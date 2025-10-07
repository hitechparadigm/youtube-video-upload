#!/usr/bin/env node

/**
 * Cleanup Old Resources Script
 * Safely removes old/unused AWS resources from previous deployments
 */

const AWS = require('aws-sdk');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROJECT_PREFIX = 'automated-video-pipeline';

// Initialize AWS SDK
AWS.config.update({ region: REGION });
const cloudformation = new AWS.CloudFormation();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get old CloudFormation stacks to clean up
 */
async function getOldStacks() {
    try {
        const response = await cloudformation.listStacks({
            StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']
        }).promise();

        // Find old stacks that don't match current naming convention
        const oldStacks = response.StackSummaries.filter(stack => {
            const name = stack.StackName;
            return (
                (name.includes('automated-video') || name.includes('TopicManagement') || name === 'VideoPipelineStack') &&
                !name.includes('VideoPipelineStack-Staging') &&
                !name.includes('VideoPipelineStack-Production')
            );
        });

        return oldStacks;
    } catch (error) {
        log(`Error getting stacks: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Get old S3 buckets to clean up
 */
async function getOldBuckets() {
    try {
        const response = await s3.listBuckets().promise();
        
        // Find old buckets that don't match current naming convention
        const oldBuckets = response.Buckets.filter(bucket => {
            const name = bucket.Name;
            return (
                name.includes(PROJECT_PREFIX) &&
                !name.includes('-v2-') && // Keep v2 buckets (current)
                !name.includes('-staging-') &&
                !name.includes('-production-')
            );
        });

        return oldBuckets;
    } catch (error) {
        log(`Error getting buckets: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Get old DynamoDB tables to clean up
 */
async function getOldTables() {
    try {
        const response = await dynamodb.listTables().promise();
        
        // Find old tables that don't match current naming convention
        const oldTables = response.TableNames.filter(tableName => {
            return (
                tableName.includes(PROJECT_PREFIX) &&
                !tableName.includes('-v2') && // Keep v2 tables (current)
                !tableName.includes('-staging') &&
                !tableName.includes('-production')
            );
        });

        return oldTables;
    } catch (error) {
        log(`Error getting tables: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Safely delete CloudFormation stack
 */
async function deleteStack(stackName) {
    try {
        log(`🗑️ Deleting stack: ${stackName}`, 'yellow');
        
        await cloudformation.deleteStack({ StackName: stackName }).promise();
        
        // Wait for deletion to complete (with timeout)
        log(`⏳ Waiting for stack deletion to complete...`, 'blue');
        
        try {
            await cloudformation.waitFor('stackDeleteComplete', { 
                StackName: stackName,
                $waiter: { delay: 30, maxAttempts: 20 } // 10 minute timeout
            }).promise();
            log(`✅ Stack deleted: ${stackName}`, 'green');
            return true;
        } catch (waitError) {
            log(`⚠️ Stack deletion timeout for ${stackName}, but deletion may still be in progress`, 'yellow');
            return false;
        }
        
    } catch (error) {
        if (error.code === 'ValidationError' && error.message.includes('does not exist')) {
            log(`ℹ️ Stack ${stackName} already deleted`, 'blue');
            return true;
        } else {
            log(`❌ Error deleting stack ${stackName}: ${error.message}`, 'red');
            return false;
        }
    }
}

/**
 * Safely empty and delete S3 bucket
 */
async function deleteS3Bucket(bucketName) {
    try {
        log(`🗑️ Emptying and deleting bucket: ${bucketName}`, 'yellow');
        
        // List and delete all objects
        const objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
        
        if (objects.Contents && objects.Contents.length > 0) {
            const deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
                }
            };
            await s3.deleteObjects(deleteParams).promise();
            log(`  Deleted ${objects.Contents.length} objects`, 'blue');
        }

        // Delete the bucket
        await s3.deleteBucket({ Bucket: bucketName }).promise();
        log(`✅ Bucket deleted: ${bucketName}`, 'green');
        return true;
        
    } catch (error) {
        if (error.code === 'NoSuchBucket') {
            log(`ℹ️ Bucket ${bucketName} already deleted`, 'blue');
            return true;
        } else {
            log(`❌ Error deleting bucket ${bucketName}: ${error.message}`, 'red');
            return false;
        }
    }
}

/**
 * Safely delete DynamoDB table
 */
async function deleteDynamoTable(tableName) {
    try {
        log(`🗑️ Deleting table: ${tableName}`, 'yellow');
        
        await dynamodb.deleteTable({ TableName: tableName }).promise();
        
        // Wait for table deletion
        await dynamodb.waitFor('tableNotExists', { 
            TableName: tableName,
            $waiter: { delay: 20, maxAttempts: 25 } // 8 minute timeout
        }).promise();
        
        log(`✅ Table deleted: ${tableName}`, 'green');
        return true;
        
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            log(`ℹ️ Table ${tableName} already deleted`, 'blue');
            return true;
        } else {
            log(`❌ Error deleting table ${tableName}: ${error.message}`, 'red');
            return false;
        }
    }
}

/**
 * Main cleanup function
 */
async function cleanupOldResources() {
    log('🧹 Starting cleanup of old resources...', 'blue');
    log('=====================================', 'blue');
    
    // Get all old resources
    const [oldStacks, oldBuckets, oldTables] = await Promise.all([
        getOldStacks(),
        getOldBuckets(), 
        getOldTables()
    ]);
    
    log(`Found ${oldStacks.length} old stacks, ${oldBuckets.length} old buckets, ${oldTables.length} old tables`, 'blue');
    
    if (oldStacks.length === 0 && oldBuckets.length === 0 && oldTables.length === 0) {
        log('✅ No old resources found to clean up!', 'green');
        return;
    }
    
    // Show what will be deleted
    log('', 'reset');
    log('📋 Resources to be deleted:', 'yellow');
    
    if (oldStacks.length > 0) {
        log('CloudFormation Stacks:', 'yellow');
        oldStacks.forEach(stack => log(`  - ${stack.StackName}`, 'yellow'));
    }
    
    if (oldBuckets.length > 0) {
        log('S3 Buckets:', 'yellow');
        oldBuckets.forEach(bucket => log(`  - ${bucket.Name}`, 'yellow'));
    }
    
    if (oldTables.length > 0) {
        log('DynamoDB Tables:', 'yellow');
        oldTables.forEach(table => log(`  - ${table}`, 'yellow'));
    }
    
    log('', 'reset');
    
    // Delete CloudFormation stacks first (they should clean up their resources)
    let stacksDeleted = 0;
    for (const stack of oldStacks) {
        const success = await deleteStack(stack.StackName);
        if (success) stacksDeleted++;
    }
    
    // Wait a bit for stack deletions to clean up resources
    if (oldStacks.length > 0) {
        log('⏳ Waiting 60 seconds for stack deletions to clean up resources...', 'blue');
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    // Clean up remaining S3 buckets
    let bucketsDeleted = 0;
    for (const bucket of oldBuckets) {
        const success = await deleteS3Bucket(bucket.Name);
        if (success) bucketsDeleted++;
    }
    
    // Clean up remaining DynamoDB tables
    let tablesDeleted = 0;
    for (const table of oldTables) {
        const success = await deleteDynamoTable(table);
        if (success) tablesDeleted++;
    }
    
    // Summary
    log('', 'reset');
    log('📊 Cleanup Summary:', 'blue');
    log(`✅ Stacks deleted: ${stacksDeleted}/${oldStacks.length}`, 'green');
    log(`✅ Buckets deleted: ${bucketsDeleted}/${oldBuckets.length}`, 'green');
    log(`✅ Tables deleted: ${tablesDeleted}/${oldTables.length}`, 'green');
    
    if (stacksDeleted === oldStacks.length && bucketsDeleted === oldBuckets.length && tablesDeleted === oldTables.length) {
        log('🎉 All old resources cleaned up successfully!', 'green');
    } else {
        log('⚠️ Some resources may need manual cleanup', 'yellow');
    }
}

/**
 * Main function
 */
async function main() {
    try {
        log('🧹 AWS Resource Cleanup Tool', 'blue');
        log('============================', 'blue');
        log('', 'reset');
        
        await cleanupOldResources();
        
    } catch (error) {
        log(`❌ Cleanup failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { cleanupOldResources, getOldStacks, getOldBuckets, getOldTables };