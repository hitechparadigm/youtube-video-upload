/**
 * 🔍 DEBUG: Audio Generator Issue
 * Investigate the Audio Generator 500 error
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

// Use proper project ID format
const baseTopic = "Travel to France - Complete Guide";
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const topicSlug = baseTopic.toLowerCase()
  .replace(/[^a-z0-9\s]/g, '')
  .replace(/\s+/g, '-')
  .slice(0, 30);

const projectId = `${timestamp}_${topicSlug}`;

console.log('🔍 DEBUGGING AUDIO GENERATOR');
console.log('='.repeat(60));
console.log(`📋 Project ID: ${projectId}`);
console.log(`🎯 Expected S3 Path: videos/${projectId}/`);
console.log('');

async function testAudioGeneratorHealth() {
  console.log('🏥 Testing Audio Generator Health...');
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/health'
      })
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log(`📥 Health Status: ${response.statusCode}`);
    console.log(`📄 Response:`, JSON.stringify(response, null, 2));
    
    return response.statusCode === 200;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAudioGeneratorWithMinimalPayload() {
  console.log('\n🎙️ Testing Audio Generator with minimal payload...');
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/audio/generate',
        body: JSON.stringify({
          text: "Welcome to France, a beautiful country with rich culture and history.",
          projectId: projectId,
          voiceOptions: {
            voice: "Ruth",
            style: "conversational"
          }
        })
      })
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log(`📥 Status: ${response.statusCode}`);
    console.log(`📄 Response:`, JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('❌ Audio generation failed:', error.message);
    return { error: error.message };
  }
}

async function debugAudioGenerator() {
  console.log('🚀 Starting Audio Generator Debug...');
  
  // Test health first
  const healthOk = await testAudioGeneratorHealth();
  
  if (!healthOk) {
    console.log('❌ Health check failed - function may not be deployed correctly');
    return;
  }
  
  // Test with minimal payload
  const result = await testAudioGeneratorWithMinimalPayload();
  
  if (result.statusCode === 200) {
    console.log('✅ Audio Generator working with minimal payload');
  } else {
    console.log('❌ Audio Generator still failing - investigating...');
    
    // Check if it's a context retrieval issue
    console.log('\n🔍 Possible issues:');
    console.log('1. Missing scene context from previous agent');
    console.log('2. DynamoDB context table access issues');
    console.log('3. S3 bucket permissions');
    console.log('4. Amazon Polly service issues');
    console.log('5. Layer dependencies missing');
  }
}

debugAudioGenerator().catch(console.error);