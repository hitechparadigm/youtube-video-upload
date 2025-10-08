#!/usr/bin/env node

/**
 * Critical System Test
 * Essential tests to verify system functionality - NO "nice to have" tests
 * 
 * Purpose: Quickly verify system is working and provide next steps for Kiro
 * Usage: node scripts/tests/critical-system-test.js
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

// All 6 AI agents that must be working
const AGENTS = [
    'automated-video-pipeline-topic-management-v2',
    'automated-video-pipeline-script-generator-v2', 
    'automated-video-pipeline-media-curator-v2',
    'automated-video-pipeline-audio-generator-v2',
    'automated-video-pipeline-video-assembler-v2',
    'automated-video-pipeline-youtube-publisher-v2'
];

async function testAgentHealth(functionName) {
    try {
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/health'
            })
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        return result.statusCode === 200;
    } catch (error) {
        return false;
    }
}

async function testEndToEndPipeline() {
    const testProjectId = `critical-test-${Date.now()}`;
    
    try {
        // Test Topic Management
        const topicResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: testProjectId,
                    baseTopic: 'AI Tools',
                    targetAudience: 'creators'
                })
            })
        }));
        
        if (JSON.parse(new TextDecoder().decode(topicResponse.Payload)).statusCode !== 200) {
            return { success: false, step: 'Topic Management' };
        }
        
        // Wait for context
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test Script Generator
        const scriptResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-script-generator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/scripts/generate-from-project',
                body: JSON.stringify({ projectId: testProjectId })
            })
        }));
        
        if (JSON.parse(new TextDecoder().decode(scriptResponse.Payload)).statusCode !== 200) {
            return { success: false, step: 'Script Generator' };
        }
        
        // Wait for context
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test Media Curator
        const mediaResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'automated-video-pipeline-media-curator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/media/curate-from-project',
                body: JSON.stringify({ projectId: testProjectId })
            })
        }));
        
        if (JSON.parse(new TextDecoder().decode(mediaResponse.Payload)).statusCode !== 200) {
            return { success: false, step: 'Media Curator' };
        }
        
        return { success: true, projectId: testProjectId };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function runCriticalTests() {
    console.log('🔍 Critical System Test - Essential Verification Only\n');
    
    // Test 1: Agent Health (30 seconds)
    console.log('📋 Test 1: Agent Health Check...');
    const healthResults = await Promise.all(
        AGENTS.map(async (agent) => ({
            agent: agent.replace('automated-video-pipeline-', '').replace('-v2', ''),
            healthy: await testAgentHealth(agent)
        }))
    );
    
    const healthyCount = healthResults.filter(r => r.healthy).length;
    const healthPercentage = Math.round((healthyCount / AGENTS.length) * 100);
    
    console.log('   Results:');
    healthResults.forEach(result => {
        console.log(`   ${result.healthy ? '✅' : '❌'} ${result.agent}`);
    });
    console.log(`   Health: ${healthPercentage}% (${healthyCount}/${AGENTS.length})`);
    
    // Test 2: Context Flow (60 seconds)
    console.log('\n📋 Test 2: Context Flow Verification...');
    const pipelineResult = await testEndToEndPipeline();
    
    if (pipelineResult.success) {
        console.log('   ✅ Context flow working (Topic → Script → Media)');
    } else {
        console.log(`   ❌ Context flow broken at: ${pipelineResult.step || 'Unknown'}`);
        if (pipelineResult.error) {
            console.log(`   Error: ${pipelineResult.error}`);
        }
    }
    
    // Results Summary
    console.log('\n📊 CRITICAL TEST RESULTS:');
    console.log(`   Agent Health: ${healthPercentage}%`);
    console.log(`   Context Flow: ${pipelineResult.success ? 'WORKING' : 'BROKEN'}`);
    
    // System Status
    const systemWorking = healthPercentage === 100 && pipelineResult.success;
    
    if (systemWorking) {
        console.log('\n🎉 SYSTEM STATUS: FULLY OPERATIONAL');
        console.log('   ✅ All agents healthy');
        console.log('   ✅ Context flow working');
        console.log('   ✅ Ready for video production');
        console.log('\n🎯 NEXT STEPS FOR KIRO:');
        console.log('   1. System is 100% operational');
        console.log('   2. No critical issues to fix');
        console.log('   3. Focus on optional enhancements if needed');
        console.log('   4. Run full end-to-end test: node scripts/tests/complete-end-to-end-test.js');
    } else {
        console.log('\n⚠️ SYSTEM STATUS: ISSUES DETECTED');
        console.log('   🎯 IMMEDIATE ACTIONS REQUIRED:');
        
        if (healthPercentage < 100) {
            console.log('   1. Fix unhealthy agents (see health check results above)');
            console.log('   2. Check CloudWatch logs for specific errors');
        }
        
        if (!pipelineResult.success) {
            console.log('   3. Fix context flow issue (race condition or validation)');
            console.log('   4. Check agent communication and timing');
        }
        
        console.log('   5. Re-run this test after fixes');
    }
    
    console.log(`\n📋 Test Project ID: ${pipelineResult.projectId || 'N/A'}`);
    
    return systemWorking;
}

// Run tests
runCriticalTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
        console.error('❌ Critical test failed:', error);
        process.exit(1);
    });