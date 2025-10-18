// Test Media Curator locally with proper event structure
const mediaCurator = require('./src/lambda/media-curator/index.js');

async function testLocalMediaCurator() {
    console.log('🧪 Testing Media Curator locally...');

    const event = {
        httpMethod: 'POST',
        path: '/media/curate',
        body: JSON.stringify({
            projectId: '2025-10-17T00-26-06_travel-to-peru'
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const context = {
        awsRequestId: 'test-request-id',
        functionName: 'test-media-curator'
    };

    try {
        const result = await mediaCurator.handler(event, context);
        console.log('✅ Local test result:');
        console.log(JSON.stringify(result, null, 2));

        if (result.body) {
            const body = JSON.parse(result.body);
            console.log('\n📄 Response body:');
            console.log(JSON.stringify(body, null, 2));
        }

    } catch (error) {
        console.error('❌ Local test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testLocalMediaCurator();