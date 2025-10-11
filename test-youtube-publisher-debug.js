/**
 * 📺 YOUTUBE PUBLISHER DEBUG TEST - SYSTEMATIC APPROACH
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

const FUNCTION_NAME = 'automated-video-pipeline-youtube-publisher-v3';
const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testYouTubePublisherDebug() {
  console.log('📺 YOUTUBE PUBLISHER DEBUG TEST - SYSTEMATIC APPROACH');
  console.log('='.repeat(60));
  
  const testProjectId = `youtube-debug-${Date.now()}_metadata-test`;
  console.log(`📋 Test Project ID: ${testProjectId}`);
  
  try {
    // Step 1: Test Health Check
    console.log('\n📊 Step 1: Testing Health Check...');
    const healthPayload = {
      httpMethod: 'GET',
      path: '/youtube/health',
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
    
    // Step 2: Create Mock Project Context (simulating complete pipeline)
    console.log('\n📝 Step 2: Creating Mock Project Context...');
    
    // Create topic context
    const mockTopicContext = {
      projectId: testProjectId,
      topic: 'Travel to France Complete Guide',
      analysis: 'Comprehensive travel guide covering Paris, Provence, and French culture',
      generatedAt: new Date().toISOString()
    };
    
    // Create scene context
    const mockSceneContext = {
      projectId: testProjectId,
      scenes: [
        {
          sceneNumber: 1,
          title: 'Introduction',
          content: { script: 'Welcome to France travel guide' },
          duration: 15
        }
      ],
      totalDuration: 15,
      generatedAt: new Date().toISOString()
    };
    
    // Create video context (simulating Video Assembler output)
    const mockVideoContext = {
      projectId: testProjectId,
      videoUrl: `https://s3.amazonaws.com/${S3_BUCKET}/videos/${testProjectId}/05-video/final-video.mp4`,
      duration: 15,
      resolution: '1920x1080',
      generatedAt: new Date().toISOString()
    };
    
    // Store contexts in S3
    const contexts = [
      { key: `videos/${testProjectId}/01-context/topic-context.json`, data: mockTopicContext },
      { key: `videos/${testProjectId}/01-context/scene-context.json`, data: mockSceneContext },
      { key: `videos/${testProjectId}/01-context/video-context.json`, data: mockVideoContext }
    ];
    
    for (const context of contexts) {
      await s3.putObject({
        Bucket: S3_BUCKET,
        Key: context.key,
        Body: JSON.stringify(context.data, null, 2),
        ContentType: 'application/json'
      }).promise();
      console.log(`✅ Created mock context: ${context.key}`);
    }
    
    // Step 3: Test YouTube Publishing
    console.log('\n📺 Step 3: Testing YouTube Publishing...');
    const publishPayload = {
      httpMethod: 'POST',
      path: '/youtube/publish',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: testProjectId,
        privacy: 'public',
        title: 'Travel to France Complete Guide',
        description: 'A comprehensive guide to traveling in France'
      })
    };
    
    console.log('📤 Sending YouTube publish request...');
    const publishResult = await lambda.invoke({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(publishPayload),
      LogType: 'Tail'
    }).promise();
    
    const publishResponse = JSON.parse(publishResult.Payload);
    console.log('📺 YouTube Publish Response:');
    console.log(JSON.stringify(publishResponse, null, 2));
    
    if (publishResult.LogResult) {
      const logs = Buffer.from(publishResult.LogResult, 'base64').toString();
      console.log('\n📋 DETAILED YOUTUBE PUBLISH LOGS:');
      console.log('='.repeat(50));
      console.log(logs);
      console.log('='.repeat(50));
    }
    
    // Step 4: Verify S3 Files Created
    console.log('\n📁 Step 4: Verifying S3 Files Created...');
    try {
      const listResult = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${testProjectId}/`
      }).promise();
      
      console.log('📂 Files created in S3:');
      listResult.Contents.forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
      });
      
      // Check for specific metadata files
      const metadataFiles = listResult.Contents.filter(obj => 
        obj.Key.includes('youtube-metadata.json') || 
        obj.Key.includes('project-summary.json')
      );
      const contextFiles = listResult.Contents.filter(obj => obj.Key.includes('01-context'));
      
      console.log(`\n📊 Summary:`);
      console.log(`   - Context files: ${contextFiles.length}`);
      console.log(`   - Metadata files: ${metadataFiles.length}`);
      console.log(`   - Total files: ${listResult.Contents.length}`);
      
      if (metadataFiles.length > 0) {
        console.log('✅ SUCCESS: YouTube metadata files were created!');
        
        // Read and display metadata content
        for (const file of metadataFiles) {
          try {
            const content = await s3.getObject({
              Bucket: S3_BUCKET,
              Key: file.Key
            }).promise();
            
            const metadata = JSON.parse(content.Body.toString());
            console.log(`\n📄 ${file.Key} content:`);
            console.log(JSON.stringify(metadata, null, 2));
          } catch (readError) {
            console.error(`❌ Error reading ${file.Key}:`, readError.message);
          }
        }
      } else {
        console.log('❌ ISSUE: No YouTube metadata files found');
      }
      
    } catch (s3Error) {
      console.error('❌ Error checking S3 files:', s3Error.message);
    }
    
    // Step 5: Check for Dependencies Issues
    console.log('\n🔍 Step 5: Dependency Analysis...');
    if (publishResponse.statusCode !== 200) {
      console.log('❌ YouTube Publishing Failed - Analyzing Response:');
      console.log('Status Code:', publishResponse.statusCode);
      if (publishResponse.body) {
        try {
          const errorBody = JSON.parse(publishResponse.body);
          console.log('Error Details:', errorBody);
        } catch (e) {
          console.log('Raw Error Body:', publishResponse.body);
        }
      }
    } else {
      console.log('✅ YouTube Publishing appears to be working!');
      
      // Check if it's actually creating the expected folder structure
      const expectedFolders = ['06-metadata'];
      console.log('\n📁 Checking expected folder structure...');
      
      const allFiles = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${testProjectId}/`
      }).promise();
      
      expectedFolders.forEach(folder => {
        const folderFiles = allFiles.Contents.filter(obj => obj.Key.includes(`/${folder}/`));
        console.log(`   - ${folder}/: ${folderFiles.length} files`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testYouTubePublisherDebug()
  .then(() => {
    console.log('\n🎯 YouTube Publisher Debug Test Complete');
    console.log('Check the logs above for detailed analysis');
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
  });