/**
 * 🔍 DEBUG CONTEXT CREATION
 * Test why Media Curator and Audio Generator aren't creating context files
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function debugContextCreation() {
  console.log('🔍 DEBUGGING CONTEXT CREATION');
  console.log('='.repeat(60));
  
  // Use the real project ID from our recent test
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Test Media Curator
    console.log('\\n🎨 Step 1: Testing Media Curator Context Creation...');
    
    const mediaCuratorPayload = {
      httpMethod: 'POST',
      path: '/media/curate',
      body: JSON.stringify({
        projectId: realProjectId,
        baseTopic: 'Travel to France Complete Guide',
        sceneCount: 6,
        quality: '1080p'
      })
    };
    
    const mediaCuratorResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-media-curator-v3',
      Payload: JSON.stringify(mediaCuratorPayload)
    }).promise();
    
    const mediaCuratorResponse = JSON.parse(mediaCuratorResult.Payload);
    console.log(`   Status: ${mediaCuratorResponse.statusCode}`);
    
    if (mediaCuratorResponse.statusCode === 200) {
      console.log('   ✅ Media Curator executed successfully');
      
      // Check if context file was created
      try {
        const contextKey = `videos/${realProjectId}/01-context/media-context.json`;
        await s3.headObject({
          Bucket: S3_BUCKET,
          Key: contextKey
        }).promise();
        console.log('   ✅ media-context.json created successfully');
      } catch (contextError) {
        console.log('   ❌ media-context.json NOT created');
        console.log(`   Error: ${contextError.message}`);
      }
    } else {
      console.log('   ❌ Media Curator failed');
      console.log(`   Response: ${JSON.stringify(mediaCuratorResponse, null, 2)}`);
    }
    
    // Step 2: Test Audio Generator
    console.log('\\n🎵 Step 2: Testing Audio Generator Context Creation...');
    
    const audioGeneratorPayload = {
      httpMethod: 'POST',
      path: '/audio/generate',
      body: JSON.stringify({
        projectId: realProjectId,
        text: 'Welcome to our comprehensive guide on traveling to France.',
        voiceId: 'Joanna'
      })
    };
    
    const audioGeneratorResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify(audioGeneratorPayload)
    }).promise();
    
    const audioGeneratorResponse = JSON.parse(audioGeneratorResult.Payload);
    console.log(`   Status: ${audioGeneratorResponse.statusCode}`);
    
    if (audioGeneratorResponse.statusCode === 200) {
      console.log('   ✅ Audio Generator executed successfully');
      
      // Check if context file was created
      try {
        const contextKey = `videos/${realProjectId}/01-context/audio-context.json`;
        await s3.headObject({
          Bucket: S3_BUCKET,
          Key: contextKey
        }).promise();
        console.log('   ✅ audio-context.json created successfully');
      } catch (contextError) {
        console.log('   ❌ audio-context.json NOT created');
        console.log(`   Error: ${contextError.message}`);
      }
    } else {
      console.log('   ❌ Audio Generator failed');
      console.log(`   Response: ${JSON.stringify(audioGeneratorResponse, null, 2)}`);
    }
    
    // Step 3: List all context files
    console.log('\\n📋 Step 3: Current Context Files...');
    const contextFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/01-context/`
    }).promise();
    
    if (contextFiles.Contents && contextFiles.Contents.length > 0) {
      contextFiles.Contents.forEach(file => {
        const fileName = file.Key.split('/').pop();
        console.log(`   📄 ${fileName} (${file.Size} bytes)`);
      });
    } else {
      console.log('   ❌ No context files found');
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the debug test
debugContextCreation();