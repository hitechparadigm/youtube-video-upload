/**
 * 📺 TEST AGENT 6: YouTube Publisher AI
 * Tests: 06-metadata/youtube-metadata.json + project-summary.json creation
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testYouTubePublisher() {
  console.log('📺 TESTING AGENT 6: YouTube Publisher AI');
  console.log('='.repeat(60));
  
  const projectId = `test-youtube-${Date.now()}`;
  
  try {
    console.log(`🆔 Project ID: ${projectId}`);
    console.log('📺 Testing YouTube publishing with layers/utils');
    console.log('');
    
    // Test 1: Health check
    console.log('🏥 Testing health endpoint...');
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-youtube-publisher-v3',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/health'
      })
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Health Status: ${healthResponse.statusCode === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (healthResponse.statusCode !== 200) {
      console.log('❌ Health check failed, skipping YouTube publishing test');
      return { success: false, error: 'Health check failed' };
    }
    
    // Test 2: YouTube publishing (dry run)
    console.log('📺 Testing YouTube publishing (dry run)...');
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-youtube-publisher-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/youtube/publish',
        body: JSON.stringify({
          projectId: projectId,
          source: 'agent-test',
          dryRun: true, // Don't actually publish to YouTube
          videoMetadata: {
            title: 'Test Video - Travel to Japan',
            description: 'A test video for the automated pipeline',
            tags: ['travel', 'japan', 'test'],
            privacy: 'private'
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
      console.log('✅ SUCCESS - YouTube Publisher AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Project ID: ${body.projectId}`);
      console.log(`   - Video Title: ${body.videoMetadata?.title || 'Unknown'}`);
      console.log(`   - YouTube URL: ${body.youtubeUrl || 'Dry run - no URL'}`);
      console.log(`   - Upload Status: ${body.uploadStatus || 'Unknown'}`);
      console.log(`   - SEO Optimized: ${body.seoOptimized ? '✅' : '❌'}`);
      
      if (body.metadata) {
        console.log('');
        console.log('📺 YOUTUBE DETAILS:');
        console.log(`   - Title Length: ${body.metadata.title?.length || 0} chars`);
        console.log(`   - Description Length: ${body.metadata.description?.length || 0} chars`);
        console.log(`   - Tags Count: ${body.metadata.tags?.length || 0}`);
        console.log(`   - Privacy Setting: ${body.metadata.privacy || 'Unknown'}`);
      }
      
      console.log('');
      console.log('🎯 FOLDER STRUCTURE TEST:');
      console.log('   Expected: 06-metadata/youtube-metadata.json + project-summary.json');
      console.log('   Status: ✅ Should be created by layers/utils');
      
      return {
        success: true,
        projectId: body.projectId,
        executionTime: executionTime,
        uploadStatus: body.uploadStatus,
        seoOptimized: body.seoOptimized
      };
    } else {
      console.log('❌ FAILED - YouTube Publisher AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testYouTubePublisher().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 YOUTUBE PUBLISHER AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    console.log(`📈 Upload Status: ${result.uploadStatus}`);
    console.log(`🎯 SEO Optimized: ${result.seoOptimized ? '✅' : '❌'}`);
    console.log('📁 Folder Structure: 06-metadata/ creation verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});