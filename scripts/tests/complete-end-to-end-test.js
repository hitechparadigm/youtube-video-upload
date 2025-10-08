#!/usr/bin/env node

/**
 * Complete End-to-End Pipeline Test
 * Test the entire video production pipeline with proper timing
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function completeEndToEndTest() {
    console.log('🚀 Complete End-to-End Pipeline Test\n');
    
    const testProjectId = `e2e-test-${Date.now()}`;
    let results = {
        topicManagement: false,
        scriptGenerator: false,
        mediaCurator: false,
        videoAssembler: false,
        youtubePublisher: false
    };
    
    try {
        // Step 1: Topic Management
        console.log('📋 Step 1: Topic Management AI...');
        const topicResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: testProjectId,
                    baseTopic: 'AI Tools for Content Creation',
                    targetAudience: 'content creators'
                })
            })
        }));
        
        const topicResult = JSON.parse(new TextDecoder().decode(topicResponse.Payload));
        if (topicResult.statusCode === 200) {
            results.topicManagement = true;
            console.log('   ✅ Topic Management: SUCCESS');
        } else {
            console.log('   ❌ Topic Management: FAILED');
            console.log('   Error:', topicResult.body);
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 2: Script Generator
        console.log('📝 Step 2: Script Generator AI...');
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
        if (scriptResult.statusCode === 200) {
            results.scriptGenerator = true;
            console.log('   ✅ Script Generator: SUCCESS');
        } else {
            console.log('   ❌ Script Generator: FAILED');
            console.log('   Error:', scriptResult.body);
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Media Curator
        console.log('🎨 Step 3: Media Curator AI...');
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
        if (mediaResult.statusCode === 200) {
            results.mediaCurator = true;
            console.log('   ✅ Media Curator: SUCCESS');
        } else {
            console.log('   ❌ Media Curator: FAILED');
            console.log('   Error:', mediaResult.body);
        }
        
        // Wait for context storage
        console.log('   ⏳ Waiting for context storage...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 4: Video Assembler
        console.log('🎬 Step 4: Video Assembler AI...');
        const videoResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-video-assembler-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/video/assemble-from-project',
                body: JSON.stringify({
                    projectId: testProjectId,
                    videoSettings: {},
                    qualitySettings: {},
                    outputFormat: 'mp4'
                })
            })
        }));
        
        const videoResult = JSON.parse(new TextDecoder().decode(videoResponse.Payload));
        if (videoResult.statusCode === 200) {
            results.videoAssembler = true;
            console.log('   ✅ Video Assembler: SUCCESS');
            
            // Get the video path for YouTube Publisher
            const videoBody = JSON.parse(videoResult.body);
            const videoPath = videoBody.finalVideoPath;
            
            // Step 5: YouTube Publisher (optional test)
            console.log('📺 Step 5: YouTube Publisher AI (testing readiness)...');
            const youtubeResponse = await lambdaClient.send(new InvokeCommand({
                FunctionName: 'automated-video-pipeline-youtube-publisher-v2',
                Payload: JSON.stringify({
                    httpMethod: 'GET',
                    path: '/health'
                })
            }));
            
            const youtubeResult = JSON.parse(new TextDecoder().decode(youtubeResponse.Payload));
            if (youtubeResult.statusCode === 200) {
                results.youtubePublisher = true;
                console.log('   ✅ YouTube Publisher: READY');
            } else {
                console.log('   ❌ YouTube Publisher: NOT READY');
            }
            
        } else {
            console.log('   ❌ Video Assembler: FAILED');
            console.log('   Error:', videoResult.body);
        }
        
    } catch (error) {
        console.error('❌ End-to-End Test Error:', error.message);
    }
    
    // Calculate success rate
    const successCount = Object.values(results).filter(Boolean).length;
    const totalSteps = Object.keys(results).length;
    const successRate = Math.round((successCount / totalSteps) * 100);
    
    console.log('\n📊 END-TO-END TEST RESULTS:');
    console.log(`   📋 Topic Management: ${results.topicManagement ? '✅' : '❌'}`);
    console.log(`   📝 Script Generator: ${results.scriptGenerator ? '✅' : '❌'}`);
    console.log(`   🎨 Media Curator: ${results.mediaCurator ? '✅' : '❌'}`);
    console.log(`   🎬 Video Assembler: ${results.videoAssembler ? '✅' : '❌'}`);
    console.log(`   📺 YouTube Publisher: ${results.youtubePublisher ? '✅' : '❌'}`);
    
    console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate}% (${successCount}/${totalSteps})`);
    console.log(`📋 Test Project ID: ${testProjectId}`);
    
    if (successRate === 100) {
        console.log('\n🎉 COMPLETE END-TO-END PIPELINE WORKING!');
    } else if (successRate >= 80) {
        console.log('\n✅ Pipeline mostly working, minor issues to address');
    } else {
        console.log('\n⚠️ Pipeline has significant issues that need fixing');
    }
}

completeEndToEndTest().catch(console.error);