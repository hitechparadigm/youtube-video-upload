#!/usr/bin/env node

/**
 * Direct Standalone Pipeline Execution for "Travel to Mexico"
 * This script runs the complete end-to-end video creation pipeline using standalone handlers
 */

const { randomUUID } = require('crypto');

async function runTravelMexicoStandalone() {
  console.log('🎬 Starting Travel to Mexico Video Pipeline (Standalone)');
  console.log('=' .repeat(60));

  const projectId = `2025-10-10T${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}_travel-to-mexico`;
  console.log(`📁 Project ID: ${projectId}`);
  console.log('');

  try {
    // Step 1: Topic Management
    console.log('📋 Step 1: Topic Management...');
    const { handler: topicHandler } = require('./src/lambda/topic-management/standalone.js');
    
    const topicResult = await topicHandler({
      baseTopic: 'Travel to Mexico',
      targetAudience: 'travelers',
      projectId: projectId
    });

    if (topicResult.statusCode === 200) {
      const topicData = JSON.parse(topicResult.body);
      console.log('   ✅ Topic Management: SUCCESS');
      console.log(`   📊 Generated ${topicData.topicContext.expandedTopics.length} subtopics`);
      console.log(`   🎯 Primary keywords: ${topicData.topicContext.seoContext.primaryKeywords.join(', ')}`);
    } else {
      console.log('   ❌ Topic Management: FAILED');
      console.log('   Error:', JSON.parse(topicResult.body).message);
      return;
    }

    // Step 2: Script Generation
    console.log('\n📝 Step 2: Script Generation...');
    const { handler: scriptHandler } = require('./src/lambda/script-generator/standalone.js');
    
    const scriptResult = await scriptHandler({
      body: JSON.stringify({
        projectId: projectId,
        baseTopic: 'Travel to Mexico',
        targetLength: 480,
        videoStyle: 'engaging_educational'
      })
    });

    if (scriptResult.statusCode === 200) {
      const scriptData = JSON.parse(scriptResult.body);
      console.log('   ✅ Script Generation: SUCCESS');
      if (scriptData.sceneContext && scriptData.sceneContext.scenes) {
        console.log(`   📝 Generated ${scriptData.sceneContext.scenes.length} scenes`);
        console.log(`   ⏱️  Total duration: ${scriptData.sceneContext.totalDuration}s`);
      } else {
        console.log('   📝 Script generated successfully');
      }
    } else {
      console.log('   ❌ Script Generation: FAILED');
      const errorBody = JSON.parse(scriptResult.body);
      console.log('   Error:', errorBody.message || errorBody.error);
    }

    // Step 3: Media Curation
    console.log('\n🎨 Step 3: Media Curation...');
    const { handler: mediaHandler } = require('./src/lambda/media-curator/standalone.js');
    
    const mediaResult = await mediaHandler({
      body: JSON.stringify({
        projectId: projectId,
        baseTopic: 'Travel to Mexico',
        action: 'curate'
      })
    });

    if (mediaResult.statusCode === 200) {
      const mediaData = JSON.parse(mediaResult.body);
      console.log('   ✅ Media Curation: SUCCESS');
      if (mediaData.mediaContext && mediaData.mediaContext.totalAssets) {
        console.log(`   🖼️  Total assets: ${mediaData.mediaContext.totalAssets}`);
        console.log(`   📊 Industry compliance: ${mediaData.mediaContext.industryStandards?.overallCompliance ? 'YES' : 'NO'}`);
      } else {
        console.log('   🖼️  Media curation completed');
      }
    } else {
      console.log('   ❌ Media Curation: FAILED');
      const errorBody = JSON.parse(mediaResult.body);
      console.log('   Error:', errorBody.message || errorBody.error);
    }

    // Step 4: Audio Generation
    console.log('\n🎙️ Step 4: Audio Generation...');
    const { handler: audioHandler } = require('./src/lambda/audio-generator/standalone.js');
    
    const audioResult = await audioHandler({
      body: JSON.stringify({
        projectId: projectId,
        script: 'Travel to Mexico video script', // Simplified for demo
        action: 'generate'
      })
    });

    if (audioResult.statusCode === 200) {
      const audioData = JSON.parse(audioResult.body);
      console.log('   ✅ Audio Generation: SUCCESS');
      if (audioData.audioContext && audioData.audioContext.audioSegments) {
        console.log(`   🎵 Audio segments: ${audioData.audioContext.audioSegments.length}`);
      }
      console.log(`   🗣️  Voice: ${audioData.generativeFeatures?.voiceUsed || 'Default'}`);
    } else {
      console.log('   ❌ Audio Generation: FAILED');
      const errorBody = JSON.parse(audioResult.body);
      console.log('   Error:', errorBody.message || errorBody.error);
    }

    // Step 5: Video Assembly
    console.log('\n🎬 Step 5: Video Assembly...');
    const { handler: videoHandler } = require('./src/lambda/video-assembler/standalone.js');
    
    const videoResult = await videoHandler({
      body: JSON.stringify({
        projectId: projectId,
        action: 'assemble'
      })
    });

    if (videoResult.statusCode === 200) {
      const videoData = JSON.parse(videoResult.body);
      console.log('   ✅ Video Assembly: SUCCESS');
      if (videoData.videoResult) {
        console.log(`   🎬 Video ID: ${videoData.videoResult.videoId || 'Generated'}`);
        console.log(`   📏 Duration: ${videoData.videoResult.duration || 'N/A'}s`);
      } else {
        console.log('   🎬 Video assembly completed');
      }
    } else {
      console.log('   ❌ Video Assembly: FAILED');
      const errorBody = JSON.parse(videoResult.body);
      console.log('   Error:', errorBody.message || errorBody.error);
    }

    // Step 6: YouTube Publishing
    console.log('\n📺 Step 6: YouTube Publishing...');
    const { handler: youtubeHandler } = require('./src/lambda/youtube-publisher/standalone.js');
    
    const youtubeResult = await youtubeHandler({
      body: JSON.stringify({
        projectId: projectId,
        action: 'publish',
        publishOptions: {
          title: 'Ultimate Travel Guide to Mexico 2025',
          description: 'Complete travel guide covering the best destinations, food, culture, and tips for traveling to Mexico.',
          tags: ['travel', 'mexico', 'travel guide', 'vacation', 'tourism']
        }
      })
    });

    if (youtubeResult.statusCode === 200) {
      const youtubeData = JSON.parse(youtubeResult.body);
      console.log('   ✅ YouTube Publishing: SUCCESS');
      if (youtubeData.youtubeResult && youtubeData.youtubeResult.youtubeUrl) {
        console.log(`   🔗 YouTube URL: ${youtubeData.youtubeResult.youtubeUrl}`);
      } else
        console.log('   🔗 YouTube publishing initiat
      }
     

      console.log('   ❌ YouTube Publishing: FAILED');
      const errorBody = JSON.parsody);
      console.log('   Error:', errorBody.messag
    }Body.error);rrore || e.bult(youtubeRese {  } else  'NO'}`);: ion ? 'YES' zata.seoOptimioutubeDatmized: ${y  📊 SEO opti.log(` nsole co

    console.log('\n🎉 PIPELINE EXECUTION COMPLETED!');
    console.log('=' .repeat(60));
    console.log(`📁 Project ID: ${projectId}`);
    console.log('🔗 Next Steps:');
    console.log('   1. Check S3 bucket for generated files:');
    console.log(`      s3://your-bucket/videos/${projectId}/`);
    console.log('   2. Monitor video processing status');
    console.log('   3. Review YouTube upload (if successful)');
    console.log('   4. Verify all content meets quality standards');

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the pipeline
if (require.main === module) {
  runTravelMexicoStandalone()
    .then(() => {
      console.log('\n✅ Standalone pipeline execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Standalone pipeline execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTravelMexicoStandalone };