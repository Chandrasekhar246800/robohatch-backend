const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * Orders & Checkout Routes
 * Converts cart to finalized order with transaction safety
 * All routes require JWT authentication
 */

// Order status constants (standardized across system)
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Apply authentication to ALL order routes
router.use(authenticateToken);

/**
 * POST /api/orders/checkout
 * Convert user's cart to order (atomic transaction)
 */
router.post('/checkout', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const userId = req.user.userId; // From JWT

    // Start transaction
    await connection.beginTransaction();

    // IDEMPOTENCY CHECK: Prevent duplicate orders within 10 seconds
    const recentOrders = await connection.query(
      `SELECT id FROM orders 
       WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)`,
      [userId]
    );
    
    if (recentOrders[0].length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Duplicate checkout detected. Please wait 10 seconds between orders.'
      });
    }

    // 1. Get user's cart
    const carts = await connection.query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts[0].length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cart not found. Please add items to cart first.'
      });
    }

    const cartId = carts[0][0].id;

    // 2. Get cart items with product details
    const cartItems = await connection.query(
      `SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name AS product_name,
        p.price AS product_price,
        p.image_url AS product_image
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    if (cartItems[0].length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add items before checkout.'
      });
    }

    // 3. Calculate total amount (snapshot current prices)
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cartItems[0]) {
      const itemTotal = parseFloat(item.product_price) * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        product_id: item.product_id,
        custom_design_id: null,
        quantity: item.quantity,
        price_at_order: item.product_price,
        product_name: item.product_name,
        item_total: itemTotal
      });
    }

    // 4. Create order
    const orderResult = await connection.query(
      `INSERT INTO orders (user_id, total_amount, status, created_at) 
       VALUES (?, ?, ?, NOW())`,
      [userId, totalAmount.toFixed(2), ORDER_STATUS.PENDING]
    );

    const orderId = orderResult[0].insertId;

    // 5. Insert order items (with price snapshot)
    for (const item of orderItemsData) {
      await connection.query(
        `INSERT INTO order_items 
         (order_id, product_id, custom_design_id, quantity, price_at_order) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.custom_design_id,
          item.quantity,
          item.price_at_order
        ]
      );
    }

    // 6. Clear cart items
    await connection.query(
      'DELETE FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    // Commit transaction
    await connection.commit();

    // 7. Fetch created order with items
    const orders = await db.query(
      `SELECT id, user_id, total_amount, status, created_at
       FROM orders
       WHERE id = ?`,
      [orderId]
    );

    const items = await db.query(
      `SELECT 
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.custom_design_id,
        oi.quantity,
        oi.price_at_order,
        p.name AS product_name,
        p.image_url AS product_image,
        (oi.price_at_order * oi.quantity) AS item_total
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // 8. Return order confirmation
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: {
          id: orders[0].id,
          user_id: orders[0].user_id,
          total_amount: parseFloat(orders[0].total_amount),
          status: orders[0].status,
          created_at: orders[0].created_at,
          items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            custom_design_id: item.custom_design_id,
            quantity: item.quantity,
            price_at_order: parseFloat(item.price_at_order),
            product_name: item.product_name,
            product_image: item.product_image,
            item_total: parseFloat(item.item_total)
          })),
          items_count: items.length
        }
      }
    });

  } catch (error) {
    // Rollback on any error
    await connection.rollback();
    console.error('Checkout error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Checkout failed. Your cart has not been modified. Please try again.'
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/orders
 * Get all orders for logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT

    // Fetch all orders for user
    const orders = await db.query(
      `SELECT 
        id, 
        user_id, 
        total_amount, 
        status, 
        created_at,
        updated_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // For each order, get item count
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const itemCount = await db.query(
          'SELECT COUNT(*) AS count FROM order_items WHERE order_id = ?',
          [order.id]
        );

        return {
          id: order.id,
          user_id: order.user_id,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items_count: itemCount[0].count
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders: ordersWithDetails,
        total_orders: ordersWithDetails.length
      }
    });

  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

/**
 * GET /api/orders/:id
 * Get single order with full details (ownership enforced)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT
    const orderId = req.params.id;

    // Validate ID
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    // Fetch order with ownership check
    const orders = await db.query(
      `SELECT 
        id, 
        user_id, 
        total_amount, 
        status, 
        created_at,
        updated_at
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

    // Fetch order items with product/design details
    const items = await db.query(
      `SELECT 
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.custom_design_id,
        oi.quantity,
        oi.price_at_order,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image,
        cd.file_name AS design_file_name,
        cd.file_size AS design_file_size,
        cd.file_type AS design_file_type,
        (oi.price_at_order * oi.quantity) AS item_total
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN custom_designs cd ON oi.custom_design_id = cd.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order: {
          id: order.id,
          user_id: order.user_id,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: items.map(item => ({
            id: item.id,
            type: item.product_id ? 'product' : 'custom_design',
            product_id: item.product_id,
            custom_design_id: item.custom_design_id,
            quantity: item.quantity,
            price_at_order: parseFloat(item.price_at_order),
            item_total: parseFloat(item.item_total),
            // Product details (if applicable)
            product: item.product_id ? {
              name: item.product_name,
              description: item.product_description,
              image_url: item.product_image
            } : null,
            // Design details (if applicable)
            design: item.custom_design_id ? {
              file_name: item.design_file_name,
              file_size: item.design_file_size,
              file_size_mb: item.design_file_size ? (item.design_file_size / (1024 * 1024)).toFixed(2) : null,
              file_type: item.design_file_type
            } : null
          })),
          items_count: items.length
        }
      }
    });

  } catch (error) {
    console.error('Get order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
});

/**
 * GET /api/admin/orders
 * Admin-only: Get all orders from all users
 * Supports pagination to handle production scale
 */
router.get('/admin/orders', requireRole('admin'), async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await db.query('SELECT COUNT(*) as total FROM orders');
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Fetch orders with pagination
    const orders = await db.query(
      `SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        u.name AS user_name,
        u.email AS user_email
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // For each order, get item details
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await db.query(
          `SELECT 
            oi.id,
            oi.product_id,
            oi.custom_design_id,
            oi.quantity,
            oi.price_at_order,
            p.name AS product_name,
            cd.file_name AS design_file_name,
            cd.file_url AS design_file_url
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN custom_designs cd ON oi.custom_design_id = cd.id
           WHERE oi.order_id = ?`,
          [order.id]
        );

        return {
          id: order.id,
          user_id: order.user_id,
          user_name: order.user_name,
          user_email: order.user_email,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: items.map(item => ({
            id: item.id,
            type: item.product_id ? 'product' : 'custom_design',
            product_id: item.product_id,
            product_name: item.product_name,
            custom_design_id: item.custom_design_id,
            design_file_name: item.design_file_name,
            design_file_url: item.design_file_url, // Admin can see S3 URL
            quantity: item.quantity,
            price_at_order: parseFloat(item.price_at_order)
          })),
          items_count: items.length
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'All orders retrieved successfully',
      data: {
        orders: ordersWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });

  } catch (error) {
    console.error('Admin get orders error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

module.exports = router;
