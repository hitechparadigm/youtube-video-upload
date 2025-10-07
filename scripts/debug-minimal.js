// Minimal debug to find the issue
process.env.AWS_REGION = 'us-east-1';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

console.log('Starting minimal debug...');

try {
    const module = await import('../src/lambda/topic-management/index.js');
    console.log('Module imported successfully');
    
    // Test with minimal event
    const result = await module.handler({
        httpMethod: 'GET',
        path: '/topics'
    });
    
    console.log('Handler executed, status:', result.statusCode);
    
} catch (error) {
    console.error('Error occurred:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
}