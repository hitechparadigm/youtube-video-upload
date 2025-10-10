#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testScriptGenerator() {
    console.log('🧪 Testing Script Generator Function - Detailed');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-script-generator-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/scripts/generate',
                body: JSON.stringify({
                    projectId: '2025-10-10T19-28-51_how-to-make-coffee-at-home',
                    topic: 'How to make coffee at home',
                    title: 'How to make coffee at home - Complete Guide',
                    targetLength: 300,
                    videoStyle: 'engaging_educational'
                })
            })
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('📥 Full Response:', JSON.stringify(response, null, 2));
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log('📋 Response Body:', JSON.stringify(body, null, 2));
        } else if (response.errorMessage) {
            console.log('❌ Error Message:', response.errorMessage);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

testScriptGenerator().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});