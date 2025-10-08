#!/usr/bin/env node

/**
 * Production Pipeline - Unified video production workflows
 */

import { StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import AWSHelpers from '../utils/aws-helpers.js';
import LambdaInvoker from '../utils/lambda-invoker.js';
import FileHelpers from '../utils/file-helpers.js';

const STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:786673323159:stateMachine:automated-video-pipeline-state-machine';

class ProductionPipeline {
    constructor() {
        this.sfnClient = AWSHelpers.getStepFunctionsClient();
        this.lambdaInvoker = new LambdaInvoker();
    }

    async runFullPipeline(config = {}) {
        console.log('🎬 Running Full Production Pipeline');
        console.log('='.repeat(80));

        const projectId = config.projectId || FileHelpers.generateProjectId('production');
        
        const executionInput = {
            topicId: projectId,
            topic: config.topic || "AI Tools for Content Creation",
            keywords: config.keywords || ["AI tools", "content creation", "productivity", "automation"],
            priority: config.priority || "high",
            targetDuration: config.targetDuration || 480
        };

        console.log('📋 Execution Input:');
        console.log(`   📁 Project ID: ${executionInput.topicId}`);
        console.log(`   📋 Topic: ${executionInput.topic}`);
        console.log(`   🏷️  Keywords: ${executionInput.keywords.join(', ')}`);

        try {
            // Run Step Functions pipeline
            const stepFunctionsResult = await this.runStepFunctionsPipeline(executionInput);
            
            if (stepFunctionsResult.success) {
                console.log('✅ Step Functions pipeline completed successfully');
                return stepFunctionsResult;
            } else {
                console.log('⚠️  Step Functions failed, trying direct Lambda pipeline...');
                return await this.runDirectLambdaPipeline(executionInput);
            }
        } catch (error) {
            console.log('💥 Full pipeline failed:', error.message);
            throw error;
        }
    }

    async runStepFunctionsPipeline(executionInput) {
        console.log('\n🚀 Starting Step Functions Pipeline...');
        console.log(`🔗 State Machine: ${STATE_MACHINE_ARN}`);

        try {
            const startCommand = new StartExecutionCommand({
                stateMachineArn: STATE_MACHINE_ARN,
                name: `execution-${executionInput.topicId}`,
                input: JSON.stringify(executionInput)
            });

            const startResult = await this.sfnClient.send(startCommand);

            console.log('✅ Step Functions Execution Started!');
            console.log(`   🆔 Execution ARN: ${startResult.executionArn}`);

            // Monitor execution
            const finalResult = await this.monitorExecution(startResult.executionArn);
            
            return {
                success: finalResult.status === 'SUCCEEDED',
                executionArn: startResult.executionArn,
                projectId: executionInput.topicId,
                status: finalResult.status,
                output: finalResult.output
            };

        } catch (error) {
            console.log(`❌ Step Functions error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async runDirectLambdaPipeline(executionInput) {
        console.log('\n🔧 Running Direct Lambda Pipeline...');
        
        const agents = [
            {
                name: 'Topic Management',
                functionName: 'automated-video-pipeline-topic-management-v2',
                method: 'GET',
                path: '/topics',
                body: {}
            },
            {
                name: 'Script Generator',
                functionName: 'automated-video-pipeline-script-generator-v2',
                method: 'POST',
                path: '/scripts/generate-enhanced',
                body: {
                    topicContext: {
                        mainTopic: executionInput.topic,
                        expandedTopics: [{
                            subtopic: executionInput.topic,
                            relevanceScore: 95,
                            keywords: executionInput.keywords
                        }]
                    },
                    baseTopic: executionInput.topic,
                    targetLength: executionInput.targetDuration,
                    projectId: executionInput.topicId
                }
            },
            {
                name: 'Media Curator',
                functionName: 'automated-video-pipeline-media-curator-v2',
                method: 'POST',
                path: '/media/search',
                body: {
                    query: executionInput.keywords.join(' '),
                    mediaCount: 6,
                    quality: '1080p',
                    projectId: executionInput.topicId
                }
            }
        ];

        const results = {};
        
        for (const agent of agents) {
            console.log(`\n📡 ${agent.name}...`);
            
            const result = await this.lambdaInvoker.invokeWithHTTP(
                agent.functionName,
                agent.method,
                agent.path,
                agent.body
            );
            
            results[agent.name.toLowerCase().replace(' ', '_')] = result;
            
            if (result.success) {
                console.log(`   ✅ ${agent.name}: SUCCESS`);
            } else {
                console.log(`   ❌ ${agent.name}: FAILED`);
            }
        }

        const successCount = Object.values(results).filter(r => r.success).length;
        
        console.log(`\n📊 Direct Pipeline Results: ${successCount}/${agents.length} agents working`);
        
        return {
            success: successCount >= 2, // At least 2 agents working
            projectId: executionInput.topicId,
            results,
            workingAgents: successCount
        };
    }

    async monitorExecution(executionArn) {
        console.log('\n📊 Monitoring Execution Progress...');

        let executionStatus = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 30;

        while (executionStatus === 'RUNNING' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 30000));

            const describeCommand = new DescribeExecutionCommand({ executionArn });
            const describeResult = await this.sfnClient.send(describeCommand);
            executionStatus = describeResult.status;

            console.log(`   ⏳ Attempt ${attempts}/30: Status = ${executionStatus}`);

            if (executionStatus === 'SUCCEEDED') {
                console.log('🎉 Execution Completed Successfully!');
                return {
                    status: executionStatus,
                    output: describeResult.output
                };
            } else if (executionStatus === 'FAILED') {
                console.log('💥 Execution Failed!');
                console.log(`   ❌ Error: ${describeResult.error || 'Unknown error'}`);
                return {
                    status: executionStatus,
                    error: describeResult.error,
                    cause: describeResult.cause
                };
            } else if (executionStatus === 'TIMED_OUT') {
                console.log('⏰ Execution Timed Out!');
                return { status: executionStatus };
            }
        }

        if (attempts >= maxAttempts) {
            console.log('⏰ Monitoring timeout reached');
            return { status: 'MONITORING_TIMEOUT' };
        }

        return { status: executionStatus };
    }
}

export default ProductionPipeline;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const pipeline = new ProductionPipeline();
    
    const config = {
        topic: "AI Tools for Content Creation",
        keywords: ["AI tools", "content creation", "productivity", "automation"],
        priority: "high",
        targetDuration: 480
    };
    
    pipeline.runFullPipeline(config).then(result => {
        console.log('\n🎉 Production pipeline completed!');
        console.log(`📁 Project: ${result.projectId}`);
        console.log(`📊 Status: ${result.success ? 'SUCCESS' : 'PARTIAL'}`);
        
        if (result.workingAgents) {
            console.log(`🤖 Working Agents: ${result.workingAgents}`);
        }
    }).catch(error => {
        console.error('\n💥 Pipeline failed:', error.message);
        process.exit(1);
    });
}