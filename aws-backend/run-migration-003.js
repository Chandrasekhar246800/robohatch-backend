/**
 * Run Database Migration 003
 * Updates order_items table to support custom STL designs
 */

// Load environment variables FIRST
require('dotenv').config();

const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('📦 Starting Migration 003: Update order_items for custom designs\n');

  try {
    // Test database connection
    await db.testConnection();
    console.log('✅ Database connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_update_order_items_for_designs.sql');
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

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`${i + 1}. Executing:`);
        console.log(statement.substring(0, 100) + '...\n');

        await db.query(statement);
        console.log('✅ Success\n');
      }
    }

    // Verify changes
    console.log('🔍 Verifying table structure...\n');
    const describe = await db.query('DESCRIBE order_items');
    
    console.log('order_items columns:');
    describe.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Check constraints
    console.log('\n🔍 Checking constraints...\n');
    const constraints = await db.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'robohatch_db' AND TABLE_NAME = 'order_items'
    `);

    console.log('Constraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.CONSTRAINT_TYPE}`);
    });

    console.log('\n✅ Migration 003 completed successfully!');
    console.log('\nChanges applied:');
    console.log('  ✓ product_id is now NULL (allows custom designs only)');
    console.log('  ✓ custom_design_id column added');
    console.log('  ✓ price renamed to price_at_order');
    console.log('  ✓ CHECK constraint added (product XOR design)');
    console.log('  ✓ Foreign key to custom_designs added');
    console.log('  ✓ Index on custom_design_id added');

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
