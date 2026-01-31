const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * GET /api/test-db
 * Database connectivity test
 * ⚠️  DISABLED IN PRODUCTION for security
 */
router.get('/test-db', async (req, res) => {
  // SECURITY: Disable test endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Test endpoints are disabled in production'
    });
  }

  try {
    console.log('📡 Testing database connection...');

    // Test 1: Simple connection test
    const simpleResult = await db.query(
      'SELECT 1 + 1 AS result'
    );

    // Test 2: Count users (don't return actual data)
    const userCount = await db.query(
      'SELECT COUNT(*) AS count FROM users'
    );

    // Test 3: Count tables
    const tableCount = await db.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [process.env.DB_NAME]
    );

    res.status(200).json({
      success: true,
      message: '✅ Database connection successful',
      timestamp: new Date().toISOString(),
      tests: {
        connectionTest: simpleResult[0].result === 2,
        userCount: userCount[0].count,
        tableCount: tableCount[0].count
      }
      // ✅ No sensitive data exposed
    });

  } catch (error) {
    // Log error internally
    console.error('❌ Database test failed:', error);

    // Don't expose error details to client
    res.status(500).json({
      success: false,
      message: 'Database connection failed'
      // ✅ No error details exposed
    });
  }
});

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'robohatch-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/profile
 * Protected route example - requires authentication
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // req.user is attached by authenticateToken middleware
    const users = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * GET /api/admin-only
 * Protected route example - requires admin role
 */
router.get('/admin-only', authenticateToken, requireRole('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin!',
    data: {
      adminInfo: 'This is admin-only content',
      user: req.user
    }
  });
});

module.exports = router;
