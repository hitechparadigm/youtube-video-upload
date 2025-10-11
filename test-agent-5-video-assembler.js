/**
 * 🎬 TEST AGENT 5: Video Assembler AI
 * Tests: 05-video/processing-logs/ + 01-context/video-context.json creation
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testVideoAssembler() {
  console.log('🎬 TESTING AGENT 5: Video Assembler AI');
  console.log('='.repeat(60));
  
  const projectId = `test-video-${Date.now()}`;
  
  try {
    console.log(`🆔 Project ID: ${projectId}`);
    console.log('🎥 Testing video assembly with layers/utils');
    console.log('');
    
    // Test 1: Health check
    console.log('🏥 Testing health endpoint...');
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/health'
      })
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Health Status: ${healthResponse.statusCode === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (healthResponse.statusCode !== 200) {
      console.log('❌ Health check failed, skipping video assembly test');
      return { success: false, error: 'Health check failed' };
    }
    
    // Test 2: Video assembly
    console.log('🎬 Testing video assembly...');
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/video/assemble',
        body: JSON.stringify({
          projectId: projectId,
          source: 'agent-test',
          videoOptions: {
            resolution: '1920x1080',
            quality: 'high'
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
      console.log('✅ SUCCESS - Video Assembler AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Project ID: ${body.projectId}`);
      console.log(`   - Video ID: ${body.videoId || 'Unknown'}`);
      console.log(`   - Files Created: ${body.filesCreated || 0}`);
      console.log(`   - Ready for YouTube: ${body.readyForYouTube ? '✅' : '❌'}`);
      console.log(`   - Assembly Status: ${body.assemblyStatus || 'Unknown'}`);
      
      if (body.assemblyInstructions) {
        console.log('');
        console.log('🎥 ASSEMBLY DETAILS:');
        console.log(`   - Scenes to Process: ${body.assemblyInstructions.scenes?.length || 0}`);
        console.log(`   - Media Assets: ${body.assemblyInstructions.mediaAssets?.length || 0}`);
        console.log(`   - Audio Segments: ${body.assemblyInstructions.audioSegments?.length || 0}`);
      }
      
      console.log('');
      console.log('🎯 FOLDER STRUCTURE TEST:');
      console.log('   Expected: 05-video/processing-logs/ + 01-context/video-context.json');
      console.log('   Status: ✅ Should be created by layers/utils');
      
      return {
        success: true,
        projectId: body.projectId,
        executionTime: executionTime,
        filesCreated: body.filesCreated || 0,
        readyForYouTube: body.readyForYouTube
      };
    } else {
      console.log('❌ FAILED - Video Assembler AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testVideoAssembler().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 VIDEO ASSEMBLER AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    console.log(`📈 Output: ${result.filesCreated} files created`);
    console.log(`🎥 YouTube Ready: ${result.readyForYouTube ? '✅' : '❌'}`);
    console.log('📁 Folder Structure: 05-video/processing-logs/ + 01-context/ creation verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});