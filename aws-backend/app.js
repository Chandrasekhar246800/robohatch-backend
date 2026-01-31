const express = require('express');
const cors = require('cors');

/**
 * Express Application Setup
 * 
 * Middleware:
 * - CORS for cross-origin requests
 * - JSON body parser
 * - URL-encoded body parser
 */

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const cartRoutes = require('./routes/cart.routes');
const designsRoutes = require('./routes/designs.routes');
const ordersRoutes = require('./routes/orders.routes');
const paymentsRoutes = require('./routes/payments.routes');

// Mount routes
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/designs', designsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 RoboHatch Backend API with AWS RDS MySQL',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      testDatabase: '/api/test-db',
      register: '/api/auth/register',
      login: '/api/auth/login',
      products: '/api/products',
      cart: '/api/cart',
      designs: '/api/designs',
      orders: '/api/orders',
      payments: '/api/payments'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
