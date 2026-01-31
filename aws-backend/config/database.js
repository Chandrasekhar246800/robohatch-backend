const mysql = require('mysql2/promise');

/**
 * AWS RDS MySQL Connection Pool Configuration
 */

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Pool settings
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
  waitForConnections: true,

  // AWS RDS SSL (REQUIRED for production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true  // ✅ Validates AWS RDS certificate
  } : false,  // Disable for local development

  // Charset
  charset: 'utf8mb4'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ MySQL pool error:', err.message || err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection lost');
  }
});

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    console.log('🔄 Testing database connection...');
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ Database connection successful:', rows[0]);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed');
    console.error('   Host:', process.env.DB_HOST);
    console.error('   DB:', process.env.DB_NAME);
    console.error('   User:', process.env.DB_USER);
    console.error('   Error:', error.message);
    process.exit(1);
  }
};

const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ Query execution error:', error.message);
    console.error('   SQL:', sql.substring(0, 100));
    throw error;
  }
};

const getConnection = async () => {
  return pool.getConnection();
};

const closePool = async () => {
  await pool.end();
  console.log('🔒 Database pool closed');
};

module.exports = {
  pool,
  query,
  getConnection,
  testConnection,
  closePool
};
