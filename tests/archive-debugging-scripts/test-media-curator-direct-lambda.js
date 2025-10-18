const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const lambda = new AWS.Lambda();

async function testMediaCuratorDirectLambda() {
    console.log('🧪 Testing Media Curator via direct Lambda invocation...');

    const testPayload = {
        httpMethod: 'POST',
        path: '/media/curate',
        body: JSON.stringify({
            projectId: '2025-10-17T00-26-06_travel-to-peru'
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log('📤 Invoking Media Curator Lambda directly (300s timeout)...');
        const startTime = Date.now();

        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v3',
            Payload: JSON.stringify(testPayload)
        }).promise();

        const duration = Date.now() - startTime;
        console.log(`⏱️ Lambda execution took: ${duration}ms`);

        if (result.FunctionError) {
            console.log('❌ Lambda Function Error:', result.FunctionError);
            const errorPayload = JSON.parse(result.Payload);
            console.log('📄 Error Details:', JSON.stringify(errorPayload, null, 2));
            return false;
        }

        const response = JSON.parse(result.Payload);
        console.log('✅ Lambda Response Status:', response.statusCode);

        if (response.body) {
            const body = JSON.parse(response.body);
            console.log('📄 Response Body:', JSON.stringify(body, null, 2));

            if (body.success) {
                console.log('🎉 Media Curator working successfully!');
                if (body.downloadStats) {
                    console.log('📊 Download Stats:', body.downloadStats);
                }
                return true;
            } else {
                console.log('⚠️ Media Curator returned error:', body.error);
                return false;
            }
        }

    } catch (error) {
        console.error('❌ Lambda invocation failed:', error.message);
        return false;
    }
}

testMediaCuratorDirectLambda().then(success => {
    if (success) {
        console.log('\n🎉 Media Curator is working via direct Lambda invocation!');
    } else {
        console.log('\n❌ Media Curator still has issues even with direct invocation.');
    }
});