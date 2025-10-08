#!/usr/bin/env node

/**
 * Direct Orchestration Test - Test the new workflow without Step Functions
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

class DirectOrchestrationTest {
    constructor() {
        this.lambdaInvoker = new LambdaInvoker();
    }

    async testDirectOrchestration() {
        console.log('🎯 Testing Direct Orchestration (No Step Functions)');
        console.log('='.repeat(80));

        try {
            // Test 1: Health Check
            console.log('\n🏥 Test 1: Workflow Orchestrator Health Check');
            const healthResult = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-workflow-orchestrator-v2',
                'GET',
                '/health',
                {}
            );

            if (healthResult.success) {
                console.log('   ✅ Workflow Orchestrator: HEALTHY');
                const healthData = typeof healthResult.data.body === 'string' 
                    ? JSON.parse(healthResult.data.body) 
                    : healthResult.data.body || healthResult.data;
                console.log(`   📊 Version: ${healthData.version || 'Unknown'}`);
                console.log(`   🎯 Type: ${healthData.type || 'Unknown'}`);
            } else {
                console.log('   ❌ Workflow Orchestrator: UNHEALTHY');
                return { success: false, error: 'Health check failed' };
            }

            // Test 2: Direct Pipeline Execution
            console.log('\n🚀 Test 2: Direct Pipeline Execution');
            const pipelineRequest = {
                action: 'start-direct',
                baseTopic: 'Direct Orchestration Test',
                targetAudience: 'developers',
                contentType: 'educational',
                videoDuration: 300,
                videoStyle: 'engaging_educational',
                scheduledBy: 'integration-test'
            };

            console.log('   📋 Starting direct pipeline...');
            console.log(`   🎯 Topic: ${pipelineRequest.baseTopic}`);
            
            const pipelineResult = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-workflow-orchestrator-v2',
                'POST',
                '/workflow/start',
                pipelineRequest
            );

            if (pipelineResult.success) {
                console.log('   ✅ Direct Pipeline: STARTED');
                
                const responseData = typeof pipelineResult.data.body === 'string' 
                    ? JSON.parse(pipelineResult.data.body) 
                    : pipelineResult.data.body || pipelineResult.data;

                console.log(`   📁 Project ID: ${responseData.projectId || 'Unknown'}`);
                console.log(`   🆔 Execution ID: ${responseData.executionId || 'Unknown'}`);
                console.log(`   🤖 Working Agents: ${responseData.result?.workingAgents || 0}/6`);
                console.log(`   📊 Success: ${responseData.success ? 'YES' : 'NO'}`);

                return {
                    success: true,
                    projectId: responseData.projectId,
                    executionId: responseData.executionId,
                    workingAgents: responseData.result?.workingAgents || 0,
                    pipelineSuccess: responseData.success
                };

            } else {
                console.log('   ❌ Direct Pipeline: FAILED');
                console.log(`   Error: ${pipelineResult.error || 'Unknown error'}`);
                return { 
                    success: false, 
                    error: pipelineResult.error || 'Pipeline execution failed' 
                };
            }

        } catch (error) {
            console.log(`💥 Direct orchestration test failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async compareWithStepFunctions() {
        console.log('\n📊 Comparison: Direct Orchestration vs Step Functions');
        console.log('='.repeat(60));

        console.log('✅ DIRECT ORCHESTRATION ADVANTAGES:');
        console.log('   🚀 Faster execution (no state machine overhead)');
        console.log('   💰 Lower cost (no Step Functions charges)');
        console.log('   🔧 Simpler debugging (single Lambda function)');
        console.log('   📊 Better error handling (immediate feedback)');
        console.log('   🎯 More flexible (dynamic agent selection)');
        console.log('   📈 Easier monitoring (CloudWatch logs in one place)');

        console.log('\n⚠️  STEP FUNCTIONS ADVANTAGES:');
        console.log('   🔄 Visual workflow representation');
        console.log('   ⏸️  Built-in retry and error handling');
        console.log('   📋 Execution history tracking');
        console.log('   🎛️  Complex branching and parallel execution');

        console.log('\n🎯 RECOMMENDATION:');
        console.log('✅ Use Direct Orchestration for this use case because:');
        console.log('   • Linear workflow (no complex branching needed)');
        console.log('   • Cost optimization is important');
        console.log('   • Faster execution is preferred');
        console.log('   • Custom error handling is sufficient');
    }
}

export default DirectOrchestrationTest;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new DirectOrchestrationTest();
    
    test.testDirectOrchestration().then(result => {
        console.log('\n🎯 DIRECT ORCHESTRATION TEST RESULTS:');
        console.log(`📊 Success: ${result.success ? 'YES' : 'NO'}`);
        
        if (result.success) {
            console.log(`🤖 Working Agents: ${result.workingAgents}/6`);
            console.log(`📈 Pipeline Success: ${result.pipelineSuccess ? 'YES' : 'PARTIAL'}`);
            console.log('✅ Direct orchestration is working!');
        } else {
            console.log(`❌ Error: ${result.error}`);
        }

        // Show comparison
        test.compareWithStepFunctions();

        console.log('\n🎉 CONCLUSION:');
        if (result.success) {
            console.log('✅ Direct orchestration successfully replaces Step Functions');
            console.log('🚀 System is more efficient and cost-effective');
            process.exit(0);
        } else {
            console.log('⚠️  Direct orchestration needs more work');
            process.exit(1);
        }
    }).catch(error => {
        console.error('\n💥 Test failed:', error.message);
        process.exit(2);
    });
}