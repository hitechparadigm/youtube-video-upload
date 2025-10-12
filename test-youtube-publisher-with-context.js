/**
 * 📺 TEST YOUTUBE PUBLISHER WITH REAL CONTEXT
 * Test YouTube Publisher using the project that has all context files including video
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testYouTubePublisherWithContext() {
  console.log('📺 TESTING YOUTUBE PUBLISHER WITH REAL CONTEXT');
  console.log('='.repeat(60));
  
  // Use the real project ID that has all context files including video
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Verify all context files exist
    console.log('\\n📋 Step 1: Verifying context files...');
    const contextFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/01-context/`
    }).promise();
    
    const requiredContexts = ['topic-context.json', 'scene-context.json', 'media-context.json', 'audio-context.json', 'video-context.json'];
    const existingContexts = contextFiles.Contents?.map(f => f.Key.split('/').pop()) || [];
    
    requiredContexts.forEach(required => {
      if (existingContexts.includes(required)) {
        console.log(`   ✅ ${required} exists`);
      } else {
        console.log(`   ❌ ${required} missing`);
      }
    });
    
    // Step 2: Test YouTube Publisher health
    console.log('\\n🏥 Step 2: Testing YouTube Publisher health...');
    
    const healthPayload = {
      httpMethod: 'GET',
      path: '/health'
    };
    
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-youtube-publisher-v3',
      Payload: JSON.stringify(healthPayload)
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Status: ${healthResponse.statusCode}`);
    
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ YouTube Publisher health check passed');
    } else {
      console.log('   ❌ YouTube Publisher health check failed');
      console.log(`   Response: ${JSON.stringify(healthResponse, null, 2)}`);
    }
    
    // Step 3: Test YouTube Publishing with real project
    console.log('\\n📺 Step 3: Testing YouTube Publishing...');
    
    const publishPayload = {
      httpMethod: 'POST',
      path: '/youtube/publish',
      body: JSON.stringify({
        projectId: realProjectId,
        videoId: `video-${realProjectId}`,
        videoFilePath: `videos/${realProjectId}/05-video/final-video.mp4`,
        title: 'Travel to France - Complete Guide',
        description: 'A comprehensive guide to traveling in France',
        privacy: 'unlisted' // Use unlisted for testing
      })
    };
    
    const publishResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-youtube-publisher-v3',
      Payload: JSON.stringify(publishPayload)
    }).promise();
    
    const publishResponse = JSON.parse(publishResult.Payload);
    console.log(`   Status: ${publishResponse.statusCode}`);
    
    if (publishResponse.statusCode === 200) {
      console.log('   ✅ YouTube Publishing executed successfully');
      
      // Check if metadata files were created
      const metadataFiles = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${realProjectId}/06-metadata/`
      }).promise();
      
      if (metadataFiles.Contents && metadataFiles.Contents.length > 0) {
        console.log(`   ✅ Created ${metadataFiles.Contents.length} metadata files:`);
        metadataFiles.Contents.forEach(file => {
          const fileName = file.Key.split('/').pop();
          console.log(`      - ${fileName} (${file.Size} bytes)`);
        });
      } else {
        console.log('   ❌ No metadata files created');
      }
      
    } else {
      console.log('   ❌ YouTube Publishing failed');
      const responseBody = JSON.parse(publishResponse.body || '{}');
      console.log(`   Error: ${responseBody.error || 'Unknown error'}`);
      console.log(`   Message: ${responseBody.message || 'No message'}`);
      console.log(`   Full Response: ${JSON.stringify(publishResponse, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testYouTubePublisherWithContext();