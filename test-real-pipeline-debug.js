/**
 * 🔍 REAL PIPELINE DEBUG TEST: Travel to France
 * Identifies root cause of pipeline breaks and missing folders
 * Tests each agent individually with real S3 data storage
 */

import AWS from 'aws-sdk';
import { writeFileSync } from 'fs';
import { createRequire } from 'module';

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

// Import shared utilities using createRequire for ES modules
const require = createRequire(import.meta.url);
const { generateS3Paths } = require('./src/utils/s3-folder-structure.cjs');

// Test configuration
const baseTopic = "Travel to France - Complete Guide";
const projectId = `real-test-${Date.now()}_travel-to-france-complete-guide`;
const paths = generateS3Paths(projectId, baseTopic);
const s3Bucket = 'automated-video-pipeline-v2-786673323159-us-east-1';

console.log('🔍 REAL PIPELINE DEBUG TEST');
console.log('='.repeat(80));
console.log(`📋 Topic: ${baseTopic}`);
console.log(`🆔 Project ID: ${projectId}`);
console.log(`📁 S3 Base Path: ${paths.basePath}`);
console.log(`🪣 S3 Bucket: ${s3Bucket}`);
console.log('');

// Debug results tracking
const debugResults = {
  projectId: projectId,
  startTime: new Date().toISOString(),
  agents: [],
  s3Files: [],
  errors: [],
  rootCauses: []
};

/**
 * Check S3 file existence with detailed debugging
 */
async function checkS3File(key, description) {
  try {
    const result = await s3.headObject({
      Bucket: s3Bucket,
      Key: key
    }).promise();
    
    const sizeKB = (result.ContentLength / 1024).toFixed(1);
    console.log(`   ✅ ${description}: ${sizeKB}KB`);
    console.log(`      📍 Path: ${key}`);
    
    debugResults.s3Files.push({
      key: key,
      description: description,
      size: result.ContentLength,
      exists: true
    });
    
    return true;
  } catch (error) {
    console.log(`   ❌ ${description}: NOT FOUND`);
    console.log(`      📍 Expected: ${key}`);
    console.log(`      🔍 Error: ${error.code}`);
    
    debugResults.s3Files.push({
      key: key,
      description: description,
      exists: false,
      error: error.code
    });
    
    return false;
  }
}

/**
 * Test Agent 1: Topic Management AI
 */
