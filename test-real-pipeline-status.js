/**
 * 🎯 REAL PIPELINE STATUS TEST - NO MOCKS
 * 
 * This will run the actual orchestrator and see what really works
 * and what folder structure we actually get
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const ORCHESTRATOR_FUNCTION = 'automated-video-pipeline-workflow-orchestrator-v3';
const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testRealPipelineStatus() {
  console.log('🎯 REAL PIPELINE STATUS TEST - NO MOCKS');
  console.log('='.repeat(60));
  
  const testProjectId = `real-pipeline-${Date.now()}_status-check`;
  console.log(`📋 Test Project ID: ${testProjectId}`);
  
  try {
    // Step 1: Run the actual orchestrator
    console.log('\n🚀 Step 1: Running Real Orchestrator...');
    const orchestratorPayload = {
      httpMethod: 'POST',
      path: '/start',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Travel to France Complete Guide',
        projectId: testProjectId
      })
    };
    
    console.log('📤 Invoking orchestrator...');
    const startTime = Date.now();
    
    const orchestratorResult = await lambda.invoke({
      FunctionName: ORCHESTRATOR_FUNCTION,
      Payload: JSON.stringify(orchestratorPayload),
      LogType: 'Tail'
    }).promise();
    
    const executionTime = Date.now() - startTime;
    const orchestratorResponse = JSON.parse(orchestratorResult.Payload);
    
    console.log(`⏱️ Execution Time: ${executionTime}ms`);
    console.log('🎯 Orchestrator Response:');
    console.log(JSON.stringify(orchestratorResponse, null, 2));
    
    if (orchestratorResult.LogResult) {
      const logs = Buffer.from(orchestratorResult.LogResult, 'base64').toString();
      console.log('\n📋 ORCHESTRATOR LOGS:');
      console.log('='.repeat(50));
      console.log(logs);
      console.log('='.repeat(50));
    }
    
    // Step 2: Extract real project ID from orchestrator response
    console.log('\n🔍 Step 2: Extracting Real Project ID...');
    let realProjectId = testProjectId;
    
    if (orchestratorResponse.statusCode === 200) {
      try {
        const responseBody = JSON.parse(orchestratorResponse.body);
        if (responseBody.result && responseBody.result.projectId) {
          realProjectId = responseBody.result.projectId;
          console.log(`✅ Real Project ID: ${realProjectId}`);
        }
      } catch (e) {
        console.log('⚠️ Could not extract project ID from response');
      }
    }
    
    // Step 3: Wait a moment for async operations
    console.log('\n⏳ Step 3: Waiting for async operations...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check what files were actually created
    console.log('\n📁 Step 4: Checking Real Files Created...');
    try {
      const listResult = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${realProjectId}/`
      }).promise();
      
      console.log('📂 REAL FILES CREATED:');
      if (listResult.Contents.length === 0) {
        console.log('   ❌ NO FILES FOUND');
      } else {
        listResult.Contents.forEach(obj => {
          console.log(`   - ${obj.Key} (${obj.Size} bytes) - ${new Date(obj.LastModified).toISOString()}`);
        });
      }
      
      // Analyze folder structure
      const folders = {};
      listResult.Contents.forEach(obj => {
        const pathParts = obj.Key.split('/');
        if (pathParts.length >= 3) {
          const folder = pathParts[2]; // videos/projectId/FOLDER/
          if (!folders[folder]) folders[folder] = [];
          folders[folder].push(obj);
        }
      });
      
      console.log('\n📊 FOLDER STRUCTURE ANALYSIS:');
      Object.keys(folders).sort().forEach(folder => {
        console.log(`   📁 ${folder}/: ${folders[folder].length} files`);
        folders[folder].forEach(file => {
          const fileName = file.Key.split('/').pop();
          console.log(`      - ${fileName} (${file.Size} bytes)`);
        });
      });
      
      // Step 5: Analyze which agents actually worked
      console.log('\n🔍 Step 5: Agent Analysis Based on Real Files...');
      
      const agentAnalysis = {
        'Topic Management': folders['01-context']?.some(f => f.Key.includes('topic-context.json')) || false,
        'Script Generator': folders['02-script']?.some(f => f.Key.includes('script.json')) || false,
        'Media Curator': folders['03-media']?.length > 0 || false,
        'Audio Generator': folders['04-audio']?.length > 0 || false,
        'Video Assembler': folders['05-video']?.length > 0 || false,
        'YouTube Publisher': folders['06-metadata']?.length > 0 || false
      };
      
      console.log('🎯 AGENT SUCCESS ANALYSIS:');
      let workingAgents = 0;
      let totalAgents = 0;
      
      Object.entries(agentAnalysis).forEach(([agent, working]) => {
        totalAgents++;
        if (working) {
          workingAgents++;
          console.log(`   ✅ ${agent}: WORKING`);
        } else {
          console.log(`   ❌ ${agent}: NOT WORKING`);
        }
      });
      
      const successRate = Math.round((workingAgents / totalAgents) * 100);
      console.log(`\n📊 REAL SUCCESS RATE: ${workingAgents}/${totalAgents} agents (${successRate}%)`);
      
      // Step 5: Check file contents for quality
      console.log('\n🔍 Step 5: File Content Quality Check...');
      
      for (const [folder, files] of Object.entries(folders)) {
        console.log(`\n📁 Checking ${folder}/ contents:`);
        
        for (const file of files.slice(0, 2)) { // Check first 2 files per folder
          try {
            const content = await s3.getObject({
              Bucket: S3_BUCKET,
              Key: file.Key
            }).promise();
            
            const fileName = file.Key.split('/').pop();
            
            if (fileName.endsWith('.json')) {
              const jsonContent = JSON.parse(content.Body.toString());
              console.log(`   📄 ${fileName}:`);
              console.log(`      - Keys: ${Object.keys(jsonContent).join(', ')}`);
              console.log(`      - Size: ${file.Size} bytes`);
              
              // Check for meaningful content
              if (jsonContent.projectId) {
                console.log(`      - Project ID: ${jsonContent.projectId}`);
              }
              if (jsonContent.scenes) {
                console.log(`      - Scenes: ${jsonContent.scenes.length}`);
              }
              if (jsonContent.mediaItems) {
                console.log(`      - Media Items: ${jsonContent.mediaItems.length}`);
              }
            } else {
              console.log(`   📄 ${fileName}: ${file.Size} bytes (binary file)`);
            }
            
          } catch (readError) {
            console.log(`   ❌ Could not read ${file.Key}: ${readError.message}`);
          }
        }
      }
      
      // Step 6: Final Assessment
      console.log('\n🎯 Step 6: FINAL REAL ASSESSMENT...');
      
      if (workingAgents === 0) {
        console.log('❌ CRITICAL: No agents are working - pipeline completely broken');
      } else if (workingAgents < 3) {
        console.log('⚠️ WARNING: Less than 50% of agents working - major issues');
      } else if (workingAgents < 5) {
        console.log('✅ PARTIAL: Pipeline partially working - some agents need fixes');
      } else {
        console.log('🎉 SUCCESS: Most agents working - pipeline operational');
      }
      
      console.log('\n📋 REAL FOLDER STRUCTURE:');
      if (Object.keys(folders).length === 0) {
        console.log('   ❌ NO FOLDER STRUCTURE CREATED');
      } else {
        Object.keys(folders).sort().forEach(folder => {
          console.log(`   📁 videos/${testProjectId}/${folder}/ (${folders[folder].length} files)`);
        });
      }
      
    } catch (s3Error) {
      console.error('❌ Error checking S3 files:', s3Error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testRealPipelineStatus()
  .then(() => {
    console.log('\n🎯 Real Pipeline Status Test Complete');
    console.log('This shows the actual state of the pipeline - no mocks, no simulations');
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
  });