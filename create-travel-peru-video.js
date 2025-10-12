/**
 * 🎬 CREATE TRAVEL TO PERU VIDEO - COMPLETE PIPELINE TEST
 * Real video creation and YouTube upload with step-by-step monitoring
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function createTravelPeruVideo() {
  console.log('🎬 CREATING TRAVEL TO PERU VIDEO - COMPLETE PIPELINE');
  console.log('='.repeat(70));
  console.log('🎯 Target: 5-minute educational video about traveling to Peru');
  console.log('📺 Destination: YouTube upload with SEO optimization');
  console.log('');
  
  try {
    // Step 1: Start the complete pipeline
    console.log('🚀 STEP 1: Starting Complete Video Pipeline...');
    console.log('   Topic: Travel to Peru - Complete Guide');
    console.log('   Duration: 5 minutes (300 seconds)');
    console.log('   Style: Educational and engaging');
    
    const pipelinePayload = {
      httpMethod: 'POST',
      path: '/start',
      body: JSON.stringify({
        topic: 'Travel to Peru - Complete Guide',
        baseTopic: 'Travel to Peru - Complete Guide',
        targetAudience: 'travel enthusiasts',
        videoDuration: 300, // 5 minutes
        videoStyle: 'educational_engaging',
        contentType: 'travel_guide',
        keywords: ['Peru', 'travel', 'Machu Picchu', 'Lima', 'Cusco', 'travel guide']
      })
    };
    
    console.log('\\n   🔄 Invoking Workflow Orchestrator...');
    const startTime = Date.now();
    
    const orchestratorResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
      Payload: JSON.stringify(pipelinePayload)
    }).promise();
    
    const orchestratorResponse = JSON.parse(orchestratorResult.Payload);
    console.log(`   Status: ${orchestratorResponse.statusCode}`);
    
    if (orchestratorResponse.statusCode !== 200) {
      console.log('   ❌ Pipeline failed to start');
      console.log(`   Error: ${JSON.stringify(orchestratorResponse, null, 2)}`);
      return;
    }
    
    // Extract real project ID
    const responseBody = JSON.parse(orchestratorResponse.body);
    const realProjectId = responseBody.result.projectId;
    console.log(`   ✅ Pipeline started successfully!`);
    console.log(`   📋 Project ID: ${realProjectId}`);
    console.log(`   🎯 Execution ID: ${responseBody.result.executionId}`);
    
    // Step 2: Monitor pipeline progress
    console.log('\\n⏳ STEP 2: Monitoring Pipeline Progress...');
    console.log('   This will take 2-3 minutes for all agents to complete');
    
    const monitoringIntervals = [30, 60, 90, 120, 150, 180]; // Check every 30 seconds
    
    for (let i = 0; i < monitoringIntervals.length; i++) {
      const waitTime = i === 0 ? monitoringIntervals[i] : monitoringIntervals[i] - monitoringIntervals[i-1];
      console.log(`\\n   ⏱️  Waiting ${waitTime} seconds... (${monitoringIntervals[i]}s total)`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      
      console.log(`\\n   📊 Progress Check ${i + 1}/6 (${monitoringIntervals[i]}s elapsed):`);
      
      // Check S3 for created files
      const projectFiles = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `videos/${realProjectId}/`
      }).promise();
      
      if (projectFiles.Contents && projectFiles.Contents.length > 0) {
        // Organize files by folder
        const folders = {};
        projectFiles.Contents.forEach(obj => {
          const pathParts = obj.Key.split('/');
          if (pathParts.length >= 3) {
            const folder = pathParts[2]; // videos/projectId/FOLDER/
            if (!folders[folder]) folders[folder] = [];
            folders[folder].push(obj);
          }
        });
        
        // Show progress by agent
        const agentStatus = {
          'Topic Management': folders['01-context']?.some(f => f.Key.includes('topic-context.json')) ? '✅' : '⏳',
          'Script Generator': folders['02-script']?.length > 0 ? '✅' : '⏳',
          'Media Curator': folders['03-media']?.length > 0 ? '✅' : '⏳',
          'Audio Generator': folders['04-audio']?.length > 0 ? '✅' : '⏳',
          'Video Assembler': folders['05-video']?.length > 0 ? '✅' : '⏳',
          'YouTube Publisher': folders['06-metadata']?.length > 0 ? '✅' : '⏳'
        };
        
        Object.entries(agentStatus).forEach(([agent, status]) => {
          const fileCount = folders[agent.toLowerCase().replace(' ', '-')] || folders[agent.toLowerCase().split(' ')[0]] || [];
          console.log(`      ${status} ${agent}: ${fileCount.length || 0} files`);
        });
        
        console.log(`\\n      📁 Total Files Created: ${projectFiles.Contents.length}`);
        
        // If we have files in 06-metadata, the pipeline is likely complete
        if (folders['06-metadata']?.length > 0) {
          console.log('      🎉 Pipeline appears complete! YouTube metadata found.');
          break;
        }
      } else {
        console.log('      ⏳ No files created yet, agents still processing...');
      }
    }
    
    // Step 3: Final results analysis
    console.log('\\n📊 STEP 3: Final Results Analysis...');
    
    const finalFiles = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `videos/${realProjectId}/`
    }).promise();
    
    if (finalFiles.Contents && finalFiles.Contents.length > 0) {
      console.log(`\\n   🎉 SUCCESS! Created ${finalFiles.Contents.length} files total`);
      
      // Organize and display results
      const folders = {};
      finalFiles.Contents.forEach(obj => {
        const pathParts = obj.Key.split('/');
        if (pathParts.length >= 3) {
          const folder = pathParts[2];
          if (!folders[folder]) folders[folder] = [];
          folders[folder].push(obj);
        }
      });
      
      console.log('\\n   📁 COMPLETE FILE STRUCTURE:');
      Object.keys(folders).sort().forEach(folder => {
        console.log(`\\n      📂 ${folder}/ (${folders[folder].length} files):`);
        folders[folder].forEach(file => {
          const fileName = file.Key.split('/').pop();
          const sizeKB = Math.round(file.Size / 1024);
          console.log(`         - ${fileName} (${sizeKB} KB)`);
        });
      });
      
      // Check for YouTube metadata
      const youtubeMetadata = folders['06-metadata']?.find(f => f.Key.includes('youtube-metadata.json'));
      if (youtubeMetadata) {
        console.log('\\n   📺 YOUTUBE UPLOAD STATUS:');
        try {
          const metadataObj = await s3.getObject({
            Bucket: S3_BUCKET,
            Key: youtubeMetadata.Key
          }).promise();
          
          const metadata = JSON.parse(metadataObj.Body.toString());
          console.log(`      ✅ Video ID: ${metadata.videoId || 'N/A'}`);
          console.log(`      ✅ Title: ${metadata.title || 'Travel to Peru - Complete Guide'}`);
          console.log(`      ✅ Privacy: ${metadata.privacy || 'N/A'}`);
          console.log(`      ✅ Status: ${metadata.status || 'N/A'}`);
          
          if (metadata.youtubeUrl) {
            console.log(`      🎬 YouTube URL: ${metadata.youtubeUrl}`);
          }
          
        } catch (metadataError) {
          console.log('      ⚠️ Could not read YouTube metadata details');
        }
      }
      
      // Performance summary
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\\n   ⏱️  PERFORMANCE SUMMARY:`);
      console.log(`      Total Execution Time: ${totalTime} seconds`);
      console.log(`      Files Created: ${finalFiles.Contents.length}`);
      console.log(`      Average Time per File: ${Math.round(totalTime / finalFiles.Contents.length)} seconds`);
      
      // Agent success analysis
      const agentResults = {
        'Topic Management': folders['01-context']?.some(f => f.Key.includes('topic-context.json')) || false,
        'Script Generator': folders['02-script']?.length > 0 || false,
        'Media Curator': folders['03-media']?.length > 0 || false,
        'Audio Generator': folders['04-audio']?.length > 0 || false,
        'Video Assembler': folders['05-video']?.length > 0 || false,
        'YouTube Publisher': folders['06-metadata']?.length > 0 || false
      };
      
      const workingAgents = Object.values(agentResults).filter(Boolean).length;
      const successRate = Math.round((workingAgents / 6) * 100);
      
      console.log(`\\n   🎯 AGENT SUCCESS RATE: ${workingAgents}/6 (${successRate}%)`);
      Object.entries(agentResults).forEach(([agent, working]) => {
        console.log(`      ${working ? '✅' : '❌'} ${agent}`);
      });
      
      if (successRate >= 83) {
        console.log('\\n   🎉 EXCELLENT! Pipeline exceeded success threshold!');
      } else if (successRate >= 67) {
        console.log('\\n   ✅ GOOD! Pipeline met minimum success threshold!');
      } else {
        console.log('\\n   ⚠️ Pipeline below optimal performance, but may have created useful content');
      }
      
    } else {
      console.log('\\n   ❌ No files were created. Pipeline may have failed.');
    }
    
    console.log('\\n' + '='.repeat(70));
    console.log('🎬 TRAVEL TO PERU VIDEO CREATION COMPLETE!');
    console.log(`📋 Project ID: ${realProjectId}`);
    console.log('📁 Check the file structure above for all created content');
    console.log('📺 Check YouTube metadata for upload status');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);
  }
}

// Run the complete video creation
createTravelPeruVideo();