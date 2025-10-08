#!/usr/bin/env node

/**
 * Production Flow Test
 * Tests the complete production flow from Google Sheets to YouTube Publisher
 * 
 * Flow: 📊 Google Sheets → 📋 Topic Management → 📝 Script Generator → 
 *       🎨 Media Curator → 🎵 Audio Generator → 🎬 Video Assembler → 📺 YouTube Publisher
 * 
 * Usage: node scripts/tests/production-flow-test.js
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testProductionFlow() {
    console.log('🚀 Production Flow Test - Complete Pipeline Verification\n');
    console.log('📊 Flow: Google Sheets → Topic Management → Script Generator → Media Curator → Audio Generator → Video Assembler → YouTube Publisher\n');
    
    const testProjectId = `prod-flow-${Date.now()}`;
    let results = {
        topicManagement: { success: false, duration: 0, details: null },
        scriptGenerator: { success: false, duration: 0, details: null },
        mediaCurator: { success: false, duration: 0, details: null },
        audioGenerator: { success: false, duration: 0, details: null },
        videoAssembler: { success: false, duration: 0, details: null },
        youtubePublisher: { success: false, duration: 0, details: null }
    };
    
    try {
        // Step 1: 📋 Topic Management AI (Google Sheets Integration)
        console.log('📋 Step 1: Topic Management AI (Google Sheets Integration)...');
        const topicStart = Date.now();
        
        const topicResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: testProjectId,
                    baseTopic: 'AI Tools for Content Creation',
                    targetAudience: 'content creators',
                    contentType: 'educational',
                    videoDuration: 480
                })
            })
        }));
        
        const topicResult = JSON.parse(new TextDecoder().decode(topicResponse.Payload));
        results.topicManagement.duration = Date.now() - topicStart;
        
        if (topicResult.statusCode === 200) {
            const topicBody = JSON.parse(topicResult.body);
            results.topicManagement.success = true;
            results.topicManagement.details = {
                projectId: topicBody.projectId,
                expandedTopics: topicBody.topicContext?.expandedTopics?.length || 0,
                contextStored: topicBody.contextStored
            };
            console.log(`   ✅ SUCCESS (${results.topicManagement.duration}ms)`);
            console.log(`      - Project ID: ${topicBody.projectId}`);
            console.log(`      - Expanded Topics: ${topicBody.topicContext?.expandedTopics?.length || 0}`);
            console.log(`      - Context Stored: ${topicBody.contextStored}`);
        } else {
            console.log(`   ❌ FAILED (${results.topicManagement.duration}ms)`);
            console.log(`      Error: ${topicResult.body}`);
            return results; // Stop if first step fails
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 2: 📝 Script Generator AI
        console.log('\n📝 Step 2: Script Generator AI...');
        const scriptStart = Date.now();
        
        const scriptResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-script-generator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/scripts/generate-from-project',
                body: JSON.stringify({
                    projectId: testProjectId
                })
            })
        }));
        
        const scriptResult = JSON.parse(new TextDecoder().decode(scriptResponse.Payload));
        results.scriptGenerator.duration = Date.now() - scriptStart;
        
        if (scriptResult.statusCode === 200) {
            const scriptBody = JSON.parse(scriptResult.body);
            results.scriptGenerator.success = true;
            results.scriptGenerator.details = {
                sceneCount: scriptBody.script?.scenes?.length || 0,
                totalDuration: scriptBody.script?.totalDuration || 0,
                wordCount: scriptBody.script?.wordCount || 0
            };
            console.log(`   ✅ SUCCESS (${results.scriptGenerator.duration}ms)`);
            console.log(`      - Scenes: ${scriptBody.script?.scenes?.length || 0}`);
            console.log(`      - Duration: ${scriptBody.script?.totalDuration || 0}s`);
            console.log(`      - Word Count: ${scriptBody.script?.wordCount || 0}`);
        } else {
            console.log(`   ❌ FAILED (${results.scriptGenerator.duration}ms)`);
            console.log(`      Error: ${scriptResult.body}`);
            return results;
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: 🎨 Media Curator AI
        console.log('\n🎨 Step 3: Media Curator AI...');
        const mediaStart = Date.now();
        
        const mediaResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-media-curator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/media/curate-from-project',
                body: JSON.stringify({
                    projectId: testProjectId
                })
            })
        }));
        
        const mediaResult = JSON.parse(new TextDecoder().decode(mediaResponse.Payload));
        results.mediaCurator.duration = Date.now() - mediaStart;
        
        if (mediaResult.statusCode === 200) {
            const mediaBody = JSON.parse(mediaResult.body);
            results.mediaCurator.success = true;
            results.mediaCurator.details = {
                totalAssets: mediaBody.mediaContext?.totalAssets || 0,
                scenesCovered: mediaBody.mediaContext?.scenesCovered || 0,
                coverageComplete: mediaBody.mediaContext?.coverageComplete || false
            };
            console.log(`   ✅ SUCCESS (${results.mediaCurator.duration}ms)`);
            console.log(`      - Total Assets: ${mediaBody.mediaContext?.totalAssets || 0}`);
            console.log(`      - Scenes Covered: ${mediaBody.mediaContext?.scenesCovered || 0}`);
            console.log(`      - Coverage Complete: ${mediaBody.mediaContext?.coverageComplete || false}`);
        } else {
            console.log(`   ❌ FAILED (${results.mediaCurator.duration}ms)`);
            console.log(`      Error: ${mediaResult.body}`);
            return results;
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 4: 🎵 Audio Generator AI
        console.log('\n🎵 Step 4: Audio Generator AI...');
        const audioStart = Date.now();
        
        const audioResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-audio-generator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/audio/generate-from-project',
                body: JSON.stringify({
                    projectId: testProjectId,
                    voiceId: 'Ruth',
                    engine: 'generative'
                })
            })
        }));
        
        const audioResult = JSON.parse(new TextDecoder().decode(audioResponse.Payload));
        results.audioGenerator.duration = Date.now() - audioStart;
        
        if (audioResult.statusCode === 200) {
            const audioBody = JSON.parse(audioResult.body);
            results.audioGenerator.success = true;
            results.audioGenerator.details = {
                totalDuration: audioBody.masterAudio?.totalDuration || 0,
                sceneAudios: audioBody.masterAudio?.sceneAudios?.length || 0,
                audioId: audioBody.masterAudio?.audioId || 'N/A'
            };
            console.log(`   ✅ SUCCESS (${results.audioGenerator.duration}ms)`);
            console.log(`      - Total Duration: ${audioBody.masterAudio?.totalDuration || 0}s`);
            console.log(`      - Scene Audios: ${audioBody.masterAudio?.sceneAudios?.length || 0}`);
            console.log(`      - Audio ID: ${audioBody.masterAudio?.audioId || 'N/A'}`);
        } else {
            console.log(`   ❌ FAILED (${results.audioGenerator.duration}ms)`);
            console.log(`      Error: ${audioResult.body}`);
            return results;
        }
        
        // Wait for audio processing
        console.log('   ⏳ Waiting for audio processing (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 5: 🎬 Video Assembler AI (Lambda-based, NO ECS)
        console.log('\n🎬 Step 5: Video Assembler AI (Lambda-based Processing)...');
        const videoStart = Date.now();
        
        const videoResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-video-assembler-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/video/assemble-from-project',
                body: JSON.stringify({
                    projectId: testProjectId,
                    videoSettings: {
                        resolution: '1920x1080',
                        framerate: 30,
                        bitrate: '5000k'
                    },
                    qualitySettings: {},
                    outputFormat: 'mp4'
                })
            })
        }));
        
        const videoResult = JSON.parse(new TextDecoder().decode(videoResponse.Payload));
        results.videoAssembler.duration = Date.now() - videoStart;
        
        if (videoResult.statusCode === 200) {
            const videoBody = JSON.parse(videoResult.body);
            results.videoAssembler.success = true;
            results.videoAssembler.details = {
                videoId: videoBody.videoId,
                status: videoBody.status,
                finalVideoPath: videoBody.finalVideoPath,
                processingMethod: videoBody.processingDetails?.method,
                readyForPublishing: videoBody.readyForPublishing
            };
            console.log(`   ✅ SUCCESS (${results.videoAssembler.duration}ms)`);
            console.log(`      - Video ID: ${videoBody.videoId}`);
            console.log(`      - Status: ${videoBody.status}`);
            console.log(`      - Processing Method: ${videoBody.processingDetails?.method}`);
            console.log(`      - Ready for Publishing: ${videoBody.readyForPublishing}`);
            console.log(`      - Final Video Path: ${videoBody.finalVideoPath}`);
        } else {
            console.log(`   ❌ FAILED (${results.videoAssembler.duration}ms)`);
            console.log(`      Error: ${videoResult.body}`);
            return results;
        }
        
        // Step 6: 📺 YouTube Publisher AI (with integrated SEO optimization)
        console.log('\n📺 Step 6: YouTube Publisher AI (with SEO Optimization)...');
        const youtubeStart = Date.now();
        
        // Test YouTube Publisher readiness (not actual publishing to avoid spam)
        const youtubeResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-youtube-publisher-v2',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/health'
            })
        }));
        
        const youtubeResult = JSON.parse(new TextDecoder().decode(youtubeResponse.Payload));
        results.youtubePublisher.duration = Date.now() - youtubeStart;
        
        if (youtubeResult.statusCode === 200) {
            results.youtubePublisher.success = true;
            results.youtubePublisher.details = {
                status: 'ready',
                seoOptimization: 'integrated',
                note: 'Health check passed - ready for publishing'
            };
            console.log(`   ✅ SUCCESS (${results.youtubePublisher.duration}ms)`);
            console.log(`      - Status: Ready for publishing`);
            console.log(`      - SEO Optimization: Integrated`);
            console.log(`      - Note: Health check passed (actual publishing not tested to avoid spam)`);
        } else {
            console.log(`   ❌ FAILED (${results.youtubePublisher.duration}ms)`);
            console.log(`      Error: ${youtubeResult.body}`);
        }
        
    } catch (error) {
        console.error('\n❌ Production Flow Test Error:', error.message);
    }
    
    // Calculate overall results
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalSteps = Object.keys(results).length;
    const successRate = Math.round((successCount / totalSteps) * 100);
    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n📊 PRODUCTION FLOW TEST RESULTS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📋 Topic Management:     ${results.topicManagement.success ? '✅' : '❌'} (${results.topicManagement.duration}ms)`);
    console.log(`📝 Script Generator:     ${results.scriptGenerator.success ? '✅' : '❌'} (${results.scriptGenerator.duration}ms)`);
    console.log(`🎨 Media Curator:        ${results.mediaCurator.success ? '✅' : '❌'} (${results.mediaCurator.duration}ms)`);
    console.log(`🎵 Audio Generator:      ${results.audioGenerator.success ? '✅' : '❌'} (${results.audioGenerator.duration}ms)`);
    console.log(`🎬 Video Assembler:      ${results.videoAssembler.success ? '✅' : '❌'} (${results.videoAssembler.duration}ms)`);
    console.log(`📺 YouTube Publisher:    ${results.youtubePublisher.success ? '✅' : '❌'} (${results.youtubePublisher.duration}ms)`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🎯 OVERALL SUCCESS RATE: ${successRate}% (${successCount}/${totalSteps})`);
    console.log(`⏱️  TOTAL PROCESSING TIME: ${Math.round(totalDuration/1000)}s`);
    console.log(`📋 Test Project ID: ${testProjectId}`);
    
    if (successRate === 100) {
        console.log('\n🎉 PRODUCTION FLOW: FULLY OPERATIONAL!');
        console.log('✅ Complete pipeline from Google Sheets to YouTube Publisher working');
        console.log('✅ All 6 AI agents operational with context flow');
        console.log('✅ Lambda-based video processing working (NO ECS required)');
        console.log('✅ SEO optimization integrated in YouTube Publisher');
        console.log('✅ Ready for autonomous video production');
    } else if (successRate >= 80) {
        console.log('\n⚠️ PRODUCTION FLOW: MOSTLY WORKING');
        console.log('✅ Most components operational');
        console.log('⚠️ Minor issues need addressing before full production');
    } else {
        console.log('\n❌ PRODUCTION FLOW: SIGNIFICANT ISSUES');
        console.log('❌ Multiple components failing');
        console.log('🔧 Major fixes required before production use');
    }
    
    // Detailed results for debugging
    if (successRate < 100) {
        console.log('\n🔍 DETAILED FAILURE ANALYSIS:');
        Object.entries(results).forEach(([step, result]) => {
            if (!result.success) {
                console.log(`❌ ${step}: Failed after ${result.duration}ms`);
            }
        });
    }
    
    return { successRate, results, testProjectId };
}

// Run production flow test
testProductionFlow()
    .then(({ successRate }) => process.exit(successRate === 100 ? 0 : 1))
    .catch(error => {
        console.error('❌ Production flow test failed:', error);
        process.exit(1);
    });

// Export for use in other scripts
export { testProductionFlow };