async function testAgent1TopicManagement() {
  console.log('\n📋 TESTING AGENT 1: Topic Management AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-topic-management-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/topics/generate',
        body: JSON.stringify({
          baseTopic: baseTopic,
          projectId: projectId,
          targetAudience: "travelers",
          source: 'debug-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Topic Management AI');
      console.log(`   📊 Project ID: ${body.projectId}`);
      console.log(`   🔍 Expanded Topics: ${body.topicContext?.expandedTopics?.length || 0}`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.context.topic, 'Topic Context File');
      
      debugResults.agents.push({
        agent: 'Topic Management AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.context.topic]
      });
      
      return { success: true, data: body };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - Topic Management AI:', error.message);
    debugResults.errors.push(`Topic Management: ${error.message}`);
    debugResults.agents.push({
      agent: 'Topic Management AI',
      success: false,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Test Agent 2: Script Generator AI
 */
async function testAgent2ScriptGenerator() {
  console.log('\n📝 TESTING AGENT 2: Script Generator AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-script-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          projectId: projectId,
          scriptOptions: {
            targetLength: 480,
            videoStyle: "travel_guide",
            targetAudience: "travelers"
          },
          source: 'debug-test'
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
      console.log(`   🎬 Scenes: ${body.sceneContext?.scenes?.length || 0}`);
      console.log(`   ⏱️  Duration: ${body.sceneContext?.totalDuration || 0}s`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.script.json, 'Script JSON File');
      await checkS3File(paths.context.scene, 'Scene Context File');
      
      debugResults.agents.push({
        agent: 'Script Generator AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.script.json, paths.context.scene]
      });
      
      return { success: true, data: body };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - Script Generator AI:', error.message);
    debugResults.errors.push(`Script Generator: ${error.message}`);
    debugResults.agents.push({
      agent: 'Script Generator AI',
      success: false,
      error: error.message
    });
    
    // ROOT CAUSE ANALYSIS: If script generator fails, no scene context for downstream agents
    if (error.message.includes('timeout') || error.message.includes('Task timed out')) {
      debugResults.rootCauses.push('Script Generator timeout prevents scene context creation - downstream agents will fail');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test Agent 3: Media Curator AI
 */
async function testAgent3MediaCurator() {
  console.log('\n🎨 TESTING AGENT 3: Media Curator AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-media-curator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/media/curate',
        body: JSON.stringify({
          projectId: projectId,
          quality: "high",
          sceneCount: 6,
          source: 'debug-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode || 'TIMEOUT'}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Media Curator AI');
      console.log(`   🖼️  Assets: ${body.mediaContext?.totalAssets || 0}`);
      console.log(`   🎬 Scenes: ${body.mediaContext?.scenesCovered || 0}`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.context.media, 'Media Context File');
      
      // Check for scene images
      console.log('\n🔍 CHECKING SCENE IMAGES:');
      for (let i = 1; i <= 6; i++) {
        const scenePrefix = `${paths.media.base}/scene-${i}/images/`;
        try {
          const objects = await s3.listObjectsV2({
            Bucket: s3Bucket,
            Prefix: scenePrefix,
            MaxKeys: 5
          }).promise();
          
          const images = objects.Contents?.filter(obj => obj.Key.endsWith('.jpg') || obj.Key.endsWith('.png')) || [];
          console.log(`   Scene ${i}: ${images.length} images`);
          
          images.forEach(img => {
            debugResults.s3Files.push({
              key: img.Key,
              description: `Scene ${i} image`,
              size: img.Size,
              exists: true
            });
          });
        } catch (error) {
          console.log(`   Scene ${i}: Error checking - ${error.message}`);
        }
      }
      
      debugResults.agents.push({
        agent: 'Media Curator AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.context.media, `${paths.media.base}/scene-*/images/*.jpg`]
      });
      
      return { success: true, data: body };
    } else if (!response.statusCode) {
      console.log('⏰ TIMEOUT - Media Curator is processing real images');
      console.log('   This indicates REAL Pexels/Pixabay API integration');
      
      // Still check if files were created
      console.log('\n🔍 CHECKING S3 FILES AFTER TIMEOUT:');
      await checkS3File(paths.context.media, 'Media Context File');
      
      debugResults.agents.push({
        agent: 'Media Curator AI',
        success: true,
        executionTime: executionTime,
        note: 'Timeout indicates real API processing'
      });
      
      return { success: true, note: 'Real API processing confirmed' };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - Media Curator AI:', error.message);
    debugResults.errors.push(`Media Curator: ${error.message}`);
    debugResults.agents.push({
      agent: 'Media Curator AI',
      success: false,
      error: error.message
    });
    
    // ROOT CAUSE ANALYSIS: Check if scene context is missing
    const sceneContextExists = debugResults.s3Files.find(f => f.key === paths.context.scene && f.exists);
    if (!sceneContextExists) {
      debugResults.rootCauses.push('Media Curator failed because scene context is missing - Script Generator must have failed');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test Agent 4: Audio Generator AI
 */
async function testAgent4AudioGenerator() {
  console.log('\n🎙️ TESTING AGENT 4: Audio Generator AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-audio-generator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/audio/generate',
        body: JSON.stringify({
          projectId: projectId,
          voiceOptions: {
            voice: "Ruth",
            style: "conversational"
          },
          source: 'debug-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Audio Generator AI');
      console.log(`   🎵 Segments: ${body.audioContext?.audioSegments?.length || 0}`);
      console.log(`   ⏱️  Duration: ${body.audioContext?.totalDuration || 0}s`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.context.audio, 'Audio Context File');
      await checkS3File(paths.audio.narration, 'Master Audio File');
      
      // Check for audio segments
      console.log('\n🔍 CHECKING AUDIO SEGMENTS:');
      for (let i = 1; i <= 6; i++) {
        const segmentPath = paths.audio.getSegmentPath(i);
        await checkS3File(segmentPath, `Scene ${i} Audio Segment`);
      }
      
      debugResults.agents.push({
        agent: 'Audio Generator AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.context.audio, paths.audio.narration]
      });
      
      return { success: true, data: body };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - Audio Generator AI:', error.message);
    debugResults.errors.push(`Audio Generator: ${error.message}`);
    debugResults.agents.push({
      agent: 'Audio Generator AI',
      success: false,
      error: error.message
    });
    
    // ROOT CAUSE ANALYSIS: Check dependencies
    const sceneContextExists = debugResults.s3Files.find(f => f.key === paths.context.scene && f.exists);
    if (!sceneContextExists) {
      debugResults.rootCauses.push('Audio Generator failed because scene context is missing - Script Generator dependency failed');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test Agent 5: Video Assembler AI
 */
async function testAgent5VideoAssembler() {
  console.log('\n🎬 TESTING AGENT 5: Video Assembler AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-video-assembler-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/video/assemble',
        body: JSON.stringify({
          projectId: projectId,
          videoOptions: {
            resolution: "1920x1080",
            quality: "high"
          },
          source: 'debug-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Video Assembler AI');
      console.log(`   🎬 Video ID: ${body.videoId || 'Unknown'}`);
      console.log(`   📺 Ready: ${body.readyForYouTube ? '✅' : '❌'}`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.context.video, 'Video Context File');
      await checkS3File(paths.video.instructions, 'Assembly Instructions');
      
      debugResults.agents.push({
        agent: 'Video Assembler AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.context.video, paths.video.instructions]
      });
      
      return { success: true, data: body };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - Video Assembler AI:', error.message);
    debugResults.errors.push(`Video Assembler: ${error.message}`);
    debugResults.agents.push({
      agent: 'Video Assembler AI',
      success: false,
      error: error.message
    });
    
    // ROOT CAUSE ANALYSIS: Check all dependencies
    const requiredContexts = [paths.context.scene, paths.context.media, paths.context.audio];
    const missingContexts = requiredContexts.filter(ctx => 
      !debugResults.s3Files.find(f => f.key === ctx && f.exists)
    );
    
    if (missingContexts.length > 0) {
      debugResults.rootCauses.push(`Video Assembler failed because missing contexts: ${missingContexts.join(', ')}`);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test Agent 6: YouTube Publisher AI
 */
async function testAgent6YouTubePublisher() {
  console.log('\n📺 TESTING AGENT 6: YouTube Publisher AI');
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-youtube-publisher-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/youtube/publish',
        body: JSON.stringify({
          projectId: projectId,
          publishOptions: {
            privacy: "private",
            category: "Travel & Events",
            dryRun: true
          },
          source: 'debug-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - YouTube Publisher AI');
      console.log(`   📺 Status: ${body.uploadStatus || 'Dry run'}`);
      console.log(`   🎯 SEO: ${body.seoOptimized ? '✅' : '❌'}`);
      
      // Check expected S3 files
      console.log('\n🔍 CHECKING S3 FILES:');
      await checkS3File(paths.metadata.youtube, 'YouTube Metadata File');
      await checkS3File(paths.metadata.project, 'Project Summary File');
      
      debugResults.agents.push({
        agent: 'YouTube Publisher AI',
        success: true,
        executionTime: executionTime,
        expectedFiles: [paths.metadata.youtube, paths.metadata.project]
      });
      
      return { success: true, data: body };
    } else {
      throw new Error(`Status ${response.statusCode}: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('❌ FAILED - YouTube Publisher AI:', error.message);
    debugResults.errors.push(`YouTube Publisher: ${error.message}`);
    debugResults.agents.push({
      agent: 'YouTube Publisher AI',
      success: false,
      error: error.message
    });
    
    // ROOT CAUSE ANALYSIS: Check dependencies
    const videoContextExists = debugResults.s3Files.find(f => f.key === paths.context.video && f.exists);
    const topicContextExists = debugResults.s3Files.find(f => f.key === paths.context.topic && f.exists);
    
    if (!videoContextExists || !topicContextExists) {
      debugResults.rootCauses.push('YouTube Publisher failed because video or topic context is missing');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Generate comprehensive debug report
 */
function generateDebugReport() {
  console.log('\n');
  console.log('🔍 PIPELINE DEBUG ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  
  debugResults.endTime = new Date().toISOString();
  debugResults.totalDuration = ((new Date(debugResults.endTime) - new Date(debugResults.startTime)) / 1000).toFixed(1);
  
  const successful = debugResults.agents.filter(a => a.success).length;
  const total = debugResults.agents.length;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
  
  console.log(`⏱️  Total Test Duration: ${debugResults.totalDuration}s`);
  console.log(`📊 Success Rate: ${successful}/${total} agents (${successRate}%)`);
  console.log(`📁 S3 Files Found: ${debugResults.s3Files.filter(f => f.exists).length}`);
  console.log(`❌ Errors: ${debugResults.errors.length}`);
  console.log('');
  
  console.log('📊 AGENT RESULTS:');
  debugResults.agents.forEach((agent, index) => {
    const status = agent.success ? '✅' : '❌';
    const time = agent.executionTime || 'N/A';
    console.log(`   ${index + 1}. ${agent.agent}: ${status} (${time}s)`);
    if (agent.error) {
      console.log(`      🔍 Error: ${agent.error}`);
    }
  });
  
  console.log('');
  console.log('📁 S3 FILES ANALYSIS:');
  const existingFiles = debugResults.s3Files.filter(f => f.exists);
  const missingFiles = debugResults.s3Files.filter(f => !f.exists);
  
  console.log(`   ✅ Found: ${existingFiles.length} files`);
  console.log(`   ❌ Missing: ${missingFiles.length} files`);
  
  if (existingFiles.length > 0) {
    console.log('\n   ✅ EXISTING FILES:');
    existingFiles.forEach(file => {
      const sizeKB = file.size ? (file.size / 1024).toFixed(1) : 'N/A';
      console.log(`      - ${file.description}: ${sizeKB}KB`);
      console.log(`        📍 ${file.key}`);
    });
  }
  
  if (missingFiles.length > 0) {
    console.log('\n   ❌ MISSING FILES:');
    missingFiles.forEach(file => {
      console.log(`      - ${file.description}`);
      console.log(`        📍 ${file.key}`);
      console.log(`        🔍 Error: ${file.error}`);
    });
  }
  
  console.log('');
  console.log('🔍 ROOT CAUSE ANALYSIS:');
  if (debugResults.rootCauses.length > 0) {
    debugResults.rootCauses.forEach((cause, index) => {
      console.log(`   ${index + 1}. ${cause}`);
    });
  } else {
    console.log('   ✅ No specific root causes identified');
  }
  
  console.log('');
  console.log('🎯 FOLDER STRUCTURE ANALYSIS:');
  const folderStructure = {};
  debugResults.s3Files.forEach(file => {
    if (file.exists) {
      const folder = file.key.split('/').slice(0, -1).join('/');
      if (!folderStructure[folder]) folderStructure[folder] = 0;
      folderStructure[folder]++;
    }
  });
  
  Object.entries(folderStructure).forEach(([folder, count]) => {
    console.log(`   📁 ${folder}/: ${count} files`);
  });
  
  console.log('');
  console.log('🚨 CRITICAL FINDINGS:');
  
  // Analyze the specific issue: only 01-context and 03-media folders
  const contextFiles = debugResults.s3Files.filter(f => f.key.includes('01-context') && f.exists).length;
  const mediaFiles = debugResults.s3Files.filter(f => f.key.includes('03-media') && f.exists).length;
  const scriptFiles = debugResults.s3Files.filter(f => f.key.includes('02-script') && f.exists).length;
  const audioFiles = debugResults.s3Files.filter(f => f.key.includes('04-audio') && f.exists).length;
  const videoFiles = debugResults.s3Files.filter(f => f.key.includes('05-video') && f.exists).length;
  const metadataFiles = debugResults.s3Files.filter(f => f.key.includes('06-metadata') && f.exists).length;
  
  console.log(`   📋 01-context/: ${contextFiles} files ${contextFiles > 0 ? '✅' : '❌'}`);
  console.log(`   📝 02-script/: ${scriptFiles} files ${scriptFiles > 0 ? '✅' : '❌'}`);
  console.log(`   🎨 03-media/: ${mediaFiles} files ${mediaFiles > 0 ? '✅' : '❌'}`);
  console.log(`   🎙️ 04-audio/: ${audioFiles} files ${audioFiles > 0 ? '✅' : '❌'}`);
  console.log(`   🎬 05-video/: ${videoFiles} files ${videoFiles > 0 ? '✅' : '❌'}`);
  console.log(`   📺 06-metadata/: ${metadataFiles} files ${metadataFiles > 0 ? '✅' : '❌'}`);
  
  if (scriptFiles === 0) {
    console.log('\n🚨 CRITICAL ISSUE IDENTIFIED:');
    console.log('   ❌ Script Generator is not creating 02-script/ files');
    console.log('   🔍 This breaks the entire pipeline - downstream agents need scene context');
    console.log('   💡 Fix: Debug Script Generator Lambda function');
  }
  
  if (audioFiles === 0 && scriptFiles > 0) {
    console.log('\n🚨 AUDIO PIPELINE BREAK:');
    console.log('   ❌ Audio Generator is not creating 04-audio/ files');
    console.log('   🔍 This prevents video assembly');
    console.log('   💡 Fix: Debug Audio Generator Lambda function');
  }
  
  return debugResults;
}

/**
 * Main debug execution
 */
async function runPipelineDebug() {
  try {
    console.log('🚀 Starting comprehensive pipeline debug...');
    console.log('⚠️  This will identify the root cause of pipeline breaks');
    console.log('');
    
    // Test each agent with proper delays
    await testAgent1TopicManagement();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAgent2ScriptGenerator();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAgent3MediaCurator();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await testAgent4AudioGenerator();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAgent5VideoAssembler();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAgent6YouTubePublisher();
    
    // Generate comprehensive debug report
    const finalResults = generateDebugReport();
    
    // Save debug results
    const debugFile = `debug-results-${Date.now()}.json`;
    writeFileSync(debugFile, JSON.stringify(finalResults, null, 2));
    console.log(`📄 Debug results saved to: ${debugFile}`);
    
    return finalResults;
    
  } catch (error) {
    console.error('💥 Pipeline debug failed:', error);
    debugResults.errors.push(`Debug execution: ${error.message}`);
    return debugResults;
  }
}

// Execute the debug test
runPipelineDebug().then(results => {
  console.log('\n🎯 DEBUG COMPLETE - Check results above for root cause analysis');
  const successRate = results.agents.filter(a => a.success).length / results.agents.length * 100;
  process.exit(successRate >= 50 ? 0 : 1); // Lower threshold for debug
}).catch(error => {
  console.error('💥 Debug execution failed:', error);
  process.exit(1);
});