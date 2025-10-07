/**
 * Simple test to debug topic management issues
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function testSimpleInvoke() {
    console.log('Testing simple topic management invoke...');
    
    try {
        // Test with minimal payload
        const result = await lambda.invoke({
            FunctionName: 'topic-management',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/topics',
                queryStringParameters: { limit: '5' }
            })
        }).promise();
        
        console.log('Raw result:', result);
        
        if (result.Payload) {
            const response = JSON.parse(result.Payload);
            console.log('Parsed response:', JSON.stringify(response, null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testSimpleInvoke();