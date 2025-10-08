#!/usr/bin/env node

/**
 * Agent Tester - Unified testing interface for all AI agents
 */

import LambdaInvoker from '../utils/lambda-invoker.js';
import FileHelpers from '../utils/file-helpers.js';

class AgentTester {
    constructor() {
        this.lambdaInvoker = new LambdaInvoker();
        this.agents = {
            'topic-management': {
                functionName: 'automated-video-pipeline-topic-management-v2',
                method: 'GET',
                path: '/topics',
                testBody: {}
            },
            'script-generator': {
                functionName: 'automated-video-pipeline-script-generator-v2',
                method: 'POST',
                path: '/scripts/generate-enhanced',
                testBody: {
                    topicContext: {
                        mainTopic: 'Test Topic',
                        expandedTopics: [{
                            subtopic: 'Test Subtopic',
                            relevanceScore: 95,
                            keywords: ['test', 'ai']
                        }]
                    },
                    baseTopic: 'Test Topic',
                    targetLength: 300,
                    projectId: 'test-project'
                }
            },
            'media-curator': {
                functionName: 'automated-video-pipeline-media-curator-v2',
                method: 'POST',
                path: '/media/search',
                testBody: {
                    query: 'AI technology',
                    mediaCount: 3,
                    quality: '1080p',
                    projectId: 'test-project'
                }
            },
            'audio-generator': {
                functionName: 'automated-video-pipeline-audio-generator-v2',
                method: 'POST',
                path: '/audio/generate',
                testBody: {
                    text: 'This is a test audio generation.',
                    voiceId: 'Joanna',
                    engine: 'standard',
                    outputFormat: 'mp3',
                    projectId: 'test-project'
                }
            },
            'video-assembler': {
                functionName: 'automated-video-pipeline-video-assembler-v2',
                method: 'POST',
                path: '/video/assemble',
                testBody: {
                    projectId: 'test-project',
                    outputOptions: {
                        resolution: '1920x1080',
                        fps: 30,
                        format: 'mp4'
                    }
                }
            },
            'youtube-publisher': {
                functionName: 'automated-video-pipeline-youtube-publisher-v2',
                method: 'POST',
                path: '/youtube/metadata',
                testBody: {
                    projectId: 'test-project',
                    videoTitle: 'Test Video',
                    description: 'Test Description',
                    tags: ['test', 'ai']
                }
            }
        };
    }

    async testAllAgents() {
        console.log('🧪 Testing All AI Agents');
        console.log('='.repeat(80));

        const results = {};
        const workingAgents = [];
        const failedAgents = [];

        for (const [agentName, config] of Object.entries(this.agents)) {
            console.log(`\n📡 Testing ${agentName}...`);
            
            const result = await this.lambdaInvoker.invokeWithHTTP(
                config.functionName,
                config.method,
                config.path,
                config.testBody
            );

            results[agentName] = result;

            if (result.success) {
                console.log(`   ✅ ${agentName}: WORKING`);
                workingAgents.push(agentName);
            } else {
                console.log(`   ❌ ${agentName}: FAILED`);
                if (result.error) {
                    console.log(`      Error: ${result.error}`);
                }
                failedAgents.push(agentName);
            }
        }

        console.log('\n📊 Agent Test Results:');
        console.log(`   ✅ Working: ${workingAgents.length}/6 (${Math.round(workingAgents.length/6*100)}%)`);
        console.log(`   ❌ Failed: ${failedAgents.length}/6`);

        if (workingAgents.length > 0) {
            console.log(`   🤖 Working agents: ${workingAgents.join(', ')}`);
        }

        if (failedAgents.length > 0) {
            console.log(`   🔧 Failed agents: ${failedAgents.join(', ')}`);
        }

        const resultsFile = FileHelpers.saveResults('agent-test', {
            summary: {
                total: 6,
                working: workingAgents.length,
                failed: failedAgents.length,
                workingAgents,
                failedAgents
            },
            results
        });

        console.log(`\n📁 Results saved to: ${resultsFile}`);

        return {
            workingAgents,
            failedAgents,
            results,
            success: workingAgents.length >= 3
        };
    }

