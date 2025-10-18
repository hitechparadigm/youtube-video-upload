/**
 * Test Audio Generator directly via Lambda invocation
 * This bypasses API Gateway to get more detailed error information
 */

const {
    LambdaClient,
    InvokeCommand
} = require('@aws-sdk/client-lambda');

async function testAudioGeneratorDirect() {
    console.log('🔍 TESTING AUDIO GENERATOR DIRECTLY');
    console.log('===================================');
    console.log('🎯 Bypassing API Gateway to get detailed error information');
    console.log('');

    const lambdaClient = new LambdaClient({
        region: 'us-east-1'
    });

    const testPayload = {
        httpMethod: 'GET',
        path: '/health',
        headers: {},
        body: null
    };

    try {
        console.log('📋 Testing Audio Generator health check...');

        const command = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-audio-generator-v3',
            Payload: JSON.stringify(testPayload)
        });

        const response = await lambdaClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.Payload));

        console.log('📊 Direct Lambda Response:');
        console.log('Status Code:', response.StatusCode);
        console.log('Function Error:', response.FunctionError || 'None');
        console.log('');
        console.log('Response Body:');
        console.log(JSON.stringify(result, null, 2));

        if (response.FunctionError) {
            console.log('');
            console.log('❌ LAMBDA FUNCTION ERROR DETECTED');
            console.log('This indicates a runtime issue in the Lambda function itself');

            if (result.errorType) {
                console.log(`Error Type: ${result.errorType}`);
            }
            if (result.errorMessage) {
                console.log(`Error Message: ${result.errorMessage}`);
            }
            if (result.trace) {
                console.log('Stack Trace:');
                result.trace.forEach(line => console.log(`  ${line}`));
            }
        } else {
            console.log('');
            console.log('✅ LAMBDA FUNCTION EXECUTED SUCCESSFULLY');
            console.log('The runtime error is likely in the business logic, not imports');
        }

    } catch (error) {
        console.error('❌ Failed to invoke Lambda directly:', error.message);

        if (error.name === 'UnauthorizedOperation' || error.message.includes('credentials')) {
            console.log('💡 This is a credentials issue - the Lambda function itself may be working');
        }
    }
}

// Also test with actual audio generation request
async function testAudioGenerationDirect() {
    console.log('');
    console.log('🎵 TESTING AUDIO GENERATION DIRECTLY');
    console.log('====================================');

    const lambdaClient = new LambdaClient({
        region: 'us-east-1'
    });

    const testPayload = {
        httpMethod: 'POST',
        path: '/audio/generate',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            projectId: '2025-10-17T00-26-06_travel-to-peru'
        })
    };

    try {
        console.log('📋 Testing actual audio generation...');

        const command = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-audio-generator-v3',
            Payload: JSON.stringify(testPayload)
        });

        const response = await lambdaClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.Payload));

        console.log('📊 Audio Generation Response:');
        console.log('Status Code:', response.StatusCode);
        console.log('Function Error:', response.FunctionError || 'None');
        console.log('');

        if (response.FunctionError) {
            console.log('❌ AUDIO GENERATION FAILED');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('✅ AUDIO GENERATION RESPONSE RECEIVED');
            console.log('Response Body:');
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error('❌ Failed to test audio generation:', error.message);
    }
}

if (require.main === module) {
    testAudioGeneratorDirect()
        .then(() => testAudioGenerationDirect())
        .then(() => {
            console.log('');
            console.log('🎯 NEXT STEPS:');
            console.log('==============');
            console.log('1. If Lambda function errors are shown, fix the specific runtime issue');
            console.log('2. If credentials errors, the function may be working but we cannot test directly');
            console.log('3. Check CloudWatch logs for more detailed error information');
        })
        .catch(error => {
            console.error('❌ Direct testing failed:', error.message);
        });
}

module.exports = {
    testAudioGeneratorDirect
};