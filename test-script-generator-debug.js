/**
 * 🔍 SCRIPT GENERATOR DEBUG TEST
 * Specifically testing why 02-script folder is not being created
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testScriptGenerator() {
  console.log('🔍 SCRIPT GENERATOR DEBUG TEST');
  console.log('='.repeat(60));
  
  // Create a test project ID
  const projectId = `debug-script-${Date.now()}_test-topic`;
  console.log(`📋 Test Project ID: ${projectId}`);
  
  try {
    // First, create a topic context (Script Generator needs this)
    console.log('📋 Step 1: Creating topic context...');
    const topicContext = {
      mainTopic: "Test Topic for Script Generation",
      expandedTopics: [
        {
          subtopic: "Introduction to Test Topic",
          priority: "high"
        }
      ],
      videoStructure: {
        recommendedScenes: 4,
        totalDuration: 240
      },
      seoContext: {
        primaryKeywords: ["test", "topic", "guide"]
      }
    };
    
    // Store topic context in S3
    const topicContextKey = `videos/${projectId}/01-context/topic-context.json`;
    await s3.putObject({
      Bucket: BUCKET,
      Key: topicContextKey,
      Body: JSON.stringify(topicContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    console.log(`✅ Created topic context: ${topicContextKey}`);
    
    // Step 2: Call Script Generator
    console.log('📝 Step 2: Calling Script Generator...');
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          projectId: projectId,
          scriptOptions: {
            targetLength: 240,
            videoStyle: 'educational',
            targetAudience: 'general'
          }
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Script Generator: SUCCESS');
      
      // Parse response body
      const body = JSON.parse(response.body);
      console.log('📄 Response Body Keys:', Object.keys(body));
      
      if (body.sceneContext) {
        console.log(`📊 Scenes Generated: ${body.sceneContext.scenes?.length || 0}`);
      }
      
      // Step 3: Check what files were actually created
      console.log('');
      console.log('📁 Step 3: Checking created files...');
      
      try {
        const listResult = await s3.listObjectsV2({
          Bucket: BUCKET,
          Prefix: `videos/${projectId}/`
        }).promise();
        
        console.log(`📊 Total files created: ${listResult.Contents.length}`);
        
        listResult.Contents.forEach(obj => {
          console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
        });
        
        // Check specifically for 02-script folder
        const scriptFiles = listResult.Contents.filter(obj => obj.Key.includes('/02-script/'));
        if (scriptFiles.length > 0) {
          console.log('');
          console.log('✅ 02-script folder found:');
          scriptFiles.forEach(file => {
            console.log(`   ✅ ${file.Key} (${file.Size} bytes)`);
          });
        } else {
          console.log('');
          console.log('❌ 02-script folder NOT FOUND');
          console.log('   This is the issue we need to fix!');
        }
        
        // Check for context files
        const contextFiles = listResult.Contents.filter(obj => obj.Key.includes('/01-context/'));
        console.log('');
        console.log('📋 Context files:');
        contextFiles.forEach(file => {
          console.log(`   📋 ${file.Key} (${file.Size} bytes)`);
        });
        
      } catch (listError) {
        console.error('❌ Error listing S3 files:', listError.message);
      }
      
    } else {
      console.log('❌ Script Generator: FAILED');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the debug test
testScriptGenerator().then(() => {
  console.log('');
  console.log('🏁 SCRIPT GENERATOR DEBUG TEST COMPLETE');
}).catch(error => {
  console.error('💥 Debug test failed:', error);
});