const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const lambda = new AWS.Lambda();

async function debugMediaCurator() {
    console.log('🔍 Debugging Media Curator response structure...');

    const testPayload = {
        projectId: 'test-peru-travel-' + Date.now(),
        sceneContext: {
            scenes: [{
                id: 'scene1',
                purpose: 'introduction',
                script: 'Welcome to Peru, a land of ancient mysteries and breathtaking landscapes.',
                keywords: ['Peru', 'travel', 'introduction', 'landscape']
            }]
        },
        searchKeywords: ['Peru travel', 'Machu Picchu', 'Andes mountains']
    };

    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v3',
            Payload: JSON.stringify(testPayload)
        }).promise();

        const response = JSON.parse(result.Payload);

        console.log('📋 Full response structure:');
        console.log(JSON.stringify(response, null, 2));

        if (response.body) {
            console.log('\n📄 Response body:');
            const body = JSON.parse(response.body);
            console.log(JSON.stringify(body, null, 2));
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

debugMediaCurator();