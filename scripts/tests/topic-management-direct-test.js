#!/usr/bin/env node

/**
 * Topic Management Direct Test
 * Tests the Topic Management AI directly
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testTopicManagement() {
    console.log('📋 Testing Topic Management AI Direct');
    
    const testProjectId = `direct-test-${Date.now()}`;
    
    try {
        // Test health endpoint first
        console.log('\n🔍 Testing Health Endpoint:');
        const healthPayload = {
            httpMethod: 'GET',
            path: '/health'
        };
        
        const healthCommand = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify(healthPayload)
        });
        
        const healthResponse = await lambdaClient.send(healthCommand);
        const healthResult = JSON.parse(new TextDecoder().decode(healthResponse.Payload));
        
        console.log(`   Status: ${healthResult.statusCode}`);
        if (healthResult.statusCode === 200) {
            const body = JSON.parse(healthResult.body);
            console.log(`   Service: ${body.service || 'Unknown'}`);
            console.log(`   Status: ${body.status || 'Unknown'}`);
        }
        
        // Test topic generation
        console.log('\n📋 Testing Topic Generation:');
        const topicPayload = {
            httpMethod: 'POST',
            path: '/topics/enhanced',
            body: JSON.stringify({
                projectId: testProjectId,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators',
                contentType: 'educational',
                videoDuration: 480
            })
        };
        
        const topicCommand = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify(topicPayload)
        });
        
        const topicResponse = await lambdaClient.send(topicCommand);
        const topicResult = JSON.parse(new TextDecoder().decode(topicResponse.Payload));
        
        console.log(`   Status: ${topicResult.statusCode}`);
        if (topicResult.statusCode === 200) {
            const body = JSON.parse(topicResult.body);
            console.log(`   Success: ${body.success}`);
            console.log(`   Project ID: ${body.projectId}`);
            console.log(`   Topic Context: ${body.topicContext ? 'Generated' : 'Missing'}`);
            console.log(`   Expanded Topics: ${body.topicContext?.expandedTopics?.length || 0}`);
            
            return {
                success: true,
                projectId: body.projectId,
                topicContext: body.topicContext
            };
        } else {
            console.log(`   Error: ${topicResult.body}`);
            return { success: false };
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false };
    }
}

async function testScriptGeneration(projectId) {
    console.log('\n📝 Testing Script Generation with Topic Context:');
    
    try {
        const scriptPayload = {
            httpMethod: 'POST',
            path: '/scripts/generate-from-project',
            body: JSON.stringify({
                projectId: projectId
            })
        };
        
        const scriptCommand = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-script-generator-v2',
            Payload: JSON.stringify(scriptPayload)
        });
        
        const scriptResponse = await lambdaClient.send(scriptCommand);
        const scriptResult = JSON.parse(new TextDecoder().decode(scriptResponse.Payload));
        
        console.log(`   Status: ${scriptResult.statusCode}`);
        if (scriptResult.statusCode === 200) {
            const body = JSON.parse(scriptResult.body);
            console.log(`   Success: ${body.success}`);
            console.log(`   Script Scenes: ${body.script?.scenes?.length || 0}`);
            console.log(`   Total Duration: ${body.script?.totalDuration || 0}s`);
            return { success: true };
        } else {
            console.log(`   Error: ${scriptResult.body}`);
            return { success: false };
        }
        
    } catch (error) {
        console.error('❌ Script Generation test failed:', error.message);
        return { success: false };
    }
}

async function main() {
    console.log('🚀 Starting Topic Management Direct Test\n');
    
    const topicResult = await testTopicManagement();
    
    if (topicResult.success && topicResult.projectId) {
        console.log(`\n✅ Topic Management working! Testing next step...`);
        await testScriptGeneration(topicResult.projectId);
    } else {
        console.log('\n❌ Topic Management failed - cannot test script generation');
    }
}

main().catch(console.error);