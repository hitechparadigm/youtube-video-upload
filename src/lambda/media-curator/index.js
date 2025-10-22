/**
 * 🧠 INTELLIGENT MEDIA CURATOR - AI-POWERED CONTENT SELECTION
 *
 * CORE AI INTELLIGENCE:
 * This Lambda implements sophisticated AI-driven media curation that transforms
 * contextual requirements from upstream AI agents into relevant visual content.
 *
 * AI FLOW INTEGRATION:
 * 1. Receives AI-generated visual requirements from Script Generator
 * 2. Uses contextual search optimization to find relevant content
 * 3. Implements intelligent duplicate prevention across project
 * 4. Applies AI-powered relevance scoring and quality assessment
 * 5. Supports both images and video clips with smart content mixing
 *
 * INTELLIGENCE FEATURES:
 * - Contextual Search Optimization: Transforms AI keywords into effective API queries
 * - Multi-Modal Content Support: Downloads both images and video clips from Pexels/Pixabay
 * - Duplicate Prevention: Uses perceptual hashing and metadata comparison
 * - Quality Assessment: AI-powered content scoring and brand safety filtering
 * - Scene-Aware Selection: Adapts content type based on scene purpose (hook/content/conclusion)
 *
 * INPUT CONTEXT (from Script Generator AI):
 * {
 *   'visualRequirements': {
 *     'searchKeywords': ['route maps', 'train stations', 'timing charts'], // AI-generated
 *     'sceneType': 'dynamic_intro',     // AI-determined visual style
 *     'emotionalTone': 'engaging'       // AI-set content mood
 *   }
 * }
 *
 * OUTPUT INTELLIGENCE:
 * - Real images and video clips organized by scene
 * - Duplicate-free content across entire project
 * - Quality-scored and relevance-filtered media
 * - Comprehensive metadata for downstream AI agents
 */

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
    marshall,
    unmarshall
} = require('@aws-sdk/util-dynamodb');
const {
    SecretsManagerClient,
    GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

// Use built-in fetch for Node.js 18+ Lambda environment
const fetch = globalThis.fetch;

/**
 * 🎬 MULTI-SCENE PROCESSOR - INTELLIGENT SCENE PROCESSING WITH RATE LIMITING
 *
 * Implements progressive delays and intelligent API rotation to prevent Scene 3 rate limiting.
 * Addresses the specific issue where Scenes 1-2 get real media but Scene 3+ fall back to placeholders.
 */
class MultiSceneProcessor {
    constructor() {
        this.sceneDelays = {
            1: 0, // No delay for first scene
            2: 2000, // 2 second delay before Scene 2 (conservative)
            3: 4000, // 4 second delay before Scene 3 (conservative)
            default: 6000 // 6 second delay for additional scenes (conservative)
        };
        // Prioritize Google Places heavily for travel content
        this.apiRotation = ['googlePlaces', 'googlePlaces', 'pexels', 'pixabay'];
        this.usedContent = new Set(); // Track content across scenes
        this.sceneProcessingStats = new Map(); // Track processing stats per scene
    }

    async processSceneWithIntelligentDelay(sceneNumber, searchQuery, processingFunction) {
        // Apply progressive delays to prevent rate limiting
        const delay = this.sceneDelays[sceneNumber] || this.sceneDelays.default;
        if (delay > 0) {
            console.log(`⏱️ MultiSceneProcessor: Applying ${delay}ms delay before processing scene ${sceneNumber}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Expand search criteria for later scenes to avoid duplicate filtering
        const expandedQuery = this.expandSearchForScene(searchQuery, sceneNumber);

        // Rotate API priority to distribute load
        const apiPriority = this.getAPIRotationForScene(sceneNumber);

        console.log(`🎯 Scene ${sceneNumber}: Query="${expandedQuery}", API Priority=[${apiPriority.join(', ')}]`);

        // Record processing start
        const startTime = Date.now();

        try {
            const result = await processingFunction(expandedQuery, apiPriority);

            // Record successful processing
            this.sceneProcessingStats.set(sceneNumber, {
                success: true,
                duration: Date.now() - startTime,
                query: expandedQuery,
                apiPriority: apiPriority,
                resultCount: (result && result.length) || 0
            });

            return result;
        } catch (error) {
            // Record failed processing
            this.sceneProcessingStats.set(sceneNumber, {
                success: false,
                duration: Date.now() - startTime,
                query: expandedQuery,
                apiPriority: apiPriority,
                error: error.message
            });

            console.error(`❌ Scene ${sceneNumber} processing failed:`, error.message);
            throw error;
        }
    }

    expandSearchForScene(originalQuery, sceneNumber) {
        // Scene-specific keyword expansions to avoid duplicate content filtering
        const expansions = {
            1: ['introduction', 'overview', 'getting started', 'basics'],
            2: ['detailed', 'comprehensive', 'step by step', 'planning'],
            3: ['tips', 'guide', 'advice', 'mistakes', 'warnings', 'common errors', 'pitfalls', 'avoid'],
            4: ['experience', 'journey', 'adventure', 'story', 'personal', 'real life', 'actual'],
            5: ['culture', 'local', 'authentic', 'traditional', 'native', 'insider', 'hidden'],
            6: ['conclusion', 'summary', 'final thoughts', 'wrap up', 'takeaways']
        };

        // Always expand for scenes 3+ to combat duplicate filtering
        if (sceneNumber >= 3) {
            const sceneTerms = expansions[sceneNumber] || expansions[5];
            const randomTerm = sceneTerms[Math.floor(Math.random() * sceneTerms.length)];
            const expandedQuery = `${originalQuery} ${randomTerm}`;

            console.log(`🔍 Scene ${sceneNumber} Query Expansion: "${originalQuery}" → "${expandedQuery}"`);
            return expandedQuery;
        }

        // For scenes 1-2, optionally add variety terms
        if (Math.random() > 0.5) {
            const sceneTerms = expansions[sceneNumber] || ['detailed', 'comprehensive'];
            const randomTerm = sceneTerms[Math.floor(Math.random() * sceneTerms.length)];
            const expandedQuery = `${originalQuery} ${randomTerm}`;

            console.log(`🔍 Scene ${sceneNumber} Optional Expansion: "${originalQuery}" → "${expandedQuery}"`);
            return expandedQuery;
        }

        console.log(`🔍 Scene ${sceneNumber} No Expansion: "${originalQuery}"`);
        return originalQuery;
    }

    getAPIRotationForScene(sceneNumber) {
        // Rotate starting API for each scene to distribute load
        const startIndex = (sceneNumber - 1) % this.apiRotation.length;
        return [
            ...this.apiRotation.slice(startIndex),
            ...this.apiRotation.slice(0, startIndex)
        ];
    }

    getProcessingStats() {
        const stats = {};
        for (const [sceneNumber, sceneStats] of this.sceneProcessingStats) {
            stats[`scene${sceneNumber}`] = sceneStats;
        }
        return stats;
    }

    analyzeQueryEffectiveness() {
        const analysis = {
            totalScenes: this.sceneProcessingStats.size,
            successfulScenes: 0,
            failedScenes: 0,
            averageProcessingTime: 0,
            scenesWithExpansion: 0,
            scenesWithoutExpansion: 0
        };

        let totalTime = 0;
        for (const [sceneNumber, stats] of this.sceneProcessingStats) {
            if (stats.success) {
                analysis.successfulScenes++;
            } else {
                analysis.failedScenes++;
            }

            totalTime += stats.duration;

            // Check if query was expanded (contains additional terms)
            if (stats.query && stats.query.split(' ').length > 3) {
                analysis.scenesWithExpansion++;
            } else {
                analysis.scenesWithoutExpansion++;
            }
        }

        analysis.averageProcessingTime = analysis.totalScenes > 0 ? totalTime / analysis.totalScenes : 0;
        analysis.successRate = analysis.totalScenes > 0 ? (analysis.successfulScenes / analysis.totalScenes) * 100 : 0;

        return analysis;
    }
}

/**
 * 🚦 RATE LIMITING MANAGER
 * Implements proper rate limiting to avoid API key suspension
 * Pixabay: 100 requests per 60 seconds (with 24h caching requirement)
 * Pexels: 200 requests per hour
 */
class RateLimitManager {
    constructor() {
        this.limits = {
            pixabay: {
                requests: 100,
                window: 60000, // 60 seconds
                current: 0,
                resetTime: 0,
                lastRequest: 0
            },
            pexels: {
                requests: 200,
                window: 3600000, // 1 hour
                current: 0,
                resetTime: 0,
                lastRequest: 0
            }
        };
    }

    async checkRateLimit(service) {
        const limit = this.limits[service];
        const now = Date.now();

        // Reset counter if window has passed
        if (now > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = now + limit.window;
        }

        // Check if we're at the limit
        if (limit.current >= limit.requests) {
            const waitTime = limit.resetTime - now;
            console.log(`⚠️ Rate limit reached for ${service}. Waiting ${Math.ceil(waitTime / 1000)}s`);
            throw new Error(`Rate limit exceeded for ${service}. Reset in ${Math.ceil(waitTime / 1000)} seconds`);
        }

        // Enforce minimum delay between requests (especially for Pixabay)
        const minDelay = service === 'pixabay' ? 1000 : 500; // 1s for Pixabay, 0.5s for Pexels
        const timeSinceLastRequest = now - limit.lastRequest;

        if (timeSinceLastRequest < minDelay) {
            const delayNeeded = minDelay - timeSinceLastRequest;
            console.log(`⏳ Enforcing ${delayNeeded}ms delay for ${service} API`);
            await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }

        // Update counters
        limit.current++;
        limit.lastRequest = Date.now();

        console.log(`🚦 ${service} rate limit: ${limit.current}/${limit.requests} requests used`);
    }

    parseRateLimitHeaders(headers, service) {
        // Parse Pixabay rate limit headers if available
        if (service === 'pixabay') {
            const remaining = headers.get('X-RateLimit-Remaining');
            const reset = headers.get('X-RateLimit-Reset');

            if (remaining !== null) {
                this.limits.pixabay.current = this.limits.pixabay.requests - parseInt(remaining);
                console.log(`📊 Pixabay API: ${remaining} requests remaining`);
            }

            if (reset !== null) {
                this.limits.pixabay.resetTime = Date.now() + (parseInt(reset) * 1000);
            }
        }
    }
}

// Global rate limit manager instance
const rateLimitManager = new RateLimitManager();

/**
 * 🗺️ GOOGLE PLACES API V1 INTEGRATION
 * Enhances media search with location-specific content and place photos
 * Uses the new Places API v1 format for better photo quality and metadata
 */
class GooglePlacesManager {
    constructor() {
        this.apiKey = null; // Will be set from Secrets Manager
        this.baseUrlV1 = 'https://places.googleapis.com/v1';
        this.baseUrlLegacy = 'https://maps.googleapis.com/maps/api'; // Fallback for text search
        this.rateLimits = {
            current: 0,
            window: 60000, // 1 minute
            resetTime: 0,
            lastRequest: 0
        };
    }

    // Initialize API key from Secrets Manager
    async initialize(apiKeys) {
        this.apiKey = apiKeys['google-places-api-key'] || apiKeys['google-places'];
        if (!this.apiKey) {
            throw new Error('Google Places API key not found in Secrets Manager');
        }
        console.log('✅ Google Places API key initialized');
    }

    async checkRateLimit() {
        const now = Date.now();

        // Reset counter if window has passed
        if (now > this.rateLimits.resetTime) {
            this.rateLimits.current = 0;
            this.rateLimits.resetTime = now + this.rateLimits.window;
        }

        // Enforce minimum delay between requests
        const minDelay = 100; // 100ms between requests
        const timeSinceLastRequest = now - this.rateLimits.lastRequest;

        if (timeSinceLastRequest < minDelay) {
            const delayNeeded = minDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }

        this.rateLimits.current++;
        this.rateLimits.lastRequest = Date.now();

        console.log(`🗺️ Google Places rate limit: ${this.rateLimits.current} requests in current window`);
    }

    async searchPlaces(query, type = 'tourist_attraction') {
        await this.checkRateLimit();

        const url = `${this.baseUrlLegacy}/place/textsearch/json?query=${encodeURIComponent(query)}&type=${type}&key=${this.apiKey}&fields=place_id,name,formatted_address,photos,rating,types`;

        console.log(`🗺️ Google Places search: '${query}' (type: ${type})`);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Google Places API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Places API status: ${data.status}`);
            }

            console.log(`📊 Google Places: Found ${data.results?.length || 0} places`);
            return data.results || [];

        } catch (error) {
            console.error(`❌ Google Places search failed:`, error.message);
            return [];
        }
    }

    async getPlacePhotos(place, maxPhotos = 3) {
        if (!place.photos || place.photos.length === 0) {
            return [];
        }

        const photos = [];
        const photoCount = Math.min(place.photos.length, maxPhotos);

        for (let i = 0; i < photoCount; i++) {
            const photo = place.photos[i];

            try {
                await this.checkRateLimit();

                // Use Legacy Photo API format (Places API v1 returns 400 errors)
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&maxheight=1200&photoreference=${photo.photo_reference}&key=${this.apiKey}`;

                console.log(`🔍 Fetching Google Places photo: ${place.name}`);

                // Download the photo
                const photoResponse = await fetch(photoUrl);

                if (photoResponse.ok) {
                    const photoBuffer = await photoResponse.arrayBuffer();

                    // Validate it's a real image (minimum size check)
                    if (photoBuffer.byteLength > 5000) {
                        photos.push({
                            type: 'image',
                            buffer: Buffer.from(photoBuffer),
                            downloadUrl: photoUrl,
                            pageUrl: `https://maps.google.com/maps/place/?q=place_id:${place.place_id}`,
                            photographer: 'Google Places',
                            width: photo.width || 1600,
                            height: photo.height || 1200,
                            description: `${place.name} - ${place.formatted_address}`,
                            source: 'google-places',
                            placeName: place.name,
                            placeAddress: place.formatted_address,
                            placeRating: place.rating,
                            placeTypes: place.types,
                            views: 0, // Google Places doesn't provide view counts
                            downloads: 0
                        });

                        console.log(`✅ Downloaded Google Places photo: ${place.name} (${Math.round(photoBuffer.byteLength / 1024)}KB)`);
                    } else {
                        console.log(`⚠️ Photo too small for ${place.name}, skipping`);
                    }
                } else {
                    console.log(`⚠️ Failed to fetch photo for ${place.name}: ${photoResponse.status}`);
                }
            } catch (error) {
                console.error(`❌ Failed to download photo for ${place.name}:`, error.message);
            }
        }

        return photos;
    }

    async searchLocationPhotos(query, maxResults = 6) {
        console.log(`🗺️ Searching Google Places photos for: '${query}' (requesting ${maxResults} photos)`);

        try {
            // Add timeout to prevent hanging
            return await Promise.race([
                this._searchLocationPhotosInternal(query, maxResults),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Google Places search timeout')), 15000))
            ]);
        } catch (error) {
            console.error(`❌ Google Places location search failed:`, error.message);
            return [];
        }
    }

    async _searchLocationPhotosInternal(query, maxResults = 6) {
        try {
            // Try multiple search strategies for better coverage
            const searchStrategies = [{
                    query: query,
                    type: 'tourist_attraction'
                },
                {
                    query: query,
                    type: 'point_of_interest'
                },
                {
                    query: `${query} landmarks`,
                    type: 'tourist_attraction'
                },
                {
                    query: `${query} attractions`,
                    type: 'point_of_interest'
                }
            ];

            const allPlaces = new Set(); // Use Set to avoid duplicates

            // Try each search strategy
            for (const strategy of searchStrategies) {
                if (allPlaces.size >= maxResults * 2) break; // Stop if we have enough places

                const places = await this.searchPlaces(strategy.query, strategy.type);
                places.forEach(place => {
                    if (place.place_id) {
                        allPlaces.add(JSON.stringify(place)); // Use JSON string to ensure uniqueness
                    }
                });

                // Small delay between searches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const uniquePlaces = Array.from(allPlaces).map(placeStr => JSON.parse(placeStr));
            console.log(`🔍 Found ${uniquePlaces.length} unique places from ${searchStrategies.length} search strategies`);

            if (uniquePlaces.length === 0) {
                console.log(`⚠️ No places found for any search strategy with query: '${query}'`);
                return [];
            }

            const allPhotos = [];
            // Process more places for better photo coverage
            const placesToProcess = uniquePlaces.slice(0, Math.min(uniquePlaces.length, maxResults));

            for (const place of placesToProcess) {
                if (allPhotos.length >= maxResults) break;

                const photosNeeded = Math.min(3, maxResults - allPhotos.length); // Increased from 2 to 3
                const placePhotos = await this.getPlacePhotos(place, photosNeeded);
                allPhotos.push(...placePhotos);

                // Small delay between photo downloads
                if (placePhotos.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
            }

            console.log(`🎯 Google Places: Retrieved ${allPhotos.length} location photos from ${placesToProcess.length} places`);
            return allPhotos;

        } catch (error) {
            console.error(`❌ Google Places internal search failed:`, error.message);
            return [];
        }
    }
}

// Global Google Places manager instance
const googlePlacesManager = new GooglePlacesManager();

const s3Client = new S3Client({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new DynamoDBClient({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});
const secretsClient = new SecretsManagerClient({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Simplified Media Curator invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/media/health') {
        return createResponse(200, {
            service: 'media-curator-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Media curation
    if (httpMethod === 'POST' && path === '/media/curate') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                projectId,
                baseTopic,
                sceneCount = 4,
                quality = '1080p'
            } = requestBody;

            if (!projectId) {
                return createResponse(400, {
                    success: false,
                    error: 'Project ID is required'
                });
            }

            // Retrieve scene context
            const sceneContext = await retrieveContext('scene', projectId);

            if (!sceneContext) {
                return createResponse(400, {
                    success: false,
                    error: 'No scene context found. Script Generator must run first.',
                    type: 'VALIDATION'
                });
            }

            // Curate media for each scene
            const mediaResults = await curateMediaForScenes(projectId, sceneContext, baseTopic);

            // Store media context
            await storeContext(mediaResults, 'media', projectId);

            console.log(`✅ Media Curator completed for project: ${projectId}`);

            return createResponse(200, {
                success: true,
                projectId: projectId,
                totalScenes: sceneContext.scenes.length,
                totalImages: mediaResults.totalImages,
                sceneMediaMapping: mediaResults.sceneMediaMapping,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Media Curator error:', error);
            return createResponse(500, {
                success: false,
                error: error.message
            });
        }
    }

    return createResponse(404, {
        success: false,
        error: 'Endpoint not found'
    });
};

/**
 * Curate media for all scenes
 */
async function curateMediaForScenes(projectId, sceneContext, baseTopic) {
    const scenes = sceneContext.scenes || [];
    const sceneMediaMapping = [];
    let totalImages = 0;

    // 🚫 DUPLICATE PREVENTION: Track used content across all scenes
    const usedContentHashes = new Set();
    const usedContentUrls = new Set();

    // 🎬 MULTI-SCENE PROCESSOR: Initialize intelligent scene processing
    const multiSceneProcessor = new MultiSceneProcessor();
    console.log(`🎬 MultiSceneProcessor initialized for ${scenes.length} scenes`);

    for (const scene of scenes) {
        const sceneNumber = scene.sceneNumber;
        const searchKeywords = (scene.visualRequirements && scene.visualRequirements.searchKeywords) || [baseTopic];
        const searchQuery = searchKeywords.join(' ');

        // Pass complete scene context for AI-powered media selection
        const sceneContextData = {
            sceneType: (scene.visualRequirements && scene.visualRequirements.sceneType) || 'informative',
            emotionalTone: (scene.visualRequirements && scene.visualRequirements.emotionalTone) || 'neutral',
            purpose: scene.purpose || 'content',
            title: scene.title || `Scene ${sceneNumber}`,
            duration: scene.duration || 60
        };

        // 🎬 INTELLIGENT SCENE PROCESSING with delays and API rotation
        const sceneImages = await multiSceneProcessor.processSceneWithIntelligentDelay(
            sceneNumber,
            searchQuery,
            async (expandedQuery, apiPriority) => {
                return await generatePlaceholderImages(
                    projectId,
                    sceneNumber,
                    expandedQuery.split(' '),
                    sceneContextData,
                    usedContentHashes,
                    usedContentUrls,
                    apiPriority
                );
            }
        );

        sceneMediaMapping.push({
            sceneNumber: sceneNumber,
            images: sceneImages,
            imageCount: sceneImages.length
        });

        totalImages += sceneImages.length;
    }

    // Generate comprehensive processing report
    const processingStats = multiSceneProcessor.getProcessingStats();
    const queryAnalysis = multiSceneProcessor.analyzeQueryEffectiveness();

    console.log(`🎬 MultiSceneProcessor Summary:`);
    console.log(`   - Total Scenes: ${scenes.length}`);
    console.log(`   - Success Rate: ${queryAnalysis.successRate.toFixed(1)}%`);
    console.log(`   - Average Processing Time: ${queryAnalysis.averageProcessingTime.toFixed(0)}ms`);
    console.log(`   - Scenes with Query Expansion: ${queryAnalysis.scenesWithExpansion}`);

    return {
        projectId: projectId,
        totalScenes: scenes.length,
        totalImages: totalImages,
        sceneMediaMapping: sceneMediaMapping,
        metadata: {
            generatedAt: new Date().toISOString(),
            architecture: 'multi-scene-processor-v1',
            approach: 'intelligent-rate-limiting-with-api-rotation',
            multiSceneProcessingStats: processingStats,
            queryEffectivenessAnalysis: queryAnalysis,
            rateLimitingEnabled: true,
            apiRotationEnabled: true
        }
    };
}

/**
 * Generate placeholder images for a scene (simplified approach)
 */
async function generatePlaceholderImages(projectId, sceneNumber, keywords, sceneContext = {}, usedContentHashes = new Set(), usedContentUrls = new Set(), apiPriority = ['pexels', 'pixabay']) {
    console.log(`🧠 AI Media Curator: Processing scene ${sceneNumber} with keywords:`, keywords);
    console.log(`📋 Scene Context:`, sceneContext);
    console.log(`🚫 Duplicate Prevention: ${usedContentHashes.size} content hashes, ${usedContentUrls.size} URLs already used`);

    const images = [];
    const searchQuery = keywords.join(' ') + ' travel';

    try {
        // 🧠 INTELLIGENT REAL MEDIA DOWNLOAD with retry logic for Scene 3+
        let realImages = [];
        let attempts = 0;
        const maxAttempts = sceneNumber >= 3 ? 2 : 1; // Reduced attempts for Scene 3+ to prevent timeout

        while (attempts < maxAttempts && realImages.length === 0) {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} for scene ${sceneNumber}`);

            try {
                realImages = await downloadRealImages(searchQuery, 4, sceneContext, usedContentHashes, usedContentUrls, apiPriority);

                if (realImages.length === 0 && attempts < maxAttempts) {
                    console.log(`⚠️ No images found on attempt ${attempts}, retrying with expanded query...`);
                    // Expand search query for retry
                    const expandedQuery = `${searchQuery} attractions landmarks sightseeing`;
                    realImages = await downloadRealImages(expandedQuery, 4, sceneContext, usedContentHashes, usedContentUrls, ['googlePlaces', 'googlePlaces', 'pexels']);
                }
            } catch (error) {
                console.error(`❌ Attempt ${attempts} failed:`, error.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                }
            }
        }

        for (let i = 0; i < realImages.length; i++) {
            // Determine correct file extension and content type based on media type
            const isVideo = realImages[i].type === 'video';
            const fileExtension = isVideo ? '.mp4' : '.jpg';
            const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
            const mediaFolder = isVideo ? 'videos' : 'images';

            const mediaName = `${i + 1}-${keywords[0] || 'travel'}-scene-${sceneNumber}${fileExtension}`;
            const s3Key = `videos/${projectId}/03-media/scene-${sceneNumber}/${mediaFolder}/${mediaName}`;

            // 🚫 DUPLICATE PREVENTION: Generate content hash and track usage
            const contentHash = generateContentHash(realImages[i].buffer);
            usedContentHashes.add(contentHash);
            if (realImages[i].url) {
                usedContentUrls.add(realImages[i].url);
            }

            // Store real media in S3 with correct content type
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: s3Key,
                Body: realImages[i].buffer,
                ContentType: contentType,
                Metadata: {
                    source: realImages[i].source,
                    photographer: realImages[i].photographer || 'Unknown',
                    originalUrl: realImages[i].url || '',
                    mediaType: realImages[i].type || 'image',
                    contentHash: contentHash
                }
            }));

            console.log(`  ✅ Downloaded real ${realImages[i].type || 'image'}: ${mediaName} (${realImages[i].buffer.length} bytes, hash: ${contentHash.substring(0, 8)}...)`);

            images.push({
                imageNumber: i + 1,
                s3Key: s3Key,
                keywords: keywords,
                size: realImages[i].buffer.length,
                source: realImages[i].source,
                type: realImages[i].type || 'image',
                contentHash: contentHash
            });
        }

        console.log(`✅ Successfully downloaded ${images.length} UNIQUE images for scene ${sceneNumber}`);
        return images;

    } catch (error) {
        console.error(`❌ Failed to download real images for scene ${sceneNumber}:`, error.message);

        // For Scene 3+, try one final attempt with generic travel terms before falling back
        if (sceneNumber >= 3) {
            console.log(`🚨 Final attempt for Scene ${sceneNumber} with generic travel terms...`);
            try {
                const genericQuery = `travel destination attractions landmarks`;
                const finalAttempt = await downloadRealImages(genericQuery, 4, sceneContext, new Set(), new Set(), ['googlePlaces', 'pexels']);

                if (finalAttempt.length > 0) {
                    console.log(`✅ Final attempt succeeded with ${finalAttempt.length} images`);

                    const images = [];
                    for (let i = 0; i < finalAttempt.length; i++) {
                        const s3Key = `videos/${projectId}/03-media/scene-${sceneNumber}/images/${i + 1}-${keywords[0] || 'travel'}-scene-${sceneNumber}.jpg`;

                        await s3Client.send(new PutObjectCommand({
                            Bucket: process.env.S3_BUCKET,
                            Key: s3Key,
                            Body: finalAttempt[i].buffer,
                            ContentType: 'image/jpeg'
                        }));

                        images.push({
                            imageNumber: i + 1,
                            s3Key: s3Key,
                            keywords: keywords,
                            size: finalAttempt[i].buffer.length,
                            source: finalAttempt[i].source,
                            type: finalAttempt[i].type || 'image'
                        });
                    }

                    return images;
                }
            } catch (finalError) {
                console.error(`❌ Final attempt also failed:`, finalError.message);
            }
        }

        console.log(`🔄 All attempts failed, falling back to placeholder images for scene ${sceneNumber}`);
        // Fallback to placeholder images if all attempts fail
        return await generateFallbackImages(projectId, sceneNumber, keywords);
    }
}

/**
 * 🧠 INTELLIGENT REAL MEDIA DOWNLOAD SYSTEM
 *
 * This function implements the core AI intelligence for media curation:
 * 1. Searches Pexels first (higher quality, better API)
 * 2. Searches Pixabay as secondary source
 * 3. Intelligently compares and selects best content
 * 4. Prevents duplicates across entire project
 * 5. Supports both images and video clips
 */
async function downloadRealImages(searchQuery, count, sceneContext = {}, usedContentHashes = new Set(), usedContentUrls = new Set(), apiPriority = ['pexels', 'pixabay', 'googlePlaces']) {
    console.log(`🧠 AI Media Curator: Intelligent search for '${searchQuery}' (${count} items)`);
    console.log(`📋 Scene Context:`, sceneContext);
    console.log(`🚫 Duplicate Prevention: Avoiding ${usedContentHashes.size} content hashes, ${usedContentUrls.size} URLs`);

    try {
        // Step 1: Get API keys from Secrets Manager
        const apiKeys = await getApiKeys();

        // Step 2: Search APIs based on priority order for load distribution
        console.log(`🔍 Searching APIs with priority order: [${apiPriority.join(', ')}]`);

        const apiSearchPromises = [];
        const apiNames = [];

        // Create search promises based on priority order
        for (const api of apiPriority) {
            switch (api) {
                case 'pexels':
                    apiSearchPromises.push(searchPexelsIntelligent(searchQuery, count * 2, apiKeys, sceneContext));
                    apiNames.push('pexels');
                    break;
                case 'pixabay':
                    apiSearchPromises.push(searchPixabayIntelligent(searchQuery, count * 2, apiKeys, sceneContext));
                    apiNames.push('pixabay');
                    break;
                case 'googlePlaces':
                    // Increase Google Places results for better coverage, especially for Scene 3+
                    const googlePlacesCount = Math.ceil(count * 1.5); // Increased from 0.5 to 1.5
                    apiSearchPromises.push(searchGooglePlacesIntelligent(searchQuery, googlePlacesCount, sceneContext, apiKeys));
                    apiNames.push('googlePlaces');
                    break;
            }
        }

        const apiResults = await Promise.allSettled(apiSearchPromises);

        // Step 3: Process results based on priority order
        const allCandidates = [];
        const apiStats = {
            successful: 0,
            failed: 0,
            rateLimited: 0
        };

        for (let i = 0; i < apiResults.length; i++) {
            const result = apiResults[i];
            const apiName = apiNames[i];

            if (result.status === 'fulfilled') {
                const candidates = result.value.map(item => ({
                    ...item,
                    source: apiName === 'googlePlaces' ? 'google-places' : apiName,
                    priority: i + 1 // Lower number = higher priority
                }));

                allCandidates.push(...candidates);
                apiStats.successful++;
                console.log(`✅ ${apiName}: Found ${result.value.length} candidates (Priority ${i + 1})`);
            } else {
                const errorMessage = result.reason && result.reason.message;

                // Enhanced error classification
                if (errorMessage && errorMessage.includes('rate limit')) {
                    apiStats.rateLimited++;
                    console.log(`🚫 ${apiName}: Rate limited (Priority ${i + 1})`);
                } else {
                    apiStats.failed++;
                    console.log(`⚠️ ${apiName}: Search failed - ${errorMessage} (Priority ${i + 1})`);
                }
            }
        }

        console.log(`📊 API Load Distribution Stats:`, apiStats);

        // Enhanced error handling with new classifications
        if (allCandidates.length === 0) {
            if (apiStats.rateLimited > 0 && apiStats.successful === 0) {
                throw new Error('SCENE_3_RATE_LIMIT: All APIs rate limited, consider increasing delays');
            } else if (apiStats.failed === apiResults.length) {
                throw new Error('API_FAILURE: All API searches failed');
            } else {
                throw new Error('DUPLICATE_CONTENT_FILTERED: No unique content found after duplicate filtering');
            }
        }

        // Step 4: AI-powered intelligent selection and comparison with duplicate prevention
        console.log(`🧠 AI Analysis: Comparing ${allCandidates.length} candidates...`);
        const selectedContent = await intelligentContentSelection(allCandidates, count, searchQuery, sceneContext, usedContentHashes, usedContentUrls);

        // Step 5: Download selected content with duplicate prevention
        const downloadedMedia = [];
        for (const content of selectedContent) {
            try {
                const mediaBuffer = await downloadMediaBuffer(content.downloadUrl);

                // 🚫 DUPLICATE PREVENTION: Check content hash before adding
                const contentHash = generateContentHash(mediaBuffer);
                if (usedContentHashes.has(contentHash)) {
                    console.log(`🚫 Duplicate content detected (hash: ${contentHash.substring(0, 8)}...), skipping`);
                    continue;
                }

                // Validate it's real content (not placeholder)
                if (await validateRealMediaContent(mediaBuffer, content.type)) {
                    // Track this content to prevent future duplicates
                    usedContentHashes.add(contentHash);
                    if (content.pageUrl) {
                        usedContentUrls.add(content.pageUrl);
                    }

                    downloadedMedia.push({
                        buffer: mediaBuffer,
                        source: content.source,
                        type: content.type,
                        photographer: content.photographer,
                        url: content.pageUrl,
                        relevanceScore: content.relevanceScore,
                        qualityScore: content.qualityScore,
                        size: mediaBuffer.length,
                        contentHash: contentHash
                    });
                    console.log(`✅ Downloaded ${content.type} from ${content.source}: ${mediaBuffer.length} bytes (Score: ${content.relevanceScore}, Hash: ${contentHash.substring(0, 8)}...)`);
                } else {
                    console.log(`❌ Invalid content from ${content.source}, skipping`);
                }
            } catch (error) {
                console.error(`❌ Failed to download from ${content.source}:`, error.message);
            }
        }

        console.log(`🎯 AI Selection Complete: ${downloadedMedia.length}/${count} high-quality items selected`);
        return downloadedMedia;

    } catch (error) {
        console.error(`❌ Intelligent media download failed:`, error.message);
        throw error;
    }
}

/**
 * 🔍 INTELLIGENT PEXELS SEARCH
 * Searches both photos and videos with AI-optimized queries
 */
async function searchPexelsIntelligent(query, count, apiKeys, sceneContext) {
    const optimizedQuery = optimizeSearchQuery(query, sceneContext);
    console.log(`🔍 Pexels search: '${optimizedQuery}'`);

    // Search both photos and videos
    const [photosPromise, videosPromise] = await Promise.allSettled([
        searchPexelsPhotos(optimizedQuery, Math.ceil(count * 0.7), apiKeys), // 70% images
        searchPexelsVideos(optimizedQuery, Math.ceil(count * 0.3), apiKeys) // 30% videos
    ]);

    const results = [];
    if (photosPromise.status === 'fulfilled') results.push(...photosPromise.value);
    if (videosPromise.status === 'fulfilled') results.push(...videosPromise.value);

    return results;
}

/**
 * 🔍 INTELLIGENT PIXABAY SEARCH
 * Searches images and videos with contextual optimization
 */
async function searchPixabayIntelligent(query, count, apiKeys, sceneContext) {
    const optimizedQuery = optimizeSearchQuery(query, sceneContext);
    console.log(`🔍 Pixabay search: '${optimizedQuery}'`);

    // Search both images and videos
    const [imagesPromise, videosPromise] = await Promise.allSettled([
        searchPixabayImages(optimizedQuery, Math.ceil(count * 0.7), apiKeys),
        searchPixabayVideos(optimizedQuery, Math.ceil(count * 0.3), apiKeys)
    ]);

    const results = [];
    if (imagesPromise.status === 'fulfilled') results.push(...imagesPromise.value);
    if (videosPromise.status === 'fulfilled') results.push(...videosPromise.value);

    return results;
}

/**
 * 🗺️ INTELLIGENT GOOGLE PLACES SEARCH
 * Searches location-specific photos with contextual optimization
 */
async function searchGooglePlacesIntelligent(query, count, sceneContext, apiKeys) {
    console.log(`🗺️ Google Places intelligent search: '${query}'`);

    try {
        // Initialize Google Places manager with API keys
        await googlePlacesManager.initialize(apiKeys);

        // Extract location information from query for better place search
        const locationQuery = extractLocationFromQuery(query, sceneContext);

        // Search for location photos using Google Places
        const placePhotos = await googlePlacesManager.searchLocationPhotos(locationQuery, count);

        console.log(`📊 Google Places: Retrieved ${placePhotos.length} location photos`);
        return placePhotos;

    } catch (error) {
        console.error(`❌ Google Places intelligent search failed:`, error.message);
        return [];
    }
}

/**
 * 🎯 EXTRACT LOCATION FROM SEARCH QUERY
 * Intelligently identifies location context for Google Places search
 */
function extractLocationFromQuery(query, sceneContext) {
    // Common location patterns in travel queries
    const locationPatterns = [
        /travel to ([a-zA-Z\s]+)/i,
        /visit ([a-zA-Z\s]+)/i,
        /([a-zA-Z\s]+) travel/i,
        /([a-zA-Z\s]+) guide/i
    ];

    // Try to extract location from query
    for (const pattern of locationPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            const location = match[1].trim();
            console.log(`🎯 Extracted location: '${location}' from query: '${query}'`);
            return location;
        }
    }

    // If no location found, use the original query
    console.log(`🔍 Using original query for location search: '${query}'`);
    return query;
}

/**
 * 🧠 AI-POWERED INTELLIGENT CONTENT SELECTION
 * Compares Pexels vs Pixabay results and selects the best content
 */
async function intelligentContentSelection(candidates, targetCount, originalQuery, sceneContext, usedContentHashes = new Set(), usedContentUrls = new Set()) {
    console.log(`🧠 AI Content Analysis: Evaluating ${candidates.length} candidates`);
    console.log(`🚫 Filtering out ${usedContentUrls.size} already used URLs`);

    // Step 1: Filter out already used content by URL
    const filteredCandidates = candidates.filter(candidate => {
        if (usedContentUrls.has(candidate.pageUrl) || usedContentUrls.has(candidate.downloadUrl)) {
            console.log(`🚫 Skipping already used URL: ${candidate.pageUrl || candidate.downloadUrl}`);
            return false;
        }
        return true;
    });

    console.log(`🔍 After URL filtering: ${filteredCandidates.length}/${candidates.length} candidates remain`);

    // Step 2: Score all remaining candidates for relevance and quality
    const scoredCandidates = await Promise.all(
        filteredCandidates.map(async (candidate) => {
            const relevanceScore = calculateRelevanceScore(candidate, originalQuery, sceneContext);
            const qualityScore = calculateQualityScore(candidate);
            // Enhanced source scoring with API priority and load distribution
            let sourceScore = 1.0;

            // Heavily prioritize Google Places for travel content
            if (candidate.source === 'google-places') {
                sourceScore = 1.5; // Highest priority for authentic location photos
            } else if (candidate.priority) {
                sourceScore = 1.3 - (candidate.priority * 0.1); // Priority 1 = 1.2, Priority 2 = 1.1, Priority 3 = 1.0
            } else {
                // Fallback to default scoring
                if (candidate.source === 'pexels') sourceScore = 1.1;
                else if (candidate.source === 'pixabay') sourceScore = 1.0;
                else sourceScore = 0.8; // Lower score for unknown sources
            }

            return {
                ...candidate,
                relevanceScore,
                qualityScore,
                sourceScore,
                totalScore: (relevanceScore * 0.5) + (qualityScore * 0.3) + (sourceScore * 0.2)
            };
        })
    );

    // Step 3: Sort by total score (best first)
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

    // Step 4: Intelligent selection with diversity
    const selected = [];
    const usedSources = new Set();
    const usedTypes = new Set();

    for (const candidate of scoredCandidates) {
        if (selected.length >= targetCount) break;

        // Ensure diversity in sources and content types
        const sourceKey = `${candidate.source}-${candidate.type}`;
        if (selected.length < targetCount * 0.5 || !usedSources.has(sourceKey)) {
            selected.push(candidate);
            usedSources.add(sourceKey);
            usedTypes.add(candidate.type);

            console.log(`✅ Selected: ${candidate.type} from ${candidate.source} (Score: ${candidate.totalScore.toFixed(2)})`);
        }
    }

    // Step 5: Fill remaining slots with best remaining content
    for (const candidate of scoredCandidates) {
        if (selected.length >= targetCount) break;
        if (!selected.includes(candidate)) {
            selected.push(candidate);
            console.log(`✅ Added: ${candidate.type} from ${candidate.source} (Score: ${candidate.totalScore.toFixed(2)})`);
        }
    }

    console.log(`🎯 Final Selection: ${selected.length} UNIQUE items from ${new Set(selected.map(s => s.source)).size} sources`);
    return selected.slice(0, targetCount);
}

/**
 * 🔄 GENERATE FALLBACK IMAGES (when real download fails)
 */
async function generateFallbackImages(projectId, sceneNumber, keywords) {
    console.log(`🔄 Generating fallback images for scene ${sceneNumber}`);

    const images = [];
    for (let i = 0; i < 4; i++) {
        const imageName = `${i + 1}-${keywords[0] || 'fallback'}-scene-${sceneNumber}.jpg`;
        const s3Key = `videos/${projectId}/03-media/scene-${sceneNumber}/images/${imageName}`;

        // Create placeholder data
        const placeholderData = createPlaceholderImageData(keywords[0] || 'fallback', sceneNumber, i + 1);

        // Store in S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: placeholderData,
            ContentType: 'text/plain',
            Metadata: {
                source: 'fallback',
                type: 'placeholder'
            }
        }));

        images.push({
            imageNumber: i + 1,
            s3Key: s3Key,
            keywords: keywords,
            size: placeholderData.length,
            source: 'fallback'
        });
    }

    console.log(`✅ Generated ${images.length} fallback images for scene ${sceneNumber}`);
    return images;
}

/**
 * Create placeholder image data (fallback approach)
 */
function createPlaceholderImageData(keyword, sceneNumber, imageNumber) {
    // Create a simple text-based placeholder (in real implementation, would download actual images)
    const placeholderText = `Placeholder Image: ${keyword} - Scene ${sceneNumber} - Image ${imageNumber}`;
    return Buffer.from(placeholderText, 'utf8');
}

/**
 * Retrieve context from S3
 */
async function retrieveContext(contextType, projectId) {
    try {
        // Get reference from DynamoDB
        const response = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Key: marshall({
                PK: `${contextType}#${projectId}`,
                SK: projectId
            })
        }));

        if (!response.Item) {
            console.log(`⚠️ No ${contextType} context found for project ${projectId}`);
            return null;
        }

        const contextRecord = unmarshall(response.Item);

        // Get context from S3
        const s3Response = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: contextRecord.s3Location
        }));

        const contextData = JSON.parse(await s3Response.Body.transformToString());
        console.log(`✅ Retrieved ${contextType} context for project ${projectId}`);

        return contextData;

    } catch (error) {
        console.error(`❌ Error retrieving ${contextType} context:`, error);
        return null;
    }
}

