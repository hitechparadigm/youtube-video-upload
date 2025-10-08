#!/usr/bin/env node

/**
 * Debug Topic Management
 * Investigate why Topic Management is failing in end-to-end tests
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function debugTopicManagement() {
    console.log('🔍 Debug Topic Management AI\n');
    
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check...');
    try {
        const healthResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/health'
            })
        }));
        
        const healthResult = JSON.parse(new TextDecoder().decode(healthResponse.Payload));
        console.log('Health Response:');
        console.log(JSON.stringify(healthResult, null, 2));
    } catch (error) {
        console.error('Health check error:', error);
    }
    
    // Test 2: Enhanced Topics Endpoint
    console.log('\n📋 Test 2: Enhanced Topics Endpoint...');
    try {
        const topicResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: `debug-${Date.now()}`,
                    baseTopic: 'AI Tools for Content Creation',
                    targetAudience: 'content creators',
                    contentType: 'educational',
                    videoDuration: 480
                })
            })
        }));
        
        const topicResult = JSON.parse(new TextDecoder().decode(topicResponse.Payload));
        console.log('Enhanced Topics Response:');
        console.log(JSON.stringify(topicResult, null, 2));
    } catch (error) {
        console.error('Enhanced topics error:', error);
    }
    
    // Test 3: Simple Topics Endpoint
    console.log('\n📋 Test 3: Simple Topics Endpoint...');
    try {
        const simpleResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/topics'
            })
        }));
        
        const simpleResult = JSON.parse(new TextDecoder().decode(simpleResponse.Payload));
        console.log('Simple Topics Response:');
        console.log(JSON.stringify(simpleResult, null, 2));
    } catch (error) {
        console.error('Simple topics error:', error);
    }
    
    // Test 4: Direct Invocation (no HTTP wrapper)
    console.log('\n📋 Test 4: Direct Invocation...');
    try {
        const directResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                projectId: `direct-${Date.now()}`,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators'
            })
        }));
        
        const directResult = JSON.parse(new TextDecoder().decode(directResponse.Payload));
        console.log('Direct Invocation Response:');
        console.log(JSON.stringify(directResult, null, 2));
    } catch (error) {
        console.error('Direct invocation error:', error);
    }
}

debugTopicManagement().catch(console.error);