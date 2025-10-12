#!/usr/bin/env node

/**
 * 🚀 COMPLETE PIPELINE TEST
 * 
 * This script tests the complete video pipeline with the fixed Script Generator
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testCompletePipeline() {
  console.log('🚀 TESTING COMPLETE VIDEO PIPELINE');
  console.log('===================================');
  
  try {
    // Test the complete pipeline with a simple topic
    const pipelinePayload = {
      topic: 'JavaScript Fundamentals',
      duration: 300, // 5 minutes
      style: 'educational',
      targetAudience: 'beginners'
    };
    
    console.log('📝 Starting complete video pipeline...');
    console.log(`   Topic: ${pipelinePayload.topic}`);
    console.log(`   Duration: ${pipelinePayload.duration} seconds`);
    console.log(`   Style: ${pipelinePayload.style}`);
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/orchestrator/start-pipeline',
        body: JSON.stringify(pipelinePayload)
      })
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('📋 Pipeline Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const responseBody = JSON.parse(response.body);
      console.log('✅ Pipeline started successfully!');
      console.log(`   Project ID: ${responseBody.result?.projectId || 'Not provided'}`);
      console.log(`   Execution ID: ${responseBody.result?.executionId || 'Not provided'}`);
      
      if (responseBody.result?.projectId) {
        console.log('');
        console.log('⏳ Pipeline is running...');
        console.log('   This will take 2-3 minutes for all agents to complete');
        console.log('   Check S3 bucket for created files:');
        console.log(`   aws s3 ls s3://automated-video-pipeline-v2-786673323159-us-east-1/videos/${responseBody.result.projectId}/ --recursive`);
        
        return responseBody.result.projectId;
      }
    } else {
      console.error('❌ Pipeline failed to start:', response);
      const responseBody = JSON.parse(response.body);
      console.error('   Error:', responseBody.error?.message || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testCompletePipeline()
  .then(projectId => {
    if (projectId) {
      console.log('');
      console.log('🎯 PIPELINE TEST INITIATED SUCCESSFULLY!');
      console.log('========================================');
      console.log(`Project ID: ${projectId}`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Wait 2-3 minutes for pipeline completion');
      console.log('2. Check S3 bucket for created files');
      console.log('3. Verify Script Generator created both script.json and scene-context.json');
      console.log('4. Check other agents for file creation');
    }
  })
  .catch(console.error);