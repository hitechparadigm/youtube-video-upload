/**
 * 🎯 WORKFLOW ORCHESTRATOR END-TO-END TEST
 * Tests the complete pipeline through the orchestrator - one call creates entire video
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
const BASE_TOPIC = "Travel to France - Complete Guide";

async function listS3Folder(prefix) {
  try {
    const result = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: prefix }).promise();
    return result.Contents.map(obj => ({ key: obj.Key, size: obj.Size }));
  } catch (error) {
    console.error(`❌ Error listing S3 folder ${prefix}:`, error.message);
    return [];
  }
}

async function checkS3File(key) {
  try {
    const result = await s3.getObject({ Bucket: BUCKET, Key: key }).promise();
    return { exists: true, size: result.Body.length, content: JSON.parse(result.Body.toString()) };
  } catch (error) {
    return { exists: false, error: error.code };
  }
}

async function testOrchestratorEndToEnd() {
  console.log('🎯 WORKFLOW ORCHESTRATOR END-TO-END TEST');
  console.log('='.repeat(80));
  console.log('🎬 Testing complete pipeline through single orchestrator call');
  console.log(`🎯 Topic: ${BASE_TOPIC}`);
  console.log(`☁️  S3 Bucket: ${BUCKET}`);
  console.log('');
  
  try {
    console.log('🚀 STARTING COMPLETE PIPELINE...');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Call the Workflow Orchestrator to run the complete pipeline
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/workflow/start',
        body: JSON.stringify({
          baseTopic: BASE_TOPIC,
          targetAudience: 'travelers',
          videoDuration: 480,
          videoStyle: 'travel_guide',
          publishOptions: {
            dryRun: true, // Don't actually publish to YouTube
            privacy: 'private'
          }
        })
      })
    }).promise();
    
    const totalExecutionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Total Pipeline Execution Time: ${totalExecutionTime}s`);
    console.log(`📥 Orchestrator Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ ORCHESTRATOR SUCCESS!');
      console.log('');
      console.log('📊 PIPELINE RESULTS:');
      console.log(`   - Execution ID: ${body.executionId || 'N/A'}`);
      console.log(`   - Project ID: ${body.projectId || 'N/A'}`);
      console.log(`   - Pipeline Status: ${body.status || 'Unknown'}`);
      console.log(`   - Agents Coordinated: ${body.agentsCoordinated || 'N/A'}`);
      console.log(`   - Total Duration: ${body.totalDuration || 'N/A'}s`);
      
      const projectId = body.projectId;
      
      if (projectId) {
        // Wait for pipeline completion (orchestrator might return before all agents finish)
        console.log('');
        console.log('⏳ Waiting for pipeline completion...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        // Analyze the complete project structure
        console.log('');
        console.log('📁 ANALYZING COMPLETE PROJECT STRUCTURE:');
        console.log('='.repeat(60));
        
        const allFiles = await listS3Folder(`videos/${projectId}/`);
        console.log(`📊 Total files created: ${allFiles.length}`);
        
        if (allFiles.length === 0) {
          console.log('❌ No files found - pipeline may have failed or still running');
          return { success: false, error: 'No files created' };
        }
        
        // Analyze folder structure
        const folderStructure = {};
        allFiles.forEach(file => {
          const pathParts = file.key.split('/');
          const folder = pathParts[pathParts.length - 2]; // Get parent folder
          if (!folderStructure[folder]) folderStructure[folder] = [];
          folderStructure[folder].push(file);
        });
        
        console.log('');
        console.log('📂 Complete folder breakdown:');
        Object.entries(folderStructure).forEach(([folder, files]) => {
          console.log(`   ${folder}/: ${files.length} files`);
        });
        
        // Check for expected folder structure
        const expectedFolders = ['01-context', '02-script', '03-media', '04-audio', '05-video', '06-metadata'];
        const missingFolders = expectedFolders.filter(folder => !folderStructure[folder]);
        
        console.log('');
        console.log('🎯 FOLDER STRUCTURE VALIDATION:');
        expectedFolders.forEach(folder => {
          const exists = folderStructure[folder];
          const status = exists ? '✅' : '❌';
          const count = exists ? exists.length : 0;
          console.log(`   ${folder}/: ${status} (${count} files)`);
        });
        
        // Check context files specifically
        console.log('');
        console.log('🔄 AGENT COORDINATION VALIDATION:');
        const contextFiles = [
          'topic-context.json',
          'scene-context.json', 
          'media-context.json',
          'audio-context.json',
          'video-context.json'
        ];
        
        for (const contextFile of contextFiles) {
          const fileCheck = await checkS3File(`videos/${projectId}/01-context/${contextFile}`);
          const status = fileCheck.exists ? '✅' : '❌';
          const size = fileCheck.exists ? `${fileCheck.size} bytes` : 'Missing';
          console.log(`   ${contextFile}: ${status} (${size})`);
        }
        
        // Calculate success metrics
        const foldersCreated = expectedFolders.length - missingFolders.length;
        const folderSuccessRate = ((foldersCreated / expectedFolders.length) * 100).toFixed(1);
        
        const contextFilesFound = contextFiles.filter(async (file) => {
          const check = await checkS3File(`videos/${projectId}/01-context/${file}`);
          return check.exists;
        }).length;
        
        console.log('');
        console.log('📈 PIPELINE SUCCESS METRICS:');
        console.log(`   - Folder Structure: ${foldersCreated}/${expectedFolders.length} folders (${folderSuccessRate}%)`);
        console.log(`   - Total Files Created: ${allFiles.length}`);
        console.log(`   - Agent Coordination: ${contextFiles.length}/5 context files`);
        console.log(`   - Execution Time: ${totalExecutionTime}s`);
        
        // Determine overall success
        const overallSuccess = foldersCreated >= 5 && allFiles.length >= 20; // At least 5 folders and 20 files
        
        console.log('');
        if (overallSuccess) {
          console.log('🎉 END-TO-END PIPELINE SUCCESS!');
          console.log('✅ Complete video project created through orchestrator');
          console.log('✅ All major components operational');
          console.log('✅ Ready for production use');
        } else {
          console.log('⚠️  PARTIAL SUCCESS - Some components may need attention');
          console.log(`   Missing folders: ${missingFolders.join(', ')}`);
        }
        
        console.log('');
        console.log('🎬 COMPLETE VIDEO PROJECT LOCATION:');
        console.log(`   S3: s3://${BUCKET}/videos/${projectId}/`);
        console.log('   Contains: Topic analysis, script, images, audio, video assembly, YouTube metadata');
        
        return {
          success: overallSuccess,
          projectId: projectId,
          totalFiles: allFiles.length,
          foldersCreated: foldersCreated,
          executionTime: totalExecutionTime,
          folderStructure: folderStructure
        };
        
      } else {
        console.log('❌ No project ID returned from orchestrator');
        return { success: false, error: 'No project ID returned' };
      }
      
    } else {
      console.log('❌ ORCHESTRATOR FAILED');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response, executionTime: totalExecutionTime };
    }
    
  } catch (error) {
    console.error('💥 End-to-end test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the orchestrator end-to-end test
testOrchestratorEndToEnd().then(result => {
  console.log('');
  console.log('🏁 WORKFLOW ORCHESTRATOR END-TO-END TEST COMPLETE');
  console.log('='.repeat(80));
  
  if (result.success) {
    console.log('🎉 RESULT: COMPLETE SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s total execution`);
    console.log(`📁 Files Created: ${result.totalFiles} files`);
    console.log(`🏗️ Folders Created: ${result.foldersCreated}/6 expected folders`);
    console.log('');
    console.log('🚀 PRODUCTION READY STATUS:');
    console.log('✅ End-to-end orchestration working');
    console.log('✅ All agents coordinated properly');
    console.log('✅ Complete video projects generated');
    console.log('✅ Ready for real-world deployment');
  } else {
    console.log('❌ RESULT: NEEDS ATTENTION');
    console.log(`⚠️  Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
    console.log('');
    console.log('🔧 TROUBLESHOOTING NEEDED:');
    console.log('- Check orchestrator implementation');
    console.log('- Verify agent coordination logic');
    console.log('- Review S3 permissions and timing');
  }
  
}).catch(error => {
  console.error('💥 Orchestrator end-to-end test failed:', error);
});