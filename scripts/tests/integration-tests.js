#!/usr/bin/env node

/**
 * Integration Tests - Test consolidated modules and agent flow
 */

import ProductionPipeline from '../core/production-pipeline.js';
import AgentTester from '../core/agent-tester.js';
import VideoCreator from '../core/video-creator.js';

class IntegrationTests {
    constructor() {
        this.pipeline = new ProductionPipeline();
        this.agentTester = new AgentTester();
        this.videoCreator = new VideoCreator();
    }

    async runAllTests() {
        console.log('🧪 Running Integration Tests');
        console.log('='.repeat(80));

        const results = {
            agentHealthTest: null,
            agentFlowTest: null,
            pipelineTest: null,
            videoCreationTest: null
        };

        try {
            // Test 1: Agent Health Check
            console.log('\n🤖 Test 1: Agent Health Check');
            results.agentHealthTest = await this.testAgentHealth();
            
            // Test 2: Agent Flow Integration
            console.log('\n🔄 Test 2: Agent Flow Integration');
            results.agentFlowTest = await this.testAgentFlow();
            
            // Test 3: Production Pipeline
            console.log('\n🎬 Test 3: Production Pipeline Module');
            results.pipelineTest = await this.testPipeline();
            
            // Test 4: Video Creation
            console.log('\n📹 Test 4: Video Creation Module');
            results.videoCreationTest = await this.testVideoCreation();

            // Summary
            console.log('\n📊 Integration Test Results:');
            console.log(`   🤖 Agent Health: ${results.agentHealthTest.success ? 'PASS' : 'FAIL'}`);
            console.log(`   🔄 Agent Flow: ${results.agentFlowTest.success ? 'PASS' : 'FAIL'}`);
            console.log(`   🎬 Pipeline Test: ${results.pipelineTest.success ? 'PASS' : 'FAIL'}`);
            console.log(`   📹 Video Creation: ${results.videoCreationTest.success ? 'PASS' : 'FAIL'}`);

            const passCount = Object.values(results).filter(r => r && r.success).length;
            console.log(`\n🎯 Overall: ${passCount}/4 tests passed`);

            return {
                success: passCount >= 3,
                results,
                passCount,
                totalTests: 4
            };

        } catch (error) {
            console.log(`💥 Integration tests failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testAgentHealth() {
        try {
            console.log('   Testing all AI agents...');
            const result = await this.agentTester.testAllAgents();
            
            console.log(`   ✅ Working agents: ${result.workingAgents.length}/6`);
            console.log(`   ❌ Failed agents: ${result.failedAgents.length}/6`);
            
            return {
                success: result.workingAgents.length >= 3, // At least 50% working
                workingCount: result.workingAgents.length,
                totalCount: 6,
                workingAgents: result.workingAgents,
                failedAgents: result.failedAgents
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testAgentFlow() {
        try {
            console.log('   Testing agent flow coordination...');
            
            // Test the expected flow: Topic Management → Script Generator → Media Curator
            const flowTests = [
                {
                    name: 'Topic Management',
                    agent: 'automated-video-pipeline-topic-management-v2',
                    method: 'GET',
                    path: '/topics'
                },
                {
                    name: 'Media Curator',
                    agent: 'automated-video-pipeline-media-curator-v2', 
                    method: 'POST',
                    path: '/media/search',
                    body: { query: 'test', mediaCount: 1, projectId: 'flow-test' }
                },
                {
                    name: 'YouTube Publisher',
                    agent: 'automated-video-pipeline-youtube-publisher-v2',
                    method: 'GET', 
                    path: '/health'
                }
            ];

            let workingFlow = 0;
            const flowResults = [];

            for (const test of flowTests) {
                const result = await this.agentTester.lambdaInvoker.invokeWithHTTP(
                    test.agent,
                    test.method,
                    test.path,
                    test.body || {}
                );

                if (result.success) {
                    workingFlow++;
                    console.log(`   ✅ ${test.name}: Flow working`);
                } else {
                    console.log(`   ❌ ${test.name}: Flow broken`);
                }

                flowResults.push({ name: test.name, success: result.success });
            }

            return {
                success: workingFlow >= 2, // At least 2 agents in flow working
                workingFlow,
                totalFlow: flowTests.length,
                flowResults
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testPipeline() {
        try {
            console.log('   Testing production pipeline...');
            
            const config = {
                topic: "Integration Test Topic",
                keywords: ["test", "integration", "ai"],
                priority: "low",
                targetDuration: 300
            };

            // Test direct Lambda pipeline (safer than Step Functions)
            const result = await this.pipeline.runDirectLambdaPipeline({
                topicId: 'integration-test-' + Date.now(),
                ...config
            });

            console.log(`   📊 Working agents in pipeline: ${result.workingAgents || 0}`);

            return {
                success: result.success && (result.workingAgents || 0) >= 1,
                workingAgents: result.workingAgents || 0,
                details: result
            };

        } catch (error) {
            console.log(`   ❌ Pipeline test failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testVideoCreation() {
        try {
            console.log('   Testing video creation workflow...');
            
            const config = {
                title: 'Integration Test Video',
                description: 'Test video for integration testing',
                keywords: ['test', 'integration'],
                duration: 60
            };

            const result = await this.videoCreator.createVideo(config);

            console.log(`   📁 Project created: ${result.projectId || 'N/A'}`);

            return {
                success: result.success,
                projectId: result.projectId,
                components: result.components
            };

        } catch (error) {
            console.log(`   ❌ Video creation test failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default IntegrationTests;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new IntegrationTests();
    
    tests.runAllTests().then(result => {
        console.log('\n🎯 INTEGRATION TEST SUMMARY:');
        console.log(`📊 Tests Passed: ${result.passCount}/${result.totalTests || 4}`);
        console.log(`📈 Success Rate: ${Math.round((result.passCount / (result.totalTests || 4)) * 100)}%`);
        
        if (result.success) {
            console.log('\n🎉 Integration tests completed successfully!');
            console.log('✅ System is ready for deployment');
            process.exit(0);
        } else {
            console.log('\n⚠️  Integration tests completed with issues');
            console.log('🔧 Some components need fixing before deployment');
            process.exit(1);
        }
    }).catch(error => {
        console.error('\n💥 Integration tests failed:', error.message);
        process.exit(2);
    });
}