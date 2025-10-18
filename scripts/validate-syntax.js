#!/usr/bin/env node

/**
 * Syntax Validation Script for CI/CD
 * Validates all Lambda function syntax before deployment
 */

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');

console.log('🔍 VALIDATING LAMBDA FUNCTION SYNTAX');
console.log('===================================');

const lambdaDir = path.join(__dirname, '..', 'src', 'lambda');
let totalFunctions = 0;
let validFunctions = 0;
let errors = [];

// Get all Lambda function directories
const functionDirs = fs.readdirSync(lambdaDir, {
        withFileTypes: true
    })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

console.log(`Found ${functionDirs.length} Lambda functions to validate\n`);

for (const funcDir of functionDirs) {
    const indexPath = path.join(lambdaDir, funcDir, 'index.js');

    if (fs.existsSync(indexPath)) {
        totalFunctions++;
        console.log(`Validating ${funcDir}/index.js...`);

        try {
            // Use Node.js to check syntax
            execSync(`node -c "${indexPath}"`, {
                stdio: 'pipe'
            });
            console.log(`  ✅ ${funcDir}: Syntax valid`);
            validFunctions++;
        } catch (error) {
            console.log(`  ❌ ${funcDir}: Syntax error`);
            console.log(`     ${error.message}`);
            errors.push({
                function: funcDir,
                error: error.message
            });
        }
    } else {
        console.log(`  ⚠️ ${funcDir}: No index.js found`);
    }
}

console.log('\n📊 VALIDATION SUMMARY');
console.log('====================');
console.log(`✅ Valid functions: ${validFunctions}/${totalFunctions}`);
console.log(`❌ Invalid functions: ${errors.length}`);

if (errors.length > 0) {
    console.log('\n❌ SYNTAX ERRORS FOUND:');
    errors.forEach(error => {
        console.log(`   - ${error.function}: ${error.error}`);
    });
    console.log('\n🔧 Please fix syntax errors before deployment');
    process.exit(1);
} else {
    console.log('\n🎉 All Lambda functions have valid syntax!');
    console.log('✅ Ready for deployment');
    process.exit(0);
}