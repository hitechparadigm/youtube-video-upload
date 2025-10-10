#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testAudioGenerator() {
    console.log('🧪 Testing Audio Generator Function - Detailed');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-audio-generator-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/audio/generate',
                body: JSON.stringify({
                    projectId: 'project-1760124074469-yzquffqdu',
                    text: 'Welcome to our guide on How to make coffee at home. This comprehensive tutorial will walk you through everything you need to know.',
                    voiceId: 'Joanna'
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

testAudioGenerator().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});