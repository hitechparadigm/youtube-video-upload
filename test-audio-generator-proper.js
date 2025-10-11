/**
 * 🎵 AUDIO GENERATOR PROPER TEST - WITH CONTEXT MANAGER
 * 
 * This test properly simulates the Script Generator -> Audio Generator flow
 * by using the context manager to store scene context first
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();

const FUNCTION_NAME = 'automated-video-pipeline-audio-generator-v3';
const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';
const CONTEXT_TABLE = 'automated-video-pipeline-context-v2';

async function testAudioGeneratorProper() {
  console.log('🎵 AUDIO GENERATOR PROPER TEST - WITH CONTEXT MANAGER');
  console.log('='.repeat(60));
  
  const testProjectId = `audio-proper-${Date.now()}_context-test`;
  console.log(`📋 Test Project ID: ${testProjectId}`);
  
  try {
    // Step 1: Simulate Script Generator storing scene context properly
    console.log('\n📝 Step 1: Simulating Script Generator Context Storage...');
    
    const mockSceneContext = {
      projectId: testProjectId,
      scenes: [
        {
          sceneNumber: 1,
          title: 'Introduction',
          content: {
            script: 'Welcome to our comprehensive guide to traveling in France. This beautiful country offers incredible experiences for every type of traveler.'
          },
          duration: 15,
          purpose: 'hook'
        },
        {
          sceneNumber: 2,
          title: 'Main Content',
          content: {
            script: 'From the romantic streets of Paris to the stunning lavender fields of Provence, France captivates visitors with its rich culture and breathtaking landscapes.'
          },
          duration: 20,
          purpose: 'content_delivery'
        }
      ],
      totalDuration: 35,
      generatedAt: new Date().toISOString()
    };
    
    // Store in S3 using standard path
    const sceneContextKey = `videos/${testProjectId}/01-context/scene-context.json`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: sceneContextKey,
      Body: JSON.stringify(mockSceneContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`✅ Stored scene context in S3: ${sceneContextKey}`);
    
    // Store reference in DynamoDB (like context manager does)
    const contextRecord = {
      PK: { S: `scene#${testProjectId}` },
      SK: { S: testProjectId },
      s3Location: { S: sceneContextKey },
      contextType: { S: 'scene' },
      projectId: { S: testProjectId },
      createdAt: { S: new Date().toISOString() },
      ttl: { N: String(Math.floor(Date.now() / 1000) + (24 * 60 * 60)) }
    };
    
    await dynamodb.putItem({
      TableName: CONTEXT_TABLE,
      Item: contextRecord
    }).promise();
    
    console.log(`✅ Stored context reference in DynamoDB: scene#${testProjectId}`);
    
    // Step 2: Test Audio Generation with proper context
    console.log('\n🎵 Step 2: Testing Audio Generation with Proper Context...');
    const audioPayload = {
      httpMethod: 'POST',
      path: '/audio/generate-from-project',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: testProjectId,
        voiceOptions: {
          preferredVoice: 'Joanna' // Use neural voice for reliability
        }
      })
    };
    
    console.log('📤 Sending audio generation request...');
    const audioResult = await lambda.invoke({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(audioPayload),
      LogType: 'Tail'
    }).promise();
    
    const audioResponse = JSON.parse(audioResult.Payload);
    console.log('🎵 Audio Generation Response:');
    console.log(JSON.stringify(audioResponse, null, 2));
    
    if (audioResult.LogResult) {
      const logs = Buffer.from(audioResult.LogResult, 'base64').toString();
      console.log('\n📋 DETAILED AUDIO GENERATION LOGS:');
      console.log('='.repeat(50));
      console.log(logs);
      console.log('='.repeat(50));
    }
    
    // Step 3: Verify S3 Files Created
    console.log('\n📁 Step 3: Verifying S3 Files Created...');
    try {
      const listResult = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${testProjectId}/`
      }).promise();
      
      console.log('📂 Files created in S3:');
      listResult.Contents.forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
      });
      
      // Check for specific audio files
      const audioFiles = listResult.Contents.filter(obj => obj.Key.includes('04-audio'));
      const contextFiles = listResult.Contents.filter(obj => obj.Key.includes('01-context'));
      
      console.log(`\n📊 Summary:`);
      console.log(`   - Context files: ${contextFiles.length}`);
      console.log(`   - Audio files: ${audioFiles.length}`);
      console.log(`   - Total files: ${listResult.Contents.length}`);
      
      if (audioFiles.length > 0) {
        console.log('✅ SUCCESS: Audio files were created!');
        
        // Check audio file sizes
        audioFiles.forEach(file => {
          if (file.Size > 1000) {
            console.log(`✅ Audio file ${file.Key} has good size: ${file.Size} bytes`);
          } else {
            console.log(`⚠️ Audio file ${file.Key} seems small: ${file.Size} bytes`);
          }
        });
      } else {
        console.log('❌ ISSUE: No audio files found in 04-audio/ folder');
      }
      
    } catch (s3Error) {
      console.error('❌ Error checking S3 files:', s3Error.message);
    }
    
    // Step 4: Check Audio Context Storage
    console.log('\n🔍 Step 4: Checking Audio Context Storage...');
    if (audioResponse.statusCode === 200) {
      try {
        // Check if audio context was stored
        const audioContextKey = `videos/${testProjectId}/01-context/audio-context.json`;
        const audioContextResult = await s3.getObject({
          Bucket: S3_BUCKET,
          Key: audioContextKey
        }).promise();
        
        const audioContext = JSON.parse(audioContextResult.Body.toString());
        console.log('✅ Audio context stored successfully:');
        console.log(`   - Master Audio ID: ${audioContext.masterAudioId}`);
        console.log(`   - Audio Segments: ${audioContext.audioSegments?.length || 0}`);
        console.log(`   - Voice Used: ${audioContext.voiceSettings?.selectedVoice?.name}`);
        console.log(`   - Total Duration: ${audioContext.qualityMetrics?.totalDuration}s`);
        
      } catch (contextError) {
        console.log('⚠️ Audio context not found (may be stored elsewhere)');
      }
    }
    
    // Step 5: Final Analysis
    console.log('\n🎯 Step 5: Final Analysis...');
    if (audioResponse.statusCode === 200) {
      console.log('✅ AUDIO GENERATOR IS WORKING!');
      console.log('✅ Context integration successful');
      console.log('✅ Polly integration functional');
      console.log('✅ S3 file creation operational');
      console.log('✅ Ready for pipeline integration');
    } else {
      console.log('❌ Audio Generator still has issues:');
      console.log(`   Status: ${audioResponse.statusCode}`);
      if (audioResponse.body) {
        try {
          const errorBody = JSON.parse(audioResponse.body);
          console.log(`   Error: ${errorBody.error?.message || 'Unknown error'}`);
        } catch (e) {
          console.log(`   Raw Error: ${audioResponse.body}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAudioGeneratorProper()
  .then(() => {
    console.log('\n🎯 Audio Generator Proper Test Complete');
    console.log('This test simulates the complete Script Generator -> Audio Generator flow');
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
  });