#!/usr/bin/env node

/**
 * Cleanup and Deploy Script
 * Removes old resources and deploys the new complete pipeline
 */

const AWS = require('aws-sdk');
const { execSync } = require('child_process');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROJECT_PREFIX = 'automated-video-pipeline';

// Initialize AWS SDK
AWS.config.update({ region: REGION });
const cloudformation = new AWS.CloudFormation();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();
const lambda = new AWS.Lambda();

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
 * Get existing CloudFormation stacks
 */
async function getExistingStacks() {
    try {
        const response = await cloudformation.listStacks({
            StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']
        }).promise();

        return response.StackSummaries.filter(stack => 
            stack.StackName.includes('automated-video') || 
            stack.StackName.includes('TopicManagement') ||
            stack.StackName.includes('VideoPipeline')
        );
    } catch (error) {
        log(`Error getting stacks: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Get existing S3 buckets
 */
async function getExistingBuckets() {
    try {
        const response = await s3.listBuckets().promise();
        return response.Buckets.filter(bucket => 
            bucket.Name.includes(PROJECT_PREFIX)
        );
    } catch (error) {
        log(`Error getting buckets: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Get existing DynamoDB tables
 */
async function getExistingTables() {
    try {
        const response = await dynamodb.listTables().promise();
        return response.TableNames.filter(tableName => 
            tableName.includes(PROJECT_PREFIX)
        );
    } catch (error) {
        log(`Error getting tables: ${error.message}`, 'red');
        return [];
    }
}

/**
 * Empty and delete S3 bucket
 */
async function emptyAndDeleteBucket(bucketName) {
    try {
        log(`🗑️  Emptying bucket: ${bucketName}`, 'yellow');
        
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
        }

        // Delete the bucket
        await s3.deleteBucket({ Bucket: bucketName }).promise();
        log(`✅ Deleted bucket: ${bucketName}`, 'green');
        
    } catch (error) {
        if (error.code === 'NoSuchBucket') {
            log(`ℹ️  Bucket ${bucketName} already deleted`, 'blue');
        } else {
            log(`❌ Error deleting bucket ${bucketName}: ${error.message}`, 'red');
        }
    }
}

/**
 * Delete DynamoDB table
 */
async function deleteTable(tableName) {
    try {
        log(`🗑️  Deleting table: ${tableName}`, 'yellow');
        await dynamodb.deleteTable({ TableName: tableName }).promise();
        
        // Wait for table to be deleted
        await dynamodb.waitFor('tableNotExists', { TableName: tableName }).promise();
        log(`✅ Deleted table: ${tableName}`, 'green');
        
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            log(`ℹ️  Table ${tableName} already deleted`, 'blue');
        } else {
            log(`❌ Error deleting table ${tableName}: ${error.message}`, 'red');
        }
    }
}

/**
 * Delete CloudFormation stack
 */
async function deleteStack(stackName) {
    try {
        log(`🗑️  Deleting stack: ${stackName}`, 'yellow');
        await cloudformation.deleteStack({ StackName: stackName }).promise();
        
        // Wait for stack deletion
        await cloudformation.waitFor('stackDeleteComplete', { StackName: stackName }).promise();
        log(`✅ Deleted stack: ${stackName}`, 'green');
        
    } catch (error) {
        if (error.code === 'ValidationError' && error.message.includes('does not exist')) {
            log(`ℹ️  Stack ${stackName} already deleted`, 'blue');
        } else {
            log(`❌ Error deleting stack ${stackName}: ${error.message}`, 'red');
        }
    }
}

/**
 * Clean up existing resources
 */
async function cleanupExistingResources() {
    log('🧹 Starting cleanup of existing resources...', 'blue');
    log('==========================================', 'blue');

    // Get existing resources
    const [stacks, buckets, tables] = await Promise.all([
        getExistingStacks(),
        getExistingBuckets(),
        getExistingTables()
    ]);

    log(`Found ${stacks.length} stacks, ${buckets.length} buckets, ${tables.length} tables`, 'blue');

    // Delete CloudFormation stacks first (this should handle most resources)
    for (const stack of stacks) {
        await deleteStack(stack.StackName);
    }

    // Clean up any remaining S3 buckets
    for (const bucket of buckets) {
        await emptyAndDeleteBucket(bucket.Name);
    }

    // Clean up any remaining DynamoDB tables
    for (const tableName of tables) {
        await deleteTable(tableName);
    }

    log('✅ Cleanup completed!', 'green');
    log('');
}

/**
 * Deploy new infrastructure
 */
async function deployNewInfrastructure() {
    log('🚀 Deploying new infrastructure...', 'blue');
    log('==================================', 'blue');

    try {
        // Change to infrastructure directory
        process.chdir('./infrastructure');

        // Bootstrap CDK
        log('🏗️  Bootstrapping CDK...', 'yellow');
        execSync('cdk bootstrap', { stdio: 'inherit' });

        // Deploy the new stack
        log('📦 Deploying VideoPipelineStack...', 'yellow');
        execSync('cdk deploy VideoPipelineStack --require-approval never --outputs-file ../deployment-outputs.json', { 
            stdio: 'inherit' 
        });

        log('✅ Deployment completed successfully!', 'green');
        
        // Change back to root directory
        process.chdir('..');

        return true;

    } catch (error) {
        log(`❌ Deployment failed: ${error.message}`, 'red');
        process.chdir('..');
        return false;
    }
}

/**
 * Display deployment results
 */
function displayResults() {
    log('📋 Deployment Results:', 'blue');
    log('=====================', 'blue');

    try {
        const fs = require('fs');
        if (fs.existsSync('./deployment-outputs.json')) {
            const outputs = JSON.parse(fs.readFileSync('./deployment-outputs.json', 'utf8'));
            const stackOutputs = outputs.VideoPipelineStack || {};

            log(`🌐 API Endpoint: ${stackOutputs.APIEndpoint || 'Not found'}`, 'green');
            log(`🔑 API Key ID: ${stackOutputs.APIKeyId || 'Not found'}`, 'green');
            log(`📦 S3 Bucket: ${stackOutputs.PrimaryBucketName || 'Not found'}`, 'green');
            log(`⚙️  State Machine: ${stackOutputs.StateMachineArn || 'Not found'}`, 'green');
        }
    } catch (error) {
        log('Could not read deployment outputs', 'yellow');
    }

    log('');
    log('🎯 Next Steps:', 'blue');
    log('1. Get your API Key value:', 'yellow');
    log('   aws apigateway get-api-key --api-key <API_KEY_ID> --include-value', 'yellow');
    log('');
    log('2. Test the deployment:', 'yellow');
    log('   node scripts/upload-first-video.js', 'yellow');
    log('');
    log('🎬 Your automated video pipeline is ready!', 'green');
}

/**
 * Main function
 */
async function main() {
    try {
        log('🎬 Automated Video Pipeline - Cleanup and Deploy', 'blue');
        log('================================================', 'blue');
        log('');

        // Ask for confirmation
        log('⚠️  This will delete ALL existing automated-video-pipeline resources!', 'yellow');
        log('This includes S3 buckets, DynamoDB tables, and CloudFormation stacks.', 'yellow');
        log('');

        // In a real scenario, you'd want user confirmation here
        // For automation, we'll proceed directly

        // Step 1: Cleanup existing resources
        await cleanupExistingResources();

        // Step 2: Deploy new infrastructure
        const deploymentSuccess = await deployNewInfrastructure();

        if (deploymentSuccess) {
            // Step 3: Display results
            displayResults();
        } else {
            log('❌ Deployment failed. Please check the errors above.', 'red');
            process.exit(1);
        }

    } catch (error) {
        log(`❌ Script failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { cleanupExistingResources, deployNewInfrastructure };