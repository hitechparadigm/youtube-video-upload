#!/usr/bin/env node

/**
 * Infrastructure Cleanup Utility
 * Removes old CDK deployment outputs and temporary files
 */

const fs = require('fs');
const path = require('path');

const INFRASTRUCTURE_DIR = path.join(__dirname, '../../infrastructure');

const foldersToRemove = [
    'cdk-deploy-out',
    'cdk-deploy-out2', 
    'cdk-deploy-out3',
    'cdk-deploy-out4',
    'temp-out',
    'temp-out2',
    'temp-out3'
];

function removeDirectory(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            console.log(`🗑️ Removing: ${path.basename(dirPath)}`);
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✅ Removed: ${path.basename(dirPath)}`);
        }
    } catch (error) {
        console.log(`⚠️ Could not remove ${path.basename(dirPath)}: ${error.message}`);
    }
}

console.log('🧹 Cleaning up infrastructure folder...\n');

foldersToRemove.forEach(folder => {
    const fullPath = path.join(INFRASTRUCTURE_DIR, folder);
    removeDirectory(fullPath);
});

console.log('\n✅ Infrastructure cleanup complete!');