#!/usr/bin/env node

/**
 * Workflow Orchestrator Correct Test
 * Tests with proper action parameters
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testWorkflowOrchestrator() {
    console.log('🎯 Testing Workflow Orchestrator with Correct Actions');
    
    try {
        // Test different actions
        const tests = [
            {
                name: 'Health Check',
                payload: {
                    httpMethod: 'GET',
                    path: '/health'
                }
            },
            {
                name: 'Start Direct Pipeline',
                payload: {
                    action: 'start-direct',
                    testMode: true,
                    maxVideos: 1
                }
            },
            {
                name: 'Scheduled Execution',
                payload: {
                    action: 'scheduled',
                    source: 'aws.events',
                    maxVideos: 1
                }
            },
            {
                name: 'Start Enhanced Pipeline',
                payload: {
                    action: 'start-enhanced',
                    testMode: true,
                    maxVideos: 1
                }
            }
        ];
        
        for (const test of tests) {
            console.log(`\n📋 Testing ${test.name}:`);
            
            try {
                const command = new InvokeCommand({
                    FunctionName: 'automated-video-pipeline-workflow-orchestrator-v2',
                    Payload: JSON.stringify(test.payload)
                });
                
                const response = await lambdaClient.send(command);
                const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
                
                if (responsePayload.statusCode) {
                    // HTTP response
                    console.log(`   Status: ${responsePayload.statusCode}`);
                    if (responsePayload.statusCode === 200) {
                        const body = JSON.parse(responsePayload.body);
                        console.log(`   Success: ${body.success || 'Unknown'}`);
                        console.log(`   Message: ${body.message || 'No message'}`);
                        if (body.projectId) {
                            console.log(`   Project ID: ${body.projectId}`);
                        }
                    } else {
                        console.log(`   Error: ${responsePayload.body}`);
                    }
                } else if (responsePayload.errorType) {
                    // Error response
                    console.log(`   ❌ Error: ${responsePayload.errorMessage}`);
                } else {
                    // Direct response
                    console.log(`   Success: ${responsePayload.success || 'Unknown'}`);
                    console.log(`   Message: ${responsePayload.message || 'No message'}`);
                    if (responsePayload.projectId) {
                        console.log(`   Project ID: ${responsePayload.projectId}`);
                    }
                }
                
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function main() {
    console.log('🚀 Starting Workflow Orchestrator Correct Test\n');
    
    await testWorkflowOrchestrator();
}

main().catch(console.error);