const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPublicKey
} = require('../config/razorpay');

/**
 * Payment Routes - Razorpay Integration
 * 
 * Security:
 * - All routes JWT protected (except webhook)
 * - Amount always from database (never frontend)
 * - Signature verification mandatory
 * - User ownership enforced
 * - Idempotent payment processing
 */

// Apply authentication to all routes except webhook
router.use((req, res, next) => {
  if (req.path === '/webhook') {
    return next(); // Webhook doesn't use JWT
  }
  authenticateToken(req, res, next);
});

/**
 * POST /api/payments/create
 * Create Razorpay order for existing order
 * 
 * Security:
 * - Reads amount from database (not frontend)
 * - Verifies user owns the order
 * - Prevents payment for already paid orders
 */
router.post('/create', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { order_id } = req.body;

    // Validate input
    if (!order_id || isNaN(order_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid order_id is required'
      });
    }

    // Fetch order with ownership verification
    const orders = await db.query(
      `SELECT id, user_id, total_amount, status, payment_status, razorpay_order_id
       FROM orders
       WHERE id = ? AND user_id = ?`,
      [order_id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or unauthorized'
      });
    }

    const order = orders[0];

    // Check if already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Check if Razorpay order already exists (idempotency)
    if (order.razorpay_order_id) {
      return res.status(200).json({
        success: true,
        message: 'Payment order already created',
        data: {
          razorpay_order_id: order.razorpay_order_id,
          amount: Math.round(parseFloat(order.total_amount) * 100), // Paise
          currency: 'INR',
          key_id: getPublicKey()
        }
      });
    }

    // CRITICAL: Amount comes from database, not frontend
    const amountInRupees = parseFloat(order.total_amount);

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(amountInRupees, order_id);

    // Save Razorpay order ID to database
    await db.query(
      `UPDATE orders 
       SET razorpay_order_id = ?, payment_status = 'created'
       WHERE id = ?`,
      [razorpayOrder.id, order_id]
    );

    // Return Razorpay order details to frontend
    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount, // In paise
        currency: razorpayOrder.currency,
        key_id: getPublicKey() // Safe to expose
      }
    });

  } catch (error) {
    console.error('Create payment error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature and update order status
 * 
 * CRITICAL SECURITY ENDPOINT
 * - Signature verification prevents payment fraud
 * - Must verify BEFORE marking order as paid
 * - Idempotent (safe to call multiple times)
 */
router.post('/verify', async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }

    // CRITICAL: Verify signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error('Payment signature verification failed:', {
        razorpay_order_id,
        razorpay_payment_id
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Start transaction
    await connection.beginTransaction();

    // Find order by Razorpay order ID and verify ownership
    const orders = await connection.query(
      `SELECT id, user_id, payment_status, status
       FROM orders
       WHERE razorpay_order_id = ? AND user_id = ?`,
      [razorpay_order_id, userId]
    );

    if (orders[0].length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found or unauthorized'
      });
    }

    const order = orders[0][0];

    // Idempotency: If already paid, return success
    if (order.payment_status === 'paid') {
      await connection.rollback();
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          order_id: order.id,
          payment_status: 'paid',
          order_status: order.status
        }
      });
    }

    // Update order: Mark as paid and processing
    await connection.query(
      `UPDATE orders
       SET payment_status = 'paid',
           payment_id = ?,
           status = 'processing',
           updated_at = NOW()
       WHERE id = ?`,
      [razorpay_payment_id, order.id]
    );

    // Commit transaction
    await connection.commit();

    console.log(`✅ Payment verified for order ${order.id}, payment ${razorpay_payment_id}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed',
      data: {
        order_id: order.id,
        payment_status: 'paid',
        order_status: 'processing'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Payment verification error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler for payment events
 * 
 * Purpose:
 * - Capture payment updates even if frontend fails
 * - Production safety (network issues, browser crashes)
 * - Required for reliable payment processing
 * 
 * Security:
 * - Verifies webhook signature
 * - No JWT required (Razorpay server -> our server)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = req.body.toString();

    // CRITICAL: Verify webhook is from Razorpay
    const isValidWebhook = verifyWebhookSignature(webhookBody, webhookSignature);

    if (!isValidWebhook) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(webhookBody);
    const eventType = event.event;
    const paymentEntity = event.payload.payment.entity;

    console.log(`📨 Webhook received: ${eventType}`);

    // Handle payment captured event
    if (eventType === 'payment.captured') {
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      // Find order by Razorpay order ID
      const orders = await db.query(
        `SELECT id, payment_status FROM orders WHERE razorpay_order_id = ?`,
        [razorpayOrderId]
      );

      if (orders.length > 0) {
        const order = orders[0];

        // Update only if not already paid (idempotent)
        if (order.payment_status !== 'paid') {
          await db.query(
            `UPDATE orders
             SET payment_status = 'paid',
                 payment_id = ?,
                 status = 'processing',
                 updated_at = NOW()
             WHERE id = ?`,
            [razorpayPaymentId, order.id]
          );

          console.log(`✅ Webhook: Order ${order.id} marked as paid`);
        }
      }
    }

    // Handle payment failed event
    if (eventType === 'payment.failed') {
      const razorpayOrderId = paymentEntity.order_id;

      const orders = await db.query(
        `SELECT id, payment_status FROM orders WHERE razorpay_order_id = ?`,
        [razorpayOrderId]
      );

      if (orders.length > 0) {
        const order = orders[0];

        if (order.payment_status !== 'paid') {
          await db.query(
            `UPDATE orders
             SET payment_status = 'failed',
                 status = 'cancelled',
                 updated_at = NOW()
             WHERE id = ?`,
            [order.id]
          );

          console.log(`❌ Webhook: Order ${order.id} payment failed`);
        }
      }
    }

    // Always return 200 to acknowledge webhook
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing error:', error.message);
    // Still return 200 to prevent Razorpay retries
    res.status(200).json({ status: 'error' });
  }
});

/**
 * GET /api/payments/order/:orderId
 * Get payment status for an order
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.orderId;

    const orders = await db.query(
      `SELECT id, payment_status, payment_id, razorpay_order_id, status
       FROM orders
       WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or unauthorized'
      });
    }

    const order = orders[0];

    res.status(200).json({
      success: true,
      data: {
        order_id: order.id,
        payment_status: order.payment_status,
        payment_id: order.payment_id,
        razorpay_order_id: order.razorpay_order_id,
        order_status: order.status
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment status'
    });
  }
});

module.exports = router;
