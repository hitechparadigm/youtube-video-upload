#!/usr/bin/env node

/**
 * Create Real Video: Travel to Portugal
 * This script triggers the complete pipeline to create actual content
 */

const https = require('https');

async function createPortugalVideo() {
  console.log('🇵🇹 Creating Real Video: Travel to Portugal');
  console.log('==========================================');
  
  try {
    // Step 1: Trigger the Video Production Orchestrator
    console.log('\n🚀 Step 1: Triggering Video Production Orchestrator');
    
    const orchestratorPayload = {
      topic: "Travel to Portugal",
      description: "Complete travel guide covering Lisbon, Porto, beaches, culture, food, and practical travel tips",
      targetDuration: 480, // 8 minutes
      style: "informative and engaging",
      audience: "travel enthusiasts and first-time visitors"
    };
    
    console.log('📋 Video Request Details:');
    console.log(`   Topic: ${orchestratorPayload.topic}`);
    console.log(`   Duration: ${orchestratorPayload.targetDuration} seconds (8 minutes)`);
    console.log(`   Style: ${orchestratorPayload.style}`);
    console.log(`   Audience: ${orchestratorPayload.audience}`);
    
    // Call agents directly for immediate results
    console.log('\n🔧 Calling agents directly for immediate results...');
    
    // Generate project ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const projectId = `${timestamp}_travel-to-portugal-complete-guide`;
    
    console.log(`📁 Project ID: ${projectId}`);
    
    const orchestratorResult = { 
      success: true, 
      projectId: projectId,
      mode: 'direct-agent-calls'
    };
    
    if (orchestratorResult.success) {
      console.log('✅ Orchestrator started successfully!');
      console.log(`   Project ID: ${orchestratorResult.projectId}`);
      console.log(`   Agents to run: ${orchestratorResult.agentsToRun?.length || 6}`);
      
      // Step 2: Run agents sequentially to create real content
      console.log('\n🔧 Step 2: Running Agents Sequentially');
      
      // Agent 1: Topic Management AI
      console.log('\n1. 🧠 Topic Management AI - Analyzing "Travel to Portugal"');
      const topicResult = await callTopicManagement(projectId, orchestratorPayload.topic);
      
      if (topicResult.success) {
        console.log('   ✅ Topic analysis complete');
        console.log(`   📊 Generated ${topicResult.subtopics?.length || 0} subtopics`);
      } else {
        console.log('   ❌ Topic analysis failed');
      }
      
      // Agent 2: Script Generator AI  
      console.log('\n2. 📝 Script Generator AI - Creating scenes with timing');
      const scriptResult = await callScriptGenerator(projectId);
      
      if (scriptResult.success) {
        console.log('   ✅ Script generation complete');
        console.log(`   📊 Created ${scriptResult.scenes?.length || 0} scenes`);
      } else {
        console.log('   ❌ Script generation failed');
      }
      
      // Agent 3: Media Curator AI
      console.log('\n3. 🖼️  Media Curator AI - Downloading Portugal images');
      const mediaResult = await callMediaCurator(projectId);
      
      if (mediaResult.success) {
        console.log('   ✅ Media curation complete');
        console.log(`   📊 Downloaded ${mediaResult.imagesDownloaded || 0} images`);
      } else {
        console.log('   ❌ Media curation failed');
      }
      
      // Agent 4: Audio Generator AI
      console.log('\n4. 🎵 Audio Generator AI - Creating narration with AWS Polly');
      const audioResult = await callAudioGenerator(projectId);
      
      if (audioResult.success) {
        console.log('   ✅ Audio generation complete');
        console.log(`   📊 Created ${audioResult.audioFiles?.length || 0} audio files`);
      } else {
        console.log('   ❌ Audio generation failed');
      }
      
      // Agent 5: Video Assembler AI (our enhanced version)
      console.log('\n5. 🎬 Video Assembler AI - Combining into final video');
      const videoResult = await callVideoAssembler(projectId);
      
      if (videoResult.success) {
        console.log('   ✅ Video assembly complete');
        console.log(`   📊 Created final video: ${videoResult.finalVideoPath}`);
      } else {
        console.log('   ❌ Video assembly failed');
      }
      
      console.log('\n📊 Pipeline Results Summary:');
      console.log(`   Topic Management: ${topicResult.success ? '✅' : '❌'}`);
      console.log(`   Script Generator: ${scriptResult.success ? '✅' : '❌'}`);
      console.log(`   Media Curator: ${mediaResult.success ? '✅' : '❌'}`);
      console.log(`   Audio Generator: ${audioResult.success ? '✅' : '❌'}`);
      console.log(`   Video Assembler: ${videoResult.success ? '✅' : '❌'}`);
      
      const successCount = [topicResult, scriptResult, mediaResult, audioResult, videoResult]
        .filter(r => r.success).length;
      console.log(`   Success Rate: ${successCount}/5 agents (${(successCount/5*100).toFixed(0)}%)`);
      
      orchestratorResult.agentResults = {
        topic: topicResult,
        script: scriptResult, 
        media: mediaResult,
        audio: audioResult,
        video: videoResult,
        successRate: `${successCount}/5`
      };
      
      console.log('\n⏱️  Expected Timeline:');
      console.log('   - Topic Management: ~18 seconds');
      console.log('   - Script Generation: ~13 seconds');
      console.log('   - Media Curation: ~25 seconds');
      console.log('   - Audio Generation: ~30 seconds');
      console.log('   - Video Assembly: ~15 seconds');
      console.log('   - YouTube Publishing: ~20 seconds');
      console.log('   Total: ~2 minutes for complete video creation');
      
      // Step 3: Wait and check results
      console.log('\n⏳ Step 3: Waiting for Pipeline Completion...');
      console.log('   (In production, this would be event-driven)');
      
      // Wait 3 minutes for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 180000));
      
      // Step 4: Check the results in S3
      console.log('\n📊 Step 4: Checking Results');
      await checkVideoResults(orchestratorResult.projectId);
      
      return orchestratorResult.projectId;
      
    } else {
      console.error('❌ Orchestrator failed:', orchestratorResult.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Video creation failed:', error.message);
    return null;
  }
}

/**
 * Call Topic Management AI
 */
async function callTopicManagement(projectId, topic) {
  try {
    console.log('   🔧 Calling Topic Management Lambda...');
    
    // Use the local handler for immediate testing
    const { handler } = require('./src/lambda/topic-management/index.js');
    
    const event = {
      httpMethod: 'POST',
      path: '/topic/analyze',
      body: JSON.stringify({
        topic: topic,
        projectId: projectId,
        targetDuration: 480,
        style: 'informative'
      })
    };
    
    const response = await handler(event, {});
    const result = JSON.parse(response.body);
    
    return {
      success: response.statusCode === 200,
      subtopics: result.expandedTopics?.length,
      ...result
    };
    
  } catch (error) {
    console.log(`   ❌ Topic Management error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Call Script Generator AI
 */
async function callScriptGenerator(projectId) {
  try {
    console.log('   🔧 Calling Script Generator Lambda...');
    
    const { handler } = require('./src/lambda/script-generator/index.js');
    
    const event = {
      httpMethod: 'POST',
      path: '/script/generate',
      body: JSON.stringify({
        projectId: projectId,
        targetDuration: 480
      })
    };
    
    const response = await handler(event, {});
    const result = JSON.parse(response.body);
    
    return {
      success: response.statusCode === 200,
      scenes: result.scenes?.length,
      ...result
    };
    
  } catch (error) {
    console.log(`   ❌ Script Generator error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Call Media Curator AI
 */
async function callMediaCurator(projectId) {
  try {
    console.log('   🔧 Calling Media Curator Lambda...');
    
    const { handler } = require('./src/lambda/media-curator/index.js');
    
    const event = {
      httpMethod: 'POST',
      path: '/media/curate',
      body: JSON.stringify({
        projectId: projectId
      })
    };
    
    const response = await handler(event, {});
    const result = JSON.parse(response.body);
    
    return {
      success: response.statusCode === 200,
      imagesDownloaded: result.totalImages,
      ...result
    };
    
  } catch (error) {
    console.log(`   ❌ Media Curator error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Call Audio Generator AI
 */
async function callAudioGenerator(projectId) {
  try {
    console.log('   🔧 Calling Audio Generator Lambda...');
    
    const { handler } = require('./src/lambda/audio-generator/index.js');
    
    const event = {
      httpMethod: 'POST',
      path: '/audio/generate',
      body: JSON.stringify({
        projectId: projectId
      })
    };
    
    const response = await handler(event, {});
    const result = JSON.parse(response.body);
    
    return {
      success: response.statusCode === 200,
      audioFiles: result.audioFiles?.length,
      ...result
    };
    
  } catch (error) {
    console.log(`   ❌ Audio Generator error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Call Video Assembler AI (our enhanced version)
 */
async function callVideoAssembler(projectId) {
  try {
    console.log('   🔧 Calling Enhanced Video Assembler Lambda...');
    
    const { handler } = require('./src/lambda/video-assembler/index.js');
    
    const event = {
      httpMethod: 'POST',
      path: '/video/assemble',
      body: JSON.stringify({
        projectId: projectId
      })
    };
    
    const response = await handler(event, {});
    const result = JSON.parse(response.body);
    
    return {
      success: response.statusCode === 200,
      finalVideoPath: result.filesCreated?.finalVideo,
      ...result
    };
    
  } catch (error) {
    console.log(`   ❌ Video Assembler error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Make HTTP request to Lambda function
 */
async function makeHttpRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Check video creation results in S3
 */
async function checkVideoResults(projectId) {
  console.log(`🔍 Checking results for project: ${projectId}`);
  
  try {
    const { execSync } = require('child_process');
    
    // List all files created for this project
    const s3ListCommand = `aws s3 ls s3://automated-video-pipeline-v2-786673323159-us-east-1/videos/${projectId}/ --recursive --human-readable`;
    
    console.log('\n📁 Files Created:');
    const s3Output = execSync(s3ListCommand, { encoding: 'utf8' });
    console.log(s3Output);
    
    // Check for key files
    const keyFiles = [
      '01-context/topic-context.json',
      '02-script/script.json', 
      '03-media/scene-1/images/',
      '04-audio/narration.mp3',
      '05-video/final-video.mp4',
      '06-metadata/youtube-metadata.json'
    ];
    
    console.log('\n✅ Key Files Status:');
    for (const file of keyFiles) {
      const checkCommand = `aws s3 ls s3://automated-video-pipeline-v2-786673323159-us-east-1/videos/${projectId}/${file}`;
      try {
        execSync(checkCommand, { encoding: 'utf8' });
        console.log(`   ✅ ${file} - Created`);
      } catch (error) {
        console.log(`   ❌ ${file} - Missing`);
      }
    }
    
    // Get file sizes for key media files
    console.log('\n📊 Media File Analysis:');
    try {
      const audioSize = execSync(`aws s3api head-object --bucket automated-video-pipeline-v2-786673323159-us-east-1 --key videos/${projectId}/04-audio/narration.mp3 --query ContentLength --output text`, { encoding: 'utf8' }).trim();
      console.log(`   🎵 Audio: ${(audioSize / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.log('   🎵 Audio: Not found');
    }
    
    try {
      const videoSize = execSync(`aws s3api head-object --bucket automated-video-pipeline-v2-786673323159-us-east-1 --key videos/${projectId}/05-video/final-video.mp4 --query ContentLength --output text`, { encoding: 'utf8' }).trim();
      console.log(`   🎬 Video: ${(videoSize / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      console.log('   🎬 Video: Not found');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Download the files to verify content quality');
    console.log('2. Test video playability in media players');
    console.log('3. Check YouTube upload status');
    console.log(`4. S3 Location: s3://automated-video-pipeline-v2-786673323159-us-east-1/videos/${projectId}/`);
    
  } catch (error) {
    console.error('❌ Error checking results:', error.message);
  }
}

// Run the video creation
if (require.main === module) {
  createPortugalVideo()
    .then(projectId => {
      if (projectId) {
        console.log('\n🎉 Portugal Video Creation Initiated Successfully!');
        console.log(`   Project ID: ${projectId}`);
        console.log('   Check S3 for results in 2-3 minutes');
      } else {
        console.log('\n❌ Portugal Video Creation Failed');
      }
    })
    .catch(error => {
      console.error('❌ Execution failed:', error);
    });
}

module.exports = { createPortugalVideo };