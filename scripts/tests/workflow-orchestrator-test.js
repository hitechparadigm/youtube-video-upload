#!/usr/bin/env node

/**
 * Workflow Orchestrator Direct Test
 * Tests the workflow orchestrator and Google Sheets integration
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testWorkflowOrchestrator() {
    console.log('🎯 Testing Workflow Orchestrator Direct');
    
    try {
        // Test different payload formats
        const payloads = [
            {
                name: 'EventBridge Format',
                payload: {
                    source: 'eventbridge',
                    testMode: true,
                    maxVideos: 1
                }
            },
            {
                name: 'Direct Invocation',
                payload: {
                    testMode: true,
                    maxVideos: 1
                }
            },
            {
                name: 'Empty Payload',
                payload: {}
            }
        ];
        
        for (const test of payloads) {
            console.log(`\n📋 Testing ${test.name}:`);
            
            try {
                const command = new InvokeCommand({
                    FunctionName: 'automated-video-pipeline-workflow-orchestrator-v2',
                    Payload: JSON.stringify(test.payload)
                });
                
                const response = await lambdaClient.send(command);
                const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
                
                console.log(`   Response: ${JSON.stringify(responsePayload, null, 2)}`);
                
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testHealthEndpoints() {
    console.log('\n🔍 Testing All Agent Health Endpoints:');
    
    const agents = [
        'automated-video-pipeline-topic-management-v2',
        'automated-video-pipeline-script-generator-v2',
        'automated-video-pipeline-media-curator-v2',
        'automated-video-pipeline-audio-generator-v2',
        'automated-video-pipeline-video-assembler-v2',
        'automated-video-pipeline-youtube-publisher-v2',
        'automated-video-pipeline-workflow-orchestrator-v2'
    ];
    
    for (const agent of agents) {
        try {
            const command = new InvokeCommand({
                FunctionName: agent,
                Payload: JSON.stringify({
                    httpMethod: 'GET',
                    path: '/health'
                })
            });
            
            const response = await lambdaClient.send(command);
            const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
            
            if (responsePayload.statusCode === 200) {
                console.log(`   ✅ ${agent.split('-').pop()}: Working`);
            } else {
                console.log(`   ❌ ${agent.split('-').pop()}: Failed (${responsePayload.statusCode})`);
            }
            
        } catch (error) {
            console.log(`   ❌ ${agent.split('-').pop()}: Error - ${error.message}`);
        }
    }
}

async function main() {
    console.log('🚀 Starting Workflow Orchestrator Investigation\n');
    
    await testHealthEndpoints();
    await testWorkflowOrchestrator();
}

main().catch(console.error);