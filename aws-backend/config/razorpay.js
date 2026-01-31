const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Razorpay Payment Gateway Configuration
 * 
 * Security:
 * - Keys loaded from environment
 * - Secret never exposed to frontend
 * - Signature verification for all payments
 */

// Validate required environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ FATAL: Razorpay credentials missing in environment');
  console.error('   Required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET');
  process.exit(1);
}

if (!RAZORPAY_WEBHOOK_SECRET) {
  console.warn('⚠️  WARNING: RAZORPAY_WEBHOOK_SECRET not set (webhooks will fail)');
}

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} receipt - Unique receipt ID (order ID)
 * @returns {Promise<object>} Razorpay order object
 */
async function createRazorpayOrder(amount, receipt) {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency: 'INR',
      receipt: receipt.toString(),
      payment_capture: 1 // Auto-capture payment
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation failed:', error.message);
    throw new Error('Failed to create payment order');
  }
}

/**
 * Verify Razorpay payment signature (CRITICAL SECURITY)
 * 
 * Algorithm: HMAC SHA256
 * Message: razorpay_order_id|razorpay_payment_id
 * Secret: RAZORPAY_KEY_SECRET
 * 
 * @param {string} razorpayOrderId 
 * @param {string} razorpayPaymentId 
 * @param {string} razorpaySignature 
 * @returns {boolean} True if signature is valid
 */
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  try {
    const message = `${razorpayOrderId}|${razorpayPaymentId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(message)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * 
 * @param {string} webhookBody - Raw request body
 * @param {string} webhookSignature - X-Razorpay-Signature header
 * @returns {boolean} True if webhook is authentic
 */
function verifyWebhookSignature(webhookBody, webhookSignature) {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    return expectedSignature === webhookSignature;
  } catch (error) {
    console.error('Webhook verification error:', error.message);
    return false;
  }
}

/**
 * Get Razorpay public key (safe to expose)
 * @returns {string} Razorpay key ID
 */
function getPublicKey() {
  return RAZORPAY_KEY_ID;
}

module.exports = {
  razorpayInstance,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPublicKey
};
