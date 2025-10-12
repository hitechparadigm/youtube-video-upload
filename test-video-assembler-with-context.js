/**
 * 🎬 TEST VIDEO ASSEMBLER WITH REAL CONTEXT FILES
 * Test Video Assembler using the project that has all context files
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testVideoAssemblerWithContext() {
  console.log('🎬 TESTING VIDEO ASSEMBLER WITH REAL CONTEXT');
  console.log('='.repeat(60));
  
  // Use the real project ID that has all context files
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Verify all context files exist
    console.log('\\n📋 Step 1: Verifying context files...');
    const contextFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/01-context/`
    }).promise();
    
    const requiredContexts = ['topic-context.json', 'scene-context.json', 'media-context.json', 'audio-context.json'];
    const existingContexts = contextFiles.Contents?.map(f => f.Key.split('/').pop()) || [];
    
    requiredContexts.forEach(required => {
      if (existingContexts.includes(required)) {
        console.log(`   ✅ ${required} exists`);
      } else {
        console.log(`   ❌ ${required} missing`);
      }
    });
    
    // Step 2: Test Video Assembler health
    console.log('\\n🏥 Step 2: Testing Video Assembler health...');
    
    const healthPayload = {
      httpMethod: 'GET',
      path: '/video/health'
    };
    
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify(healthPayload)
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Status: ${healthResponse.statusCode}`);
    
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ Video Assembler health check passed');
    } else {
      console.log('   ❌ Video Assembler health check failed');
      console.log(`   Response: ${JSON.stringify(healthResponse, null, 2)}`);
    }
    
    // Step 3: Test Video Assembly with real project
    console.log('\\n🎬 Step 3: Testing Video Assembly...');
    
    const assemblyPayload = {
      httpMethod: 'POST',
      path: '/video/assemble',
      body: JSON.stringify({
        projectId: realProjectId,
        scenes: [
          { sceneNumber: 1, title: 'Introduction' },
          { sceneNumber: 2, title: 'Main Content' },
          { sceneNumber: 3, title: 'Conclusion' }
        ]
      })
    };
    
    const assemblyResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify(assemblyPayload)
    }).promise();
    
    const assemblyResponse = JSON.parse(assemblyResult.Payload);
    console.log(`   Status: ${assemblyResponse.statusCode}`);
    
    if (assemblyResponse.statusCode === 200) {
      console.log('   ✅ Video Assembly executed successfully');
      
      // Check if video files were created
      const videoFiles = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${realProjectId}/05-video/`
      }).promise();
      
      if (videoFiles.Contents && videoFiles.Contents.length > 0) {
        console.log(`   ✅ Created ${videoFiles.Contents.length} video files:`);
        videoFiles.Contents.forEach(file => {
          const fileName = file.Key.split('/').pop();
          console.log(`      - ${fileName} (${file.Size} bytes)`);
        });
      } else {
        console.log('   ❌ No video files created');
      }
      
      // Check if video context was created
      try {
        await s3.headObject({
          Bucket: S3_BUCKET,
          Key: `videos/${realProjectId}/01-context/video-context.json`
        }).promise();
        console.log('   ✅ video-context.json created');
      } catch (contextError) {
        console.log('   ❌ video-context.json NOT created');
      }
      
    } else {
      console.log('   ❌ Video Assembly failed');
      console.log(`   Response: ${JSON.stringify(assemblyResponse, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testVideoAssemblerWithContext();