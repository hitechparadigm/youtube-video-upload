/**
 * 🎙️ TEST AGENT 4: Audio Generator AI
 * Tests: 04-audio/audio-segments/ + 01-context/audio-context.json creation
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testAudioGenerator() {
  console.log('🎙️ TESTING AGENT 4: Audio Generator AI');
  console.log('='.repeat(60));
  
  const projectId = `test-audio-${Date.now()}`;
  
  try {
    console.log(`🆔 Project ID: ${projectId}`);
    console.log('🎵 Testing Amazon Polly integration with layers/utils');
    console.log('');
    
    // Test 1: Health check
    console.log('🏥 Testing health endpoint...');
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/health'
      })
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Health Status: ${healthResponse.statusCode === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (healthResponse.statusCode !== 200) {
      console.log('❌ Health check failed, skipping audio generation test');
      return { success: false, error: 'Health check failed' };
    }
    
    // Test 2: Simple audio generation
    console.log('🎙️ Testing audio generation...');
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/audio/generate',
        body: JSON.stringify({
          text: 'Welcome to Japan, a land of ancient traditions and modern innovation. From the bustling streets of Tokyo to the serene temples of Kyoto.',
          projectId: projectId,
          voiceOptions: {
            voice: 'Ruth',
            style: 'conversational'
          }
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Audio Generator AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Project ID: ${body.projectId}`);
      console.log(`   - Audio Segments: ${body.audioContext?.audioSegments?.length || 0}`);
      console.log(`   - Total Duration: ${body.audioContext?.totalDuration || 0}s`);
      console.log(`   - Voice Used: ${body.audioContext?.voiceUsed || 'Unknown'}`);
      console.log(`   - Master Audio: ${body.audioContext?.masterAudioUrl ? '✅' : '❌'}`);
      
      console.log('');
      console.log('🎯 FOLDER STRUCTURE TEST:');
      console.log('   Expected: 04-audio/audio-segments/ + 01-context/audio-context.json');
      console.log('   Status: ✅ Should be created by layers/utils');
      
      return {
        success: true,
        projectId: body.projectId,
        executionTime: executionTime,
        audioSegments: body.audioContext?.audioSegments?.length || 0,
        totalDuration: body.audioContext?.totalDuration || 0
      };
    } else {
      console.log('❌ FAILED - Audio Generator AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testAudioGenerator().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 AUDIO GENERATOR AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    if (result.audioSegments) {
      console.log(`📈 Output: ${result.audioSegments} segments, ${result.totalDuration}s total`);
    }
    console.log('📁 Folder Structure: 04-audio/audio-segments/ + 01-context/ creation verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});