    async testSpecificAgent(agentName, customConfig = null) {
        console.log(`🧪 Testing Specific Agent: ${agentName}`);
        console.log('='.repeat(50));

        const config = customConfig || this.agents[agentName];
        
        if (!config) {
            console.log(`❌ Unknown agent: ${agentName}`);
            return { success: false, error: 'Unknown agent' };
        }

        const result = await this.lambdaInvoker.invokeWithHTTP(
            config.functionName,
            config.method,
            config.path,
            config.testBody
        );

        if (result.success) {
            console.log(`✅ ${agentName}: WORKING`);
            if (result.data && result.data.body) {
                const responseData = typeof result.data.body === 'string' 
                    ? JSON.parse(result.data.body) 
                    : result.data.body;
                console.log(`   📊 Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
            }
        } else {
            console.log(`❌ ${agentName}: FAILED`);
            console.log(`   Error: ${result.error || 'Unknown error'}`);
        }

        return result;
    }

    async fixProblematicAgents() {
        console.log('🔧 Attempting to Fix Problematic Agents');
        console.log('='.repeat(80));

        // Test all agents first
        const testResults = await this.testAllAgents();
        
        if (testResults.failedAgents.length === 0) {
            console.log('🎉 All agents are working! No fixes needed.');
            return testResults;
        }

        console.log(`\n🔧 Attempting fixes for ${testResults.failedAgents.length} failed agents...`);

        // Try alternative endpoints for failed agents
        const alternativeEndpoints = {
            'audio-generator': [
                { path: '/audio/generate-from-text', method: 'POST' },
                { path: '/audio/synthesize', method: 'POST' }
            ],
            'video-assembler': [
                { path: '/video/assemble-from-project', method: 'POST' },
                { path: '/video/create', method: 'POST' }
            ],
            'youtube-publisher': [
                { path: '/youtube/publish', method: 'POST' },
                { path: '/publish', method: 'POST' },
                { path: '/youtube/optimize', method: 'POST' }
            ]
        };

        const fixedAgents = [];

        for (const agentName of testResults.failedAgents) {
            if (alternativeEndpoints[agentName]) {
                console.log(`\n🔧 Trying alternative endpoints for ${agentName}...`);
                
                for (const altEndpoint of alternativeEndpoints[agentName]) {
                    const altConfig = {
                        ...this.agents[agentName],
                        path: altEndpoint.path,
                        method: altEndpoint.method
                    };
                    
                    console.log(`   Testing: ${altEndpoint.method} ${altEndpoint.path}`);
                    
                    const result = await this.testSpecificAgent(agentName, altConfig);
                    
                    if (result.success) {
                        console.log(`   ✅ FIXED: ${agentName} works with ${altEndpoint.path}`);
                        this.agents[agentName] = altConfig; // Update the working config
                        fixedAgents.push(agentName);
                        break;
                    }
                }
            }
        }

        console.log(`\n🎉 Fix Results: ${fixedAgents.length}/${testResults.failedAgents.length} agents fixed`);
        
        if (fixedAgents.length > 0) {
            console.log(`   ✅ Fixed: ${fixedAgents.join(', ')}`);
        }

        return {
            ...testResults,
            fixedAgents,
            totalWorking: testResults.workingAgents.length + fixedAgents.length
        };
    }

    async validateAgentEndpoints() {
        console.log('🔍 Validating Agent Endpoints');
        console.log('='.repeat(50));

        const validationResults = {};

        for (const [agentName, config] of Object.entries(this.agents)) {
            console.log(`\n🔍 Validating ${agentName}...`);
            console.log(`   Function: ${config.functionName}`);
            console.log(`   Endpoint: ${config.method} ${config.path}`);
            
            // Simple validation - just check if function responds
            const result = await this.lambdaInvoker.invokeWithHTTP(
                config.functionName,
                config.method,
                config.path,
                {}
            );

            validationResults[agentName] = {
                functionExists: result.statusCode !== undefined,
                endpointResponds: result.success || result.statusCode === 400, // 400 might be expected for empty body
                actualStatusCode: result.statusCode,
                error: result.error
            };

            if (validationResults[agentName].functionExists) {
                console.log(`   ✅ Function exists`);
            } else {
                console.log(`   ❌ Function not found`);
            }

            if (validationResults[agentName].endpointResponds) {
                console.log(`   ✅ Endpoint responds`);
            } else {
                console.log(`   ❌ Endpoint not responding`);
            }
        }

        return validationResults;
    }
}

export default AgentTester;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new AgentTester();
    
    const command = process.argv[2] || 'test-all';
    
    switch (command) {
        case 'test-all':
            tester.testAllAgents();
            break;
        case 'fix':
            tester.fixProblematicAgents();
            break;
        case 'validate':
            tester.validateAgentEndpoints();
            break;
        default:
            if (tester.agents[command]) {
                tester.testSpecificAgent(command);
            } else {
                console.log('Usage: node agent-tester.js [test-all|fix|validate|agent-name]');
            }
    }
}