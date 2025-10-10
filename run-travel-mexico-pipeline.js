#!/usr/bin/env node

/**
 * Direct Pipeline Execution for "Travel to Mexico"
 * This script runs the complete end-to-end video creation pipeline
 */

const { handler } = require('./src/lambda/workflow-orchestrator/handler.js');

async function runTravelMexicoPipeline() {
  console.log('🎬 Starting Travel to Mexico Video Pipeline');
  console.log('=' .repeat(50));

  try {
    // Create the event for direct pipeline execution
    const event = {
      httpMethod: 'POST',
      path: '/workflow/start-enhanced',
      body: JSON.stringify({
        baseTopic: 'Travel to Mexico',
        targetAudience: 'travelers',
        contentType: 'travel_guide',
        videoDuration: 480, // 8 minutes
        videoStyle: 'engaging_educational',
        publishOptions: {
          publishToYouTube: true,
          title: 'Ultimate Travel Guide to Mexico 2025',
          description: 'Complete travel guide covering the best destinations, food, culture, and tips for traveling to Mexico.',
          tags: ['travel', 'mexico', 'travel guide', 'vacation', 'tourism']
        }
      })
    };

    console.log('📋 Pipeline Configuration:');
    console.log('   Topic: Travel to Mexico');
    console.log('   Audience: Travelers');
    console.log('   Duration: 8 minutes');
    console.log('   Style: Engaging Educational');
    console.log('   YouTube Publishing: Enabled');
    console.log('');

    console.log('🚀 Invoking Workflow Orchestrator...');
    const startTime = Date.now();

    const result = await handler(event);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️  Total execution time: ${Math.round(executionTime / 1000)}s`);
    console.log('');

    if (result.statusCode === 200) {
      const responseBody = JSON.parse(result.body);
      
      if (responseBody.success) {
        console.log('🎉 PIPELINE EXECUTION SUCCESSFUL!');
        console.log('=' .repeat(50));
        console.log(`📁 Project ID: ${responseBody.result.projectId}`);
        console.log(`🆔 Execution ID: ${responseBody.result.executionId}`);
        console.log(`📊 Type: ${responseBody.result.type}`);
        
        if (responseBody.result.result) {
          const pipelineResult = responseBody.result.result;
          console.log(`✅ Working Agents: ${pipelineResult.workingAgents}/${pipelineResult.totalAgents}`);
          
          console.log('\n📋 Agent Execution Results:');
          pipelineResult.steps.forEach((step, index) => {
            const status = step.success ? '✅' : '❌';
            console.log(`   ${step.step}. ${status} ${step.agent}`);
          });

          if (pipelineResult.success) {
            console.log('\n🎬 Video Creation Status: COMPLETED');
            console.log('📺 YouTube Publishing: INITIATED');
            console.log('\n🔗 Next Steps:');
            console.log('   1. Check S3 bucket for generated video files');
            console.log('   2. Monitor YouTube upload status');
            console.log('   3. Review video quality and metadata');
          } else {
            console.log('\n⚠️  Pipeline completed with some failures');
            console.log('💡 Check individual agent logs for details');
          }
        }
      } else {
        console.log('❌ PIPELINE EXECUTION FAILED');
        console.log('Error:', responseBody.error || 'Unknown error');
      }
    } else {
      console.log('❌ WORKFLOW ORCHESTRATOR ERROR');
      console.log(`Status Code: ${result.statusCode}`);
      console.log('Response:', result.body);
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the pipeline
if (require.main === module) {
  runTravelMexicoPipeline()
    .then(() => {
      console.log('\n✅ Pipeline execution script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Pipeline execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTravelMexicoPipeline };