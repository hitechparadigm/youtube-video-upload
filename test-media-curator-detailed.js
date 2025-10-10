#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testMediaCurator() {
    console.log('🧪 Testing Media Curator Function - Detailed');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/media/curate',
                body: JSON.stringify({
                    projectId: 'project-1760124074469-yzquffqdu',
                    baseTopic: 'How to make coffee at home',
                    sceneCount: 6,
                    quality: '1080p'
                })
            })
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('📥 Full Response:', JSON.stringify(response, null, 2));
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log('📋 Response Body:', JSON.stringify(body, null, 2));
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

testMediaCurator().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});