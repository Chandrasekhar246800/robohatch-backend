/**
 * Run Database Migration 004
 * Adds Razorpay payment fields to orders table
 */

// Load environment variables FIRST
require('dotenv').config();

const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('📦 Starting Migration 004: Add Payment Fields\n');

  try {
    // Test database connection
    await db.testConnection();
    console.log('✅ Database connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '004_add_payment_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL statements (remove comments and DESCRIBE query)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        !stmt.toLowerCase().startsWith('describe') &&
        !stmt.toLowerCase().startsWith('expected')
      );

    console.log(`📝 Executing ${statements.length} SQL statement(s)...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`${i + 1}. Executing:`);
        console.log(statement.substring(0, 150) + '...\n');

        await db.query(statement);
        console.log('✅ Success\n');
      }
    }

    // Verify changes
    console.log('🔍 Verifying table structure...\n');
    const describe = await db.query('DESCRIBE orders');
    
    console.log('orders columns:');
    describe.forEach(col => {
      console.log(`  - ${col.Field.padEnd(20)} ${col.Type.padEnd(30)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check for new columns
    const hasPaymentProvider = describe.find(c => c.Field === 'payment_provider');
    const hasPaymentId = describe.find(c => c.Field === 'payment_id');
    const hasPaymentStatus = describe.find(c => c.Field === 'payment_status');
    const hasRazorpayOrderId = describe.find(c => c.Field === 'razorpay_order_id');

    console.log('\n✅ Migration 004 completed successfully!');
    console.log('\nChanges applied:');
    console.log(`  ${hasPaymentProvider ? '✓' : '✗'} payment_provider column added`);
    console.log(`  ${hasPaymentId ? '✓' : '✗'} payment_id column added`);
    console.log(`  ${hasPaymentStatus ? '✓' : '✗'} payment_status column added`);
    console.log(`  ${hasRazorpayOrderId ? '✓' : '✗'} razorpay_order_id column added`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.closePool();
    console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

// Run migration
runMigration();
