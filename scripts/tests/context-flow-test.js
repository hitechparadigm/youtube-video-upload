#!/usr/bin/env node

/**
 * Context Flow Integration Test
 * Tests the complete context flow between AI agents
 * 
 * This test validates:
 * 1. Topic Management AI generates and stores topic context
 * 2. Script Generator AI retrieves topic context and generates scene context
 * 3. Audio Generator AI retrieves scene context and generates audio
 * 
 * Usage: node scripts/tests/context-flow-test.js
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

const invoker = new LambdaInvoker();

async function testContextFlow() {
    console.log('🧪 Testing Complete Context Flow: Topic → Script → Audio...');
    
    const testProjectId = `test-context-flow-${Date.now()}`;
    let testResults = {
        topicGeneration: false,
        scriptGeneration: false,
        audioGeneration: false,
        contextFlow: false
    };
    
    try {
        // Step 1: Generate topic context
        console.log('📋 Step 1: Testing Topic Management AI...');
        const topicResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-topic-management-v2',
            'POST',
            '/topics/enhanced',
            {
                projectId: testProjectId,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators'
            }
        );
        
        if (topicResult && topicResult.success) {
            const topicBody = typeof topicResult.data.body === 'string' 
                ? JSON.parse(topicResult.data.body) 
                : topicResult.data.body;
            
            if (topicBody && topicBody.success && topicBody.projectId === testProjectId) {
                testResults.topicGeneration = true;
                console.log('✅ Topic context generated successfully');
            } else {
                console.log('❌ Topic generation failed: Invalid response structure');
                console.log('Response:', topicBody);
                return testResults;
            }
        } else {
            console.log('❌ Topic generation failed:', topicResult?.error || 'Unknown error');
            if (topicResult?.data?.body) {
                const errorBody = typeof topicResult.data.body === 'string' 
                    ? JSON.parse(topicResult.data.body) 
                    : topicResult.data.body;
                console.log('Error details:', errorBody);
            }
            return testResults;
        }
        
        // Step 2: Generate script using topic context
        console.log('📝 Step 2: Testing Script Generator AI...');
        const scriptResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-script-generator-v2',
            'POST',
            '/scripts/generate-from-project',
            {
                projectId: testProjectId
            }
        );
        
        if (scriptResult.success) {
            const scriptBody = typeof scriptResult.data.body === 'string' 
                ? JSON.parse(scriptResult.data.body) 
                : scriptResult.data.body;
            
            if (scriptBody.projectId === testProjectId && scriptBody.sceneContext) {
                testResults.scriptGeneration = true;
                console.log(`✅ Script generated with ${scriptBody.sceneContext.sceneCount} scenes`);
            } else {
                console.log('❌ Script generation failed: Invalid response structure');
                return testResults;
            }
        } else {
            console.log('❌ Script generation failed:', scriptResult.error);
            return testResults;
        }
        
        // Step 3: Generate audio using scene context
        console.log('🎵 Step 3: Testing Audio Generator AI...');
        const audioResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-audio-generator-v2',
            'POST',
            '/audio/generate-from-project',
            {
                projectId: testProjectId,
                voiceId: 'Ruth',
                engine: 'generative'
            }
        );
        
        if (audioResult.success) {
            const audioBody = typeof audioResult.data.body === 'string' 
                ? JSON.parse(audioResult.data.body) 
                : audioResult.data.body;
            
            if (audioBody.projectId === testProjectId && audioBody.contextUsage?.contextAwareGeneration) {
                testResults.audioGeneration = true;
                testResults.contextFlow = true;
                console.log(`✅ Audio generated: ${audioBody.totalScenes} scenes, ${audioBody.totalDuration}s duration`);
                console.log('🎉 COMPLETE CONTEXT FLOW SUCCESS!');
            } else {
                console.log('❌ Audio generation failed: Invalid response structure');
                return testResults;
            }
        } else {
            console.log('❌ Audio generation failed:', audioResult.error);
            return testResults;
        }
        
    } catch (error) {
        console.error('❌ Context flow test failed:', error.message);
    }
    
    return testResults;
}

async function main() {
    console.log('🚀 Starting Context Flow Integration Test\n');
    
    const results = await testContextFlow();
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`   Topic Generation: ${results.topicGeneration ? '✅' : '❌'}`);
    console.log(`   Script Generation: ${results.scriptGeneration ? '✅' : '❌'}`);
    console.log(`   Audio Generation: ${results.audioGeneration ? '✅' : '❌'}`);
    console.log(`   Context Flow: ${results.contextFlow ? '✅' : '❌'}`);
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 OVERALL: ${successCount}/${totalTests} tests passed`);
    
    if (results.contextFlow) {
        console.log('🎉 Context flow is working perfectly!');
        process.exit(0);
    } else {
        console.log('❌ Context flow has issues that need to be fixed');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});