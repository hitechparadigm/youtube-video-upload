#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need syntax fixes
const filesToFix = [
    'src/lambda/audio-generator/index.js',
    'src/lambda/media-curator/index.js',
    'src/lambda/manifest-builder/index.js'
];

console.log('🔧 Fixing optional chaining syntax errors...');

filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Fixing ${filePath}...`);

        let content = fs.readFileSync(filePath, 'utf8');

        // Fix the malformed optional chaining operators
        const originalContent = content;
        content = content.replace(/\? \./g, '?.');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed ${filePath}`);
        } else {
            console.log(`ℹ️ No changes needed in ${filePath}`);
        }
    } else {
        console.log(`⚠️ File not found: ${filePath}`);
    }
});

console.log('🎉 Syntax fixes complete!');

// Test syntax of fixed files
console.log('\n🧪 Testing syntax...');
const {
    execSync
} = require('child_process');

filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        try {
            execSync(`node -c "${filePath}"`, {
                stdio: 'pipe'
            });
            console.log(`✅ ${filePath} - Syntax OK`);
        } catch (error) {
            console.log(`❌ ${filePath} - Syntax Error:`);
            console.log(error.stdout ? .toString() || error.message);
        }
    }
});