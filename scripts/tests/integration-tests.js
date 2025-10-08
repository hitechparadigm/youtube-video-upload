#!/usr/bin/env node

/**
 * Integration Tests - Test consolidated modules
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
            agentTests: null,
            pipelineTest: null,
            videoCreationTest: null
        };

        try {
            // Test 1: Agent Testing
            console.log('\n🤖 Test 1: Agent Testing Module');
            results.agentTests = await this.agentTester.testAllAgents();
            
            // Test 2: Production Pipeline
            console.log('\n🎬 Test 2: Production Pipeline Module');
            results.pipelineTest = await this.testPipeline();
            
            // Test 3: Video Creation
            console.log('\n📹 Test 3: Video Creation Module');
            results.videoCreationTest = await this.testVideoCreation();

            // Summary
            console.log('\n📊 Integration Test Results:');
            console.log(`   🤖 Agent Tests: ${results.agentTests.success ? 'PASS' : 'FAIL'}`);
            console.log(`   🎬 Pipeline Test: ${results.pipelineTest.success ? 'PASS' : 'FAIL'}`);
            console.log(`   📹 Video Creation: ${results.videoCreationTest.success ? 'PASS' : 'FAIL'}`);

            const passCount = Object.values(results).filter(r => r && r.success).length;
            console.log(`\n🎯 Overall: ${passCount}/3 tests passed`);

            return {
                success: passCount >= 2,
                results,
                passCount
            };

        } catch (error) {
            console.log(`💥 Integration tests failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testPipeline() {
        try {
            const config = {
                topic: "Test AI Tools",
                keywords: ["test", "ai", "tools"],
                priority: "low",
                targetDuration: 300
            };

            // Test direct Lambda pipeline (safer than Step Functions)
            const result = await this.pipeline.runDirectLambdaPipeline({
                topicId: 'integration-test',
                ...config
            });

            return {
                success: result.success && result.workingAgents >= 1,
                workingAgents: result.workingAgents,
                details: result
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testVideoCreation() {
        try {
            const config = {
                title: 'Integration Test Video',
                description: 'Test video for integration testing',
                keywords: ['test', 'integration'],
                duration: 60
            };

            const result = await this.videoCreator.createVideo(config);

            return {
                success: result.success,
                projectId: result.projectId,
                components: result.components
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

export default IntegrationTests;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new IntegrationTests();
    
    tests.runAllTests().then(result => {
        if (result.success) {
            console.log('\n🎉 Integration tests completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Integration tests failed!');
            process.exit(1);
        }
    });
}