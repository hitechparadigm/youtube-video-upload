#!/usr/bin/env node

/**
 * 🔧 CLOUDFORMATION STACK RECOVERY SCRIPT
 *
 * Helps recover from UPDATE_ROLLBACK_FAILED state
 */

const {
    exec
} = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const STACK_NAME = 'automated-video-pipeline-prod';
const REGION = 'us-east-1';

async function fixCloudFormationStack() {
    console.log('🔧 CloudFormation Stack Recovery Tool\n');

    try {
        // Step 1: Check current stack status
        console.log('1️⃣ Checking current stack status...');
        const statusResult = await execAsync(`aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].StackStatus' --output text`);
        const currentStatus = statusResult.stdout.trim();
        console.log(`   Current Status: ${currentStatus}`);

        if (currentStatus === 'UPDATE_ROLLBACK_FAILED') {
            console.log('   🚨 Stack is in UPDATE_ROLLBACK_FAILED state - needs recovery');

            // Step 2: Try to continue rollback
            console.log('\n2️⃣ Attempting to continue update rollback...');
            try {
                await execAsync(`aws cloudformation continue-update-rollback --stack-name ${STACK_NAME} --region ${REGION}`);
                console.log('   ✅ Continue rollback initiated successfully');

                // Step 3: Monitor rollback progress
                console.log('\n3️⃣ Monitoring rollback progress...');
                await monitorStackStatus();

            } catch (rollbackError) {
                console.log('   ❌ Continue rollback failed:', rollbackError.message);

                // Step 4: Try cancel update as fallback
                console.log('\n4️⃣ Trying cancel update as fallback...');
                try {
                    await execAsync(`aws cloudformation cancel-update-stack --stack-name ${STACK_NAME} --region ${REGION}`);
                    console.log('   ✅ Cancel update initiated');
                    await monitorStackStatus();
                } catch (cancelError) {
                    console.log('   ❌ Cancel update also failed:', cancelError.message);
                    console.log('\n🆘 Manual intervention required - see AWS Console');
                }
            }

        } else if (currentStatus === 'UPDATE_ROLLBACK_COMPLETE' || currentStatus === 'UPDATE_COMPLETE') {
            console.log('   ✅ Stack is in a good state - ready for deployment');

            // Test the current deployment
            console.log('\n🧪 Testing current deployment...');
            await testCurrentDeployment();

        } else {
            console.log(`   ⚠️ Stack is in ${currentStatus} state`);
            console.log('   Waiting for stack to stabilize...');
            await monitorStackStatus();
        }

    } catch (error) {
        console.error('❌ Stack recovery failed:', error.message);
        console.log('\n🆘 Manual Recovery Steps:');
        console.log('1. Go to AWS CloudFormation Console');
        console.log('2. Find the automated-video-pipeline-prod stack');
        console.log('3. Try "Continue update rollback" or "Delete stack" if needed');
        console.log('4. Redeploy from scratch if necessary');
    }
}

async function monitorStackStatus() {
    console.log('   Monitoring stack status (checking every 30 seconds)...');

    for (let i = 0; i < 20; i++) { // Max 10 minutes
        try {
            const statusResult = await execAsync(`aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].StackStatus' --output text`);
            const status = statusResult.stdout.trim();

            console.log(`   Status: ${status}`);

            if (status.includes('COMPLETE')) {
                console.log('   ✅ Stack operation completed successfully');
                return true;
            } else if (status.includes('FAILED')) {
                console.log('   ❌ Stack operation failed');
                return false;
            }

            // Wait 30 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 30000));

        } catch (error) {
            console.log('   ❌ Error checking status:', error.message);
            return false;
        }
    }

    console.log('   ⏰ Monitoring timeout - check AWS Console for current status');
    return false;
}

async function testCurrentDeployment() {
    try {
        // Simple API test
        const https = require('https');

        const testResult = await new Promise((resolve) => {
            const req = https.request({
                hostname: 'f00upvjiwg.execute-api.us-east-1.amazonaws.com',
                port: 443,
                path: '/prod/topics',
                method: 'GET',
                headers: {
                    'x-api-key': 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk'
                }
            }, (res) => {
                resolve({
                    success: res.statusCode === 200,
                    statusCode: res.statusCode
                });
            });

            req.on('error', () => resolve({
                success: false,
                statusCode: 0
            }));
            req.end();
        });

        if (testResult.success) {
            console.log('   ✅ API Gateway is responding - deployment is working');
        } else {
            console.log(`   ⚠️ API Gateway status: ${testResult.statusCode}`);
        }

    } catch (error) {
        console.log('   ❌ API test failed:', error.message);
    }
}

// Run the recovery
fixCloudFormationStack();
