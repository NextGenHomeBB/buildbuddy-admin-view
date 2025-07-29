#!/usr/bin/env node

// Production readiness validation script
const fs = require('fs');
const path = require('path');

console.log('🚀 Production Readiness Check');
console.log('==============================\n');

// Check for console.log statements in production files
function checkConsoleStatements() {
  const srcDir = path.join(__dirname, '../src');
  let hasIssues = false;
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('test') && !file.includes('__tests__')) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.includes('// Production safe')) {
            console.log(`❌ Found console.log at ${filePath}:${index + 1}`);
            hasIssues = true;
          }
        });
      }
    });
  }
  
  scanDirectory(srcDir);
  return hasIssues;
}

const hasConsoleIssues = checkConsoleStatements();

if (hasConsoleIssues) {
  console.log('\n❌ Production check failed - clean up console statements');
  process.exit(1);
} else {
  console.log('✅ All production checks passed!');
  console.log('🎉 Ready for deployment');
}