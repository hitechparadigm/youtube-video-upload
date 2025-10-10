#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testScriptSimplified() {
    console.log('🧪 Testing Simplified Script Generator');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-script-generator-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/scripts/generate',
                body: JSON.stringify({
                    projectId: '2025-10-10T19-55-32_how-to-make-coffee-at-home',
                    scriptOptions: {
                        targetLength: 300,
                        videoStyle: 'engaging_educational',
                        targetAudience: 'coffee enthusiasts'
                    }
                })
            })
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('📥 Full Response:', JSON.stringify(response, null, 2));
        
        return response;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

testScriptSimplified().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});