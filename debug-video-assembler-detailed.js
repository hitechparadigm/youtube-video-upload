/**
 * 🔍 DEBUG VIDEO ASSEMBLER DETAILED
 * Detailed debugging of Video Assembler to see exactly what's happening
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function debugVideoAssemblerDetailed() {
  console.log('🔍 DEBUG VIDEO ASSEMBLER DETAILED');
  console.log('='.repeat(60));
  
  // Use the real project ID that has all context files
  const realProjectId = '2025-10-11T23-02-47_travel-to-france-complete-guid';
  console.log(`📋 Using Real Project ID: ${realProjectId}`);
  
  try {
    // Step 1: Test with detailed logging
    console.log('\\n🎬 Step 1: Testing Video Assembly with detailed logging...');
    
    const assemblyPayload = {
      httpMethod: 'POST',
      path: '/video/assemble',
      body: JSON.stringify({
        projectId: realProjectId,
        scenes: [
          { sceneNumber: 1, title: 'Introduction to France' },
          { sceneNumber: 2, title: 'Planning Your Trip' },
          { sceneNumber: 3, title: 'Best Destinations' }
        ]
      })
    };
    
    console.log('   Payload:', JSON.stringify(assemblyPayload, null, 2));
    
    const assemblyResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify(assemblyPayload)
    }).promise();
    
    const assemblyResponse = JSON.parse(assemblyResult.Payload);
    console.log(`   Status: ${assemblyResponse.statusCode}`);
    console.log('   Full Response:', JSON.stringify(assemblyResponse, null, 2));
    
    // Step 2: Check what files were supposed to be created
    console.log('\\n📁 Step 2: Checking expected file locations...');
    
    const expectedPaths = [
      `videos/${realProjectId}/05-video/processing-logs/processing-manifest.json`,
      `videos/${realProjectId}/05-video/processing-logs/ffmpeg-instructions.json`,
      `videos/${realProjectId}/01-context/video-context.json`
    ];
    
    for (const path of expectedPaths) {
      try {
        const result = await s3.headObject({
          Bucket: S3_BUCKET,
          Key: path
        }).promise();
        console.log(`   ✅ ${path} exists (${result.ContentLength} bytes)`);
      } catch (error) {
        console.log(`   ❌ ${path} missing (${error.code})`);
      }
    }
    
    // Step 3: List all files in 05-video folder
    console.log('\\n📂 Step 3: Listing all files in 05-video folder...');
    
    const videoFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/05-video/`
    }).promise();
    
    if (videoFiles.Contents && videoFiles.Contents.length > 0) {
      console.log(`   Found ${videoFiles.Contents.length} files:`);
      videoFiles.Contents.forEach(file => {
        const fileName = file.Key.split('/').pop();
        const folder = file.Key.split('/').slice(-2, -1)[0];
        console.log(`      - ${folder}/${fileName} (${file.Size} bytes)`);
      });
    } else {
      console.log('   ❌ No files found in 05-video folder');
    }
    
    // Step 4: Check CloudWatch logs for errors
    console.log('\\n📋 Step 4: Checking for recent errors...');
    
    // Get the most recent log stream
    const logGroups = await new AWS.CloudWatchLogs().describeLogStreams({
      logGroupName: '/aws/lambda/automated-video-pipeline-video-assembler-v3',
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1
    }).promise();
    
    if (logGroups.logStreams && logGroups.logStreams.length > 0) {
      const latestStream = logGroups.logStreams[0];
      console.log(`   Latest log stream: ${latestStream.logStreamName}`);
      
      // Get recent log events
      const logEvents = await new AWS.CloudWatchLogs().getLogEvents({
        logGroupName: '/aws/lambda/automated-video-pipeline-video-assembler-v3',
        logStreamName: latestStream.logStreamName,
        limit: 10,
        startFromHead: false
      }).promise();
      
      if (logEvents.events && logEvents.events.length > 0) {
        console.log('   Recent log messages:');
        logEvents.events.forEach(event => {
          const message = event.message.trim();
          if (message.includes('ERROR') || message.includes('❌') || message.includes('Failed')) {
            console.log(`      🔴 ${message}`);
          } else if (message.includes('✅') || message.includes('uploaded')) {
            console.log(`      🟢 ${message}`);
          } else {
            console.log(`      ⚪ ${message}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the detailed debug
debugVideoAssemblerDetailed();