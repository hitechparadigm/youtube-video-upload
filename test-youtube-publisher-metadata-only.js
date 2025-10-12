/**
 * 📺 TEST YOUTUBE PUBLISHER - METADATA CREATION ONLY
 * Test if YouTube Publisher can create metadata files without actual video upload
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testYouTubePublisherMetadataOnly() {
  console.log('📺 TESTING YOUTUBE PUBLISHER - METADATA CREATION ONLY');
  console.log('='.repeat(60));
  
  // Use the real project ID that has all context files
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Create a dummy video file for testing
    console.log('\\n📁 Step 1: Creating dummy video file for testing...');
    
    const dummyVideoKey = `videos/${realProjectId}/05-video/final-video.mp4`;
    const dummyVideoContent = 'This is a dummy video file for testing YouTube Publisher metadata creation.';
    
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: dummyVideoKey,
      Body: dummyVideoContent,
      ContentType: 'video/mp4'
    }).promise();
    
    console.log(`   ✅ Created dummy video file: ${dummyVideoKey}`);
    
    // Step 2: Test YouTube Publisher with the dummy video
    console.log('\\n📺 Step 2: Testing YouTube Publishing with dummy video...');
    
    const publishPayload = {
      httpMethod: 'POST',
      path: '/youtube/publish',
      body: JSON.stringify({
        projectId: realProjectId,
        videoId: `video-${realProjectId}`,
        videoFilePath: `s3://${S3_BUCKET}/${dummyVideoKey}`,
        title: 'Travel to France - Complete Guide (Test)',
        description: 'A comprehensive guide to traveling in France - This is a test upload',
        privacy: 'private', // Use private for testing
        tags: ['travel', 'france', 'guide', 'test']
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
        
        // Read and display the YouTube metadata
        try {
          const youtubeMetadataKey = `videos/${realProjectId}/06-metadata/youtube-metadata.json`;
          const metadataObj = await s3.getObject({
            Bucket: S3_BUCKET,
            Key: youtubeMetadataKey
          }).promise();
          
          const metadata = JSON.parse(metadataObj.Body.toString());
          console.log('\\n   📄 YouTube Metadata Created:');
          console.log(`      - Video ID: ${metadata.videoId || 'N/A'}`);
          console.log(`      - Title: ${metadata.title || 'N/A'}`);
          console.log(`      - Status: ${metadata.status || 'N/A'}`);
          console.log(`      - Privacy: ${metadata.privacy || 'N/A'}`);
          
        } catch (metadataError) {
          console.log('   ⚠️ Could not read YouTube metadata file');
        }
        
      } else {
        console.log('   ❌ No metadata files created');
      }
      
    } else {
      console.log('   ❌ YouTube Publishing failed');
      const responseBody = JSON.parse(publishResponse.body || '{}');
      console.log(`   Error: ${responseBody.error || 'Unknown error'}`);
      console.log(`   Message: ${responseBody.message || 'No message'}`);
      
      // Show more details if available
      if (responseBody.details) {
        console.log(`   Details: ${JSON.stringify(responseBody.details, null, 2)}`);
      }
    }
    
    // Step 3: Clean up dummy video file
    console.log('\\n🧹 Step 3: Cleaning up dummy video file...');
    try {
      await s3.deleteObject({
        Bucket: S3_BUCKET,
        Key: dummyVideoKey
      }).promise();
      console.log('   ✅ Dummy video file cleaned up');
    } catch (cleanupError) {
      console.log('   ⚠️ Could not clean up dummy video file');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testYouTubePublisherMetadataOnly();