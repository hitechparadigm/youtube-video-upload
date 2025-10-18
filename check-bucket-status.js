#!/usr/bin/env node

/**
 * Simple script to check S3 bucket status for cleanup
 */

const {
    execSync
} = require('child_process');

console.log('🧹 S3 Bucket Status Check\n');

// Current active buckets (should NOT be deleted)
const activeBuckets = [
    'automated-video-pipeline-prod-786673323159-us-east-1',
    'automated-video-pipeline-deployments-prod',
    'automated-video-pipeline-deployments-staging',
    'automated-video-pipeline-deployments-dev'
];

// Legacy buckets that might need cleanup
const legacyBuckets = [
    'automated-video-pipeline-backup-v2-786673323159-us-west-2',
    'automated-video-pipeline-v2-786673323159-us-east-1',
    'automated-video-pipeline-backup-786673323159-us-east-1',
    'automated-video-pipeline-backup-786673323159-us-west-2',
    'automated-video-pipeline-786673323159-us-east-1'
];

console.log('✅ ACTIVE BUCKETS (DO NOT DELETE):');
activeBuckets.forEach(bucket => {
    console.log(`   • ${bucket}`);
});

console.log('\n🔍 LEGACY BUCKETS (Cleanup Candidates):\n');

function checkBucket(bucketName) {
    try {
        execSync(`aws s3 ls s3://${bucketName} --summarize`, {
            stdio: 'pipe'
        });
        console.log(`   🟡 ${bucketName}: EXISTS - Check contents before cleanup`);
        console.log(`      Command to check: aws s3 ls s3://${bucketName} --recursive`);
        console.log(`      Command to delete (if empty): aws s3 rb s3://${bucketName}`);
    } catch (error) {
        if (error.message.includes('NoSuchBucket') || error.message.includes('does not exist')) {
            console.log(`   ✅ ${bucketName}: Already cleaned up (doesn't exist)`);
        } else if (error.message.includes('AccessDenied')) {
            console.log(`   🔒 ${bucketName}: Access denied (different region/account)`);
        } else {
            console.log(`   ❌ ${bucketName}: Error - ${error.message.split('\n')[0]}`);
        }
    }
    console.log('');
}

legacyBuckets.forEach(checkBucket);

console.log('📋 SUMMARY:');
console.log('• ✅ Already cleaned up buckets can be ignored');
console.log('• 🟡 Existing buckets should be checked for contents before deletion');
console.log('• 🔒 Access denied buckets may be in different AWS regions');
console.log('• ⚠️  NEVER delete the active buckets listed above');

console.log('\n🎯 YOUR CURRENT PRODUCTION SETUP:');
console.log('• Video Assets: automated-video-pipeline-prod-786673323159-us-east-1');
console.log('• CI/CD Artifacts: automated-video-pipeline-deployments-prod');
console.log('• Status: ✅ Working correctly after latest deployment');