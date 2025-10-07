/**
 * Test topic creation specifically
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function testTopicCreation() {
    console.log('Testing topic creation...');
    
    try {
        const payload = {
            httpMethod: 'POST',
            path: '/topics',
            body: JSON.stringify({
                topic: 'Integration Test - Future of Renewable Energy',
                dailyFrequency: 1,
                priority: 5,
                status: 'active',
                targetAudience: 'environmental enthusiasts',
                region: 'US',
                contentStyle: 'engaging_educational',
                tags: ['renewable', 'energy', 'sustainability']
            })
        };
        
        console.log('Sending payload:', JSON.stringify(payload, null, 2));
        
        const result = await lambda.invoke({
            FunctionName: 'topic-management',
            Payload: JSON.stringify(payload)
        }).promise();
        
        console.log('Raw result:', result);
        
        if (result.Payload) {
            const response = JSON.parse(result.Payload);
            console.log('Response status:', response.statusCode);
            console.log('Response body:', JSON.parse(response.body));
            
            if (response.statusCode === 201) {
                const topic = JSON.parse(response.body);
                console.log('✅ Topic created successfully!');
                console.log('Topic ID:', topic.topicId);
                return topic.topicId;
            } else {
                console.log('❌ Failed to create topic');
                return null;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

testTopicCreation();