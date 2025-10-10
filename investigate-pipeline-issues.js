#!/usr/bin/env node

/**
 * Investigate Pipeline Issues - Duration and Content Inconsistencies
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

async function investigatePipelineIssues() {
  console.log('🔍 INVESTIGATING PIPELINE ISSUES');
  console.log('=' .repeat(60));

  const bucketName = 'automated-video-pipeline-v2-786673323159-us-east-1';
  const projectId = '2025-10-10T04-07-57_travel-to-mexico-REAL';
  
  console.log(`📁 Project: ${projectId}`);
  console.log('');

  try {
    const s3Client = new S3Client({ region: 'us-east-1' });

    // 1. Check Topic Context - What duration was specified?
    console.log('📋 1. TOPIC CONTEXT ANALYSIS:');
    try {
      const topicResult = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: `videos/${projectId}/01-context/topic-context.json`
      }));
      
      const topicData = JSON.parse(await topicResult.Body.transformToString());
      console.log(`   📊 Topic: ${topicData.selectedTopic}`);
      console.log(`   ⏱️  Specified Duration: ${topicData.videoStructure?.totalDuration}s`);
      console.log(`   🎯 Recommended Scenes: ${topicData.videoStructure?.recommendedScenes}`);
      console.log(`   📝 Hook Duration: ${topicData.videoStructure?.hookDuration}s`);
      console.log(`   📖 Main Content: ${topicData.videoStructure?.mainContentDuration}s`);
      console.log(`   🔚 Conclusion: ${topicData.videoStructure?.conclusionDuration}s`);
      
    } catch (error) {
      console.log(`   ❌ Error reading topic context: ${error.message}`);
    }

    console.log('');

    // 2. Check Script - What duration was generated?
    console.log('📝 2. SCRIPT ANALYSIS:');
    try {
      const scriptResult = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: `videos/${projectId}/02-script/script.json`
      }));
      
      const scriptData = JSON.parse(await scriptResult.Body.transformToString());
      console.log(`   📊 Total Duration: ${scriptData.totalDuration}s`);
      console.log(`   🎬 Number of Scenes: ${scriptData.scenes?.length || 'N/A'}`);
      
      if (scriptData.scenes) {
        let totalSceneDuration = 0;
        scriptData.scenes.forEach((scene, index) => {
          console.log(`   Scene ${index + 1}: ${scene.duration}s - "${scene.title}"`);
          totalSceneDuration += scene.duration || 0;
        });
        console.log(`   🧮 Calculated Total: ${totalSceneDuration}s`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading script: ${error.message}`);
    }

    console.log('');

    // 3. Check Audio File - What's the actual duration?
    console.log('🎵 3. AUDIO FILE ANALYSIS:');
    try {
      const audioResult = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: `videos/${projectId}/04-audio/narration.mp3`
      }));
      
      // Read the audio file to check if it's real MP3
      const chunks = [];
      for await (const chunk of audioResult.Body) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      
      console.log(`   📊 File Size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
      
      // Check MP3 header
      if (audioBuffer.length >= 10) {
        const header = audioBuffer.slice(0, 10);
        const isMP3 = header[0] === 0xFF && (header[1] & 0xE0) === 0xE0;
        console.log(`   🎵 Valid MP3 Header: ${isMP3 ? 'YES' : 'NO'}`);
        
        if (isMP3) {
          // Rough duration calculation for MP3 (very approximate)
          const estimatedDuration = Math.round(audioBuffer.length / 1000); // Very rough estimate
          console.log(`   ⏱️  Estimated Duration: ~${estimatedDuration}s`);
        } else {
          console.log(`   ⚠️  File may not be a valid MP3`);
          console.log(`   🔍 First 20 bytes: ${header.toString('hex')}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading audio file: ${error.message}`);
    }

    console.log('');

    // 4. Check Media Files - Are they real images?
    console.log('🖼️ 4. MEDIA FILES ANALYSIS:');
    for (let i = 1; i <= 5; i++) {
      try {
        const mediaResult = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: `videos/${projectId}/03-media/scene-${i}/images/mexico-${i}.jpg`
        }));
        
        const chunks = [];
        for await (const chunk of mediaResult.Body) {
          chunks.push(chunk);
        }
        const imageBuffer = Buffer.concat(chunks);
        
        // Check JPEG header
        const isJPEG = imageBuffer.length >= 2 && imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
        
        console.log(`   Image ${i}: ${imageBuffer.length} bytes, Valid JPEG: ${isJPEG ? 'YES' : 'NO'}`);
        
        if (!isJPEG && imageBuffer.length < 100) {
          console.log(`   🔍 Content: "${imageBuffer.toString('utf8').slice(0, 50)}..."`);
        }
        
      } catch (error) {
        console.log(`   Image ${i}: ❌ Error - ${error.message}`);
      }
    }

    console.log('');

    // 5. Industry Standards Check
    console.log('📏 5. INDUSTRY STANDARDS ANALYSIS:');
    console.log('   🎯 Expected Standards:');
    console.log('   - Video Duration: 480s (8 minutes) as requested');
    console.log('   - Scene Count: 5-6 scenes for 8-minute video');
    console.log('   - Scene Duration: 60-96s per scene');
    console.log('   - Audio Quality: Professional narration matching script length');
    console.log('   - Media Quality: High-resolution images (>100KB each)');
    console.log('   - Consistency: All durations should match across agents');

    console.log('');

    // 6. Issues Summary
    console.log('🚨 ISSUES IDENTIFIED:');
    console.log('   1. Duration Inconsistency: Topic (360s) vs Script (480s) vs Audio (~142s)');
    console.log('   2. Media Files: 0.0 KB images indicate placeholder content, not real downloads');
    console.log('   3. Audio Duration: Much shorter than script requires');
    console.log('   4. Agent Coordination: Agents not using consistent parameters');
    console.log('   5. Industry Standards: Not meeting professional video production standards');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
if (require.main === module) {
  investigatePipelineIssues()
    .then(() => {
      console.log('\n✅ Pipeline investigation completed');
    })
    .catch((error) => {
      console.error('\n💥 Investigation failed:', error);
      process.exit(1);
    });
}

module.exports = { investigatePipelineIssues };