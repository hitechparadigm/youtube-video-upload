#!/usr/bin/env node

/**
 * Comprehensive AI Agent Status Check
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

class AgentStatusChecker {
    constructor() {
        this.lambdaInvoker = new LambdaInvoker();
        this.agents = [
            {
                name: 'Topic Management',
                functionName: 'automated-video-pipeline-topic-management-v2',
                endpoints: [
                    { method: 'GET', path: '/topics' },
                    { method: 'POST', path: '/topics' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'Script Generator',
                functionName: 'automated-video-pipeline-script-generator-v2',
                endpoints: [
                    { method: 'POST', path: '/scripts/generate' },
                    { method: 'POST', path: '/scripts/generate-enhanced' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'Media Curator',
                functionName: 'automated-video-pipeline-media-curator-v2',
                endpoints: [
                    { method: 'POST', path: '/media/search' },
                    { method: 'POST', path: '/media/curate' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'Audio Generator',
                functionName: 'automated-video-pipeline-audio-generator-v2',
                endpoints: [
                    { method: 'POST', path: '/audio/generate' },
                    { method: 'POST', path: '/audio/synthesize' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'Video Assembler',
                functionName: 'automated-video-pipeline-video-assembler-v2',
                endpoints: [
                    { method: 'POST', path: '/video/assemble' },
                    { method: 'POST', path: '/video/create' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'YouTube Publisher',
                functionName: 'automated-video-pipeline-youtube-publisher-v2',
                endpoints: [
                    { method: 'POST', path: '/youtube/publish' },
                    { method: 'POST', path: '/youtube/optimize' },
                    { method: 'GET', path: '/health' }
                ]
            },
            {
                name: 'Workflow Orchestrator',
                functionName: 'automated-video-pipeline-workflow-orchestrator-v2',
                endpoints: [
                    { method: 'POST', path: '/workflow/start' },
                    { method: 'GET', path: '/workflow/status' },
                    { method: 'GET', path: '/health' }
                ]
            }
        ];
    }

    async checkAllAgents() {
        console.log('🔍 Comprehensive AI Agent Status Check');
        console.log('='.repeat(80));

        const results = {
            working: [],
            broken: [],
            details: {}
        };

        for (const agent of this.agents) {
            console.log(`\n🤖 Testing ${agent.name}...`);
            console.log(`   Function: ${agent.functionName}`);

            const agentResult = {
                name: agent.name,
                functionName: agent.functionName,
                status: 'unknown',
                workingEndpoints: [],
                brokenEndpoints: [],
                errors: []
            };

            let hasWorkingEndpoint = false;

            for (const endpoint of agent.endpoints) {
                console.log(`   Testing: ${endpoint.method} ${endpoint.path}`);

                try {
                    const result = await this.lambdaInvoker.invokeWithHTTP(
                        agent.functionName,
                        endpoint.method,
                        endpoint.path,
                        {}
                    );

                    if (result.success) {
                        console.log(`     ✅ SUCCESS`);
                        agentResult.workingEndpoints.push(`${endpoint.method} ${endpoint.path}`);
                        hasWorkingEndpoint = true;
                    } else {
                        console.log(`     ❌ FAILED`);
                        agentResult.brokenEndpoints.push(`${endpoint.method} ${endpoint.path}`);
                        if (result.error) {
                            console.log(`     Error: ${result.error}`);
                            agentResult.errors.push(result.error);
                        }
                        if (result.data && result.data.errorMessage) {
                            console.log(`     Lambda Error: ${result.data.errorMessage}`);
                            agentResult.errors.push(result.data.errorMessage);
                        }
                    }
                } catch (error) {
                    console.log(`     💥 EXCEPTION: ${error.message}`);
                    agentResult.brokenEndpoints.push(`${endpoint.method} ${endpoint.path}`);
                    agentResult.errors.push(error.message);
                }
            }

            agentResult.status = hasWorkingEndpoint ? 'working' : 'broken';
            
            if (hasWorkingEndpoint) {
                results.working.push(agent.name);
                console.log(`   📊 Status: ✅ WORKING (${agentResult.workingEndpoints.length}/${agent.endpoints.length} endpoints)`);
            } else {
                results.broken.push(agent.name);
                console.log(`   📊 Status: ❌ BROKEN (0/${agent.endpoints.length} endpoints working)`);
            }

            results.details[agent.name] = agentResult;
        }

        // Summary
        console.log('\n📊 AGENT STATUS SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Working Agents: ${results.working.length}/${this.agents.length}`);
        console.log(`❌ Broken Agents: ${results.broken.length}/${this.agents.length}`);
        console.log(`📈 System Health: ${Math.round(results.working.length / this.agents.length * 100)}%`);

        if (results.working.length > 0) {
            console.log(`\n✅ Working Agents:`);
            results.working.forEach(agent => {
                const details = results.details[agent];
                console.log(`   🤖 ${agent}: ${details.workingEndpoints.length} endpoints working`);
            });
        }

        if (results.broken.length > 0) {
            console.log(`\n❌ Broken Agents:`);
            results.broken.forEach(agent => {
                const details = results.details[agent];
                console.log(`   🔧 ${agent}: ${details.errors.length} errors found`);
                details.errors.slice(0, 2).forEach(error => {
                    console.log(`      - ${error.substring(0, 100)}...`);
                });
            });
        }

        console.log('\n🔧 RECOMMENDED ACTIONS:');
        if (results.broken.length > 0) {
            console.log('1. 🔄 Redeploy Lambda functions with proper dependencies');
            console.log('2. 🧪 Fix module import/export issues');
            console.log('3. 📦 Ensure all npm packages are installed');
            console.log('4. 🔍 Check CloudWatch logs for detailed errors');
        } else {
            console.log('✅ All agents are working! System is ready for production.');
        }

        return results;
    }
}

export default AgentStatusChecker;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new AgentStatusChecker();
    
    checker.checkAllAgents().then(results => {
        const healthPercentage = Math.round(results.working.length / 7 * 100);
        
        if (healthPercentage >= 80) {
            console.log('\n🎉 System Status: HEALTHY');
            process.exit(0);
        } else if (healthPercentage >= 50) {
            console.log('\n⚠️  System Status: DEGRADED');
            process.exit(1);
        } else {
            console.log('\n💥 System Status: CRITICAL');
            process.exit(2);
        }
    }).catch(error => {
        console.error('\n💥 Status check failed:', error.message);
        process.exit(3);
    });
}