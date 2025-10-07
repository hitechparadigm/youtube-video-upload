/**
 * Test actual pipeline integration to identify specific issues
 */

const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function testMediaCurator() {
    console.log('\n=== Testing Media Curator ===');
    
    try {
        const payload = {
            httpMethod: 'POST',
            path: '/media/search',
            body: JSON.stringify({
                query: 'technology',
                mediaType: 'images',
                limit: 5
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'media-curator',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log('✅ Media Curator Response:', response.statusCode);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log(`   Found ${body.media?.length || 0} media items`);
            console.log(`   Sources: ${body.sources?.join(', ') || 'none'}`);
        } else {
            console.log('❌ Error:', JSON.parse(response.body));
        }
        
        return response.statusCode === 200;
        
    } catch (error) {
        console.log('❌ Media Curator Error:', error.message);
        return false;
    }
}

async function testTopicManagement() {
    console.log('\n=== Testing Topic Management ===');
    
    try {
        // Test creating a topic
        const createPayload = {
            httpMethod: 'POST',
            path: '/topics',
            body: JSON.stringify({
                topic: 'Test Integration Topic - AI and Technology Trends',
                dailyFrequency: 1,
                priority: 5,
                status: 'active',
                targetAudience: 'tech enthusiasts',
                region: 'US',
                contentStyle: 'engaging_educational'
            })
        };
        
        const createResult = await lambda.invoke({
            FunctionName: 'topic-management',
            Payload: JSON.stringify(createPayload)
        }).promise();
        
        const createResponse = JSON.parse(createResult.Payload);
        console.log('✅ Topic Creation Response:', createResponse.statusCode);
        
        if (createResponse.statusCode === 201) {
            const body = JSON.parse(createResponse.body);
            console.log(`   Created topic: ${body.topicId}`);
            return body.topicId;
        } else {
            console.log('❌ Error:', JSON.parse(createResponse.body));
            return null;
        }
        
    } catch (error) {
        console.log('❌ Topic Management Error:', error.message);
        return null;
    }
}

async function testCrossServiceCommunication(topicId) {
    console.log('\n=== Testing Cross-Service Communication ===');
    
    if (!topicId) {
        console.log('❌ No topic ID available for cross-service test');
        return false;
    }
    
    try {
        // Test if media-curator can access topic data
        const payload = {
            httpMethod: 'POST',
            path: '/media/search',
            body: JSON.stringify({
                query: 'technology startup',
                mediaType: 'both',
                limit: 3,
                topicId: topicId  // Pass topic context
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'media-curator',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log('✅ Cross-service call response:', response.statusCode);
        
        return response.statusCode === 200;
        
    } catch (error) {
        console.log('❌ Cross-service Error:', error.message);
        return false;
    }
}

async function checkIAMPermissions() {
    console.log('\n=== Checking IAM Permissions ===');
    
    const iam = new AWS.IAM();
    
    try {
        // Get media-curator role
        const mediaCuratorRole = 'TopicManagementStack-AITopicGeneratorLambdaRole80E9-Zbr1zNMgbH84';
        
        const policies = await iam.listAttachedRolePolicies({
            RoleName: mediaCuratorRole
        }).promise();
        
        console.log('Media Curator attached policies:');
        policies.AttachedPolicies.forEach(policy => {
            console.log(`  - ${policy.PolicyName}`);
        });
        
        // Check inline policies
        const inlinePolicies = await iam.listRolePolicies({
            RoleName: mediaCuratorRole
        }).promise();
        
        console.log('Media Curator inline policies:');
        inlinePolicies.PolicyNames.forEach(policyName => {
            console.log(`  - ${policyName}`);
        });
        
    } catch (error) {
        console.log('❌ IAM Check Error:', error.message);
    }
}

async function main() {
    console.log('🚀 Testing Automated Video Pipeline Integration\n');
    
    // Test individual services
    const mediaCuratorWorking = await testMediaCurator();
    const topicId = await testTopicManagement();
    
    // Test cross-service communication
    const crossServiceWorking = await testCrossServiceCommunication(topicId);
    
    // Check permissions
    await checkIAMPermissions();
    
    // Summary
    console.log('\n=== Integration Test Summary ===');
    console.log(`Media Curator: ${mediaCuratorWorking ? '✅ Working' : '❌ Issues'}`);
    console.log(`Topic Management: ${topicId ? '✅ Working' : '❌ Issues'}`);
    console.log(`Cross-Service: ${crossServiceWorking ? '✅ Working' : '❌ Issues'}`);
    
    if (mediaCuratorWorking && topicId && crossServiceWorking) {
        console.log('\n🎉 Pipeline integration is working correctly!');
    } else {
        console.log('\n⚠️  Some issues found. Check the logs above for details.');
    }
}

main().catch(console.error);