const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * Shopping Cart Routes
 * All routes require JWT authentication
 * Users can only access their own cart
 */

// Apply authentication to ALL cart routes
router.use(authenticateToken);

/**
 * GET /api/cart
 * Get current user's cart with all items
 * Auto-creates cart if it doesn't exist
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT

    // 1. Get or create cart for user
    let carts = await db.query(
      'SELECT id, user_id, created_at, updated_at FROM carts WHERE user_id = ?',
      [userId]
    );

    let cartId;

    if (carts.length === 0) {
      // Auto-create cart for user
      const result = await db.query(
        'INSERT INTO carts (user_id) VALUES (?)',
        [userId]
      );
      cartId = result.insertId;

      // Fetch the newly created cart
      carts = await db.query(
        'SELECT id, user_id, created_at, updated_at FROM carts WHERE id = ?',
        [cartId]
      );
    } else {
      cartId = carts[0].id;
    }

    // 2. Get all items in cart with product details
    const cartItems = await db.query(
      `SELECT 
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.image_url AS product_image_url,
        (p.price * ci.quantity) AS item_total
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at DESC`,
      [cartId]
    );

    // 3. Calculate cart totals
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total), 0);

    // 4. Return cart with items
    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        cart: {
          id: carts[0].id,
          user_id: carts[0].user_id,
          created_at: carts[0].created_at,
          updated_at: carts[0].updated_at
        },
        items: cartItems.map(item => ({
          id: item.id,
          cart_id: item.cart_id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: {
            name: item.product_name,
            description: item.product_description,
            price: parseFloat(item.product_price),
            image_url: item.product_image_url
          },
          item_total: parseFloat(item.item_total),
          created_at: item.created_at,
          updated_at: item.updated_at
        })),
        summary: {
          total_items: totalItems,
          total_price: parseFloat(totalPrice.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Get cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart'
    });
  }
});

/**
 * POST /api/cart/items
 * Add product to cart or increase quantity if already exists
 */
router.post(
  '/items',
  [
    body('product_id')
      .notEmpty()
      .withMessage('Product ID is required')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer')
  ],
  async (req, res) => {
    try {
      // 1. Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const userId = req.user.userId; // From JWT
      const { product_id, quantity = 1 } = req.body;

      // 2. Verify product exists
      const products = await db.query(
        'SELECT id, name, price FROM products WHERE id = ?',
        [product_id]
      );

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // 3. Get or create cart
      let carts = await db.query(
        'SELECT id FROM carts WHERE user_id = ?',
        [userId]
      );

      let cartId;
      if (carts.length === 0) {
        const result = await db.query(
          'INSERT INTO carts (user_id) VALUES (?)',
          [userId]
        );
        cartId = result.insertId;
      } else {
        cartId = carts[0].id;
      }

      // 4. Check if product already in cart
      const existingItems = await db.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
        [cartId, product_id]
      );

      if (existingItems.length > 0) {
        // Product exists → Update quantity
        const newQuantity = existingItems[0].quantity + quantity;
        await db.query(
          'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
          [newQuantity, existingItems[0].id]
        );

        const itemId = existingItems[0].id;
        
        // Fetch updated item with product details
        const updatedItems = await db.query(
          `SELECT 
            ci.id,
            ci.cart_id,
            ci.product_id,
            ci.quantity,
            ci.updated_at,
            p.name AS product_name,
            p.price AS product_price,
            (p.price * ci.quantity) AS item_total
           FROM cart_items ci
           INNER JOIN products p ON ci.product_id = p.id
           WHERE ci.id = ?`,
          [itemId]
        );

        return res.status(200).json({
          success: true,
          message: 'Cart item quantity updated',
          data: {
            cart_item: {
              id: updatedItems[0].id,
              cart_id: updatedItems[0].cart_id,
              product_id: updatedItems[0].product_id,
              quantity: updatedItems[0].quantity,
              product_name: updatedItems[0].product_name,
              product_price: parseFloat(updatedItems[0].product_price),
              item_total: parseFloat(updatedItems[0].item_total),
              updated_at: updatedItems[0].updated_at
            }
          }
        });

      } else {
        // Product doesn't exist → Insert new item
        const result = await db.query(
          'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
          [cartId, product_id, quantity]
        );

        const itemId = result.insertId;

        // Fetch created item with product details
        const createdItems = await db.query(
          `SELECT 
            ci.id,
            ci.cart_id,
            ci.product_id,
            ci.quantity,
            ci.created_at,
            p.name AS product_name,
            p.price AS product_price,
            (p.price * ci.quantity) AS item_total
           FROM cart_items ci
           INNER JOIN products p ON ci.product_id = p.id
           WHERE ci.id = ?`,
          [itemId]
        );

        return res.status(201).json({
          success: true,
          message: 'Product added to cart',
          data: {
            cart_item: {
              id: createdItems[0].id,
              cart_id: createdItems[0].cart_id,
              product_id: createdItems[0].product_id,
              quantity: createdItems[0].quantity,
              product_name: createdItems[0].product_name,
              product_price: parseFloat(createdItems[0].product_price),
              item_total: parseFloat(createdItems[0].item_total),
              created_at: createdItems[0].created_at
            }
          }
        });
      }

    } catch (error) {
      console.error('Add to cart error:', error.message);
      
      // Handle duplicate key error (edge case race condition)
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Product already in cart. Please refresh and try again.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add product to cart'
      });
    }
  }
);

