#!/usr/bin/env node

/**
 * 🧪 TEST SCENE CONTEXT ISSUE
 * 
 * This script investigates why scene-context.json is not being created
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testSceneContextIssue() {
  console.log('🧪 INVESTIGATING SCENE CONTEXT ISSUE');
  console.log('====================================');
  
  // Use proper timestamp_{title} format like the orchestrator
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, ''); // Remove milliseconds and timezone
  const testProjectId = `${timestamp}_javascript-testing-fundamentals`;
  
  try {
    // Step 1: Create topic context
    console.log('📝 Step 1: Creating test topic context...');
    
    const topicContext = {
      mainTopic: 'JavaScript Testing',
      expandedTopics: [
        { subtopic: 'JavaScript Testing Fundamentals' }
      ],
      videoStructure: {
        recommendedScenes: 4,
        totalDuration: 240
      },
      seoContext: {
        primaryKeywords: ['javascript', 'testing', 'tutorial']
      }
    };
    
    // Upload topic context
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
    
    // Step 2: Invoke Script Generator with LogType to see execution details
    console.log('📝 Step 2: Invoking Script Generator with detailed logging...');
    
    const scriptPayload = {
      projectId: testProjectId,
      scriptOptions: {
        style: 'educational',
        targetAudience: 'beginners'
      }
    };
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      LogType: 'Tail', // This will give us the execution logs
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify(scriptPayload)
      })
    }).promise();
    
    // Decode and display the logs
    if (result.LogResult) {
      const logs = Buffer.from(result.LogResult, 'base64').toString();
      console.log('📋 EXECUTION LOGS:');
      console.log('==================');
      console.log(logs);
      console.log('==================');
    }
    
    const response = JSON.parse(result.Payload);
    console.log('📋 Script Generator Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('✅ Script Generator succeeded');
    } else {
      console.error('❌ Script Generator failed:', response);
      return;
    }
    
    // Step 3: Check what files were actually created
    console.log('📝 Step 3: Checking all created files...');
    
    const listResult = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `videos/${testProjectId}/`
    }).promise();
    
    console.log(`📁 Total files created: ${listResult.Contents?.length || 0}`);
    listResult.Contents?.forEach(file => {
      console.log(`   - ${file.Key} (${file.Size} bytes)`);
    });
    
    // Step 4: Specifically check for scene-context.json
    const hasSceneContext = listResult.Contents?.some(f => f.Key.includes('scene-context.json'));
    const hasScriptFile = listResult.Contents?.some(f => f.Key.includes('02-script/script.json'));
    
    console.log('');
    console.log('🎯 ANALYSIS RESULTS:');
    console.log('====================');
    console.log(`✅ Topic Context Created: YES`);
    console.log(`✅ Script File Created: ${hasScriptFile ? 'YES' : 'NO'}`);
    console.log(`✅ Scene Context Created: ${hasSceneContext ? 'YES' : 'NO'}`);
    
    if (!hasSceneContext) {
      console.log('');
      console.log('🚨 SCENE CONTEXT MISSING!');
      console.log('This suggests the storeContext function is failing silently.');
      console.log('Check the execution logs above for any error messages.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testSceneContextIssue().catch(console.error);