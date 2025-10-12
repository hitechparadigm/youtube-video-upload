/**
 * 🔧 CREATE MISSING CONTEXT FILES
 * Manually create the missing context files so Video Assembler can work
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function createMissingContextFiles() {
  console.log('🔧 CREATING MISSING CONTEXT FILES');
  console.log('='.repeat(60));
  
  // Use the real project ID from our recent test
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Create media-context.json based on actual files
    console.log('\\n🎨 Step 1: Creating media-context.json...');
    
    // List actual media files
    const mediaFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/03-media/`
    }).promise();
    
    console.log(`   Found ${mediaFiles.Contents?.length || 0} media files`);
    
    // Create media context based on actual files
    const mediaContext = {
      projectId: realProjectId,
      status: 'completed',
      totalAssets: mediaFiles.Contents?.length || 0,
      sceneMediaMapping: [
        {
          sceneNumber: 1,
          mediaAssets: mediaFiles.Contents?.filter(f => f.Key.includes('scene-1')).map(f => ({
            fileName: f.Key.split('/').pop(),
            s3Key: f.Key,
            size: f.Size,
            type: 'image'
          })) || []
        },
        {
          sceneNumber: 2,
          mediaAssets: mediaFiles.Contents?.filter(f => f.Key.includes('scene-2')).map(f => ({
            fileName: f.Key.split('/').pop(),
            s3Key: f.Key,
            size: f.Size,
            type: 'image'
          })) || []
        }
        // Add more scenes as needed
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'manual-context-creation',
        actualFileStructure: true
      }
    };
    
    // Upload media context
    const mediaContextKey = `videos/${realProjectId}/01-context/media-context.json`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: mediaContextKey,
      Body: JSON.stringify(mediaContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`   ✅ Created ${mediaContextKey}`);
    
    // Step 2: Create audio-context.json based on actual files
    console.log('\\n🎵 Step 2: Creating audio-context.json...');
    
    // List actual audio files
    const audioFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/04-audio/`
    }).promise();
    
    console.log(`   Found ${audioFiles.Contents?.length || 0} audio files`);
    
    // Create audio context based on actual files
    const audioContext = {
      projectId: realProjectId,
      status: 'completed',
      totalScenes: audioFiles.Contents?.length || 0,
      audioFiles: audioFiles.Contents?.map(f => ({
        fileName: f.Key.split('/').pop(),
        s3Key: f.Key,
        size: f.Size,
        sceneNumber: f.Key.includes('scene-1') ? 1 : 
                    f.Key.includes('scene-2') ? 2 :
                    f.Key.includes('scene-3') ? 3 :
                    f.Key.includes('scene-4') ? 4 :
                    f.Key.includes('scene-5') ? 5 :
                    f.Key.includes('scene-6') ? 6 : 0
      })) || [],
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'manual-context-creation',
        actualFileStructure: true
      }
    };
    
    // Upload audio context
    const audioContextKey = `videos/${realProjectId}/01-context/audio-context.json`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: audioContextKey,
      Body: JSON.stringify(audioContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`   ✅ Created ${audioContextKey}`);
    
    // Step 3: Verify all context files exist
    console.log('\\n📋 Step 3: Verifying all context files...');
    const contextFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/01-context/`
    }).promise();
    
    if (contextFiles.Contents && contextFiles.Contents.length > 0) {
      contextFiles.Contents.forEach(file => {
        const fileName = file.Key.split('/').pop();
        console.log(`   📄 ${fileName} (${file.Size} bytes)`);
      });
    }
    
    console.log('\\n✅ CONTEXT FILES CREATION COMPLETE!');
    console.log('Now Video Assembler should be able to read all required contexts.');
    
  } catch (error) {
    console.error('❌ Failed to create context files:', error);
  }
}

// Run the context creation
createMissingContextFiles();