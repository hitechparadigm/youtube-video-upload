#!/usr/bin/env node

/**
 * Debug Video Assembler Context Usage
 * Test what happens when Video Assembler tries to use the media context
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function debugVideoAssemblerContext() {
    console.log('🔍 Debug Video Assembler Context Usage\n');
    
    const testProjectId = `video-debug-${Date.now()}`;
    
    // Create full context chain
    console.log('📋 Creating full context chain...');
    
    // Topic context
    await lambdaClient.send(new InvokeCommand({
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
    
    // Script context
    await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-script-generator-v2',
        Payload: JSON.stringify({
            httpMethod: 'POST',
            path: '/scripts/generate-from-project',
            body: JSON.stringify({
                projectId: testProjectId
            })
        })
    }));
    
    // Media context
    await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-media-curator-v2',
        Payload: JSON.stringify({
            httpMethod: 'POST',
            path: '/media/curate-from-project',
            body: JSON.stringify({
                projectId: testProjectId
            })
        })
    }));
    
    console.log('✅ Context chain created');
    
    // Now test Video Assembler
    console.log('\n🎬 Testing Video Assembler with context...');
    
    const videoPayload = {
        httpMethod: 'POST',
        path: '/video/assemble-from-project',
        body: JSON.stringify({
            projectId: testProjectId,
            videoSettings: {},
            qualitySettings: {},
            outputFormat: 'mp4'
        })
    };
    
    const videoResponse = await lambdaClient.send(new InvokeCommand({
        FunctionName: 'automated-video-pipeline-video-assembler-v2',
        Payload: JSON.stringify(videoPayload)
    }));
    
    const videoResult = JSON.parse(new TextDecoder().decode(videoResponse.Payload));
    console.log('Video Assembler Response:');
    console.log(JSON.stringify(videoResult, null, 2));
    
    console.log(`\n📋 Test Project ID: ${testProjectId}`);
}

debugVideoAssemblerContext().catch(console.error);