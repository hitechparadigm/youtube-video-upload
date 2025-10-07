/**
 * Media Curator with AI-Powered Relevance Analysis
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { RekognitionClient, DetectLabelsCommand, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

let secretsClient = null;
let bedrockClient = null;
let rekognitionClient = null;
let s3Client = null;
let cachedSecrets = null;

/**
 * Initialize AWS clients
 */
async function initializeService() {
    if (!secretsClient) {
        const region = process.env.AWS_REGION || 'us-east-1';
        secretsClient = new SecretsManagerClient({ region });
        bedrockClient = new BedrockRuntimeClient({ region });
        rekognitionClient = new RekognitionClient({ region });
        s3Client = new S3Client({ region });
        console.log('Media Curator service initialized with AI capabilities and S3 storage');
    }
}

/**
 * Get API keys from Secrets Manager
 */
async function getApiKeys() {
    // Force refresh secrets (clear cache)
    cachedSecrets = null;
    
    if (cachedSecrets) {
        return cachedSecrets;
    }
    
    try {
        const secretName = process.env.API_KEYS_SECRET_NAME || process.env.MEDIA_SECRET_NAME || 'automated-video-pipeline/api-keys';
        
        const command = new GetSecretValueCommand({
            SecretId: secretName
        });
        
        const response = await secretsClient.send(command);
        
        if (response.SecretString) {
            cachedSecrets = JSON.parse(response.SecretString);
            console.log('API keys retrieved from Secrets Manager');
            console.log('Available keys:', Object.keys(cachedSecrets));
            return cachedSecrets;
        }
        
        throw new Error('No secret string found');
        
    } catch (error) {
        console.error('Error retrieving API keys:', error.message);
        // Return empty object so we can still test without keys
        cachedSecrets = {};
        return cachedSecrets;
    }
}

