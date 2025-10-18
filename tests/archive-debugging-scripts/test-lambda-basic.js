const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const lambda = new AWS.Lambda();

async function testBasicLambda() {
    console.log('🧪 Testing basic Lambda invocation...');

    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v3',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/health'
            })
        }).promise();

        console.log('📋 Raw result:', result);

        if (result.Payload) {
            try {
                const response = JSON.parse(result.Payload);
                console.log('📄 Parsed response:', JSON.stringify(response, null, 2));
            } catch (e) {
                console.log('❌ Failed to parse payload:', result.Payload);
            }
        } else {
            console.log('❌ No payload in response');
        }

    } catch (error) {
        console.error('❌ Lambda invocation failed:', error);
    }
}

testBasicLambda();