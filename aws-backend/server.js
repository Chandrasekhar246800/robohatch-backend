require('dotenv').config();
const app = require('./app');
const db = require('./config/database');

/**
 * Server Entry Point
 * 
 * Flow:
 * 1. Load environment variables
 * 2. Validate required env vars
 * 3. Test database connection (MUST succeed)
 * 4. Start Express server
 * 5. Handle graceful shutdown
 */

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validate required environment variables
 */
const validateEnvironment = () => {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
};

/**
 * Start server
 */
const startServer = async () => {
  try {
    console.log('='.repeat(60));
    console.log('🚀 Starting RoboHatch Backend Server');
    console.log('='.repeat(60));
    
    // Step 1: Validate environment
    console.log('\n📋 Step 1: Validating environment variables...');
    validateEnvironment();
    
    // Step 2: Test database connection (CRITICAL)
    console.log('\n📋 Step 2: Testing database connection...');
    await db.testConnection();
    
    // Step 3: Start Express server
    console.log('\n📋 Step 3: Starting Express server...');
    const server = app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('✅ SERVER RUNNING');
      console.log('='.repeat(60));
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Server: http://localhost:${PORT}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}`);
      console.log(`🔒 SSL: ${NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
      console.log('='.repeat(60));
      console.log('\n📌 Available Endpoints:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/api/health`);
      console.log(`   GET  http://localhost:${PORT}/api/test-db`);
      console.log('='.repeat(60));
      console.log('\n✨ Server is ready to accept connections\n');
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      server.close(async () => {
        console.log('📪 HTTP server closed');
        
        // Close database connections
        await db.closePool();
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
