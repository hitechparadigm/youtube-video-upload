#!/usr/bin/env node

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testPipelineFixed() {
    console.log('🧪 Testing Fixed Pipeline with AI Agents');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/start',
                body: JSON.stringify({
                    baseTopic: 'How to make coffee at home',
                    targetAudience: 'coffee enthusiasts',
                    contentType: 'educational',
                    videoDuration: 480,
                    videoStyle: 'engaging_educational'
                })
            })
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('📥 Status Code:', response.statusCode);
        
        if (response.statusCode === 200) {
            console.log('✅ Pipeline: SUCCESS');
            const body = JSON.parse(response.body);
            console.log('📥 Full Response:', JSON.stringify(body, null, 2));
            console.log('📊 Project ID:', body.result?.projectId);
            console.log('📊 Working Agents:', body.result?.result?.workingAgents || 0, '/ 6');
            console.log('📊 Overall Success:', body.result?.result?.success);
            
            // Show step results
            if (body.result?.result?.steps) {
                console.log('\n🔍 Agent Results:');
                body.result.result.steps.forEach(step => {
                    const status = step.success ? '✅' : '❌';
                    console.log(`   ${status} ${step.agent}: ${step.success ? 'SUCCESS' : 'FAILED'}`);
                });
            }
        } else {
            console.log('❌ Pipeline: FAILED');
            console.log('📥 Error Response:', JSON.stringify(response, null, 2));
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

testPipelineFixed().then(() => {
    console.log('✨ Test completed');
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});