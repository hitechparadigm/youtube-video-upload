// Test if we can import the handler
try {
    console.log('Testing import...');
    const module = await import('../src/lambda/topic-management/index.js');
    console.log('Import successful:', typeof module.handler);
    
    // Test basic call
    const result = await module.handler({
        httpMethod: 'GET',
        path: '/topics'
    });
    
    console.log('Handler call result:', result.statusCode);
} catch (error) {
    console.error('Import/call failed:', error.message);
    console.error('Stack:', error.stack);
}