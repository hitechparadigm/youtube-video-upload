#!/usr/bin/env node

/**
 * Debug Context Structure
 * Check what context data is being passed between agents
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function debugContextStructure() {
    console.log('🔍 Debug Context Structure\n');
    
    const testProjectId = `context-debug-${Date.now()}`;
    
    // Step 1: Create topic context and check output
    console.log('📋 Step 1: Testing Topic Management output...');
    
    const topicPayload = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            projectId: testProjectId,
            baseTopic: 'AI Tools for Content Creation',
            targetAudience: 'content creators'
        })
    };
    
    const topicResponse = await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-topic-management-v2',
        Payload: JSON.stringify(topicPayload)
    }));
    
    const topicResult = JSON.parse(new TextDecoder().decode(topicResponse.Payload));
    console.log('Topic Management Response:');
    console.log(JSON.stringify(topicResult, null, 2));
    
    // Step 2: Create script context and check output
    console.log('\n📝 Step 2: Testing Script Generator output...');
    
    const scriptPayload = {
        httpMethod: 'POST',
        path: '/scripts/generate-from-project',
        body: JSON.stringify({
            projectId: testProjectId
        })
    };
    
    const scriptResponse = await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-script-generator-v2',
        Payload: JSON.stringify(scriptPayload)
    }));
    
    const scriptResult = JSON.parse(new TextDecoder().decode(scriptResponse.Payload));
    console.log('Script Generator Response:');
    console.log(JSON.stringify(scriptResult, null, 2));
    
    // Step 3: Try Media Curator and see exact error
    console.log('\n🎨 Step 3: Testing Media Curator with detailed error...');
    
    const mediaPayload = {
        httpMethod: 'POST',
        path: '/media/curate-from-project',
        body: JSON.stringify({
            projectId: testProjectId
        })
    };
    
    const mediaResponse = await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-media-curator-v2',
        Payload: JSON.stringify(mediaPayload)
    }));
    
    const mediaResult = JSON.parse(new TextDecoder().decode(mediaResponse.Payload));
    console.log('Media Curator Response:');
    console.log(JSON.stringify(mediaResult, null, 2));
    
    console.log(`\n📋 Test Project ID: ${testProjectId}`);
}

debugContextStructure().catch(console.error);