/**
 * 🔍 DETAILED SCRIPT GENERATOR DEBUG
 * Testing with CloudWatch logs simulation
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

async function testDetailedScriptGenerator() {
  console.log('🔍 DETAILED SCRIPT GENERATOR DEBUG');
  console.log('='.repeat(60));
  
  const projectId = `detailed-debug-${Date.now()}_script-test`;
  console.log(`📋 Test Project ID: ${projectId}`);
  
  try {
    // Step 1: Topic Management
    console.log('📋 Step 1: Topic Management...');
    const topicResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-topic-management-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/topics/generate',
        body: JSON.stringify({
          baseTopic: "Detailed Debug Test Topic",
          projectId: projectId,
          targetAudience: 'testers'
        })
      })
    }).promise();
    
    const topicResponse = JSON.parse(topicResult.Payload);
    if (topicResponse.statusCode !== 200) {
      console.log('❌ Topic Management failed');
      return;
    }
    console.log('✅ Topic Management: SUCCESS');
    
    // Wait for consistency
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Script Generator with detailed logging
    console.log('📝 Step 2: Script Generator with detailed logging...');
    
    // Enable detailed logging by setting LogType to Tail
    const scriptResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      LogType: 'Tail', // This will return the logs
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          projectId: projectId,
          scriptOptions: {
            targetLength: 180,
            videoStyle: 'educational',
            targetAudience: 'testers'
          }
        })
      })
    }).promise();
    
    const scriptResponse = JSON.parse(scriptResult.Payload);
    
    // Decode and display the logs
    if (scriptResult.LogResult) {
      const logs = Buffer.from(scriptResult.LogResult, 'base64').toString('utf-8');
      console.log('');
      console.log('📋 LAMBDA EXECUTION LOGS:');
      console.log('-'.repeat(60));
      console.log(logs);
      console.log('-'.repeat(60));
    }
    
    console.log(`📥 Script Generator Status: ${scriptResponse.statusCode}`);
    
    if (scriptResponse.statusCode === 200) {
      console.log('✅ Script Generator: SUCCESS');
      
      // Step 3: Immediate S3 check
      console.log('');
      console.log('📁 Step 3: Immediate S3 check...');
      
      const listResult = await s3.listObjectsV2({
        Bucket: BUCKET,
        Prefix: `videos/${projectId}/`
      }).promise();
      
      console.log(`📊 Total files: ${listResult.Contents.length}`);
      
      // Check for specific files
      const scriptFiles = listResult.Contents.filter(obj => obj.Key.includes('/02-script/'));
      const contextFiles = listResult.Contents.filter(obj => obj.Key.includes('/01-context/'));
      
      console.log('');
      console.log('📂 File Analysis:');
      console.log(`   01-context files: ${contextFiles.length}`);
      contextFiles.forEach(file => {
        console.log(`      - ${file.Key} (${file.Size} bytes)`);
      });
      
      console.log(`   02-script files: ${scriptFiles.length}`);
      if (scriptFiles.length > 0) {
        scriptFiles.forEach(file => {
          console.log(`      ✅ ${file.Key} (${file.Size} bytes)`);
        });
      } else {
        console.log('      ❌ NO 02-script files found!');
        
        // Check if there are any errors in the logs related to S3 upload
        if (scriptResult.LogResult) {
          const logs = Buffer.from(scriptResult.LogResult, 'base64').toString('utf-8');
          if (logs.includes('❌') || logs.includes('Error') || logs.includes('Failed')) {
            console.log('');
            console.log('🚨 ERRORS FOUND IN LOGS:');
            const errorLines = logs.split('\\n').filter(line => 
              line.includes('❌') || line.includes('Error') || line.includes('Failed')
            );
            errorLines.forEach(line => console.log(`   ${line.trim()}`));
          }
        }
      }
      
    } else {
      console.log('❌ Script Generator: FAILED');
      console.log('📄 Response:', JSON.stringify(scriptResponse, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the detailed debug test
testDetailedScriptGenerator().then(() => {
  console.log('');
  console.log('🏁 DETAILED DEBUG TEST COMPLETE');
}).catch(error => {
  console.error('💥 Test failed:', error);
});