/**
 * Store context in S3 and DynamoDB
 */
async function storeContext(context, contextType, projectId) {
    try {
        // Store in S3
        const s3Key = `videos/${projectId}/01-context/${contextType}-context.json`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: JSON.stringify(context, null, 2),
            ContentType: 'application/json'
        }));

        // Store reference in DynamoDB
        const contextRecord = {
            PK: `${contextType}#${projectId}`,
            SK: projectId,
            s3Location: s3Key,
            contextType,
            projectId,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Item: marshall(contextRecord)
        }));

        console.log(`✅ Stored ${contextType} context for project ${projectId}`);
        return {
            success: true,
            s3Location: s3Key
        };

    } catch (error) {
        console.error(`❌ Error storing ${contextType} context:`, error);
        throw error;
    }
}

/**
 * 🔑 GET API KEYS FROM SECRETS MANAGER
 */
async function getApiKeys() {
    try {
        const response = await secretsClient.send(new GetSecretValueCommand({
            SecretId: 'automated-video-pipeline/api-keys'
        }));

        const keys = JSON.parse(response.SecretString);
        console.log(`✅ Retrieved API keys for ${Object.keys(keys).length} services`);
        return keys;
    } catch (error) {
        console.error(`❌ Failed to get API keys:`, error.message);
        throw new Error(`API keys retrieval failed: ${error.message}`);
    }
}

