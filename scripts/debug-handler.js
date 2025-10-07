// Debug the handler step by step
process.env.AWS_REGION = 'us-east-1';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

const module = await import('../src/lambda/topic-management/index.js');

console.log('1. Module imported successfully');

const testEvent = {
    httpMethod: 'POST',
    path: '/topics/enhanced',
    body: JSON.stringify({
        baseTopic: 'Test topic'
    })
};

console.log('2. Test event created');

try {
    console.log('3. About to call handler...');
    
    // Add a timeout to see if it hangs
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Handler timeout')), 5000)
    );
    
    const handlerPromise = module.handler(testEvent);
    
    const result = await Promise.race([handlerPromise, timeoutPromise]);
    
    console.log('4. Handler completed');
    console.log('Status:', result.statusCode);
    console.log('Body:', result.body);
    
} catch (error) {
    console.log('5. Handler failed');
    console.error('Error:', error.message);
}