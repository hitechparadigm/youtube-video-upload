#!/usr/bin/env node

/**
 * Debug Media Curator AI
 * Test media curation and context storage
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

const invoker = new LambdaInvoker();

async function debugMediaCurator() {
    console.log('🎨 Debugging Media Curator AI\n');
    
    // First, create a topic and script context
    const testProjectId = `media-debug-${Date.now()}`;
    
    console.log('📋 Step 1: Creating Topic Context...');
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
    
    if (!topicResult.success) {
        console.log('❌ Topic creation failed, cannot test media curator');
        return;
    }
    
    console.log('✅ Topic context created');
    
    console.log('\n📝 Step 2: Creating Script Context...');
    const scriptResult = await invoker.invokeWithHTTP(
        'automated-video-pipeline-script-generator-v2',
        'POST',
        '/scripts/generate-from-project',
        {
            projectId: testProjectId
        }
    );
    
    if (!scriptResult.success) {
        console.log('❌ Script creation failed, cannot test media curator');
        return;
    }
    
    console.log('✅ Script context created');
    
    console.log('\n🎨 Step 3: Testing Media Curator...');
    const mediaResult = await invoker.invokeWithHTTP(
        'automated-video-pipeline-media-curator-v2',
        'POST',
        '/media/curate-from-project',
        {
            projectId: testProjectId
        }
    );
    
    console.log('📊 Media Curator Response:');
    console.log(`   Success: ${mediaResult.success}`);
    console.log(`   Status Code: ${mediaResult.statusCode}`);
    console.log(`   Function Error: ${mediaResult.functionError}`);
    
    if (mediaResult.data?.body) {
        console.log('\n📝 Response Body:');
        try {
            const body = typeof mediaResult.data.body === 'string' 
                ? JSON.parse(mediaResult.data.body) 
                : mediaResult.data.body;
            
            console.log(`   Success: ${body.success}`);
            console.log(`   Total Assets: ${body.totalAssets || 0}`);
            console.log(`   Scene Mappings: ${body.sceneMediaMapping?.length || 0}`);
            console.log(`   Coverage Complete: ${body.coverageComplete}`);
            console.log(`   Context Stored: ${body.contextStored}`);
            
            if (body.sceneMediaMapping && body.sceneMediaMapping.length > 0) {
                console.log('\n📋 Sample Scene Mapping:');
                console.log(JSON.stringify(body.sceneMediaMapping[0], null, 2));
            }
            
        } catch (parseError) {
            console.log(`   Parse Error: ${parseError.message}`);
            console.log(`   Raw Body: ${mediaResult.data.body}`);
        }
    }
    
    console.log('\n🔍 Step 4: Testing Video Assembler Access to Media Context...');
    const videoResult = await invoker.invokeWithHTTP(
        'automated-video-pipeline-video-assembler-v2',
        'POST',
        '/video/assemble-from-project',
        {
            projectId: testProjectId,
            videoSettings: {
                resolution: '1920x1080',
                framerate: 30
            }
        }
    );
    
    console.log('📊 Video Assembler Response:');
    console.log(`   Success: ${videoResult.success}`);
    
    if (!videoResult.success && videoResult.data?.body) {
        try {
            const body = typeof videoResult.data.body === 'string' 
                ? JSON.parse(videoResult.data.body) 
                : videoResult.data.body;
            
            console.log(`   Error: ${body.error}`);
            console.log(`   Message: ${body.message}`);
            
        } catch (parseError) {
            console.log(`   Raw Error: ${videoResult.data.body}`);
        }
    }
    
    console.log(`\n📋 Test Project ID: ${testProjectId}`);
}

debugMediaCurator().catch(console.error);