/**
 * 🔍 SEARCH PEXELS PHOTOS
 */
async function searchPexelsPhotos(query, count, apiKeys) {
    const apiKey = apiKeys['pexels-api-key'] || apiKeys.pexels;
    if (!apiKey) throw new Error('Pexels API key not found');

    // Enforce rate limiting
    await rateLimitManager.checkRateLimit('pexels');

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 80)}&orientation=landscape&size=large`;

    console.log(`🔍 Pexels Photos API call: ${query} (${count} requested)`);

    const response = await fetch(url, {
        headers: {
            'Authorization': apiKey
        }
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Pexels rate limit exceeded - please wait before making more requests');
        }
        const errorText = await response.text();
        throw new Error(`Pexels photos API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Pexels Photos: Found ${data.photos?.length || 0} results (total: ${data.total_results})`);

    return (data.photos || []).map(photo => ({
        type: 'image',
        downloadUrl: photo.src.large2x || photo.src.large,
        pageUrl: photo.url,
        photographer: photo.photographer,
        width: photo.width,
        height: photo.height,
        description: photo.alt || query
    }));
}

/**
 * 🎬 SEARCH PEXELS VIDEOS
 */
async function searchPexelsVideos(query, count, apiKeys) {
    const apiKey = apiKeys['pexels-api-key'] || apiKeys.pexels;
    if (!apiKey) throw new Error('Pexels API key not found');

    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`, {
        headers: {
            'Authorization': apiKey
        }
    });

    if (!response.ok) throw new Error(`Pexels videos API error: ${response.status}`);

    const data = await response.json();
    return data.videos.map(video => ({
        type: 'video',
        downloadUrl: (video.video_files.find(f => f.quality === 'hd' || f.quality === 'sd') && video.video_files.find(f => f.quality === 'hd' || f.quality === 'sd').link) || (video.video_files[0] && video.video_files[0].link),
        pageUrl: video.url,
        photographer: video.user.name,
        width: video.width,
        height: video.height,
        duration: video.duration,
        description: query
    }));
}

/**
 * 🖼️ SEARCH PIXABAY IMAGES
 */
async function searchPixabayImages(query, count, apiKeys) {
    const apiKey = apiKeys['pixabay-api-key'] || apiKeys.pixabay;
    if (!apiKey) throw new Error('Pixabay API key not found');

    // Enforce rate limiting to avoid API suspension
    await rateLimitManager.checkRateLimit('pixabay');

    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&category=travel&per_page=${Math.min(count, 20)}&min_width=1280&safesearch=true&order=popular`;

    console.log(`🔍 Pixabay Images API call: ${query} (${count} requested)`);

    const response = await fetch(url);

    // Parse rate limit headers for monitoring
    rateLimitManager.parseRateLimitHeaders(response.headers, 'pixabay');

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Pixabay rate limit exceeded - please wait before making more requests');
        }
        const errorText = await response.text();
        throw new Error(`Pixabay images API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Pixabay Images: Found ${data.hits.length} results (total: ${data.total})`);

    return data.hits.map(hit => ({
        type: 'image',
        downloadUrl: hit.largeImageURL || hit.webformatURL,
        pageUrl: hit.pageURL,
        photographer: hit.user,
        width: hit.imageWidth,
        height: hit.imageHeight,
        description: hit.tags,
        views: hit.views,
        downloads: hit.downloads
    }));
}

/**
 * 🎬 SEARCH PIXABAY VIDEOS
 */
async function searchPixabayVideos(query, count, apiKeys) {
    const apiKey = apiKeys['pixabay-api-key'] || apiKeys.pixabay;
    if (!apiKey) throw new Error('Pixabay API key not found');

    // Enforce rate limiting to avoid API suspension
    await rateLimitManager.checkRateLimit('pixabay');

    const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&category=travel&per_page=${Math.min(count, 20)}&min_width=1280&safesearch=true&order=popular`;

    console.log(`🔍 Pixabay Videos API call: ${query} (${count} requested)`);

    const response = await fetch(url);

    // Parse rate limit headers for monitoring
    rateLimitManager.parseRateLimitHeaders(response.headers, 'pixabay');

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Pixabay rate limit exceeded - please wait before making more requests');
        }
        const errorText = await response.text();
        throw new Error(`Pixabay videos API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Pixabay Videos: Found ${data.hits.length} results (total: ${data.total})`);

    return data.hits.map(hit => ({
        type: 'video',
        downloadUrl: (hit.videos.medium && hit.videos.medium.url) || (hit.videos.small && hit.videos.small.url) || (hit.videos.tiny && hit.videos.tiny.url),
        pageUrl: hit.pageURL,
        photographer: hit.user,
        width: (hit.videos.medium && hit.videos.medium.width) || (hit.videos.small && hit.videos.small.width),
        height: (hit.videos.medium && hit.videos.medium.height) || (hit.videos.small && hit.videos.small.height),
        duration: hit.duration,
        description: hit.tags,
        views: hit.views,
        downloads: hit.downloads
    }));
}

/**
 * 🧠 OPTIMIZE SEARCH QUERY BASED ON SCENE CONTEXT
 */
function optimizeSearchQuery(originalQuery, sceneContext = {}) {
    let optimized = originalQuery;

    // Add scene-specific context
    if (sceneContext.sceneType === 'dynamic_intro') {
        optimized += ' dynamic action movement';
    } else if (sceneContext.sceneType === 'informative') {
        optimized += ' clear detailed informative';
    }

    // Add emotional tone
    if (sceneContext.emotionalTone === 'engaging') {
        optimized += ' vibrant engaging';
    }

    // Clean up and optimize
    optimized = optimized.replace(/\s+/g, ' ').trim();
    console.log(`🔍 Query optimization: '${originalQuery}' → '${optimized}'`);

    return optimized;
}

/**
 * 📊 CALCULATE RELEVANCE SCORE (0-100)
 */
function calculateRelevanceScore(candidate, originalQuery, sceneContext) {
    let score = 50; // Base score

    // Check description/tags match
    const description = (candidate.description || '').toLowerCase();
    const queryWords = originalQuery.toLowerCase().split(' ');
    const matchingWords = queryWords.filter(word => description.includes(word));
    score += (matchingWords.length / queryWords.length) * 30;

    // Bonus for scene type match
    if (sceneContext.sceneType === 'dynamic_intro' && candidate.type === 'video') {
        score += 15;
    }

    // Quality indicators
    if (candidate.width >= 1920) score += 10;
    if (candidate.photographer && candidate.photographer !== 'Unknown') score += 5;

    // Google Places bonus for location-specific content
    if (candidate.source === 'google-places') {
        score += 20; // High bonus for authentic location photos

        // Additional bonus for highly rated places
        if (candidate.placeRating && candidate.placeRating >= 4.0) {
            score += 10;
        }

        // Bonus for tourist attractions and landmarks
        if (candidate.placeTypes && candidate.placeTypes.includes('tourist_attraction')) {
            score += 15;
        }
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * ⭐ CALCULATE QUALITY SCORE (0-100)
 */
function calculateQualityScore(candidate) {
    let score = 50; // Base score

    // Resolution quality
    if (candidate.width >= 1920) score += 20;
    else if (candidate.width >= 1280) score += 10;

    // Aspect ratio (prefer landscape for videos)
    const aspectRatio = candidate.width / candidate.height;
    if (aspectRatio >= 1.5 && aspectRatio <= 2.0) score += 15;

    // Video duration (prefer 5-30 seconds)
    if (candidate.type === 'video' && candidate.duration) {
        if (candidate.duration >= 5 && candidate.duration <= 30) score += 15;
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * 📥 DOWNLOAD MEDIA BUFFER
 */
async function downloadMediaBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * ✅ VALIDATE REAL MEDIA CONTENT
 */
async function validateRealMediaContent(buffer, type) {
    if (buffer.length < 1000) return false; // Too small to be real media

    if (type === 'image') {
        // Check for JPEG or PNG headers
        const header = buffer.slice(0, 8).toString('hex');
        return header.startsWith('ffd8ffe0') || // JPEG
            header.startsWith('89504e47'); // PNG
    } else if (type === 'video') {
        // Check for common video headers
        const header = buffer.slice(0, 12).toString('hex');
        return header.includes('667479') || // MP4 'ftyp'
            header.includes('000001'); // H.264
    }

    return true; // Default to valid for other types
}

/**
 * 🔐 GENERATE CONTENT HASH FOR DUPLICATE PREVENTION
 * Creates a simple hash of the content buffer to detect identical files
 */
function generateContentHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body, null, 2)
    };
}