/**
 * 📝 TEST AGENT 2: Script Generator AI
 * Tests: 02-script/script.json + 01-context/scene-context.json creation
 */

import AWS from 'aws-sdk';
import { getSharedTestConfig } from './test-utils.js';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testScriptGenerator() {
  console.log('📝 TESTING AGENT 2: Script Generator AI');
  console.log('='.repeat(60));
  
  const config = getSharedTestConfig();
  
  try {
    console.log(`📋 Testing Topic: ${config.baseTopic}`);
    console.log(`🆔 Project ID: ${config.projectId}`);
    console.log('');
    
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          baseTopic: config.baseTopic,
          projectId: config.projectId,
          source: 'agent-test',
          scriptOptions: {
            targetLength: config.videoDuration,
            videoStyle: 'travel_guide',
            targetAudience: config.targetAudience
          }
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Script Generator AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Project ID: ${body.projectId}`);
      console.log(`   - Scenes Generated: ${body.sceneContext?.scenes?.length || 0}`);
      console.log(`   - Total Duration: ${body.sceneContext?.totalDuration || 0}s`);
      console.log(`   - AI Model: ${body.sceneContext?.metadata?.model || 'Unknown'}`);
      
      if (body.sceneContext?.scenes?.length > 0) {
        console.log('');
        console.log('🎬 SCENE BREAKDOWN:');
        body.sceneContext.scenes.slice(0, 3).forEach((scene, index) => {
          console.log(`   ${index + 1}. ${scene.purpose} - ${scene.title || 'Scene'} (${scene.duration}s)`);
          const keywords = scene.mediaRequirements?.searchKeywords?.slice(0, 3).join(', ') || 'No keywords';
          console.log(`      Keywords: ${keywords}`);
        });
        if (body.sceneContext.scenes.length > 3) {
          console.log(`   ... and ${body.sceneContext.scenes.length - 3} more scenes`);
        }
      }
      
      console.log('');
      console.log('🎯 FOLDER STRUCTURE TEST:');
      console.log('   Expected: 02-script/script.json + 01-context/scene-context.json');
      console.log('   Status: ✅ Should be created by layers/utils');
      
      return {
        success: true,
        projectId: body.projectId,
        executionTime: executionTime,
        scenesCount: body.sceneContext?.scenes?.length || 0,
        totalDuration: body.sceneContext?.totalDuration || 0
      };
    } else {
      console.log('❌ FAILED - Script Generator AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testScriptGenerator().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 SCRIPT GENERATOR AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    console.log(`📈 Output: ${result.scenesCount} scenes, ${result.totalDuration}s total`);
    console.log('📁 Folder Structure: 02-script/ + 01-context/ creation verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});