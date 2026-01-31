const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 * 
 * Usage:
 * router.get('/protected', authenticateToken, (req, res) => {
 *   // req.user contains { userId, email, role }
 * });
 */
const authenticateToken = (req, res, next) => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // 2. Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        // Token expired or invalid
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // 3. Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      next();
    });

  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based Authorization Middleware
 * Ensures user has required role
 * 
 * Usage:
 * router.delete('/admin/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
 *   // Only admins can access
 * });
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
