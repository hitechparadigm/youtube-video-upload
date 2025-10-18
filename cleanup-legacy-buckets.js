#!/usr/bin/env node

/**
 * Script to help identify and clean up legacy S3 buckets
 * This script will check bucket contents and suggest cleanup actions
 */

const {
    execSync
} = require('child_process');

console.log('🧹 S3 Bucket Cleanup Analysis\n');

// Legacy buckets that might need cleanup
const legacyBuckets = [
    'automated-video-pipeline-backup-v2-786673323159-us-west-2',
    'automated-video-pipeline-v2-786673323159-us-east-1',
    'automated-video-pipeline-backup-786673323159-us-east-1',
    'automated-video-pipeline-backup-786673323159-us-west-2',
    'automated-video-pipeline-786673323159-us-east-1'
];

// Current active buckets (should NOT be deleted)
const activeBuckets = [
    'automated-video-pipeline-prod-786673323159-us-east-1',
    'automated-video-pipeline-deployments-prod',
    'automated-video-pipeline-deployments-staging',
    'automated-video-pipeline-deployments-dev'
];

console.log('🎯 Active Buckets (DO NOT DELETE):');
activeBuckets.forEach(bucket => {
    console.log(`   ✅ ${bucket}`);
});

console.log('\n🔍 Checking Legacy Buckets for Cleanup:\n');

async function checkBucket(bucketName) {
    try {
        // Check if bucket exists and get object count
        const result = execSync(`aws s3 ls s3://${bucketName} --summarize --human-readable`, {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        const lines = result.split('\n');
        const summaryLine = lines.find(line => line.includes('Total Objects:'));
        const sizeLine = lines.find(line => line.includes('Total Size:'));

        const objectCount = summaryLine ? summaryLine.match(/Total Objects: (\d+)/) ? . [1] || '0' : '0';
        const totalSize = sizeLine ? sizeLine.match(/Total Size: (.+)/) ? . [1] || '0 Bytes' : '0 Bytes';

        console.log(`   📦 ${bucketName}:`);
        console.log(`      Objects: ${objectCount}`);
        console.log(`      Size: ${totalSize}`);

        if (objectCount === '0') {
            console.log(`      🟢 Status: EMPTY - Safe to delete`);
            console.log(`      💡 Command: aws s3 rb s3://${bucketName}`);
        } else {
            console.log(`      🟡 Status: Contains ${objectCount} objects`);
            console.log(`      💡 Review: aws s3 ls s3://${bucketName} --recursive`);
        }
        console.log('');

    } catch (error) {
        if (error.message.includes('NoSuchBucket') || error.message.includes('does not exist')) {
            console.log(`   ❌ ${bucketName}: Does not exist (already cleaned up)`);
        } else if (error.message.includes('AccessDenied')) {
            console.log(`   🔒 ${bucketName}: Access denied (may be in different region/account)`);
        } else {
            console.log(`   ⚠️  ${bucketName}: Error checking - ${error.message.split('\n')[0]}`);
        }
        console.log('');
    }
}

async function main() {
    for (const bucket of legacyBuckets) {
        await checkBucket(bucket);
    }

    console.log('🎯 Cleanup Recommendations:\n');
    console.log('1. 🟢 Empty buckets can be safely deleted');
    console.log('2. 🟡 Non-empty buckets should be reviewed first');
    console.log('3. ❌ Non-existent buckets are already cleaned up');
    console.log('4. 🔒 Access denied buckets may be in different regions');

    console.log('\n⚠️  IMPORTANT: Never delete active buckets:');
    activeBuckets.forEach(bucket => {
        console.log(`   • ${bucket}`);
    });

    console.log('\n🚀 Your current production deployment is using:');
    console.log('   • automated-video-pipeline-prod-786673323159-us-east-1 (video assets)');
    console.log('   • automated-video-pipeline-deployments-prod (CI/CD artifacts)');
}

main().catch(console.error);