const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * POST /api/products
 * Create a new product (Admin only)
 */
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 3, max: 255 })
      .withMessage('Product name must be between 3 and 255 characters'),
    body('description')
      .trim()
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description must not exceed 5000 characters'),
    body('price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Image URL must be a valid URL')
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

      const { name, description, price, image_url } = req.body;

      // 2. Insert product into database
      const result = await db.query(
        `INSERT INTO products (name, description, price, image_url, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [name, description || null, price, image_url || null]
      );

      const productId = result.insertId;

      // 3. Fetch the created product
      const products = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      // 4. Return success response
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          product: products[0]
        }
      });

    } catch (error) {
      console.error('Create product error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create product'
      });
    }
  }
);

/**
 * GET /api/products
 * Get all products (Public)
 */
router.get('/', async (req, res) => {
  try {
    // Optional query parameters for filtering/pagination (MVP - basic implementation)
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Fetch products with limit and offset
    const products = await db.query(
      `SELECT id, name, description, price, image_url, created_at 
       FROM products 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM products'
    );

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: products,
        pagination: {
          total: countResult.total,
          limit: limit,
          offset: offset,
          count: products.length
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products'
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID (Public)
 */
router.get(
  '/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      // 1. Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      const productId = req.params.id;

      // 2. Fetch product from database
      const products = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      // 3. Check if product exists
      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // 4. Return product
      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: {
          product: products[0]
        }
      });

    } catch (error) {
      console.error('Get product error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product'
      });
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (Admin only)
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Product name must be between 3 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must not exceed 5000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    body('image_url')
      .optional()
      .trim()
      .custom(value => {
        if (value === '' || value === null) return true; // Allow empty string to clear
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('Image URL must be a valid URL');
        }
      })
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

      const productId = req.params.id;
      const { name, description, price, image_url } = req.body;

      // 2. Check if product exists
      const existingProducts = await db.query(
        'SELECT id FROM products WHERE id = ?',
        [productId]
      );

      if (existingProducts.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // 3. Build update query dynamically (only update provided fields)
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (price !== undefined) {
        updates.push('price = ?');
        values.push(price);
      }
      if (image_url !== undefined) {
        updates.push('image_url = ?');
        values.push(image_url || null);
      }

      // 4. If no fields to update, return error
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      // 5. Update product
      values.push(productId);
      await db.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // 6. Fetch updated product
      const updatedProducts = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      // 7. Return success response
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: {
          product: updatedProducts[0]
        }
      });

    } catch (error) {
      console.error('Update product error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update product'
      });
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (Admin only)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      // 1. Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      const productId = req.params.id;

      // 2. Check if product exists
      const existingProducts = await db.query(
        'SELECT id, name FROM products WHERE id = ?',
        [productId]
      );

      if (existingProducts.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // 3. Delete product
      await db.query(
        'DELETE FROM products WHERE id = ?',
        [productId]
      );

      // 4. Return success response
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: {
          deletedProduct: {
            id: parseInt(productId),
            name: existingProducts[0].name
          }
        }
      });

    } catch (error) {
      console.error('Delete product error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product'
      });
    }
  }
);

module.exports = router;
