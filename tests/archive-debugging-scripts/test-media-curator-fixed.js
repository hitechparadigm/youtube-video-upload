const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const lambda = new AWS.Lambda();

async function testMediaCurator() {
    console.log('🧪 Testing Media Curator after syntax fixes...');

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

        if (response.errorType) {
            console.error('❌ Media Curator Error:', response.errorMessage);
            console.error('Stack trace:', response.trace);
            return false;
        }

        console.log('✅ Media Curator working! Response keys:', Object.keys(response));
        console.log('📊 Media context created with', (response.sceneMediaMapping && response.sceneMediaMapping.length) || 0, 'scene mappings');
        return true;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

testMediaCurator().then(success => {
    if (success) {
        console.log('🎉 Media Curator is now working! Ready to test complete Peru pipeline.');
    } else {
        console.log('❌ Media Curator still has issues.');
    }
});