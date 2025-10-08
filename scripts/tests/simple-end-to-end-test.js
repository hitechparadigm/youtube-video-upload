#!/usr/bin/env node

/**
 * Simple End-to-End Test using the same approach as quick-agent-test.js
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

const invoker = new LambdaInvoker();

async function testCompleteFlow() {
    console.log('🚀 Starting Simple End-to-End Test\n');
    
    const testProjectId = `simple-e2e-${Date.now()}`;
    let results = {
        topic: false,
        script: false,
        media: false,
        audio: false,
        video: false
    };
    
    // Step 1: Test Topic Management
    console.log('📋 Step 1: Testing Topic Management AI...');
    try {
        const topicResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-topic-management-v2',
            'POST',
            '/topics/enhanced',
            {
                projectId: testProjectId,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators',
                contentType: 'educational',
                videoDuration: 480
            }
        );
        
        console.log(`   Success: ${topicResult.success}`);
        if (topicResult.success && topicResult.data?.body) {
            const body = typeof topicResult.data.body === 'string' 
                ? JSON.parse(topicResult.data.body) 
                : topicResult.data.body;
            
            console.log(`   Project ID: ${body.projectId}`);
            console.log(`   Topic Context: ${body.topicContext ? 'Generated' : 'Missing'}`);
            results.topic = true;
        } else {
            console.log(`   Error: ${topicResult.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.log(`   Exception: ${error.message}`);
    }
    
    // Step 2: Test Script Generation
    console.log('\n📝 Step 2: Testing Script Generator AI...');
    try {
        const scriptResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-script-generator-v2',
            'POST',
            '/scripts/generate-from-project',
            {
                projectId: testProjectId
            }
        );
        
        console.log(`   Success: ${scriptResult.success}`);
        if (scriptResult.success && scriptResult.data?.body) {
            const body = typeof scriptResult.data.body === 'string' 
                ? JSON.parse(scriptResult.data.body) 
                : scriptResult.data.body;
            
            console.log(`   Script Scenes: ${body.script?.scenes?.length || 0}`);
            console.log(`   Total Duration: ${body.script?.totalDuration || 0}s`);
            results.script = true;
        } else {
            console.log(`   Error: ${scriptResult.error || 'Unknown error'}`);
            if (scriptResult.data?.body) {
                console.log(`   Details: ${scriptResult.data.body}`);
            }
        }
    } catch (error) {
        console.log(`   Exception: ${error.message}`);
    }
    
    // Step 3: Test Media Curation
    console.log('\n🎨 Step 3: Testing Media Curator AI...');
    try {
        const mediaResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-media-curator-v2',
            'POST',
            '/media/curate-from-project',
            {
                projectId: testProjectId
            }
        );
        
        console.log(`   Success: ${mediaResult.success}`);
        if (mediaResult.success && mediaResult.data?.body) {
            const body = typeof mediaResult.data.body === 'string' 
                ? JSON.parse(mediaResult.data.body) 
                : mediaResult.data.body;
            
            console.log(`   Total Assets: ${body.totalAssets || 0}`);
            console.log(`   Scene Mappings: ${body.sceneMediaMapping?.length || 0}`);
            results.media = true;
        } else {
            console.log(`   Error: ${mediaResult.error || 'Unknown error'}`);
            if (mediaResult.data?.body) {
                console.log(`   Details: ${mediaResult.data.body}`);
            }
        }
    } catch (error) {
        console.log(`   Exception: ${error.message}`);
    }
    
    // Step 4: Test Audio Generation
    console.log('\n🎵 Step 4: Testing Audio Generator AI...');
    try {
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
        
        console.log(`   Success: ${audioResult.success}`);
        if (audioResult.success && audioResult.data?.body) {
            const body = typeof audioResult.data.body === 'string' 
                ? JSON.parse(audioResult.data.body) 
                : audioResult.data.body;
            
            console.log(`   Master Audio: ${body.masterAudio?.audioId || 'Unknown'}`);
            console.log(`   Total Duration: ${body.masterAudio?.totalDuration || 0}s`);
            results.audio = true;
        } else {
            console.log(`   Error: ${audioResult.error || 'Unknown error'}`);
            if (audioResult.data?.body) {
                console.log(`   Details: ${audioResult.data.body}`);
            }
        }
    } catch (error) {
        console.log(`   Exception: ${error.message}`);
    }
    
    // Step 5: Test Video Assembly (CRITICAL TEST)
    console.log('\n🎬 Step 5: Testing Video Assembler AI (CRITICAL - Task 7.2)...');
    try {
        const videoResult = await invoker.invokeWithHTTP(
            'automated-video-pipeline-video-assembler-v2',
            'POST',
            '/video/assemble-from-project',
            {
                projectId: testProjectId,
                videoSettings: {
                    resolution: '1920x1080',
                    framerate: 30,
                    bitrate: '5000k'
                },
                qualitySettings: {},
                outputFormat: 'mp4'
            }
        );
        
        console.log(`   Success: ${videoResult.success}`);
        if (videoResult.success && videoResult.data?.body) {
            const body = typeof videoResult.data.body === 'string' 
                ? JSON.parse(videoResult.data.body) 
                : videoResult.data.body;
            
            console.log(`   Status: ${body.status}`);
            console.log(`   Video ID: ${body.videoId}`);
            console.log(`   Processing Method: ${body.processingDetails?.method || 'Unknown'}`);
            console.log(`   Ready for Publishing: ${body.readyForPublishing ? 'Yes' : 'No'}`);
            results.video = true;
        } else {
            console.log(`   Error: ${videoResult.error || 'Unknown error'}`);
            if (videoResult.data?.body) {
                console.log(`   Details: ${videoResult.data.body}`);
            }
        }
    } catch (error) {
        console.log(`   Exception: ${error.message}`);
    }
    
    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMPLE END-TO-END TEST RESULTS');
    console.log('='.repeat(60));
    
    const steps = [
        { name: 'Topic Management', result: results.topic },
        { name: 'Script Generation', result: results.script },
        { name: 'Media Curation', result: results.media },
        { name: 'Audio Generation', result: results.audio },
        { name: 'Video Assembly', result: results.video }
    ];
    
    let passedCount = 0;
    steps.forEach(step => {
        const status = step.result ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${step.name.padEnd(20)} ${status}`);
        if (step.result) passedCount++;
    });
    
    console.log(`\n📈 SUMMARY: ${passedCount}/${steps.length} (${Math.round(passedCount/steps.length*100)}%)`);
    console.log(`📋 Project ID: ${testProjectId}`);
    
    if (results.video) {
        console.log('\n🎯 SUCCESS: Video Assembler (Task 7.2) is working!');
    } else {
        console.log('\n❌ ISSUE: Video Assembler needs investigation');
    }
    
    if (passedCount >= 3) {
        console.log('✅ Core pipeline components are functional');
    } else {
        console.log('❌ Multiple pipeline issues detected');
    }
    
    console.log('='.repeat(60));
}

testCompleteFlow().catch(console.error);