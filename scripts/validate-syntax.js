#!/usr/bin/env node

/**
 * Syntax validation script to catch optional chaining errors early
 */

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');

console.log('🔍 Running comprehensive syntax validation...\n');

// Find all JavaScript files in Lambda functions
const lambdaDir = path.join(__dirname, '..', 'src', 'lambda');
const lambdaFunctions = fs.readdirSync(lambdaDir);

let totalErrors = 0;
let totalWarnings = 0;

for (const functionName of lambdaFunctions) {
    const functionPath = path.join(lambdaDir, functionName);
    const indexPath = path.join(functionPath, 'index.js');

    if (!fs.existsSync(indexPath)) continue;

    console.log(`📁 Validating: ${functionName}`);

    try {
        // 1. Check for the specific ?. pattern
        const content = fs.readFileSync(indexPath, 'utf8');
        const badPatterns = content.match(/\?\s+\./g);

        if (badPatterns) {
            console.log(`   ❌ Found ${badPatterns.length} instances of "?." instead of "?."`);
            totalErrors += badPatterns.length;

            // Show line numbers
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.match(/\?\s+\./)) {
                    console.log(`      Line ${index + 1}: ${line.trim()}`);
                }
            });
        }

        // 2. Node.js syntax validation
        try {
            execSync(`node -c "${indexPath}"`, {
                stdio: 'pipe'
            });
            console.log(`   ✅ Node.js syntax validation passed`);
        } catch (error) {
            console.log(`   ❌ Node.js syntax error: ${error.message}`);
            totalErrors++;
        }

        // 3. ESLint validation (if available)
        try {
            execSync(`npx eslint "${indexPath}"`, {
                stdio: 'pipe'
            });
            console.log(`   ✅ ESLint validation passed`);
        } catch (error) {
            const output = error.stdout ?.toString() || error.message;
            if (output.includes('warning')) {
                console.log(`   ⚠️  ESLint warnings found`);
                totalWarnings++;
            } else {
                console.log(`   ❌ ESLint errors found`);
                totalErrors++;
            }
        }

    } catch (error) {
        console.log(`   ❌ Validation failed: ${error.message}`);
        totalErrors++;
    }

    console.log('');
}

// Summary
console.log('📊 Validation Summary:');
console.log(`   Errors: ${totalErrors}`);
console.log(`   Warnings: ${totalWarnings}`);

if (totalErrors > 0) {
    console.log('\n🚨 Syntax errors found! Please fix before committing.');
    process.exit(1);
} else {
    console.log('\n✅ All syntax validation passed!');
    process.exit(0);
}
