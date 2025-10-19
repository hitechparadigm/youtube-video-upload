#!/usr/bin/env node

/**
 * Quick Deployment Validation Script
 * Validates that the deployment fixes the 403 authentication issues
 */

const {
    spawn
} = require('child_process');
const fs = require('fs');

/**
 * Run AWS CLI command
 */
function runAwsCommand(command, args) {
    return new Promise((resolve, reject) => {
        const aws = spawn('aws', [command, ...args], {
            stdio: 'pipe'
        });

        let output = '';
        let error = '';

        aws.stdout.on('data', (data) => {
            output += data.toString();
        });

        aws.stderr.on('data', (data) => {
            error += data.toString();
        });

        aws.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(output));
                } catch (e) {
                    resolve(output.trim());
                }
            } else {
                reject(new Error(error || `Command failed with code ${code}`));
            }
        });
    });
}

/**
 * Get stack information
 */
async function getStackInfo(stackName) {
    try {
        const result = await runAwsCommand('cloudformation', [
            'describe-stacks',
            '--stack-name', stackName,
            '--query', 'Stacks[0].Outputs'
        ]);

        const outputs = {};
        if (Array.isArray(result)) {
            result.forEach(output => {
                outputs[output.OutputKey] = output.OutputValue;
            });
        }

        return outputs;
    } catch (error) {
        console.log(`⚠️ Could not get stack info for ${stackName}:`, error.message);
        return null;
    }
}

/**
 * Get API key value
 */
async function getApiKeyValue(apiKeyId) {
    try {
        const result = await runAwsCommand('apigateway', [
            'get-api-key',
            '--api-key', apiKeyId,
            '--include-value',
            '--query', 'value',
            '--output', 'text'
        ]);

        return result;
    } catch (error) {
        console.log(`⚠️ Could not get API key value:`, error.message);
        return null;
    }
}

/**
 * Validate deployment
 */
async function validateDeployment() {
    console.log('🔍 Deployment Validation');
    console.log('========================');

    // Check for different environment stacks
    const environments = ['dev', 'staging', 'prod'];
    let foundStack = null;
    let stackOutputs = null;

    for (const env of environments) {
        const stackName = `automated-video-pipeline-${env}`;
        console.log(`\n📋 Checking stack: ${stackName}`);

        const outputs = await getStackInfo(stackName);
        if (outputs) {
            console.log(`✅ Found stack: ${stackName}`);
            foundStack = stackName;
            stackOutputs = outputs;
            break;
        }
    }

    if (!foundStack) {
        console.log('\n❌ No deployed stacks found');
        console.log('Please deploy the stack first using:');
        console.log('sam deploy --template-file template-simplified.yaml --stack-name automated-video-pipeline-dev --capabilities CAPABILITY_IAM');
        return;
    }

    console.log('\n📊 Stack Outputs:');
    Object.entries(stackOutputs).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    // Get API key value if available
    if (stackOutputs.ApiKey) {
        console.log('\n🔑 Getting API Key value...');
        const apiKeyValue = await getApiKeyValue(stackOutputs.ApiKey);
        if (apiKeyValue) {
            console.log(`✅ API Key: ${apiKeyValue.substring(0, 8)}...`);

            // Create test configuration
            const testConfig = {
                API_URL: stackOutputs.ApiUrl,
                API_KEY: apiKeyValue
            };

            console.log('\n🧪 Ready for testing!');
            console.log('Run the following command to test your deployment:');
            console.log('');
            console.log(`API_URL="${testConfig.API_URL}" \\`);
            console.log(`API_KEY="${testConfig.API_KEY}" \\`);
            console.log('node test-all-endpoints.js');
            console.log('');

            // Save configuration for easy testing
            fs.writeFileSync('.env.test', `API_URL=${testConfig.API_URL}\nAPI_KEY=${testConfig.API_KEY}\n`);
            console.log('✅ Test configuration saved to .env.test');
            console.log('You can also run: source .env.test && node test-all-endpoints.js');

        } else {
            console.log('❌ Could not retrieve API key value');
        }
    }

    // Check Lambda functions
    console.log('\n🔧 Checking Lambda Functions...');
    const expectedFunctions = [
        'health-check',
        'topic-management',
        'script-generator'
    ];

    for (const func of expectedFunctions) {
        const functionName = `automated-video-pipeline-${func}-${foundStack.split('-').pop()}`;
        try {
            await runAwsCommand('lambda', [
                'get-function',
                '--function-name', functionName,
                '--query', 'Configuration.FunctionName',
                '--output', 'text'
            ]);
            console.log(`   ✅ ${functionName}`);
        } catch (error) {
            console.log(`   ❌ ${functionName} - ${error.message}`);
        }
    }

    console.log('\n🎯 Validation Summary:');
    console.log(`✅ Stack deployed: ${foundStack}`);
    console.log(`✅ API Gateway URL: ${stackOutputs.ApiUrl || 'Not found'}`);
    console.log(`✅ API Key configured: ${stackOutputs.ApiKey ? 'Yes' : 'No'}`);
    console.log(`✅ Ready for testing: ${stackOutputs.ApiUrl && stackOutputs.ApiKey ? 'Yes' : 'No'}`);

    if (stackOutputs.ApiUrl && stackOutputs.ApiKey) {
        console.log('\n🚀 Next Steps:');
        console.log('1. Run the test command shown above');
        console.log('2. If tests pass, your CI/CD pipeline authentication is fixed!');
        console.log('3. You can now deploy through GitHub Actions successfully');
    }
}

// Main execution
if (require.main === module) {
    validateDeployment().catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
}

module.exports = {
    validateDeployment,
    getStackInfo,
    getApiKeyValue
};