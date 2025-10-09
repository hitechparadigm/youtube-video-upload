/**
 * Example usage of YouTube Publishing Service
 * Shows how to integrate with the YouTube publisher
 */

import { YouTubeService } from './youtube-service.js';

/**
 * Example: Publish a completed video to YouTube
 */
async function exampleYouTubePublish() {
    const youtubeService = new YouTubeService();

    // Example publish request (would come from video assembly completion)
    const publishRequest = {
        videoId: 'investing-apps-2025-001',
        
        // Video file location from video assembly
        videoFilePath: 's3://automated-video-pipeline-786673323159-us-east-1/final-videos/investing-apps-2025-001/investing-apps-2025-001-complete.mp4',
        
        // Optimized metadata from script generation
        title: 'This App Turned $50 Into $127 in 3 Weeks (Beginners Only)',
        description: `Sarah started with $50 and made $127 in just 3 weeks using this beginner-friendly app. I'm revealing her exact strategy + the 5 best investment apps for 2025. Plus, the one mistake that's costing beginners hundreds (timestamp 4:30).

🔥 TIMESTAMPS:
0:00 - The $50 Success Story
1:00 - Top 5 Apps Revealed
2:30 - Robinhood vs Acorns Test
4:30 - Costly Mistake Exposed
6:00 - How to Start Today

💰 SUBSCRIBE for more money tips that actually work!

#InvestingApps #BeginnerInvesting #MakeMoney2025`,
        
        tags: [
            'investment apps 2025',
            'best apps for beginners',
            'robinhood vs acorns',
            'how to start investing',
            'investment mistakes',
            'beginner investing guide',
            'make money apps',
            'investing with $50'
        ],
        
        // Optional thumbnail
        thumbnail: 's3://automated-video-pipeline-786673323159-us-east-1/thumbnails/investing-apps-2025-001-thumbnail.jpg',
        
        // Publishing options
        privacy: 'public', // public, unlisted, private
        category: '22' // People & Blogs
    };

    try {
        console.log('🚀 Starting YouTube publish...');
        
        const result = await youtubeService.publishVideo(publishRequest);
        
        console.log('✅ Video published successfully!');
        console.log(`📺 YouTube URL: ${result.youtubeUrl}`);
        console.log(`🆔 YouTube Video ID: ${result.youtubeVideoId}`);
        console.log(`⏱️  Upload Time: ${result.uploadTime}ms`);

        return result;

    } catch (error) {
        console.error('❌ YouTube publish failed:', error.message);
        throw error;
    }
}

/**
 * Example: Generate optimized metadata from script and trend data
 */
function exampleMetadataOptimization() {
    const youtubeService = new YouTubeService();

    // Script data from Content Script Writer
    const scriptData = {
        clickWorthyMetadata: {
            title: 'This App Turned $50 Into $127 in 3 Weeks (Beginners Only)',
            description: 'Sarah started with $50 and made $127 in just 3 weeks using this beginner-friendly app...',
            tags: ['investment apps', 'beginners', 'money making']
        },
        scenes: [
            { duration: 15, type: 'hook', narration: 'What if I told you...' },
            { duration: 45, type: 'story', narration: 'Last month, my friend Sarah...' },
            { duration: 90, type: 'value', narration: 'Alright, let\'s dive into the top 5 apps...' },
            { duration: 120, type: 'comparison', narration: 'Here\'s where it gets interesting...' },
            { duration: 90, type: 'mistake', narration: 'Now here\'s that mistake I mentioned...' },
            { duration: 120, type: 'cta', narration: 'Look, I\'ve been making these videos...' }
        ]
    };

    // Trend data from Trend Research Analyst
    const trendData = {
        hotKeywords: ['2025 investing', 'AI stocks', 'fractional shares', 'mobile apps', 'beginner friendly'],
        currentEvents: ['Fed rate decisions', 'AI boom', 'market volatility'],
        popularFormats: ['step-by-step tutorials', 'app reviews', 'budget challenges']
    };

    const optimizedMetadata = youtubeService.generateOptimizedMetadata(scriptData, trendData);

    console.log('📝 Optimized Metadata:');
    console.log(`Title: ${optimizedMetadata.title}`);
    console.log(`Description Length: ${optimizedMetadata.description.length} characters`);
    console.log(`Tags (${optimizedMetadata.tags.length}):`, optimizedMetadata.tags);

    return optimizedMetadata;
}

/**
 * Example: Check upload status
 */
async function exampleStatusCheck(videoId) {
    const youtubeService = new YouTubeService();
    
    try {
        console.log(`🔍 Checking upload status for: ${videoId}`);
        
        const status = await youtubeService.getUploadStatus(videoId);
        
        if (status) {
            console.log('📊 Upload Status:', {
                videoId: status.videoId,
                status: status.status,
                youtubeUrl: status.youtubeUrl,
                uploadTime: status.uploadTime
            });
        } else {
            console.log('❌ No upload record found');
        }

        return status;

    } catch (error) {
        console.error('❌ Status check failed:', error.message);
        throw error;
    }
}

/**
 * Example: Integration with Step Functions workflow
 */
function createStepFunctionsPublishInput(videoAssemblyResult, scriptData, trendData) {
    const youtubeService = new YouTubeService();
    
    // Generate optimized metadata
    const optimizedMetadata = youtubeService.generateOptimizedMetadata(scriptData, trendData);
    
    return {
        videoId: videoAssemblyResult.videoId,
        videoFilePath: videoAssemblyResult.outputLocation,
        title: optimizedMetadata.title,
        description: optimizedMetadata.description,
        tags: optimizedMetadata.tags,
        thumbnail: scriptData.clickWorthyMetadata?.thumbnail?.s3Location,
        privacy: 'public',
        category: '22',
        metadata: {
            originalTitle: scriptData.clickWorthyMetadata?.title,
            estimatedViews: scriptData.estimatedViews,
            targetAudience: scriptData.targetAudience,
            processingTime: videoAssemblyResult.processingTime,
            createdAt: new Date().toISOString()
        }
    };
}

/**
 * Example: Batch publish multiple videos
 */
async function exampleBatchPublish(videoList) {
    const youtubeService = new YouTubeService();
    const results = [];

    console.log(`📦 Starting batch publish of ${videoList.length} videos...`);

    for (let i = 0; i < videoList.length; i++) {
        const video = videoList[i];
        
        try {
            console.log(`📤 Publishing video ${i + 1}/${videoList.length}: ${video.videoId}`);
            
            const result = await youtubeService.publishVideo(video);
            results.push({ success: true, ...result });
            
            // Add delay between uploads to respect rate limits
            if (i < videoList.length - 1) {
                console.log('⏳ Waiting 30 seconds before next upload...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
        } catch (error) {
            console.error(`❌ Failed to publish ${video.videoId}:`, error.message);
            results.push({ success: false, videoId: video.videoId, error: error.message });
        }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Batch publish completed: ${successful} successful, ${failed} failed`);
    return results;
}

// Export examples for testing
export {
    exampleYouTubePublish,
    exampleMetadataOptimization,
    exampleStatusCheck,
    createStepFunctionsPublishInput,
    exampleBatchPublish
};

// Run example if called directly
if (require.main === module) {
    exampleMetadataOptimization();
    console.log('\n📝 Metadata optimization example completed');
    
    // Note: Actual publishing requires valid YouTube credentials
    console.log('\n💡 To test actual publishing, ensure YouTube credentials are configured in AWS Secrets Manager');
}
