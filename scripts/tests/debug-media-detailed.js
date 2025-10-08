#!/usr/bin/env node

/**
 * Detailed Media Curator Debug
 * Get the actual error details
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function debugMediaDetailed() {
    console.log('🔍 Detailed Media Curator Debug\n');
    
    // First create contexts
    const testProjectId = `detailed-debug-${Date.now()}`;
    
    console.log('📋 Creating contexts...');
    
    // Create topic context
    const topicPayload = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            projectId: testProjectId,
            baseTopic: 'AI Tools for Content Creation',
            targetAudience: 'content creators'
        })
    };
    
    await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-topic-management-v2',
        Payload: JSON.stringify(topicPayload)
    }));
    
    // Wait for context to be stored
    console.log('⏳ Waiting for topic context to be stored...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create script context
    const scriptPayload = {
        httpMethod: 'POST',
        path: '/scripts/generate-from-project',
        body: JSON.stringify({
            projectId: testProjectId
        })
    };
    
    await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-script-generator-v2',
        Payload: JSON.stringify(scriptPayload)
    }));
    
    // Wait for script context to be stored
    console.log('⏳ Waiting for script context to be stored...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Contexts created');
    
    // Now test media curator with detailed error capture
    console.log('\n🎨 Testing Media Curator with detailed error capture...');
    
    const mediaPayload = {
        httpMethod: 'POST',
        path: '/media/curate-from-project',
        body: JSON.stringify({
            projectId: testProjectId
        })
    };
    
    const mediaCommand = new InvokeCommand({
        FunctionName: 'automated-video-pipeline-media-curator-v2',
        Payload: JSON.stringify(mediaPayload)
    });
    
    const mediaResponse = await lambdaClient.send(mediaCommand);
    const mediaResult = JSON.parse(new TextDecoder().decode(mediaResponse.Payload));
    
    console.log('📊 Full Media Curator Response:');
    console.log(JSON.stringify(mediaResult, null, 2));
    
    console.log(`\n📋 Test Project ID: ${testProjectId}`);
}

debugMediaDetailed().catch(console.error);