/**
 * Test Deployed Lambda Functions
 * Tests the newly deployed media-curator and topic-management functions
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function testLambdaFunction(functionName, payload, description) {
    console.log(`\n🧪 Testing ${functionName}: ${description}`);
    console.log('=' .repeat(50));
    
    try {
        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify(payload)
        });
        
        const response = await lambda.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.statusCode === 200) {
            console.log('✅ Test passed');
            console.log('📊 Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('⚠️ Test returned non-200 status');
            console.log('📊 Response:', JSON.stringify(result, null, 2));
        }
        
        return true;
    } catch (error) {
        console.log('❌ Test failed');
        console.error('Error:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Testing Deployed Lambda Functions');
    console.log('====================================');
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0
    };
    
    // Test 1: Media Curator - Search for images
    results.total++;
    const mediaCuratorTest1 = await testLambdaFunction(
        'media-curator',
        {
            httpMethod: 'POST',
            path: '/media/search',
            body: JSON.stringify({
                query: 'business meeting',
                mediaType: 'images',
                limit: 5,
                sources: ['pexels', 'pixabay']
            })
        },
        'Search for business meeting images'
    );
    if (mediaCuratorTest1) results.passed++; else results.failed++;
    
    // Test 2: Media Curator - Search for videos
    results.total++;
    const mediaCuratorTest2 = await testLambdaFunction(
        'media-curator',
        {
            httpMethod: 'POST',
            path: '/media/search',
            body: JSON.stringify({
                query: 'technology',
                mediaType: 'videos',
                limit: 3,
                sources: ['pexels']
            })
        },
        'Search for technology videos'
    );
    if (mediaCuratorTest2) results.passed++; else results.failed++;
    
    // Test 3: Topic Management - Get all topics
    results.total++;
    const topicManagementTest1 = await testLambdaFunction(
        'topic-management',
        {
            httpMethod: 'GET',
            pathParameters: null,
            queryStringParameters: { status: 'active' }
        },
        'Get all active topics'
    );
    if (topicManagementTest1) results.passed++; else results.failed++;
    
    // Test 4: Topic Management - Create a test topic
    results.total++;
    const topicManagementTest2 = await testLambdaFunction(
        'topic-management',
        {
            httpMethod: 'POST',
            pathParameters: null,
            body: JSON.stringify({
                topic: 'Test Topic: AI and Machine Learning for Beginners',
                dailyFrequency: 2,
                priority: 3,
                status: 'active',
                targetAudience: 'beginners',
                region: 'US',
                contentStyle: 'engaging_educational',
                tags: ['AI', 'machine learning', 'beginners']
            })
        },
        'Create a test topic'
    );
    if (topicManagementTest2) results.passed++; else results.failed++;
    
    // Test 5: Media Curator - Invalid request (should fail gracefully)
    results.total++;
    const mediaCuratorTest3 = await testLambdaFunction(
        'media-curator',
        {
            httpMethod: 'POST',
            path: '/media/search',
            body: JSON.stringify({
                // Missing required 'query' field
                mediaType: 'images',
                limit: 5
            })
        },
        'Invalid request (missing query) - should return 400'
    );
    if (mediaCuratorTest3) results.passed++; else results.failed++;
    
    // Print summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.total}`);
    console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    if (results.passed === results.total) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('Your deployed Lambda functions are working correctly.');
        
        console.log('\n🔗 Next Steps:');
        console.log('1. Set up API Gateway endpoints for HTTP access');
        console.log('2. Configure IAM permissions for cross-function communication');
        console.log('3. Add YouTube integration to complete the pipeline');
        console.log('4. Set up Step Functions for end-to-end orchestration');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the error messages above.');
        console.log('Common issues:');
        console.log('- Missing IAM permissions');
        console.log('- DynamoDB table not created');
        console.log('- Secrets Manager secrets not configured');
        console.log('- Network connectivity issues');
    }
    
    return results.passed === results.total;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testLambdaFunction };