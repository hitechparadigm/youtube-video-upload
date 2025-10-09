#!/usr/bin/env node

/**
 * Test Topic Management Agent Specifically
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function invokeLambda(functionName, payload) {
    try {
        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        });
        
        const response = await lambdaClient.send(command);
        
        let result = null;
        if (response.Payload) {
            const payloadString = new TextDecoder().decode(response.Payload);
            result = JSON.parse(payloadString);
        }
        
        return result;
        
    } catch (error) {
        throw new Error(`Lambda invocation failed: ${error.message}`);
    }
}

async function testTopicManagement() {
    console.log('🧪 Testing Topic Management Agent');
    console.log('=' .repeat(50));

    try {
        // Test health endpoint
        console.log('\n📋 Step 1: Testing health endpoint...');
        const healthResult = await invokeLambda('automated-video-pipeline-topic-management-v2', {
            httpMethod: 'GET',
            path: '/health'
        });

        if (healthResult.statusCode === 200) {
            console.log('   ✅ Health check: OK');
            const healthData = JSON.parse(healthResult.body);
            console.log(`   📊 Service: ${healthData.service}`);
            console.log(`   📅 Version: ${healthData.version}`);
        } else {
            console.log('   ❌ Health check failed:', healthResult);
            return false;
        }

        // Test available endpoints
        console.log('\n📋 Step 2: Testing available endpoints...');
        
        // Try different endpoint paths that might exist
        const endpointsToTest = [
            '/topics',
            '/topics/generate',
            '/topics/generate-from-basic',
            '/topics/expand',
            '/topics/list'
        ];

        for (const endpoint of endpointsToTest) {
            try {
                console.log(`   🔍 Testing endpoint: ${endpoint}`);
                const result = await invokeLambda('automated-video-pipeline-topic-management-v2', {
                    httpMethod: 'GET',
                    path: endpoint
                });
                
                if (result.statusCode === 200) {
                    console.log(`   ✅ ${endpoint}: Available`);
                } else if (result.statusCode === 404) {
                    console.log(`   ⚠️ ${endpoint}: Not found`);
                } else if (result.statusCode === 400) {
                    console.log(`   ⚠️ ${endpoint}: Bad request (may need parameters)`);
                } else {
                    console.log(`   ❌ ${endpoint}: Error ${result.statusCode}`);
                }
            } catch (error) {
                console.log(`   ❌ ${endpoint}: Exception - ${error.message}`);
            }
        }

        // Test with a simple POST request (basic topic creation)
        console.log('\n📋 Step 3: Testing basic topic creation...');
        try {
            const topicResult = await invokeLambda('automated-video-pipeline-topic-management-v2', {
                httpMethod: 'POST',
                path: '/topics',
                body: JSON.stringify({
                    topic: 'Technology trends for beginners',
                    targetAudience: 'general',
                    dailyFrequency: 1,
                    priority: 5
                })
            });

            if (topicResult.statusCode === 201) {
                console.log('   ✅ Basic topic creation: Working');
                const topicData = JSON.parse(topicResult.body);
                console.log(`   📊 Created topic ID: ${topicData.topicId}`);
            } else {
                console.log('   ❌ Basic topic creation failed:', topicResult.statusCode);
                if (topicResult.body) {
                    const errorData = JSON.parse(topicResult.body);
                    console.log('   📋 Error details:', errorData);
                }
            }
        } catch (error) {
            console.log('   ❌ Basic topic creation exception:', error.message);
        }

        // Test enhanced topic generation
        console.log('\n📋 Step 4: Testing enhanced topic generation...');
        try {
            const testProjectId = `test-enhanced-${Date.now()}`;
            const enhancedResult = await invokeLambda('automated-video-pipeline-topic-management-v2', {
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: testProjectId,
                    baseTopic: 'Technology trends',
                    targetAudience: 'general',
                    videoLength: 300
                })
            });

            if (enhancedResult.statusCode === 200) {
                console.log('   ✅ Enhanced topic generation: Working');
                const enhancedData = JSON.parse(enhancedResult.body);
                console.log(`   📊 Generated topics: ${enhancedData.expandedTopics?.length || 0}`);
                console.log(`   📊 Project ID: ${enhancedData.projectId || 'N/A'}`);
                return true;
            } else {
                console.log('   ❌ Enhanced topic generation failed:', enhancedResult.statusCode);
                if (enhancedResult.body) {
                    const errorData = JSON.parse(enhancedResult.body);
                    console.log('   📋 Error details:', errorData);
                }
                return false;
            }
        } catch (error) {
            console.log('   ❌ Enhanced topic generation exception:', error.message);
            return false;
        }

    } catch (error) {
        console.error('\n❌ Topic Management test failed:', error.message);
        return false;
    }
}

// Run the test
testTopicManagement()
    .then(success => {
        console.log('\n📊 TOPIC MANAGEMENT TEST RESULT:', success ? 'PASS' : 'FAIL');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });