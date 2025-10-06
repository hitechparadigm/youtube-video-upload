/**
 * Media Curator with Secrets Manager Integration
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const https = require('https');

let secretsClient = null;
let cachedSecrets = null;

/**
 * Initialize AWS clients
 */
async function initializeService() {
    if (!secretsClient) {
        const region = process.env.AWS_REGION || 'us-east-1';
        secretsClient = new SecretsManagerClient({ region });
        console.log('Media Curator service initialized');
    }
}

/**
 * Get API keys from Secrets Manager
 */
async function getApiKeys() {
    if (cachedSecrets) {
        return cachedSecrets;
    }
    
    try {
        const secretName = process.env.API_KEYS_SECRET_NAME || 'automated-video-pipeline/api-keys';
        
        const command = new GetSecretValueCommand({
            SecretId: secretName
        });
        
        const response = await secretsClient.send(command);
        
        if (response.SecretString) {
            cachedSecrets = JSON.parse(response.SecretString);
            console.log('API keys retrieved from Secrets Manager');
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
 * Search Pexels for images and videos
 */
async function searchPexels(query, mediaType, limit, orientation, minWidth, minHeight, apiKey) {
    const results = [];
    
    // Search images if requested
    if (mediaType === 'images' || mediaType === 'both') {
        try {
            const imageUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(limit, 80)}&orientation=${orientation}`;
            const imageData = await makeHttpRequest(imageUrl, {
                'Authorization': apiKey
            });
            
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
            const imageData = await makeHttpRequest(imageUrl);
            
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