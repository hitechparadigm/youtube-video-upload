#!/usr/bin/env node

/**
 * Test Simple Context Flow - Topic to Script
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

async function testSimpleContextFlow() {
    console.log('🧪 Testing Simple Context Flow: Topic → Script');
    console.log('=' .repeat(60));

    const testProjectId = `test-context-${Date.now()}`;
    console.log(`📋 Test Project ID: ${testProjectId}`);

    try {
        // Step 1: Create basic topic (skip enhanced for now)
        console.log('\n📋 Step 1: Creating basic topic...');
        const topicResult = await invokeLambda('automated-video-pipeline-topic-management-v2', {
            httpMethod: 'POST',
            path: '/topics',
            body: JSON.stringify({
                topic: 'AI Tools for Content Creation',
                targetAudience: 'content creators',
                dailyFrequency: 1,
                priority: 5
            })
        });

        if (topicResult.statusCode !== 201) {
            throw new Error(`Topic creation failed: ${topicResult.statusCode}`);
        }

        console.log('   ✅ Basic topic created');
        const topicData = JSON.parse(topicResult.body);
        console.log(`   📊 Topic ID: ${topicData.topicId}`);

        // Step 2: Test Script Generator directly (without topic context)
        console.log('\n📝 Step 2: Testing Script Generator directly...');
        const scriptResult = await invokeLambda('automated-video-pipeline-script-generator-v2', {
            httpMethod: 'POST',
            path: '/scripts/generate',
            body: JSON.stringify({
                topic: 'AI Tools for Content Creation',
                title: '5 AI Tools That Will Transform Your Content Creation',
                targetLength: 480,
                includeSceneBreakdown: true,
                projectId: testProjectId
            })
        });

        if (scriptResult.statusCode !== 200) {
            console.error('   ❌ Script generation failed:', JSON.stringify(scriptResult, null, 2));
            return false;
        }

        console.log('   ✅ Script generated successfully');
        const scriptData = JSON.parse(scriptResult.body);
        console.log(`   📊 Generated ${scriptData.scenes?.length || 0} scenes`);
        console.log(`   ⏱️ Total duration: ${scriptData.totalDuration || 0}s`);

        // Step 3: Test if context was stored
        console.log('\n🔍 Step 3: Testing if scene context was stored...');
        
        // Try to use the stored context with Media Curator
        const mediaResult = await invokeLambda('automated-video-pipeline-media-curator-v2', {
            httpMethod: 'POST',
            path: '/media/curate-from-project',
            body: JSON.stringify({
                projectId: testProjectId,
                qualityThreshold: 80
            })
        });

        if (mediaResult.statusCode === 200) {
            console.log('   ✅ Media Curator can access scene context');
            const mediaData = JSON.parse(mediaResult.body);
            console.log(`   📊 Total assets: ${mediaData.mediaContext?.totalAssets || 0}`);
            console.log(`   🎬 Scenes covered: ${mediaData.mediaContext?.scenesCovered || 0}`);
        } else {
            console.log('   ⚠️ Media Curator cannot access scene context');
            console.log(`   📋 Status: ${mediaResult.statusCode}`);
        }

        console.log('\n📊 SIMPLE CONTEXT FLOW TEST SUMMARY:');
        console.log('=' .repeat(60));
        console.log('✅ Basic topic creation: WORKING');
        console.log('✅ Script generation: WORKING');
        console.log(`✅ Context flow: ${mediaResult.statusCode === 200 ? 'WORKING' : 'PARTIAL'}`);
        
        return mediaResult.statusCode === 200;

    } catch (error) {
        console.error('\n❌ Simple context flow test failed:', error.message);
        return false;
    }
}

// Run the test
testSimpleContextFlow()
    .then(success => {
        console.log('\n🎯 RESULT:', success ? 'CONTEXT FLOW WORKING' : 'CONTEXT FLOW ISSUES');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });