// Debug the enhanced topic generation
process.env.AWS_REGION = 'us-east-1';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

try {
    console.log('Testing enhanced topic generation...');
    const module = await import('../src/lambda/topic-management/index.js');
    
    const testEvent = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            baseTopic: 'Investing for beginners',
            targetAudience: 'beginners',
            contentType: 'educational',
            videoDuration: 480,
            videoStyle: 'engaging_educational'
        })
    };
    
    console.log('Calling handler...');
    const result = await module.handler(testEvent);
    
    console.log('Result status:', result.statusCode);
    console.log('Result body:', result.body);
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}