/**
 * 🎵 AUDIO GENERATOR DEBUG TEST - SYSTEMATIC APPROACH
 * 
 * Following the successful Script Generator debugging methodology:
 * 1. Test individual agent in isolation
 * 2. Check dependencies and permissions
 * 3. Verify S3 folder creation
 * 4. Examine detailed execution logs
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const FUNCTION_NAME = 'automated-video-pipeline-audio-generator-v3';
const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testAudioGeneratorDebug() {
  console.log('🎵 AUDIO GENERATOR DEBUG TEST - SYSTEMATIC APPROACH');
  console.log('='.repeat(60));
  
  const testProjectId = `audio-debug-${Date.now()}_polly-test`;
  console.log(`📋 Test Project ID: ${testProjectId}`);
  
  try {
    // Step 1: Test Health Check
    console.log('\n📊 Step 1: Testing Health Check...');
    const healthPayload = {
      httpMethod: 'GET',
      path: '/health',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const healthResult = await lambda.invoke({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(healthPayload),
      LogType: 'Tail'
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log('✅ Health Check Response:', JSON.stringify(healthResponse, null, 2));
    
    if (healthResult.LogResult) {
      const logs = Buffer.from(healthResult.LogResult, 'base64').toString();
      console.log('📋 Health Check Logs:');
      console.log(logs);
    }
    
    // Step 2: Check Polly Permissions
    console.log('\n🔐 Step 2: Testing Polly Permissions...');
    const voicesPayload = {
      httpMethod: 'GET',
      path: '/audio/voices',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const voicesResult = await lambda.invoke({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(voicesPayload),
      LogType: 'Tail'
    }).promise();
    
    const voicesResponse = JSON.parse(voicesResult.Payload);
    console.log('🎭 Voices Response:', JSON.stringify(voicesResponse, null, 2));
    
    if (voicesResult.LogResult) {
      const logs = Buffer.from(voicesResult.LogResult, 'base64').toString();
      console.log('📋 Voices Check Logs:');
      console.log(logs);
    }
    
    // Step 3: Create Mock Scene Context (like Script Generator creates)
    console.log('\n📝 Step 3: Creating Mock Scene Context...');
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
    
    // Store scene context in S3 (simulating Script Generator output)
    const sceneContextKey = `videos/${testProjectId}/01-context/scene-context.json`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: sceneContextKey,
      Body: JSON.stringify(mockSceneContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`✅ Created mock scene context: ${sceneContextKey}`);
    
    // Step 4: Test Audio Generation
    console.log('\n🎵 Step 4: Testing Audio Generation...');
    const audioPayload = {
      httpMethod: 'POST',
      path: '/audio/generate-from-project',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: testProjectId,
        voiceOptions: {
          preferredVoice: 'Joanna' // Use neural voice first (more reliable than generative)
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
    
    // Step 5: Verify S3 Files Created
    console.log('\n📁 Step 5: Verifying S3 Files Created...');
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
      } else {
        console.log('❌ ISSUE: No audio files found in 04-audio/ folder');
      }
      
    } catch (s3Error) {
      console.error('❌ Error checking S3 files:', s3Error.message);
    }
    
    // Step 6: Check for Dependencies Issues
    console.log('\n🔍 Step 6: Dependency Analysis...');
    if (audioResponse.statusCode !== 200) {
      console.log('❌ Audio Generation Failed - Analyzing Response:');
      console.log('Status Code:', audioResponse.statusCode);
      if (audioResponse.body) {
        try {
          const errorBody = JSON.parse(audioResponse.body);
          console.log('Error Details:', errorBody);
        } catch (e) {
          console.log('Raw Error Body:', audioResponse.body);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAudioGeneratorDebug()
  .then(() => {
    console.log('\n🎯 Audio Generator Debug Test Complete');
    console.log('Check the logs above for detailed analysis');
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
  });