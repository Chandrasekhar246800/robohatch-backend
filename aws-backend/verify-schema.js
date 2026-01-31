/**
 * Schema Verification Tool
 * Checks which migrations have been applied
 */

require('dotenv').config();
const db = require('./config/database');

async function verifySchema() {
  console.log('🔍 Verifying Database Schema...\n');

  try {
    await db.testConnection();
    console.log('✅ Database connected\n');

    // Check order_items structure
    console.log('📋 Checking order_items table...');
    const orderItems = await db.query('DESCRIBE order_items');
    
    const columns = orderItems.map(c => c.Field);
    const hasCustomDesignId = columns.includes('custom_design_id');
    const hasPriceAtOrder = columns.includes('price_at_order');
    const hasPrice = columns.includes('price');

    console.log('Columns found:');
    orderItems.forEach(c => {
      console.log(`  - ${c.Field.padEnd(20)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📊 Migration Status:');
    console.log(`  Migration 003: ${hasCustomDesignId && hasPriceAtOrder ? '✅ APPLIED' : '❌ NOT APPLIED'}`);
    
    if (!hasCustomDesignId) {
      console.log('  ⚠️  Missing: custom_design_id column');
      console.log('  Action: Run node run-migration-003.js');
    }
    
    if (!hasPriceAtOrder && hasPrice) {
      console.log('  ⚠️  Column still named "price" (should be "price_at_order")');
      console.log('  Action: Run node run-migration-003.js');
    }

    // Check cart_items structure
    console.log('\n📋 Checking cart_items table...');
    const cartItems = await db.query('DESCRIBE cart_items');
    const cartColumns = cartItems.map(c => c.Field);
    const hasCartCustomDesign = cartColumns.includes('custom_design_id');

    console.log('Columns found:');
    cartItems.forEach(c => {
      console.log(`  - ${c.Field.padEnd(20)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n⚠️  KNOWN LIMITATION:');
    console.log(`  cart_items.custom_design_id: ${hasCartCustomDesign ? '✅ EXISTS' : '❌ DOES NOT EXIST'}`);
    if (!hasCartCustomDesign) {
      console.log('  → Custom STL designs CANNOT be added to cart yet');
      console.log('  → This is Phase 2 feature (documented limitation)');
    }

    // Check orders table
    console.log('\n📋 Checking orders table...');
    const orders = await db.query('DESCRIBE orders');
    const statusField = orders.find(c => c.Field === 'status');
    
    if (statusField) {
      console.log(`  Status column type: ${statusField.Type}`);
      console.log('  Valid values: pending, processing, shipped, completed, cancelled');
    }

    console.log('\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await db.closePool();
    process.exit(0);
  }
}

verifySchema();
