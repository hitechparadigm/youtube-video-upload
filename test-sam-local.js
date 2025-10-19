#!/usr/bin/env node

/**
 * SAM Local Testing Script
 * Test Lambda functions locally using SAM CLI
 */

const {
    spawn,
    exec
} = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Check if SAM CLI is installed
 */
function checkSamCli() {
    return new Promise((resolve) => {
        exec('sam --version', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ SAM CLI not found. Please install it first:');
                console.log('pip install aws-sam-cli');
                console.log('or visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html');
                resolve(false);
            } else {
                console.log('✅ SAM CLI found:', stdout.trim());
                resolve(true);
            }
        });
    });
}

/**
 * Build SAM application
 */
function buildSam() {
    return new Promise((resolve, reject) => {
        console.log('🔨 Building SAM application...');

        const build = spawn('sam', ['build', '--template-file', 'template-simplified.yaml'], {
            stdio: 'inherit'
        });

        build.on('close', (code) => {
            if (code === 0) {
                console.log('✅ SAM build completed successfully');
                resolve();
            } else {
                console.log('❌ SAM build failed');
                reject(new Error(`Build failed with code ${code}`));
            }
        });
    });
}

/**
 * Start SAM local API
 */
function startSamLocal() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting SAM local API...');
        console.log('API will be available at: http://localhost:3000');
        console.log('Press Ctrl+C to stop');

        const samLocal = spawn('sam', ['local', 'start-api', '--port', '3000'], {
            stdio: 'inherit'
        });

        samLocal.on('close', (code) => {
            console.log(`SAM local API stopped with code ${code}`);
            resolve();
        });

        samLocal.on('error', (error) => {
            console.log('❌ Failed to start SAM local API:', error.message);
            reject(error);
        });

        // Handle Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping SAM local API...');
            samLocal.kill('SIGINT');
        });
    });
}

/**
 * Test individual Lambda function
 */
function testFunction(functionName, event) {
    return new Promise((resolve, reject) => {
        console.log(`🧪 Testing function: ${functionName}`);

        // Create temporary event file
        const eventFile = `test-event-${functionName}.json`;
        fs.writeFileSync(eventFile, JSON.stringify(event, null, 2));

        const invoke = spawn('sam', ['local', 'invoke', functionName, '--event', eventFile], {
            stdio: 'pipe'
        });

        let output = '';
        let error = '';

        invoke.stdout.on('data', (data) => {
            output += data.toString();
        });

        invoke.stderr.on('data', (data) => {
            error += data.toString();
        });

        invoke.on('close', (code) => {
            // Clean up event file
            fs.unlinkSync(eventFile);

            if (code === 0) {
                console.log('✅ Function test completed');
                console.log('Output:', output);
                resolve(output);
            } else {
                console.log('❌ Function test failed');
                console.log('Error:', error);
                reject(new Error(`Function test failed with code ${code}`));
            }
        });
    });
}

/**
 * Create test events for different functions
 */
const TEST_EVENTS = {
    HealthCheckFunction: {
        httpMethod: 'GET',
        path: '/',
        headers: {
            'x-api-key': 'test-key'
        },
        body: null
    },

    TopicManagementFunction: {
        httpMethod: 'POST',
        path: '/topics',
        headers: {
            'x-api-key': 'test-key',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            topic: 'Local SAM Testing',
            targetAudience: 'developers',
            videoDuration: 300
        })
    },

    ScriptGeneratorFunction: {
        httpMethod: 'GET',
        path: '/scripts/generate',
        headers: {
            'x-api-key': 'test-key'
        },
        body: null
    }
};

/**
 * Run comprehensive local tests
 */
async function runLocalTests() {
    console.log('🧪 SAM Local Testing Suite');
    console.log('==========================');

    // Check SAM CLI
    const samAvailable = await checkSamCli();
    if (!samAvailable) {
        return;
    }

    // Build application
    try {
        await buildSam();
    } catch (error) {
        console.log('❌ Build failed, cannot proceed with testing');
        return;
    }

    console.log('\n🎯 Choose testing mode:');
    console.log('1. Start local API server (interactive)');
    console.log('2. Test individual functions');
    console.log('3. Run quick validation tests');

    const mode = process.argv[2] || '3';

    switch (mode) {
        case '1':
        case 'server':
            await startSamLocal();
            break;

        case '2':
        case 'functions':
            console.log('\n🧪 Testing individual functions...');
            for (const [functionName, event] of Object.entries(TEST_EVENTS)) {
                try {
                    await testFunction(functionName, event);
                    console.log('');
                } catch (error) {
                    console.log(`❌ ${functionName} test failed:`, error.message);
                    console.log('');
                }
            }
            break;

        case '3':
        case 'quick':
        default:
            console.log('\n🚀 Quick validation - testing HealthCheckFunction...');
            try {
                await testFunction('HealthCheckFunction', TEST_EVENTS.HealthCheckFunction);
                console.log('\n✅ Local SAM testing is working!');
                console.log('\n🎯 Next steps:');
                console.log('1. Run "node test-sam-local.js server" to start local API');
                console.log('2. Run "node test-sam-local.js functions" to test all functions');
                console.log('3. Use "sam local start-api" for interactive development');
            } catch (error) {
                console.log('\n❌ Local SAM testing failed:', error.message);
            }
            break;
    }
}

/**
 * Print usage information
 */
function printUsage() {
    console.log('SAM Local Testing Script');
    console.log('');
    console.log('Usage:');
    console.log('  node test-sam-local.js [mode]');
    console.log('');
    console.log('Modes:');
    console.log('  server     Start local API server at http://localhost:3000');
    console.log('  functions  Test individual Lambda functions');
    console.log('  quick      Quick validation test (default)');
    console.log('');
    console.log('Examples:');
    console.log('  node test-sam-local.js server    # Start local API');
    console.log('  node test-sam-local.js functions # Test all functions');
    console.log('  node test-sam-local.js           # Quick test');
    console.log('');
    console.log('Prerequisites:');
    console.log('  - AWS SAM CLI installed');
    console.log('  - Docker installed (for local testing)');
    console.log('  - AWS credentials configured');
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
    } else {
        runLocalTests().catch(error => {
            console.error('❌ Local testing failed:', error);
            process.exit(1);
        });
    }
}

module.exports = {
    checkSamCli,
    buildSam,
    startSamLocal,
    testFunction
};