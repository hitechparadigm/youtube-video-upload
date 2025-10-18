const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const lambda = new AWS.Lambda();

async function testMinimalMediaCurator() {
    console.log('🧪 Testing Media Curator with minimal payload...');

    // Create a minimal test payload that should work
    const testPayload = {
        httpMethod: 'POST',
        path: '/media/curate',
        body: JSON.stringify({
            projectId: '2025-10-17T00-26-06_travel-to-peru',
            // Add minimal required fields
            searchKeywords: ['Peru', 'travel', 'mountains'],
            sceneContext: {
                scenes: [{
                    id: 'scene1',
                    purpose: 'introduction',
                    script: 'Welcome to Peru',
                    keywords: ['Peru', 'travel']
                }]
            }
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log('📤 Invoking Media Curator with payload...');
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v3',
            Payload: JSON.stringify(testPayload)
        }).promise();

        const response = JSON.parse(result.Payload);

        console.log('📋 Response Status Code:', response.statusCode);
        console.log('📋 Response Headers:', response.headers);

        if (response.body) {
            const body = JSON.parse(response.body);
            console.log('📄 Response Body:', JSON.stringify(body, null, 2));

            if (body.error) {
                console.log('❌ Error Type:', body.error.type);
                console.log('❌ Error Message:', body.error.message);
                if (body.error.details) {
                    console.log('📝 Error Details:', JSON.stringify(body.error.details, null, 2));
                }
            }
        }

        return response;

    } catch (error) {
        console.error('❌ Lambda invocation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

testMinimalMediaCurator().then(result => {
    console.log('\n🎯 Test completed');
});