exports.handler = async (event) => {
    console.log('Media Curator invoked:', JSON.stringify(event, null, 2));
    
    try {
        await initializeService();
        
        const { httpMethod, path, body } = event;
        
        // Parse request body if present
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        if (httpMethod === 'POST' && path === '/media/search') {
            return await searchMedia(requestBody);
        } else if (httpMethod === 'POST' && path === '/media/curate') {
            return await curateMediaWithAI(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Media Curator:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Search for media from multiple sources
 */
async function searchMedia(requestBody) {
    const { 
        query, 
        mediaType = 'both',
        sources = ['pexels', 'pixabay'],
        limit = 10,
        orientation = 'landscape',
        minWidth = 1920,
        minHeight = 1080
    } = requestBody;
    
    try {
        console.log(`Searching for media: ${query}`);
        
        if (!query) {
            return createResponse(400, { error: 'Search query is required' });
        }
        
        // Get API keys
        const apiKeys = await getApiKeys();
        
        const results = [];
        
        // Search each enabled source
        for (const source of sources) {
            try {
                let sourceResults = [];
                
                switch (source.toLowerCase()) {
                    case 'pexels':
                        if (apiKeys.PEXELS_API_KEY) {
                            sourceResults = await searchPexels(query, mediaType, limit, orientation, minWidth, minHeight, apiKeys.PEXELS_API_KEY);
                        } else {
                            console.warn('Pexels API key not found in secrets');
                        }
                        break;
                    case 'pixabay':
                        if (apiKeys.PIXABAY_API_KEY) {
                            sourceResults = await searchPixabay(query, mediaType, limit, orientation, minWidth, minHeight, apiKeys.PIXABAY_API_KEY);
                        } else {
                            console.warn('Pixabay API key not found in secrets');
                        }
                        break;
                    default:
                        console.warn(`Unknown media source: ${source}`);
                        continue;
                }
                
                // Add source information and score
                sourceResults.forEach(item => {
                    item.source = source;
                    item.searchQuery = query;
                    item.relevanceScore = calculateRelevanceScore(item, query);
                });
                
                results.push(...sourceResults);
                
            } catch (error) {
                console.error(`Error searching ${source}:`, error.message);
                // Continue with other sources
            }
        }
        
        // Sort by relevance score
        results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        
        // Limit total results
        const limitedResults = results.slice(0, limit);
        
        return createResponse(200, {
            media: limitedResults,
            totalFound: results.length,
            query: query,
            sources: sources,
            filters: { mediaType, orientation, minWidth, minHeight }
        });
        
    } catch (error) {
        console.error('Error searching media:', error);
        return createResponse(500, { 
            error: 'Failed to search media',
            message: error.message 
        });
    }
}

/**
 * AI-powered media curation with relevance analysis
 */
async function curateMediaWithAI(requestBody) {
    const { 
        topic, 
        script, 
        mediaRequirements = {},
        sceneContext = null,
        videoId = null,
        projectId = null
    } = requestBody;
    
    if (!topic || !script) {
        return createResponse(400, {
            error: 'Missing required parameters',
            required: ['topic', 'script']
        });
    }
    
    // Generate readable project ID with date stamp if not provided
    let finalProjectId;
    if (projectId || videoId) {
        finalProjectId = projectId || videoId;
    } else {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const topicSlug = topic.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .substring(0, 30); // Limit length
        finalProjectId = `${dateStr}_${timeStr}_${topicSlug}`;
    }
    console.log(`📁 Using project ID: ${finalProjectId}`);
    
    // Enhanced media requirements with stricter defaults
    const requirements = {
        images: 6,
        videos: 2,
        minRelevanceScore: 75,
        maxProcessingTime: 300,
        requireVisualAnalysis: true,
        ...mediaRequirements
    };
    
    console.log(`🎬 AI Curating media for topic: "${topic}"`);
    console.log(`📋 Requirements:`, requirements);
    
    try {
        // Generate enhanced search terms using AI
        const searchTerms = await generateSearchTerms(topic, script);
        console.log(`🔍 Generated search terms:`, searchTerms);
        
        // Get API keys
        const apiKeys = await getApiKeys();
        console.log(`🔑 API Keys available:`, {
            pexels: !!(apiKeys.pexels || apiKeys.PEXELS_API_KEY),
            pixabay: !!(apiKeys.pixabay || apiKeys.PIXABAY_API_KEY)
        });
        
        // Search for media from multiple sources with enhanced terms
        const allMedia = [];
        
        for (const term of searchTerms.slice(0, 3)) {
            try {
                console.log(`🔍 Searching for: "${term}"`);
                
                // Search images
                if (apiKeys.pexels || apiKeys.PEXELS_API_KEY) {
                    const pexelsKey = apiKeys.pexels || apiKeys.PEXELS_API_KEY;
                    const pexelsImages = await searchPexels(term, 'images', Math.ceil(requirements.images / 2), 'landscape', 1920, 1080, pexelsKey);
                    console.log(`📸 Pexels images found for "${term}": ${pexelsImages.length}`);
                    allMedia.push(...pexelsImages);
                }
                
                if (apiKeys.pixabay || apiKeys.PIXABAY_API_KEY) {
                    const pixabayKey = apiKeys.pixabay || apiKeys.PIXABAY_API_KEY;
                    const pixabayImages = await searchPixabay(term, 'images', Math.ceil(requirements.images / 2), 'horizontal', 1920, 1080, pixabayKey);
                    console.log(`📸 Pixabay images found for "${term}": ${pixabayImages.length}`);
                    allMedia.push(...pixabayImages);
                }
                
                // Search videos
                if (apiKeys.pexels || apiKeys.PEXELS_API_KEY) {
                    const pexelsKey = apiKeys.pexels || apiKeys.PEXELS_API_KEY;
                    const pexelsVideos = await searchPexels(term, 'videos', Math.ceil(requirements.videos / 2), 'landscape', 1280, 720, pexelsKey);
                    console.log(`🎥 Pexels videos found for "${term}": ${pexelsVideos.length}`);
                    allMedia.push(...pexelsVideos);
                }
                
            } catch (error) {
                console.error(`Error searching with term "${term}":`, error.message);
            }
        }
        
        console.log(`📊 Found ${allMedia.length} potential media items`);
        
        // Remove duplicates based on URL
        const uniqueMedia = allMedia.filter((media, index, self) => 
            index === self.findIndex(m => m.url === media.url)
        );
        
        console.log(`🔄 After deduplication: ${uniqueMedia.length} unique items`);
        
        // Analyze each media item with AI for relevance
        const analyzedMedia = [];
        
        for (const media of uniqueMedia) {
            try {
                const analysis = await analyzeMediaRelevanceWithAI(media, topic, script, sceneContext);
                
                if (analysis.score >= requirements.minRelevanceScore && analysis.recommended) {
                    analyzedMedia.push({
                        ...media,
                        aiAnalysis: analysis
                    });
                }
            } catch (error) {
                console.error('Error analyzing media:', error.message);
            }
        }
        
        console.log(`🤖 AI analysis completed: ${analyzedMedia.length} items passed relevance threshold`);
        
        // Sort by AI relevance score
        analyzedMedia.sort((a, b) => b.aiAnalysis.score - a.aiAnalysis.score);
        
        // Select diverse media to avoid repetitive content
        const selectedImages = selectDiverseMedia(
            analyzedMedia.filter(m => m.type === 'image'),
            requirements.images
        );
        
        const selectedVideos = selectDiverseMedia(
            analyzedMedia.filter(m => m.type === 'video'),
            requirements.videos
        );
        
        console.log(`📸 Selected ${selectedImages.length} images and ${selectedVideos.length} videos`);
        
        // Download and save selected media to S3
        const processedMedia = [];
        const allSelectedMedia = [...selectedImages, ...selectedVideos];
        
        console.log(`💾 Downloading and saving ${allSelectedMedia.length} media items to S3...`);
        
        for (const media of allSelectedMedia) {
            try {
                const processedItem = await downloadAndSaveMedia(media, finalProjectId);
                if (processedItem) {
                    processedMedia.push(processedItem);
                }
            } catch (error) {
                console.error(`❌ Failed to process media ${media.id}:`, error.message);
            }
        }
        
        console.log(`✅ Successfully saved ${processedMedia.length} media items to S3`);
        
        // Update project summary with media information
        await updateProjectSummary(finalProjectId, 'media', {
            mediaCount: processedMedia.length,
            images: processedMedia.filter(m => m.type === 'image').length,
            videos: processedMedia.filter(m => m.type === 'video').length,
            averageRelevanceScore: processedMedia.reduce((sum, m) => sum + (m.aiAnalysis?.score || 0), 0) / processedMedia.length,
            completedAt: new Date().toISOString()
        });
        
        // Generate usage recommendations
        const usageRecommendations = await generateUsageRecommendations(
            processedMedia,
            script,
            topic
        );
        
        return createResponse(200, {
            success: true,
            media: processedMedia,
            usageRecommendations,
            summary: {
                searchTermsUsed: searchTerms,
                totalFound: allMedia.length,
                uniqueItems: uniqueMedia.length,
                passedAIAnalysis: analyzedMedia.length,
                selected: allSelectedMedia.length,
                successfullySaved: processedMedia.length,
                images: processedMedia.filter(m => m.type === 'image').length,
                videos: processedMedia.filter(m => m.type === 'video').length,
                averageRelevanceScore: analyzedMedia.reduce((sum, m) => sum + m.aiAnalysis.score, 0) / analyzedMedia.length
            }
        });
        
    } catch (error) {
        console.error('Error in AI media curation:', error);
        return createResponse(500, {
            error: 'AI media curation failed',
            message: error.message
        });
    }
}

/**
 * Search Pexels for images and videos
 */
async function searchPexels(query, mediaType, limit, orientation, minWidth, minHeight, apiKey) {
    const results = [];
    
    // Search images if requested
    if (mediaType === 'images' || mediaType === 'both') {
        try {
            const imageUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(limit, 80)}&orientation=${orientation}`;
            console.log(`🔍 Pexels API call: ${imageUrl}`);
            const imageData = await makeHttpRequest(imageUrl, {
                'Authorization': apiKey
            });
            console.log(`📊 Pexels response: ${imageData.photos?.length || 0} photos found`);
            
            if (imageData.photos) {
                imageData.photos.forEach(photo => {
                    if (photo.src && photo.src.large2x && 
                        photo.width >= minWidth && photo.height >= minHeight) {
                        results.push({
                            id: `pexels-img-${photo.id}`,
                            type: 'image',
                            title: photo.alt || query,
                            description: photo.alt || `Image related to ${query}`,
                            url: photo.src.large2x,
                            thumbnailUrl: photo.src.medium,
                            width: photo.width,
                            height: photo.height,
                            photographer: photo.photographer,
                            photographerUrl: photo.photographer_url,
                            license: 'Pexels License',
                            licenseUrl: 'https://www.pexels.com/license/',
                            downloadUrl: photo.src.original,
                            avgColor: photo.avg_color
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error searching Pexels images:', error.message);
        }
    }
    
    // Search videos if requested
    if (mediaType === 'videos' || mediaType === 'both') {
        try {
            const videoUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.min(limit, 80)}&orientation=${orientation}`;
            const videoData = await makeHttpRequest(videoUrl, {
                'Authorization': apiKey
            });
            
            if (videoData.videos) {
                videoData.videos.forEach(video => {
                    if (video.video_files && video.video_files.length > 0) {
                        // Find the best quality video file
                        const bestVideo = video.video_files
                            .filter(file => file.width >= minWidth && file.height >= minHeight)
                            .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
                        
                        if (bestVideo) {
                            results.push({
                                id: `pexels-vid-${video.id}`,
                                type: 'video',
                                title: video.tags?.join(', ') || query,
                                description: `Video related to ${query}`,
                                url: bestVideo.link,
                                thumbnailUrl: video.image,
                                width: bestVideo.width,
                                height: bestVideo.height,
                                duration: video.duration,
                                photographer: video.user?.name,
                                photographerUrl: video.user?.url,
                                license: 'Pexels License',
                                licenseUrl: 'https://www.pexels.com/license/',
                                downloadUrl: bestVideo.link,
                                quality: bestVideo.quality,
                                fileType: bestVideo.file_type
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error searching Pexels videos:', error.message);
        }
    }
    
    return results;
}/**
 * S
earch Pixabay for images and videos
 */
async function searchPixabay(query, mediaType, limit, orientation, minWidth, minHeight, apiKey) {
    const results = [];
    
    // Search images if requested
    if (mediaType === 'images' || mediaType === 'both') {
        try {
            const imageUrl = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=${orientation}&min_width=${minWidth}&min_height=${minHeight}&per_page=${Math.min(limit, 200)}&safesearch=true`;
            console.log(`🔍 Pixabay API call: ${imageUrl.replace(apiKey, 'HIDDEN')}`);
            const imageData = await makeHttpRequest(imageUrl);
            console.log(`📊 Pixabay response: ${imageData.hits?.length || 0} images found`);
            
            if (imageData.hits) {
                imageData.hits.forEach(hit => {
                    results.push({
                        id: `pixabay-img-${hit.id}`,
                        type: 'image',
                        title: hit.tags || query,
                        description: `Image: ${hit.tags}`,
                        url: hit.largeImageURL || hit.webformatURL,
                        thumbnailUrl: hit.previewURL,
                        width: hit.imageWidth,
                        height: hit.imageHeight,
                        photographer: hit.user,
                        photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
                        license: 'Pixabay License',
                        licenseUrl: 'https://pixabay.com/service/license/',
                        downloadUrl: hit.largeImageURL || hit.webformatURL,
                        views: hit.views,
                        downloads: hit.downloads,
                        likes: hit.likes
                    });
                });
            }
        } catch (error) {
            console.error('Error searching Pixabay images:', error.message);
        }
    }
    
    // Search videos if requested
    if (mediaType === 'videos' || mediaType === 'both') {
        try {
            const videoUrl = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&min_width=${minWidth}&min_height=${minHeight}&per_page=${Math.min(limit, 200)}&safesearch=true`;
            const videoData = await makeHttpRequest(videoUrl);
            
            if (videoData.hits) {
                videoData.hits.forEach(hit => {
                    // Find the best quality video
                    const videos = hit.videos;
                    const bestVideo = videos.large || videos.medium || videos.small;
                    
                    if (bestVideo) {
                        results.push({
                            id: `pixabay-vid-${hit.id}`,
                            type: 'video',
                            title: hit.tags || query,
                            description: `Video: ${hit.tags}`,
                            url: bestVideo.url,
                            thumbnailUrl: hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg` : null,
                            width: bestVideo.width,
                            height: bestVideo.height,
                            duration: hit.duration,
                            photographer: hit.user,
                            photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
                            license: 'Pixabay License',
                            licenseUrl: 'https://pixabay.com/service/license/',
                            downloadUrl: bestVideo.url,
                            fileSize: bestVideo.size,
                            views: hit.views,
                            downloads: hit.downloads,
                            likes: hit.likes
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error searching Pixabay videos:', error.message);
        }
    }
    
    return results;
}

/**
 * Calculate relevance score for media item
 */
function calculateRelevanceScore(mediaItem, query) {
    let score = 0;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const title = (mediaItem.title || '').toLowerCase();
    const description = (mediaItem.description || '').toLowerCase();
    
    // Title relevance (40 points)
    queryWords.forEach(word => {
        if (title.includes(word)) score += 10;
    });
    
    // Description relevance (30 points)
    queryWords.forEach(word => {
        if (description.includes(word)) score += 7.5;
    });
    
    // Quality factors (30 points)
    // Resolution bonus
    const pixels = (mediaItem.width || 0) * (mediaItem.height || 0);
    if (pixels >= 1920 * 1080) score += 10; // Full HD+
    else if (pixels >= 1280 * 720) score += 7; // HD
    else if (pixels >= 854 * 480) score += 4; // SD
    
    // Engagement metrics (likes, views, downloads)
    const likes = mediaItem.likes || 0;
    const views = mediaItem.views || 0;
    const downloads = mediaItem.downloads || 0;
    
    if (likes > 100) score += 5;
    else if (likes > 50) score += 3;
    else if (likes > 10) score += 1;
    
    if (views > 10000) score += 5;
    else if (views > 1000) score += 3;
    else if (views > 100) score += 1;
    
    if (downloads > 1000) score += 5;
    else if (downloads > 100) score += 3;
    else if (downloads > 10) score += 1;
    
    // Video duration bonus (for videos)
    if (mediaItem.type === 'video' && mediaItem.duration) {
        if (mediaItem.duration >= 10 && mediaItem.duration <= 60) score += 5; // Good length
        else if (mediaItem.duration >= 5 && mediaItem.duration <= 120) score += 3;
    }
    
    return Math.min(score, 100); // Cap at 100
}

/**
 * Make HTTP request with error handling
 */
function makeHttpRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'AutomatedVideoPipeline/1.0',
                ...headers
            }
        };
        
        const req = https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

/**
 * Generate enhanced search terms using AI
 */
async function generateSearchTerms(topic, script) {
    try {
        const prompt = `Generate 5-7 specific, visual search terms for finding relevant stock photos and videos.

TOPIC: ${topic}
SCRIPT EXCERPT: ${script.substring(0, 600)}...

Requirements:
- Focus on visual elements that would appear in the video
- Include both broad and specific terms
- Consider objects, scenes, concepts, and emotions
- Avoid generic terms like "business" or "success"
- Think about what viewers would see, not just concepts

Examples for "investing for beginners":
- "smartphone trading app interface"
- "young person using investment app"
- "stock market charts on phone screen"
- "piggy bank with coins"
- "financial planning documents"

Respond with a JSON array of search terms: ["term1", "term2", ...]`;
        
        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 300,
                temperature: 0.4,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
        
        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        const searchTerms = JSON.parse(result.content[0].text);
        
        // Add the original topic as a fallback
        return [...searchTerms, topic];
        
    } catch (error) {
        console.error('Error generating search terms:', error);
        // Fallback to basic terms
        return [topic, `${topic} concept`, `${topic} illustration`];
    }
}

/**
 * Analyze media relevance using AI with enhanced analysis
 */
async function analyzeMediaRelevanceWithAI(media, topic, script, sceneContext = null) {
    try {
        const prompt = `You are an expert video content curator. Analyze the relevance of this media to the video topic, script, and specific scene context.

VIDEO TOPIC: ${topic}

SCRIPT EXCERPT: ${script.substring(0, 800)}...

${sceneContext ? `SCENE CONTEXT: ${sceneContext}` : ''}

MEDIA TO ANALYZE:
- Title: ${media.title || 'No title'}
- Description: ${media.description || 'No description'}
- Type: ${media.type}
- Source: ${media.source}
- Photographer: ${media.photographer || 'Unknown'}
- Dimensions: ${media.width}x${media.height}
${media.duration ? `- Duration: ${media.duration}s` : ''}

ANALYSIS CRITERIA:
1. Visual relevance to topic (0-30 points)
2. Contextual match with script content (0-25 points)
3. Professional quality and clarity (0-20 points)
4. Emotional tone alignment (0-15 points)
5. Brand safety and appropriateness (0-10 points)

REQUIREMENTS:
- Score must be 0-100
- Recommended only if score >= 70
- Consider if image/video directly supports the narrative
- Reject generic stock photos unless highly relevant
- Prioritize authentic, engaging visuals

Respond in JSON format:
{
    "score": number,
    "reasoning": "detailed explanation",
    "recommended": boolean,
    "criteria_scores": {
        "visual_relevance": number,
        "contextual_match": number,
        "quality": number,
        "tone_alignment": number,
        "brand_safety": number
    },
    "usage_suggestion": "how to use this media in the video"
}`;
        
        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 500,
                temperature: 0.3,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
        
        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        const analysis = JSON.parse(result.content[0].text);
        
        return {
            score: analysis.score,
            reasoning: analysis.reasoning,
            recommended: analysis.recommended,
            criteriaScores: analysis.criteria_scores,
            usageSuggestion: analysis.usage_suggestion
        };
        
    } catch (error) {
        console.error('Error analyzing media relevance:', error);
        return {
            score: 30,
            reasoning: 'AI analysis failed, using conservative default scoring',
            recommended: false,
            criteriaScores: {
                visual_relevance: 10,
                contextual_match: 10,
                quality: 5,
                tone_alignment: 3,
                brand_safety: 2
            },
            usageSuggestion: 'Manual review required'
        };
    }
}

/**
 * Select diverse media to avoid repetitive content
 */
function selectDiverseMedia(mediaArray, count) {
    if (mediaArray.length <= count) {
        return mediaArray;
    }
    
    const selected = [];
    const sortedMedia = [...mediaArray].sort((a, b) => b.aiAnalysis.score - a.aiAnalysis.score);
    
    for (const media of sortedMedia) {
        if (selected.length >= count) break;
        
        // Check for diversity (avoid similar titles/descriptions)
        const isDiverse = !selected.some(selectedMedia => {
            const titleSimilarity = calculateStringSimilarity(
                media.title || '',
                selectedMedia.title || ''
            );
            
            const descSimilarity = calculateStringSimilarity(
                media.description || '',
                selectedMedia.description || ''
            );
            
            return titleSimilarity > 0.7 || descSimilarity > 0.8;
        });
        
        if (isDiverse) {
            selected.push(media);
        }
    }
    
    // If we don't have enough diverse items, fill with remaining high-scoring items
    if (selected.length < count) {
        for (const media of sortedMedia) {
            if (selected.length >= count) break;
            if (!selected.includes(media)) {
                selected.push(media);
            }
        }
    }
    
    return selected.slice(0, count);
}

/**
 * Calculate string similarity (simple implementation)
 */
function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
}

/**
 * Generate usage recommendations for selected media
 */
async function generateUsageRecommendations(processedMedia, script, topic) {
    try {
        const mediaDescriptions = processedMedia.map(media => 
            `${media.type}: "${media.title}" (AI Score: ${media.aiAnalysis.score}) - ${media.aiAnalysis.usageSuggestion}`
        ).join('\n');
        
        const prompt = `Create specific usage recommendations for how to use these curated media items in a video about "${topic}".

SCRIPT EXCERPT: ${script.substring(0, 800)}...

AVAILABLE MEDIA:
${mediaDescriptions}

Provide recommendations for:
1. Which media to use for intro/hook (first 10 seconds)
2. Which media to use for main content sections
3. Which media to use for conclusion/call-to-action
4. Timing suggestions (when to show each media)
5. Transition recommendations

Respond in JSON format:
{
    "intro": ["mediaId1", "mediaId2"],
    "main_content": [
        {"mediaId": "id", "timing": "30-45s", "purpose": "explanation"}
    ],
    "conclusion": ["mediaId3"],
    "transitions": {
        "fade_duration": "0.5s",
        "style": "smooth"
    }
}`;
        
        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 500,
                temperature: 0.3,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
        
        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        return JSON.parse(result.content[0].text);
        
    } catch (error) {
        console.error('Error generating usage recommendations:', error);
        return {
            intro: processedMedia.slice(0, 1).map(m => m.id),
            main_content: processedMedia.slice(1, -1).map(m => ({
                mediaId: m.id,
                timing: "auto",
                purpose: "support"
            })),
            conclusion: processedMedia.slice(-1).map(m => m.id),
            transitions: {
                fade_duration: "0.5s",
                style: "smooth"
            }
        };
    }
}

/**
 * Download media file and save to S3 in organized folder structure
 */
async function downloadAndSaveMedia(media, projectId) {
    try {
        console.log(`📥 Downloading ${media.type}: ${media.title}`);
        
        // Download the media file
        const mediaBuffer = await downloadMediaFile(media.downloadUrl || media.url);
        
        // Determine file extension
        const fileExtension = getFileExtension(media.url, media.type);
        
        // Create organized S3 key structure matching the required format:
        // videos/{projectId}/media/images/ or videos/{projectId}/media/videos/
        const mediaFolder = media.type === 'image' ? 'images' : 'videos';
        const fileName = `${media.id}-${Date.now()}${fileExtension}`;
        const s3Key = `videos/${projectId}/media/${mediaFolder}/${fileName}`;
        
        // Upload to S3
        const bucketName = process.env.S3_BUCKET_NAME;
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: mediaBuffer,
            ContentType: getContentType(media.type, fileExtension),
            Metadata: {
                originalUrl: media.url,
                source: media.source,
                mediaId: media.id,
                projectId: projectId,
                aiRelevanceScore: media.aiAnalysis?.score?.toString() || '0'
            }
        }));
        
        console.log(`✅ Saved ${media.type} to S3: ${s3Key}`);
        
        // Return processed media item with S3 information
        return {
            mediaId: uuidv4(),
            originalId: media.id,
            type: media.type,
            title: media.title,
            source: media.source,
            s3Bucket: bucketName,
            s3Key: s3Key,
            s3Url: `s3://${bucketName}/${s3Key}`,
            publicUrl: `https://${bucketName}.s3.amazonaws.com/${s3Key}`,
            projectId: projectId,
            originalUrl: media.url,
            aiAnalysis: media.aiAnalysis,
            metadata: {
                width: media.width,
                height: media.height,
                duration: media.duration,
                photographer: media.photographer,
                fileSize: mediaBuffer.length,
                contentType: getContentType(media.type, fileExtension)
            },
            createdAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Error downloading/saving media ${media.id}:`, error.message);
        throw error;
    }
}

/**
 * Download media file from URL
 */
async function downloadMediaFile(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AutomatedVideoPipeline/1.0)'
            }
        }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            const chunks = [];
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                
                // Validate file size (max 100MB)
                if (buffer.length > 100 * 1024 * 1024) {
                    reject(new Error('File too large (max 100MB)'));
                    return;
                }
                
                resolve(buffer);
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Download timeout'));
        });
    });
}

/**
 * Get file extension from URL or media type
 */
function getFileExtension(url, mediaType) {
    // Try to extract extension from URL
    const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (urlMatch) {
        return `.${urlMatch[1].toLowerCase()}`;
    }
    
    // Fallback based on media type
    if (mediaType === 'image') {
        return '.jpg';
    } else if (mediaType === 'video') {
        return '.mp4';
    }
    
    return '.bin';
}

/**
 * Get content type for S3 upload
 */
function getContentType(mediaType, fileExtension) {
    if (mediaType === 'image') {
        switch (fileExtension.toLowerCase()) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.webp':
                return 'image/webp';
            default:
                return 'image/jpeg';
        }
    } else if (mediaType === 'video') {
        switch (fileExtension.toLowerCase()) {
            case '.mp4':
                return 'video/mp4';
            case '.mov':
                return 'video/quicktime';
            case '.avi':
                return 'video/x-msvideo';
            default:
                return 'video/mp4';
        }
    }
    
    return 'application/octet-stream';
}

/**
 * Update project summary with component completion status
 */
async function updateProjectSummary(projectId, componentType, componentData) {
    try {
        const summaryKey = `videos/${projectId}/metadata/project.json`;
        const bucketName = process.env.S3_BUCKET_NAME;
        
        // Try to get existing project summary
        let projectSummary = {};
        try {
            const { GetObjectCommand } = require('@aws-sdk/client-s3');
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: summaryKey
            }));
            
            const bodyContents = await streamToString(response.Body);
            projectSummary = JSON.parse(bodyContents);
        } catch (error) {
            // File doesn't exist yet, create new summary
            projectSummary = {
                projectId: projectId,
                createdAt: new Date().toISOString(),
                components: {},
                status: 'in_progress'
            };
        }
        
        // Update the specific component
        projectSummary.components[componentType] = componentData;
        projectSummary.lastUpdated = new Date().toISOString();
        
        // Update status based on completed components
        const hasScript = projectSummary.components.script;
        const hasAudio = projectSummary.components.audio;
        const hasMedia = projectSummary.components.media;
        
        if (hasScript && hasAudio && hasMedia) {
            projectSummary.status = 'ready_for_assembly';
        } else if (hasScript || hasAudio || hasMedia) {
            projectSummary.status = 'in_progress';
        }
        
        // Save updated summary
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: summaryKey,
            Body: JSON.stringify(projectSummary, null, 2),
            ContentType: 'application/json',
            Metadata: {
                projectId: projectId,
                lastUpdated: new Date().toISOString(),
                status: projectSummary.status
            }
        }));
        
        console.log(`📋 Updated project summary: ${componentType} completed`);
        
    } catch (error) {
        console.error('Error updating project summary:', error);
        // Don't fail the whole operation
    }
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

/**
 * Create standardized HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
        },
        body: JSON.stringify(body)
    };
}