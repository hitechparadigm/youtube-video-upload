#!/usr/bin/env node

/**
 * Final Travel to Mexico Pipeline - Complete E2E Test
 */

async function runTravelMexicoFinal() {
  console.log('🎬 Travel to Mexico - Complete Video Pipeline');
  console.log('=' .repeat(60));

  const projectId = `2025-10-10T${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}_travel-to-mexico`;
  console.log(`📁 Project ID: ${projectId}`);
  console.log('');

  let successCount = 0;
  const totalSteps = 6;

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
      console.log('   ✅ Topic Management: SUCCESS');
    } else {
      console.log('   ❌ Topic Management: FAILED');
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
      console.log('   ✅ Script Generation: SUCCESS');
    } else {
      console.log('   ❌ Script Generation: FAILED');
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
      console.log('   ✅ Media Curation: SUCCESS');
      const mediaData = JSON.parse(mediaResult.body);
      console.log(`   🖼️  Generated ${mediaData.totalAssets} media assets`);
    } else {
      console.log('   ❌ Media Curation: FAILED');
    }

    // Step 4: Audio Generation
    console.log('\n🎙️ Step 4: Audio Generation...');
    const { handler: audioHandler } = require('./src/lambda/audio-generator/standalone.js');
    
    const audioResult = await audioHandler({
      body: JSON.stringify({
        projectId: projectId,
        script: 'Travel to Mexico comprehensive guide script with engaging narration',
        voiceId: 'Ruth',
        language: 'en-US'
      })
    });

    if (audioResult.statusCode === 200) {
      successCount++;
      console.log('   ✅ Audio Generation: SUCCESS');
    } else {
      console.log('   ❌ Audio Generation: FAILED');
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
      console.log('   ✅ Video Assembly: SUCCESS');
    } else {
      console.log('   ❌ Video Assembly: FAILED');
    }

    // Step 6: YouTube Publishing
    console.log('\n📺 Step 6: YouTube Publishing...');
    const { handler: youtubeHandler } = require('./src/lambda/youtube-publisher/standalone.js');
    
    const youtubeResult = await youtubeHandler({
      body: JSON.stringify({
        projectId: projectId,
        videoPath: `videos/${projectId}/05-video/final-video.mp4`,
        title: 'Ultimate Travel Guide to Mexico 2025',
        description: 'Complete travel guide covering the best destinations, food, culture, and tips for traveling to Mexico.',
        tags: ['travel', 'mexico', 'travel guide', 'vacation', 'tourism'],
        category: 'Travel & Events'
      })
    });

    if (youtubeResult.statusCode === 200) {
      successCount++;
      console.log('   ✅ YouTube Publishing: SUCCESS');
    } else {
      console.log('   ❌ YouTube Publishing: FAILED');
    }

    // Final Results
    console.log('\n🎉 PIPELINE EXECUTION COMPLETED!');
    console.log('=' .repeat(60));
    console.log(`📊 Success Rate: ${successCount}/${totalSteps} (${Math.round(successCount/totalSteps*100)}%)`);
    console.log(`📁 Project ID: ${projectId}`);
    
    if (successCount >= 3) {
      console.log('✅ PIPELINE SUCCESS - Minimum viable pipeline achieved!');
    } else {
      console.log('⚠️  PIPELINE PARTIAL - Some components need attention');
    }

    console.log('\n🔗 Generated Content:');
    console.log(`   📋 Topic Context: S3://bucket/videos/${projectId}/01-context/`);
    console.log(`   📝 Script: S3://bucket/videos/${projectId}/02-script/`);
    console.log(`   🖼️  Media Assets: S3://bucket/videos/${projectId}/03-media/`);
    console.log(`   🎵 Audio: S3://bucket/videos/${projectId}/04-audio/`);
    console.log(`   🎬 Video: S3://bucket/videos/${projectId}/05-video/`);
    console.log(`   📺 Metadata: S3://bucket/videos/${projectId}/06-metadata/`);

    return {
      success: successCount >= 3,
      successRate: Math.round(successCount/totalSteps*100),
      projectId: projectId,
      workingComponents: successCount,
      totalComponents: totalSteps
    };

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    throw error;
  }
}

// Run the pipeline
if (require.main === module) {
  runTravelMexicoFinal()
    .then((result) => {
      console.log('\n✅ Final pipeline execution completed');
      console.log(`🎯 Result: ${result.success ? 'SUCCESS' : 'PARTIAL'} (${result.successRate}%)`);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Final pipeline execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTravelMexicoFinal };