#!/usr/bin/env node

/**
 * Simple Script Generator Test (no emojis to avoid log encoding issues)
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();

async function testSimpleScriptGenerator() {
  console.log('TESTING SIMPLE SCRIPT GENERATOR');
  console.log('================================');
  
  try {
    // Test with a very simple payload
    const testPayload = {
      httpMethod: 'GET',
      path: '/scripts/health'
    };
    
    console.log('Invoking health check endpoint...');
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify(testPayload)
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('SUCCESS: Health check passed');
      const responseBody = JSON.parse(response.body);
      console.log('Service:', responseBody.service);
      console.log('Status:', responseBody.status);
      console.log('Version:', responseBody.version);
      console.log('Shared Utilities:', responseBody.sharedUtilities);
    } else {
      console.log('FAILED: Health check failed');
      console.log('Response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

// Run the test
testSimpleScriptGenerator().catch(console.error);