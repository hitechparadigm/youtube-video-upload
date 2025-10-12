#!/usr/bin/env node

/**
 * 🧪 TEST SCRIPT GENERATOR FIX
 * 
 * This script tests the Script Generator to ensure it creates both:
 * 1. scene-context.json (for agent coordination)
 * 2. script.json (in 02-script/ folder)
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testScriptGeneratorFix() {
  console.log('🧪 TESTING SCRIPT GENERATOR FIX');
  console.log('==============================');
  
  const testProjectId = `test-script-fix-${Date.now()}`;
  
  try {
    // Step 1: Create a simple topic context for testing
    console.log('📝 Step 1: Creating test topic context...');
    
    const topicContext = {
      mainTopic: 'JavaScript Basics',
      expandedTopics: [
        { subtopic: 'JavaScript Fundamentals for Beginners' }
      ],
      videoStructure: {
        recommendedScenes: 4,
        totalDuration: 300
      },
      seoContext: {
        primaryKeywords: ['javascript', 'programming', 'tutorial']
      }
    };
    
    // Upload topic context using the same method the Topic Management AI would use
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `videos/${testProjectId}/01-context/topic-context.json`,
      Body: JSON.stringify(topicContext, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    // Also store in DynamoDB for context manager compatibility
    const dynamodb = new AWS.DynamoDB();
    await dynamodb.putItem({
      TableName: 'automated-video-pipeline-context-v2',
      Item: {
        PK: { S: `topic#${testProjectId}` },
        SK: { S: testProjectId },
        s3Location: { S: `videos/${testProjectId}/01-context/topic-context.json` },
        contextType: { S: 'topic' },
        projectId: { S: testProjectId },
        createdAt: { S: new Date().toISOString() },
        ttl: { N: String(Math.floor(Date.now() / 1000) + (24 * 60 * 60)) }
      }
    }).promise();
    
    console.log('✅ Created test topic context');
    
    // Step 2: Invoke Script Generator
    console.log('📝 Step 2: Invoking Script Generator...');
    
    const scriptPayload = {
      projectId: testProjectId,
      scriptOptions: {
        style: 'educational',
        targetAudience: 'beginners'
      }
    };
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify(scriptPayload)
      })
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('📋 Script Generator Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const responseBody = JSON.parse(response.body);
      console.log('✅ Script Generator succeeded');
      console.log(`   - Project ID: ${responseBody.projectId}`);
      console.log(`   - Fast Track Mode: ${responseBody.fastTrackMode}`);
      console.log(`   - Validation Passed: ${responseBody.validationPassed}`);
    } else {
      console.error('❌ Script Generator failed:', response);
      return;
    }
    
    // Step 3: Check if both files were created
    console.log('📝 Step 3: Checking created files...');
    
    // Check for scene-context.json
    try {
      const sceneContext = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: `videos/${testProjectId}/01-context/scene-context.json`
      }).promise();
      console.log('✅ scene-context.json created successfully');
      console.log(`   - Size: ${sceneContext.Body.length} bytes`);
    } catch (error) {
      console.error('❌ scene-context.json NOT found:', error.message);
    }
    
    // Check for script.json in 02-script folder
    try {
      const scriptFile = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: `videos/${testProjectId}/02-script/script.json`
      }).promise();
      console.log('✅ script.json created successfully in 02-script/ folder');
      console.log(`   - Size: ${scriptFile.Body.length} bytes`);
      
      // Parse and show script details
      const scriptData = JSON.parse(scriptFile.Body.toString());
      console.log(`   - Title: ${scriptData.title}`);
      console.log(`   - Scenes: ${scriptData.scenes?.length || 0}`);
      console.log(`   - Duration: ${scriptData.totalDuration}s`);
      
    } catch (error) {
      console.error('❌ script.json NOT found in 02-script/ folder:', error.message);
      console.error('❌ THIS IS THE BUG WE\'RE TRYING TO FIX!');
    }
    
    // Step 4: List all files created
    console.log('📝 Step 4: Listing all files created...');
    
    const listResult = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `videos/${testProjectId}/`
    }).promise();
    
    console.log(`📁 Total files created: ${listResult.Contents?.length || 0}`);
    listResult.Contents?.forEach(file => {
      console.log(`   - ${file.Key} (${file.Size} bytes)`);
    });
    
    console.log('');
    console.log('🎯 TEST RESULTS SUMMARY:');
    console.log('========================');
    
    const hasSceneContext = listResult.Contents?.some(f => f.Key.includes('scene-context.json'));
    const hasScriptFile = listResult.Contents?.some(f => f.Key.includes('02-script/script.json'));
    
    console.log(`✅ Scene Context Created: ${hasSceneContext ? 'YES' : 'NO'}`);
    console.log(`✅ Script File Created: ${hasScriptFile ? 'YES' : 'NO'}`);
    
    if (hasSceneContext && hasScriptFile) {
      console.log('🎉 SUCCESS! Script Generator is working correctly');
      console.log('   Both scene-context.json and script.json are being created');
    } else {
      console.log('❌ ISSUE DETECTED! Script Generator is not creating all required files');
      if (!hasScriptFile) {
        console.log('   Missing: 02-script/script.json - this causes downstream agents to fail');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testScriptGeneratorFix().catch(console.error);