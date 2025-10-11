/**
 * 🔍 PROPER SCRIPT GENERATOR TEST
 * Testing the complete flow: Topic Management -> Script Generator
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

async function testProperScriptGenerator() {
  console.log('🔍 PROPER SCRIPT GENERATOR TEST');
  console.log('='.repeat(60));
  
  // Create a test project ID
  const projectId = `proper-test-${Date.now()}_script-generation`;
  console.log(`📋 Test Project ID: ${projectId}`);
  
  try {
    // Step 1: Call Topic Management AI first (to create proper context)
    console.log('📋 Step 1: Calling Topic Management AI...');
    const topicStartTime = Date.now();
    
    const topicResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-topic-management-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/topics/generate',
        body: JSON.stringify({
          baseTopic: "Script Generator Test Topic",
          projectId: projectId,
          targetAudience: 'developers'
        })
      })
    }).promise();
    
    const topicExecutionTime = ((Date.now() - topicStartTime) / 1000).toFixed(1);
    const topicResponse = JSON.parse(topicResult.Payload);
    
    console.log(`⏱️  Topic Management Time: ${topicExecutionTime}s`);
    console.log(`📥 Topic Management Status: ${topicResponse.statusCode}`);
    
    if (topicResponse.statusCode !== 200) {
      console.log('❌ Topic Management failed, cannot proceed');
      console.log('📄 Response:', JSON.stringify(topicResponse, null, 2));
      return;
    }
    
    console.log('✅ Topic Management: SUCCESS');
    
    // Wait a moment for consistency
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Call Script Generator
    console.log('📝 Step 2: Calling Script Generator...');
    const scriptStartTime = Date.now();
    
    const scriptResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          projectId: projectId,
          scriptOptions: {
            targetLength: 240,
            videoStyle: 'educational',
            targetAudience: 'developers'
          }
        })
      })
    }).promise();
    
    const scriptExecutionTime = ((Date.now() - scriptStartTime) / 1000).toFixed(1);
    const scriptResponse = JSON.parse(scriptResult.Payload);
    
    console.log(`⏱️  Script Generator Time: ${scriptExecutionTime}s`);
    console.log(`📥 Script Generator Status: ${scriptResponse.statusCode}`);
    
    if (scriptResponse.statusCode === 200) {
      console.log('✅ Script Generator: SUCCESS');
      
      // Parse response body
      const body = JSON.parse(scriptResponse.body);
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
        
        // Organize files by folder
        const folderStructure = {};
        listResult.Contents.forEach(obj => {
          const pathParts = obj.Key.split('/');
          const folder = pathParts[pathParts.length - 2]; // Get parent folder
          if (!folderStructure[folder]) folderStructure[folder] = [];
          folderStructure[folder].push(obj);
        });
        
        console.log('');
        console.log('📂 Folder structure:');
        Object.entries(folderStructure).forEach(([folder, files]) => {
          console.log(`   ${folder}/: ${files.length} files`);
          files.forEach(file => {
            console.log(`      - ${file.Key.split('/').pop()} (${file.Size} bytes)`);
          });
        });
        
        // Check specifically for 02-script folder
        if (folderStructure['02-script']) {
          console.log('');
          console.log('✅ SUCCESS: 02-script folder found!');
          folderStructure['02-script'].forEach(file => {
            console.log(`   ✅ ${file.Key} (${file.Size} bytes)`);
          });
        } else {
          console.log('');
          console.log('❌ ISSUE: 02-script folder NOT FOUND');
          console.log('   Available folders:', Object.keys(folderStructure));
        }
        
      } catch (listError) {
        console.error('❌ Error listing S3 files:', listError.message);
      }
      
    } else {
      console.log('❌ Script Generator: FAILED');
      console.log('📄 Response:', JSON.stringify(scriptResponse, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the proper test
testProperScriptGenerator().then(() => {
  console.log('');
  console.log('🏁 PROPER SCRIPT GENERATOR TEST COMPLETE');
}).catch(error => {
  console.error('💥 Test failed:', error);
});