#!/usr/bin/env node

/**
 * 🎬 TEST ENHANCED VIDEO ASSEMBLER
 * 
 * This script tests the enhanced Video Assembler that creates actual video files
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';
const PROJECT_ID = '2025-10-12T01-42-31_javascript-fundamentals'; // Our existing project

async function testEnhancedVideoAssembler() {
  console.log('🎬 TESTING ENHANCED VIDEO ASSEMBLER');
  console.log('===================================');
  
  try {
    // Step 1: Check existing project content
    console.log(`📝 Step 1: Checking existing content for project: ${PROJECT_ID}`);
    
    const listResult = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `videos/${PROJECT_ID}/`
    }).promise();
    
    console.log(`📁 Current files: ${listResult.Contents?.length || 0}`);
    const currentFiles = listResult.Contents?.map(f => f.Key) || [];
    
    // Check what we have before
    const hasNarrationBefore = currentFiles.some(f => f.includes('narration.mp3'));
    const hasFinalVideoBefore = currentFiles.some(f => f.includes('final-video.mp4'));
    
    console.log(`   Current narration.mp3: ${hasNarrationBefore ? 'EXISTS' : 'MISSING'}`);
    console.log(`   Current final-video.mp4: ${hasFinalVideoBefore ? 'EXISTS' : 'MISSING'}`);
    
    // Step 2: Invoke Enhanced Video Assembler
    console.log('📝 Step 2: Invoking Enhanced Video Assembler...');
    
    const assemblerPayload = {
      projectId: PROJECT_ID,
      scenes: [
        { sceneNumber: 1, title: 'Introduction' },
        { sceneNumber: 2, title: 'Main Content' },
        { sceneNumber: 3, title: 'Conclusion' }
      ]
    };
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      LogType: 'Tail', // Get execution logs
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/video/assemble',
        body: JSON.stringify(assemblerPayload)
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
    console.log('📋 Video Assembler Response Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const responseBody = JSON.parse(response.body);
      console.log('✅ Video Assembler succeeded');
      console.log(`   Mode: ${responseBody.mode}`);
      console.log(`   Files Created:`);
      if (responseBody.filesCreated) {
        Object.entries(responseBody.filesCreated).forEach(([type, path]) => {
          console.log(`     ${type}: ${path}`);
        });
      }
    } else {
      console.error('❌ Video Assembler failed:', response);
      return;
    }
    
    // Step 3: Check what files were created
    console.log('📝 Step 3: Checking newly created files...');
    
    // Wait a moment for S3 consistency
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedListResult = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `videos/${PROJECT_ID}/`
    }).promise();
    
    console.log(`📁 Updated files: ${updatedListResult.Contents?.length || 0}`);
    const updatedFiles = updatedListResult.Contents?.map(f => ({ key: f.Key, size: f.Size })) || [];
    
    // Check what we have after
    const hasNarrationAfter = updatedFiles.some(f => f.key.includes('narration.mp3'));
    const hasFinalVideoAfter = updatedFiles.some(f => f.key.includes('final-video.mp4'));
    
    console.log('');
    console.log('🎯 RESULTS COMPARISON:');
    console.log('======================');
    console.log(`📁 Total files: ${listResult.Contents?.length || 0} → ${updatedFiles.length}`);
    console.log(`🎵 narration.mp3: ${hasNarrationBefore ? 'EXISTS' : 'MISSING'} → ${hasNarrationAfter ? 'EXISTS' : 'MISSING'}`);
    console.log(`🎬 final-video.mp4: ${hasFinalVideoBefore ? 'EXISTS' : 'MISSING'} → ${hasFinalVideoAfter ? 'EXISTS' : 'MISSING'}`);
    
    // Show new files created
    const newFiles = updatedFiles.filter(f => 
      f.key.includes('narration.mp3') || 
      f.key.includes('final-video.mp4') ||
      f.key.includes('processing-manifest.json') ||
      f.key.includes('ffmpeg-instructions.json')
    );
    
    if (newFiles.length > 0) {
      console.log('');
      console.log('🎉 NEW FILES CREATED:');
      console.log('====================');
      newFiles.forEach(file => {
        console.log(`   ${file.key} (${file.size} bytes)`);
      });
    }
    
    // Final assessment
    console.log('');
    console.log('🎯 FINAL ASSESSMENT:');
    console.log('====================');
    
    if (hasNarrationAfter && hasFinalVideoAfter) {
      console.log('🎉 SUCCESS! Enhanced Video Assembler created both missing files:');
      console.log('   ✅ narration.mp3 (master audio file)');
      console.log('   ✅ final-video.mp4 (complete assembled video)');
      console.log('   🚀 Project now has complete file structure!');
    } else if (hasNarrationAfter || hasFinalVideoAfter) {
      console.log('⚠️ PARTIAL SUCCESS! Some files created:');
      console.log(`   ${hasNarrationAfter ? '✅' : '❌'} narration.mp3`);
      console.log(`   ${hasFinalVideoAfter ? '✅' : '❌'} final-video.mp4`);
    } else {
      console.log('❌ NO NEW FILES CREATED');
      console.log('   Check execution logs above for errors');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testEnhancedVideoAssembler().catch(console.error);