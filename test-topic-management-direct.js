#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testTopicManagement() {
    console.log('🧪 Testing Topic Management AI');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-topic-management-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/topics',
                body: JSON.stringify({
                    baseTopic: 'How to make coffee at home',
                    useGoogleSheets: true,
                    targetAudience: 'coffee enthusiasts',
                    projectId: '2025-10-10T20-15-00_how-to-make-coffee-at-home'
                })
            })
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('📥 Status Code:', response.statusCode);
        
        if (response.statusCode === 200) {
            console.log('✅ Topic Management: SUCCESS');
            const body = JSON.parse(response.body);
            console.log('📊 Full Response Body:', JSON.stringify(body, null, 2));
            console.log('📊 Generated Topics:', body.topicContext?.expandedTopics?.length || 0);
            console.log('🎯 Top Subtopic:', body.topicContext?.expandedTopics?.[0]?.subtopic);
        } else {
            console.log('❌ Topic Management: FAILED');
            console.log('📥 Error Response:', JSON.stringify(response, null, 2));
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

testTopicManagement().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});