#!/usr/bin/env node

/**
 * Wait for Deployment Script
 * Monitors when the GitHub Actions deployment completes and tests become available
 */

const {
    spawn
} = require('child_process');

/**
 * Check if stack has been updated recently
 */
function checkStackStatus() {
    return new Promise((resolve, reject) => {
        const aws = spawn('aws', [
            '--profile', 'hitechparadigm',
            'cloudformation', 'describe-stacks',
            '--stack-name', 'automated-video-pipeline-prod',
            '--query', 'Stacks[0].{Status:StackStatus,LastUpdated:LastUpdatedTime}',
            '--output', 'json'
        ], {
            stdio: 'pipe'
        });

        let output = '';
        let error = '';

        aws.stdout.on('data', (data) => output += data.toString());
        aws.stderr.on('data', (data) => error += data.toString());

        aws.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(output));
                } catch (e) {
                    reject(new Error('Failed to parse stack status'));
                }
            } else {
                reject(new Error(error || 'Failed to get stack status'));
            }
        });
    });
}

/**
 * Test API endpoints
 */
function testEndpoints() {
    return new Promise((resolve, reject) => {
        const env = Object.create(process.env);
        env.API_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        env.API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

        const test = spawn('node', ['test-all-endpoints.js'], {
            stdio: 'pipe',
            env: env
        });

        let output = '';
        let error = '';

        test.stdout.on('data', (data) => output += data.toString());
        test.stderr.on('data', (data) => error += data.toString());

        test.on('close', (code) => {
            // Parse the success rate from output
            const successMatch = output.match(/Success Rate: (\d+)%/);
            const successRate = successMatch ? parseInt(successMatch[1]) : 0;

            resolve({
                success: successRate > 80,
                successRate: successRate,
                output: output,
                error: error
            });
        });
    });
}

/**
 * Monitor deployment progress
 */
async function monitorDeployment() {
    console.log('🔍 Monitoring Deployment Progress');
    console.log('=================================');
    console.log('');

    let attempts = 0;
    const maxAttempts = 20; // 10 minutes max
    const interval = 30000; // 30 seconds

    console.log('📊 Current Status: Waiting for GitHub Actions deployment to complete...');
    console.log('🔗 Monitor at: https://github.com/hitechparadigm/youtube-video-upload/actions');
    console.log('');

    while (attempts < maxAttempts) {
        attempts++;
        console.log(`\n🔍 Check ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);

        try {
            // Check stack status
            const stackStatus = await checkStackStatus();
            console.log(`   📋 Stack Status: ${stackStatus.Status}`);
            console.log(`   📅 Last Updated: ${new Date(stackStatus.LastUpdated).toLocaleString()}`);

            // If stack is updating, wait
            if (stackStatus.Status.includes('IN_PROGRESS')) {
                console.log('   ⏳ Stack update in progress, waiting...');
            } else if (stackStatus.Status === 'UPDATE_COMPLETE') {
                // Check if update was recent (within last 10 minutes)
                const lastUpdated = new Date(stackStatus.LastUpdated);
                const now = new Date();
                const minutesAgo = (now - lastUpdated) / (1000 * 60);

                if (minutesAgo < 10) {
                    console.log('   🎉 Recent update detected! Testing endpoints...');

                    // Test endpoints
                    const testResult = await testEndpoints();
                    console.log(`   📊 Test Success Rate: ${testResult.successRate}%`);

                    if (testResult.success) {
                        console.log('\n✅ SUCCESS! Deployment fix is working!');
                        console.log('🎉 API Gateway is now responding correctly');
                        console.log('🚀 CI/CD pipeline authentication is fixed');
                        return;
                    } else {
                        console.log('   ⚠️ Tests still failing, may need more time...');
                    }
                } else {
                    console.log(`   📅 Last update was ${Math.round(minutesAgo)} minutes ago`);
                    console.log('   ⏳ Waiting for GitHub Actions to deploy our fix...');
                }
            }

        } catch (error) {
            console.log(`   ❌ Error checking status: ${error.message}`);
        }

        if (attempts < maxAttempts) {
            console.log(`   ⏱️ Waiting ${interval/1000} seconds before next check...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    console.log('\n⏰ Monitoring timeout reached');
    console.log('💡 The deployment may still be in progress');
    console.log('🔗 Check GitHub Actions manually: https://github.com/hitechparadigm/youtube-video-upload/actions');
}

/**
 * Show current status
 */
async function showCurrentStatus() {
    console.log('📊 Current Deployment Status');
    console.log('============================');

    try {
        const stackStatus = await checkStackStatus();
        console.log(`Stack Status: ${stackStatus.Status}`);
        console.log(`Last Updated: ${new Date(stackStatus.LastUpdated).toLocaleString()}`);

        const testResult = await testEndpoints();
        console.log(`API Test Success Rate: ${testResult.successRate}%`);

        if (testResult.success) {
            console.log('✅ API Gateway is working correctly!');
        } else {
            console.log('❌ API Gateway still has issues (expected if deployment not complete)');
        }

    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

// Main execution
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'status') {
        showCurrentStatus();
    } else if (command === 'monitor') {
        monitorDeployment();
    } else {
        console.log('Deployment Monitoring Script');
        console.log('');
        console.log('Usage:');
        console.log('  node wait-for-deployment.js status   # Check current status');
        console.log('  node wait-for-deployment.js monitor  # Monitor until deployment completes');
        console.log('');
        console.log('The fix has been pushed to GitHub and is being deployed.');
        console.log('Current API tests show 403 errors because the old template is still deployed.');
        console.log('Once GitHub Actions completes, the tests should pass.');
    }
}

module.exports = {
    monitorDeployment,
    showCurrentStatus
};