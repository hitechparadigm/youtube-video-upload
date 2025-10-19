#!/usr/bin/env node

/**
 * Setup script for Travel to Spain E2E Test
 * Helps configure the test with the correct API URL and API Key
 */

const {
    execSync
} = require('child_process');
const fs = require('fs');

class TestSetup {
    constructor() {
        this.environment = process.argv[2] || 'dev';
        this.stackName = `automated-video-pipeline-${this.environment}`;
    }

    async getStackOutputs() {
        try {
            console.log(`🔍 Getting outputs from stack: ${this.stackName}`);

            const command = `aws cloudformation describe-stacks --stack-name ${this.stackName} --query "Stacks[0].Outputs" --output json`;
            const result = execSync(command, {
                encoding: 'utf8'
            });
            const outputs = JSON.parse(result);

            const apiUrlOutput = outputs.find(o => o.OutputKey === 'ApiUrl');
            const apiKeyOutput = outputs.find(o => o.OutputKey === 'ApiKey');
            const apiUrl = apiUrlOutput ? apiUrlOutput.OutputValue : null;
            const apiKey = apiKeyOutput ? apiKeyOutput.OutputValue : null;

            if (!apiUrl || !apiKey) {
                throw new Error('Could not find ApiUrl or ApiKey in stack outputs');
            }

            return {
                apiUrl,
                apiKey
            };
        } catch (error) {
            console.error('❌ Error getting stack outputs:', error.message);
            console.log('\n💡 Make sure:');
            console.log('   1. AWS CLI is configured (aws configure)');
            console.log('   2. Stack is deployed (sam deploy --config-env dev)');
            console.log('   3. You have permissions to describe CloudFormation stacks');
            return null;
        }
    }

    createTestScript(apiUrl, apiKey) {
        const testScript = `#!/usr/bin/env node

// Auto-generated test configuration for Travel to Spain E2E Test
// Generated on: ${new Date().toISOString()}
// Environment: ${this.environment}
// Stack: ${this.stackName}

process.env.API_URL = '${apiUrl}';
process.env.API_KEY = '${apiKey}';

console.log('🌐 API URL:', process.env.API_URL);
console.log('🔑 API Key:', process.env.API_KEY ? '***' + process.env.API_KEY.slice(-4) : 'Not set');
console.log('');

// Import and run the main test
const TravelSpainE2ETest = require('./test-travel-spain-e2e.js');
const test = new TravelSpainE2ETest();

test.runCompleteTest()
    .then(results => {
        process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
`;

        fs.writeFileSync('run-travel-spain-test.js', testScript);
        console.log('✅ Created run-travel-spain-test.js');
        return 'run-travel-spain-test.js';
    }

    createManualSetupInstructions() {
        const instructions = `# Manual Setup Instructions for Travel to Spain E2E Test

## Step 1: Get your API URL and API Key

Run these AWS CLI commands to get your deployed stack information:

\`\`\`bash
# Get API URL
aws cloudformation describe-stacks \\
  --stack-name ${this.stackName} \\
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \\
  --output text

# Get API Key  
aws cloudformation describe-stacks \\
  --stack-name ${this.stackName} \\
  --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" \\
  --output text
\`\`\`

## Step 2: Set environment variables and run test

\`\`\`bash
# Set your API URL and Key (replace with actual values)
export API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
export API_KEY="your-actual-api-key"

# Run the Travel to Spain E2E test
node test-travel-spain-e2e.js
\`\`\`

## Alternative: Direct test with inline values

Edit the test-travel-spain-e2e.js file and replace these lines:

\`\`\`javascript
this.baseUrl = process.env.API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = process.env.API_KEY || 'your-api-key';
\`\`\`

With your actual values:

\`\`\`javascript
this.baseUrl = 'https://YOUR-ACTUAL-API-ID.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = 'YOUR-ACTUAL-API-KEY';
\`\`\`

## Expected Test Flow

The test will execute these 7 steps for "Travel to Spain":

1. ✅ **Topic Management** - Create topic entry
2. ✅ **Script Generation** - Generate travel script  
3. ✅ **Audio Generation** - Convert script to speech
4. ✅ **Media Curation** - Find Spain travel images
5. ✅ **Video Assembly** - Combine audio + images
6. ✅ **Manifest Builder** - Create video manifest
7. ✅ **YouTube Publishing** - Test publish (test mode)

## Troubleshooting

- **403 Forbidden**: Check your API Key is correct
- **404 Not Found**: Verify API URL and endpoints are deployed
- **500 Internal Error**: Check CloudWatch logs for Lambda function errors
- **Timeout**: Some steps (video assembly) may take longer

## Stack Information

- **Environment**: ${this.environment}
- **Stack Name**: ${this.stackName}
- **Region**: us-east-1
`;

        fs.writeFileSync('TRAVEL_SPAIN_TEST_SETUP.md', instructions);
        console.log('✅ Created TRAVEL_SPAIN_TEST_SETUP.md');
        return 'TRAVEL_SPAIN_TEST_SETUP.md';
    }

    async run() {
        console.log('🚀 Setting up Travel to Spain E2E Test');
        console.log('='.repeat(50));
        console.log(`📦 Environment: ${this.environment}`);
        console.log(`🏗️  Stack Name: ${this.stackName}`);
        console.log('');

        const outputs = await this.getStackOutputs();

        if (outputs) {
            console.log('✅ Successfully retrieved stack outputs');
            console.log(`🌐 API URL: ${outputs.apiUrl}`);
            console.log(`🔑 API Key: ***${outputs.apiKey.slice(-4)}`);
            console.log('');

            const testScript = this.createTestScript(outputs.apiUrl, outputs.apiKey);

            console.log('🎯 Ready to test! Run:');
            console.log(`   node ${testScript}`);
        } else {
            console.log('⚠️  Could not auto-configure. Creating manual setup instructions...');
            const instructionsFile = this.createManualSetupInstructions();

            console.log('📋 Manual setup instructions created:');
            console.log(`   cat ${instructionsFile}`);
        }

        console.log('');
        console.log('🎬 Test Topic: Travel to Spain');
        console.log('📊 Expected: 7-step end-to-end pipeline validation');
        console.log('='.repeat(50));
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new TestSetup();
    setup.run().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

module.exports = TestSetup;