/**
 * PUT /api/cart/items/:itemId
 * Update cart item quantity
 */
router.put(
  '/items/:itemId',
  [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Item ID must be a positive integer'),
    body('quantity')
      .notEmpty()
      .withMessage('Quantity is required')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1')
  ],
  async (req, res) => {
    try {
      // 1. Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const userId = req.user.userId; // From JWT
      const itemId = req.params.itemId;
      const { quantity } = req.body;

      // 2. Verify item exists AND belongs to user's cart
      const items = await db.query(
        `SELECT ci.id, ci.cart_id, ci.product_id, c.user_id
         FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         WHERE ci.id = ? AND c.user_id = ?`,
        [itemId, userId]
      );

      if (items.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cart item not found or unauthorized'
        });
      }

      // 3. Update quantity
      await db.query(
        'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [quantity, itemId]
      );

      // 4. Fetch updated item with product details
      const updatedItems = await db.query(
        `SELECT 
          ci.id,
          ci.cart_id,
          ci.product_id,
          ci.quantity,
          ci.updated_at,
          p.name AS product_name,
          p.price AS product_price,
          (p.price * ci.quantity) AS item_total
         FROM cart_items ci
         INNER JOIN products p ON ci.product_id = p.id
         WHERE ci.id = ?`,
        [itemId]
      );

      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: {
          cart_item: {
            id: updatedItems[0].id,
            cart_id: updatedItems[0].cart_id,
            product_id: updatedItems[0].product_id,
            quantity: updatedItems[0].quantity,
            product_name: updatedItems[0].product_name,
            product_price: parseFloat(updatedItems[0].product_price),
            item_total: parseFloat(updatedItems[0].item_total),
            updated_at: updatedItems[0].updated_at
          }
        }
      });

    } catch (error) {
      console.error('Update cart item error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update cart item'
      });
    }
  }
);

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
router.delete(
  '/items/:itemId',
  [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Item ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      // 1. Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item ID'
        });
      }

      const userId = req.user.userId; // From JWT
      const itemId = req.params.itemId;

      // 2. Verify item exists AND belongs to user's cart
      const items = await db.query(
        `SELECT ci.id, ci.product_id, p.name AS product_name
         FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         INNER JOIN products p ON ci.product_id = p.id
         WHERE ci.id = ? AND c.user_id = ?`,
        [itemId, userId]
      );

      if (items.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cart item not found or unauthorized'
        });
      }

      const deletedItem = items[0];

      // 3. Delete item
      await db.query(
        'DELETE FROM cart_items WHERE id = ?',
        [itemId]
      );

      res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        data: {
          deleted_item: {
            id: parseInt(itemId),
            product_id: deletedItem.product_id,
            product_name: deletedItem.product_name
          }
        }
      });

    } catch (error) {
      console.error('Delete cart item error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to remove item from cart'
      });
    }
  }
);

/**
 * DELETE /api/cart
 * Clear entire cart (remove all items)
 * Keeps cart record, only deletes items
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT

    // 1. Get user's cart
    const carts = await db.query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartId = carts[0].id;

    // 2. Count items before deletion
    const countResult = await db.query(
      'SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    const itemCount = countResult[0].count;

    // 3. Delete all items from cart
    await db.query(
      'DELETE FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart_id: cartId,
        items_removed: itemCount
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;
