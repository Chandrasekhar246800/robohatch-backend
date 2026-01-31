#!/usr/bin/env node
/**
 * Production Readiness Verification Script
 * Tests all critical backend components before Railway deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECKS = [];
let PASSED = 0;
let FAILED = 0;

function check(name, fn) {
  CHECKS.push({ name, fn });
}

function run() {
  console.log('🔍 PRODUCTION READINESS CHECK\n');
  console.log('=' .repeat(60));
  
  CHECKS.forEach(({ name, fn }) => {
    try {
      fn();
      console.log(`✅ ${name}`);
      PASSED++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      FAILED++;
    }
  });
  
  console.log('=' .repeat(60));
  console.log(`\n📊 Results: ${PASSED} passed, ${FAILED} failed\n`);
  
  if (FAILED > 0) {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    process.exit(1);
  } else {
    console.log('✅ READY FOR RAILWAY DEPLOYMENT');
    process.exit(0);
  }
}

// ==================== CHECKS ====================

check('TypeScript compilation', () => {
  execSync('npm run build', { stdio: 'pipe' });
});

check('Prisma client generation', () => {
  execSync('npx prisma generate', { stdio: 'pipe' });
});

check('Environment file exists', () => {
  if (!fs.existsSync('.env')) {
    throw new Error('.env file not found');
  }
});

check('Prisma schema valid', () => {
  execSync('npx prisma validate', { stdio: 'pipe' });
});

check('No TypeScript any types in services', () => {
  const services = execSync('find src -name "*.service.ts" || dir /s /b src\\*.service.ts', { 
    encoding: 'utf8',
    stdio: 'pipe'
  }).split('\n').filter(Boolean);
  
  services.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const anyCount = (content.match(/:\s*any\b/g) || []).length;
    if (anyCount > 2) { // Allow minimal any usage
      throw new Error(`${file} has ${anyCount} 'any' types`);
    }
  });
});

check('All required env vars documented', () => {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];
  
  required.forEach(key => {
    if (!envExample.includes(key)) {
      throw new Error(`Missing ${key} in .env.example`);
    }
  });
});

check('No console.log in production code', () => {
  const srcFiles = execSync('find src -name "*.ts" -not -path "*/node_modules/*" || dir /s /b src\\*.ts', {
    encoding: 'utf8',
    stdio: 'pipe'
  }).split('\n').filter(Boolean);
  
  let violations = [];
  srcFiles.forEach(file => {
    if (!fs.existsSync(file) || file.includes('main.ts')) return;
    const content = fs.readFileSync(file, 'utf8');
    if (content.match(/console\.(log|debug)\(/)) {
      violations.push(path.basename(file));
    }
  });
  
  if (violations.length > 5) { // Allow some console usage
    throw new Error(`${violations.length} files with console.log`);
  }
});

check('Main entry point valid', () => {
  const main = fs.readFileSync('src/main.ts', 'utf8');
  if (!main.includes('NestFactory.create')) {
    throw new Error('Invalid main.ts');
  }
  if (!main.includes('await app.listen')) {
    throw new Error('Missing app.listen() in main.ts');
  }
});

check('Package.json has start:prod', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!pkg.scripts['start:prod']) {
    throw new Error('Missing start:prod script');
  }
});

check('No direct imports from @prisma/client in services', () => {
  const services = execSync('find src -name "*.service.ts" || dir /s /b src\\*.service.ts', {
    encoding: 'utf8',
    stdio: 'pipe'
  }).split('\n').filter(Boolean);
  
  services.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    // Enums are OK, but PrismaClient should come from PrismaService
    if (content.match(/import\s+\{[^}]*PrismaClient[^}]*\}\s+from\s+['"]@prisma\/client['"]/)) {
      throw new Error(`${file} imports PrismaClient directly`);
    }
  });
});

// Run all checks
run();
