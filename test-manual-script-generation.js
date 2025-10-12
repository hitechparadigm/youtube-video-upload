#!/usr/bin/env node

/**
 * Test Manual Script Generation (no topic context required)
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testManualScriptGeneration() {
  console.log('TESTING MANUAL SCRIPT GENERATION');
  console.log('=================================');
  
  try {
    // Test manual script generation (doesn't require topic context)
    const testPayload = {
      httpMethod: 'POST',
      path: '/scripts/generate',
      body: JSON.stringify({
        topic: 'JavaScript Basics',
        title: 'JavaScript Fundamentals for Beginners',
        targetLength: 120,
        style: 'educational',
        targetAudience: 'beginners'
      })
    };
    
    console.log('Invoking manual script generation...');
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify(testPayload)
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('SUCCESS: Manual script generation worked');
      const responseBody = JSON.parse(response.body);
      console.log('Success:', responseBody.success);
      console.log('Topic:', responseBody.topic);
      console.log('Scenes:', responseBody.scenes?.length || 0);
    } else {
      console.log('FAILED: Manual script generation failed');
      const responseBody = JSON.parse(response.body);
      console.log('Error:', responseBody.error?.message || 'Unknown error');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

// Run the test
testManualScriptGeneration().catch(console.error);