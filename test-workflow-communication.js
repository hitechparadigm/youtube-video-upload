/**
 * Test script to verify workflow orchestrator can communicate with agents
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function testDirectLambdaCall() {
    console.log('🧪 Testing direct Lambda invocation (current workflow orchestrator method)...');
    
    const payload = {
        httpMethod: 'POST',
        path: '/topics',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            baseTopic: 'Travel to Canada - Direct Lambda Test',
            targetAudience: 'travel enthusiasts',
            projectId: 'direct-lambda-test'
        })
    };

    try {
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        }).promise();

        const response = JSON.parse(result.Payload);
        console.log('✅ Direct Lambda call result:', response);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('🎯 Success! Project ID:', data.projectId);
            return true;
        } else {
            console.log('❌ Failed with status:', response.statusCode);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Direct Lambda call error:', error.message);
        return false;
    }
}

testDirectLambdaCall();