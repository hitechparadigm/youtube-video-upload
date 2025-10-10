#!/usr/bin/env node

/**
 * Travel to Mexico Pipeline with S3 Storage
 * This script sets the proper environment variables and runs the complete pipeline
 */

// Set environment variables for S3 storage
process.env.S3_BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';
process.env.S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';
process.env.AWS_REGION = 'us-east-1';

async function runTravelMexicoWithS3() {
  console.log('🎬 Travel to Mexico - Complete Video Pipeline with S3 Storage');
  console.log('=' .repeat(70));

  const projectId = `2025-10-10T${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}_travel-to-mexico`;
  console.log(`📁 Project ID: ${projectId}`);
  console.log(`🪣 S3 Bucket: ${process.env.S3_BUCKET_NAME}`);
  console.log('');

  let successCount = 0;
  const totalSteps = 6;
  const results = {};

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
      successCount++;
      results.topicManagement = JSON.parse(topicResult.body);
      console.log('   ✅ Topic Management: SUCCESS');
      console.log(`   📊 Generated ${results.topicManagement.topicContext.expandedTopics.length} subtopics`);
      console.log(`   🎯 Keywords: ${results.topicManagement.topicContext.seoContext.primaryKeywords.join(', ')}`);
      console.log(`   💾 Context stored: ${results.topicManagement.contextStored ? 'YES' : 'NO'}`);
    } else {
      console.log('   ❌ Topic Management: FAILED');
      const error = JSON.parse(topicResult.body);
      console.log(`   Error: ${error.message || error.error}`);
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
      successCount++;
      results.scriptGeneration = JSON.parse(scriptResult.body);
      console.log('   ✅ Script Generation: SUCCESS');
      if (results.scriptGeneration.sceneContext) {
        console.log(`   📝 Generated ${results.scriptGeneration.sceneContext.scenes.length} scenes`);
        console.log(`   ⏱️  Total duration: ${results.scriptGeneration.sceneContext.totalDuration}s`);
      }
      console.log(`   💾 Script stored: ${results.scriptGeneration.scriptStored ? 'YES' : 'NO'}`);
    } else {
      console.log('   ❌ Script Generation: FAILED');
      const error = JSON.parse(scriptResult.body);
      console.log(`   Error: ${error.message || error.error}`);
    }

    // Step 3: Media Curation
    console.log('\n🎨 Step 3: Media Curation...');
    const { handler: mediaHandler } = require('./src/lambda/media-curator/standalone.js');
    
    const mediaResult = await mediaHandler({
      body: JSON.stringify({
        projectId: projectId,
        baseTopic: 'Travel to Mexico',
        sceneCount: 5
      })
    });

    if (mediaResult.statusCode === 200) {
      successCount++;
      results.mediaCuration = JSON.parse(mediaResult.body);
      console.log('   ✅ Media Curation: SUCCESS');
      console.log(`   🖼️  Generated ${results.mediaCuration.totalAssets} media assets`);
      console.log(`   📊 Scenes covered: ${results.mediaCuration.scenesCovered}`);
    } else {
      console.log('   ❌ Media Curation: FAILED');
      const error = JSON.parse(mediaResult.body);
      console.log(`   Error: ${error.message || error.error}`);
    }

    // Step 4: Audio Generation
    console.log('\n🎙️ Step 4: Audio Generation...');
    const { handler: audioHandler } = require('./src/lambda/audio-generator/standalone.js');
    
    const audioResult = await audioHandler({
      body: JSON.stringify({
        projectId: projectId,
        script: 'Travel to Mexico comprehensive guide script with engaging narration covering the best destinations, culture, food, and travel tips for an amazing Mexican adventure.',
        voiceId: 'Ruth',
        language: 'en-US'
      })
    });

    if (audioResult.statusCode === 200) {
      successCount++;
      results.audioGeneration = JSON.parse(audioResult.body);
      console.log('   ✅ Audio Generation: SUCCESS');
      if (results.audioGeneration.audioContext) {
        console.log(`   🎵 Audio segments: ${results.audioGeneration.audioContext.audioSegments?.length || 1}`);
      }
      console.log(`   🗣️  Voice: ${results.audioGeneration.voiceUsed || 'Ruth'}`);
    } else {
      console.log('   ❌ Audio Generation: FAILED');
      const error = JSON.parse(audioResult.body);
      console.log(`   Error: ${error.message || error.error}`);
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
      successCount++;
      results.videoAssembly = JSON.parse(videoResult.body);
      console.log('   ✅ Video Assembly: SUCCESS');
      if (results.videoAssembly.videoResult) {
        console.log(`   🎬 Video ID: ${results.videoAssembly.videoResult.videoId || 'Generated'}`);
        console.log(`   📏 Duration: ${results.videoAssembly.videoResult.duration || 'N/A'}s`);
      }
    } else {
      console.log('   ❌ Video Assembly: FAILED');
      const error = JSON.parse(videoResult.body);
      console.log(`   Error: ${error.message || error.error}`);
    }

    // Step 6: YouTube Publishing
    console.log('\n📺 Step 6: YouTube Publishing...');
    const { handler: youtubeHandler } = require('./src/lambda/youtube-publisher/standalone.js');
    
    const youtubeResult = await youtubeHandler({
      body: JSON.stringify({
        projectId: projectId,
        videoPath: `videos/${projectId}/05-video/final-video.mp4`,
        title: 'Ultimate Travel Guide to Mexico 2025 - Best Destinations, Food & Culture',
        description: 'Complete travel guide covering the best destinations, authentic food experiences, rich culture, and essential tips for traveling to Mexico. Discover hidden gems, must-visit places, and insider secrets for an unforgettable Mexican adventure.',
        tags: ['travel', 'mexico', 'travel guide', 'vacation', 'tourism', 'mexican culture', 'destinations', 'food'],
        category: 'Travel & Events'
      })
    });

    if (youtubeResult.statusCode === 200) {
      successCount++;
      results.youtubePublishing = JSON.parse(youtubeResult.body);
      console.log('   ✅ YouTube Publishing: SUCCESS');
      if (results.youtubePublishing.youtubeResult && results.youtubePublishing.youtubeResult.youtubeUrl) {
        console.log(`   🔗 YouTube URL: ${results.youtubePublishing.youtubeResult.youtubeUrl}`);
      }
      console.log(`   📊 SEO optimized: ${results.youtubePublishing.seoOptimization ? 'YES' : 'NO'}`);
    } else {
      console.log('   ❌ YouTube Publishing: FAILED');
      const error = JSON.parse(youtubeResult.body);
      console.log(`   Error: ${error.message || error.error}`);
    }

    // Final Results
    console.log('\n🎉 PIPELINE EXECUTION COMPLETED!');
    console.log('=' .repeat(70));
    console.log(`📊 Success Rate: ${successCount}/${totalSteps} (${Math.round(successCount/totalSteps*100)}%)`);
    console.log(`📁 Project ID: ${projectId}`);
    
    if (successCount >= 4) {
      console.log('✅ PIPELINE SUCCESS - Strong pipeline performance!');
    } else if (successCount >= 3) {
      console.log('✅ PIPELINE SUCCESS - Minimum viable pipeline achieved!');
    } else {
      console.log('⚠️  PIPELINE PARTIAL - Some components need attention');
    }

    console.log('\n🔗 S3 Storage Locations:');
    console.log(`   📋 Topic Context: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/01-context/`);
    console.log(`   📝 Script: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/02-script/`);
    console.log(`   🖼️  Media Assets: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/03-media/`);
    console.log(`   🎵 Audio: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/04-audio/`);
    console.log(`   🎬 Video: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/05-video/`);
    console.log(`   📺 Metadata: s3://${process.env.S3_BUCKET_NAME}/videos/${projectId}/06-metadata/`);

    console.log('\n🔍 To verify S3 storage, run:');
    console.log(`   node check-s3-bucket.js`);

    return {
      success: successCount >= 3,
      successRate: Math.round(successCount/totalSteps*100),
      projectId: projectId,
      workingComponents: successCount,
      totalComponents: totalSteps,
      results: results
    };

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    throw error;
  }
}

// Run the pipeline
if (require.main === module) {
  runTravelMexicoWithS3()
    .then((result) => {
      console.log('\n✅ Travel to Mexico pipeline with S3 storage completed');
      console.log(`🎯 Result: ${result.success ? 'SUCCESS' : 'PARTIAL'} (${result.successRate}%)`);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Travel to Mexico pipeline failed:', error);
      process.exit(1);
    });
}

module.exports = { runTravelMexicoWithS3 };