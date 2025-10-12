#!/usr/bin/env node

/**
 * 🧪 TEST LAYER ISSUE
 * 
 * This script tests if the deployed layer has the uploadToS3 function
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testLayerIssue() {
  console.log('🧪 TESTING LAYER ISSUE');
  console.log('======================');
  
  try {
    // Create a simple test that tries to use uploadToS3
    const testPayload = {
      httpMethod: 'POST',
      path: '/scripts/generate',
      body: JSON.stringify({
        topic: 'Test Topic',
        title: 'Test Title',
        targetLength: 60
      })
    };
    
    console.log('📝 Invoking Script Generator with simple manual generation...');
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify(testPayload)
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('📋 Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('✅ Function executed successfully');
      const responseBody = JSON.parse(response.body);
      console.log('   - Success:', responseBody.success);
    } else {
      console.log('❌ Function failed');
      const responseBody = JSON.parse(response.body);
      console.log('   - Error:', responseBody.error?.message);
      
      // Check if it's a layer-related error
      if (responseBody.error?.message?.includes('uploadToS3') || 
          responseBody.error?.message?.includes('require') ||
          responseBody.error?.message?.includes('Cannot find module')) {
        console.log('🚨 LAYER ISSUE DETECTED!');
        console.log('   The deployed layer is missing the uploadToS3 function');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Cannot find module') || 
        error.message.includes('uploadToS3')) {
      console.log('🚨 CONFIRMED: LAYER ISSUE!');
      console.log('   The deployed layer does not have the required functions');
    }
  }
}

// Run the test
testLayerIssue().catch(console.error);