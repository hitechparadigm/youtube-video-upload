#!/usr/bin/env node

/**
 * Test Enhanced Media Curator and Audio Generator
 * Tests the new context awareness and industry standards implementation
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

async function testEnhancedAgents() {
    console.log('🧪 Testing Enhanced Media Curator and Audio Generator');
    console.log('=' .repeat(60));

    const testProjectId = `test-enhanced-${Date.now()}`;
    console.log(`📋 Test Project ID: ${testProjectId}`);

    try {
        // Step 1: Create test topic context
        console.log('\n📋 Step 1: Creating test topic context...');
        const topicResult = await invokeLambda('automated-video-pipeline-topic-management-v2', {
            httpMethod: 'POST',
            path: '/topics/generate-from-basic',
            body: JSON.stringify({
                projectId: testProjectId,
                baseTopic: 'Investing for beginners',
                targetAudience: 'young adults',
                videoLength: 480 // 8 minutes
            })
        });

        if (topicResult.statusCode !== 200) {
            throw new Error(`Topic Management failed: ${JSON.stringify(topicResult)}`);
        }

        console.log('   ✅ Topic context created');
        const topicData = JSON.parse(topicResult.body);
        console.log(`   📊 Generated ${topicData.expandedTopics?.length || 0} subtopics`);

        // Step 2: Generate script with scene context
        console.log('\n📝 Step 2: Generating script with scene context...');
        const scriptResult = await invokeLambda('automated-video-pipeline-script-generator-v2', {
            httpMethod: 'POST',
            path: '/scripts/generate-from-project',
            body: JSON.stringify({
                projectId: testProjectId,
                targetDuration: 480,
                includeSceneBreakdown: true
            })
        });

        if (scriptResult.statusCode !== 200) {
            throw new Error(`Script Generator failed: ${JSON.stringify(scriptResult)}`);
        }

        console.log('   ✅ Script with scenes created');
        const scriptData = JSON.parse(scriptResult.body);
        console.log(`   📊 Generated ${scriptData.scenes?.length || 0} scenes`);
        console.log(`   ⏱️ Total duration: ${scriptData.totalDuration || 0}s`);

        // Step 3: Test Enhanced Media Curator
        console.log('\n🎨 Step 3: Testing Enhanced Media Curator...');
        const mediaResult = await invokeLambda('automated-video-pipeline-media-curator-v2', {
            httpMethod: 'POST',
            path: '/media/curate-from-project',
            body: JSON.stringify({
                projectId: testProjectId,
                qualityThreshold: 80
            })
        });

        if (mediaResult.statusCode !== 200) {
            console.error('   ❌ Media Curator failed:', JSON.stringify(mediaResult, null, 2));
            throw new Error(`Media Curator failed: ${mediaResult.statusCode}`);
        }

        console.log('   ✅ Enhanced Media Curator completed');
        const mediaData = JSON.parse(mediaResult.body);
        console.log(`   📊 Total assets: ${mediaData.mediaContext?.totalAssets || 0}`);
        console.log(`   🎬 Scenes covered: ${mediaData.mediaContext?.scenesCovered || 0}`);
        console.log(`   📈 Industry standards: ${mediaData.industryStandards?.overallCompliance ? 'COMPLIANT' : 'NEEDS_ADJUSTMENT'}`);
        console.log(`   ⚡ Average visuals per scene: ${mediaData.industryStandards?.averageVisualsPerScene || 0}`);
        console.log(`   ⏱️ Average visual duration: ${mediaData.industryStandards?.averageVisualDuration || 0}s`);

        // Step 4: Test Enhanced Audio Generator
        console.log('\n🎙️ Step 4: Testing Enhanced Audio Generator...');
        const audioResult = await invokeLambda('automated-video-pipeline-audio-generator-v2', {
            httpMethod: 'POST',
            path: '/audio/generate-from-project',
            body: JSON.stringify({
                projectId: testProjectId,
                voiceId: 'Ruth', // Generative voice
                engine: 'generative',
                generateByScene: true
            })
        });

        if (audioResult.statusCode !== 200) {
            console.error('   ❌ Audio Generator failed:', JSON.stringify(audioResult, null, 2));
            throw new Error(`Audio Generator failed: ${audioResult.statusCode}`);
        }

        console.log('   ✅ Enhanced Audio Generator completed');
        const audioData = JSON.parse(audioResult.body);
        console.log(`   🎙️ Voice used: ${audioData.audioQuality?.voiceId || 'Unknown'} (${audioData.audioQuality?.engine || 'Unknown'})`);
        console.log(`   📊 Total scenes: ${audioData.totalScenes || 0}`);
        console.log(`   ⏱️ Total duration: ${audioData.totalDuration || 0}s`);
        console.log(`   🎯 Context integration: Scene=${audioData.contextIntegration?.sceneContextConsumed}, Media=${audioData.contextIntegration?.mediaContextConsumed}`);
        console.log(`   📈 Quality score: ${audioData.audioQuality?.averageQualityScore || 0}`);
        console.log(`   ✅ Industry compliance: ${audioData.audioQuality?.industryCompliance?.contextAwareGeneration ? 'PASS' : 'FAIL'}`);

        // Step 5: Validation Summary
        console.log('\n📊 ENHANCED AGENTS TEST SUMMARY:');
        console.log('=' .repeat(60));
        
        const mediaCompliant = mediaData.industryStandards?.overallCompliance;
        const audioContextAware = audioData.contextIntegration?.sceneContextConsumed && audioData.contextIntegration?.mediaContextConsumed;
        const generativeVoiceUsed = audioData.audioQuality?.engine === 'generative';
        
        console.log(`✅ Media Curator Industry Standards: ${mediaCompliant ? 'COMPLIANT' : 'NEEDS_WORK'}`);
        console.log(`✅ Audio Generator Context Awareness: ${audioContextAware ? 'FULL' : 'PARTIAL'}`);
        console.log(`✅ Generative Voice Quality: ${generativeVoiceUsed ? 'MAXIMUM' : 'STANDARD'}`);
        console.log(`✅ End-to-End Context Flow: ${mediaCompliant && audioContextAware ? 'WORKING' : 'ISSUES'}`);
        
        if (mediaCompliant && audioContextAware && generativeVoiceUsed) {
            console.log('\n🎉 ALL ENHANCED FEATURES WORKING CORRECTLY!');
            console.log('   - Industry-standard visual pacing implemented');
            console.log('   - Context-aware audio generation working');
            console.log('   - AWS Polly generative voices active');
            console.log('   - Scene synchronization ready');
            return true;
        } else {
            console.log('\n⚠️ SOME ENHANCED FEATURES NEED ATTENTION');
            return false;
        }

    } catch (error) {
        console.error('\n❌ Enhanced agents test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
testEnhancedAgents()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });