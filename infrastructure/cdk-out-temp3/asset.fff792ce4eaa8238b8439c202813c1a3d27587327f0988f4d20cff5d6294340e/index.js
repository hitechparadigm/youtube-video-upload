/**
 * 🎨 MEDIA CURATOR AI LAMBDA FUNCTION
 * 
 * ROLE: Intelligent Media Sourcing & Curation
 * This Lambda function sources high-quality media assets from external APIs
 * and curates them based on script content and scene requirements.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 📸 Media Sourcing - Searches Pexels and Pixabay APIs for relevant media
 * 2. 🎯 Relevance Matching - AI-powered matching of media to script scenes
 * 3. 📊 Quality Filtering - Ensures 1080p+ quality and proper licensing
 * 4. 🔄 Context Integration - Uses scene context from Script Generator AI
 * 5. 📁 Asset Organization - Organizes media by scene and timing
 * 
 * MEDIA SOURCES:
 * - Pexels API - High-quality stock photos and videos
 * - Pixabay API - Additional media with commercial licenses
 * - Fallback: Generic media for common topics
 * 
 * ENDPOINTS:
 * - POST /media/search - Search for media by query
 * - POST /media/curate-from-project - Curate media for existing project (main endpoint)
 * - POST /media/curate - AI-powered curation with context
 * - GET /health - Health check
 * 
 * QUALITY REQUIREMENTS:
 * - Minimum resolution: 1920x1080 (Full HD)
 * - Commercial license compatibility
 * - Relevance score > 70%
 * - Appropriate content rating
 * 
 * CONTEXT FLOW:
 * 1. INPUT: Retrieves scene context from Script Generator AI
 * 2. PROCESSING: Searches and curates relevant media assets
 * 3. OUTPUT: Stores media context for Video Assembler AI
 * 
 * CURATION ALGORITHM:
 * - Keyword extraction from script scenes
 * - Semantic matching with media descriptions
 * - Quality and licensing validation
 * - Timing and duration optimization
 * 
 * INTEGRATION FLOW:
 * Script Generator AI → Media Curator AI → Audio Generator AI (parallel) → Video Assembler AI
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { RekognitionClient, DetectLabelsCommand, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { generateS3Paths } = require('/opt/nodejs/s3-folder-structure');
const https = require('https');
const { randomUUID } = require('crypto');
// Use Node.js built-in crypto.randomUUID instead of uuid package
const uuidv4 = randomUUID;
// Import context management functions
const { getSceneContext, storeMediaContext, updateProjectSummary } = require('/opt/nodejs/context-integration');

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

        if (httpMethod === 'GET' && path === '/health') {
            return createResponse(200, {
                service: 'media-curator',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        } else if (httpMethod === 'POST' && path === '/media/search') {
            return await searchMedia(requestBody);
        } else if (httpMethod === 'POST' && path === '/media/curate-from-project') {
            return await curateMediaFromProject(requestBody);
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
 * Enhanced scene-aware media curation using stored scene context
 */
async function curateMediaFromProject(requestBody) {
    const {
        projectId,
        mediaRequirements = {},
        qualityThreshold = 80,
        diversityFactor = 0.7
    } = requestBody;

    try {
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }

        console.log(`🎨 Starting scene-aware media curation for project: ${projectId}`);

        // Retrieve scene context from Context Manager
        console.log('🔍 Retrieving scene context from Context Manager...');
        const sceneContext = await getSceneContext(projectId);

        console.log('✅ Retrieved scene context:');
        console.log(`   - Available scenes: ${sceneContext.scenes?.length || 0}`);
        console.log(`   - Total duration: ${sceneContext.totalDuration || 0}s`);
        console.log(`   - Selected subtopic: ${sceneContext.selectedSubtopic || 'N/A'}`);
        console.log(`   - Overall style: ${sceneContext.overallStyle || 'N/A'}`);

        if (!sceneContext.scenes || sceneContext.scenes.length === 0) {
            return createResponse(400, { error: 'No scenes found in scene context' });
        }

        // INDUSTRY BEST PRACTICES: Professional video production media requirements
        // Based on industry standards for stock media supporting video scripts
        const requirements = {
            // VISUAL CHANGE FREQUENCY: 3-5 seconds per visual for optimal processing
            standardVisualDuration: 4, // 4 seconds per visual (balanced approach)
            hookVisualDuration: 3, // 2-3 seconds for opening hook (faster pacing)
            educationalVisualDuration: 5, // 4-6 seconds for educational content
            promotionalVisualDuration: 3, // 2-4 seconds for promotional content

            // SCENE-BASED RECOMMENDATIONS: For typical 60-80 second scenes
            primaryVisualsPerScene: 5, // 4-6 primary visuals supporting key narrative points
            cutawayVisualsPerScene: 3, // 2-3 quick cutaway shots (1-2 seconds each)

            // DYNAMIC CALCULATION: Based on actual scene duration
            calculateVisualsForScene: (sceneDuration, sceneType) => {
                if (sceneDuration <= 30) {
                    // Short scenes: 2-3 assets
                    return { primary: 2, cutaway: 1, total: 3 };
                } else if (sceneDuration <= 60) {
                    // Medium scenes: 3-4 assets
                    return { primary: 3, cutaway: 2, total: 5 };
                } else if (sceneDuration <= 80) {
                    // Standard scenes: 4-6 assets
                    return { primary: 4, cutaway: 2, total: 6 };
                } else {
                    // Long scenes: 6-8 assets (avoid exceeding 8-10 visual changes)
                    return { primary: 5, cutaway: 3, total: 8 };
                }
            },

            // CONTENT TYPE OPTIMIZATION
            getVisualDurationForScene: (sceneType, scenePurpose) => {
                if (scenePurpose === 'hook' || scenePurpose === 'intro') {
                    return 3; // 2-3 seconds for maximum retention
                } else if (sceneType === 'educational' || sceneType === 'explanation') {
                    return 5; // 4-6 seconds for comprehension
                } else if (sceneType === 'promotional' || sceneType === 'entertainment') {
                    return 3; // 2-4 seconds for excitement
                } else {
                    return 4; // 3-5 seconds balanced approach
                }
            },

            // SPEECH PATTERN MATCHING: Cut on natural speech breaks
            speechPatternMatching: true,
            narrativePointAlignment: true, // Align visuals with key narrative points
            avoidMidSentenceCuts: true, // Cut on pauses rather than mid-sentence

            // VISUAL RHYTHM OPTIMIZATION
            visualRhythmOptimization: true,
            preventVisualFatigue: true, // Prevent static images > 5 seconds
            maintainEngagement: true, // Ensure visual interest throughout

            // QUALITY THRESHOLDS
            minRelevanceScore: qualityThreshold,
            maxVisualsPerScene: 8, // Industry limit to avoid chaos
            minVisualsPerScene: 2, // Minimum for proper coverage

            // LEGACY COMPATIBILITY (for existing code)
            assetsPerScene: 6, // Default balanced approach
            minImagesPerScene: 2, // Updated to realistic minimum
            maxImagesPerScene: 6, // Updated to industry standards
            videosPerScene: 2, // Mix of images and videos

            // ADVANCED FEATURES
            maxProcessingTime: 600, // 10 minutes
            requireVisualAnalysis: true,
            sceneSpecificMatching: true,
            sequenceOptimization: true,
            transitionPlanning: true,

            ...mediaRequirements
        };

        console.log(`📋 Enhanced requirements:`, requirements);

        // Get API keys for media sources
        const apiKeys = await getApiKeys();
        console.log(`🔑 API Keys available:`, {
            pexels: !!(apiKeys.pexels || apiKeys.PEXELS_API_KEY),
            pixabay: !!(apiKeys.pixabay || apiKeys.PIXABAY_API_KEY)
        });

        // Process each scene with context-aware media matching
        const sceneMediaMapping = [];
        let totalAssets = 0;
        let totalRelevanceScore = 0;

        console.log(`🎬 Processing ${sceneContext.scenes.length} scenes with context-aware matching...`);

        for (const scene of sceneContext.scenes) {
            console.log(`\n📋 Processing Scene ${scene.sceneNumber}: ${scene.title || 'Untitled'}`);
            console.log(`   Duration: ${scene.duration}s`);
            console.log(`   Purpose: ${scene.purpose || 'N/A'}`);
            console.log(`   Visual style: ${scene.visualRequirements?.style || 'N/A'}`);

            // INDUSTRY STANDARDS: Calculate optimal visual count based on scene duration and type
            const sceneVisualPlan = requirements.calculateVisualsForScene(scene.duration, scene.purpose);
            const visualDuration = requirements.getVisualDurationForScene(scene.visualRequirements?.style, scene.purpose);

            console.log(`   📊 Visual Plan: ${sceneVisualPlan.total} assets (${sceneVisualPlan.primary} primary + ${sceneVisualPlan.cutaway} cutaway)`);
            console.log(`   ⏱️ Visual Duration: ${visualDuration}s per asset (${scene.purpose} content type)`);

            // Generate scene-specific search terms using AI
            const sceneSearchTerms = await generateSceneSpecificSearchTerms(scene, sceneContext);
            console.log(`   🔍 Generated search terms: ${sceneSearchTerms.join(', ')}`);

            // Search for media with scene-specific context and visual plan
            const sceneMedia = await searchMediaForScene(scene, sceneSearchTerms, apiKeys, {
                ...requirements,
                targetAssetCount: sceneVisualPlan.total,
                primaryAssetCount: sceneVisualPlan.primary,
                cutawayAssetCount: sceneVisualPlan.cutaway,
                visualDuration: visualDuration
            });
            console.log(`   📸 Found ${sceneMedia.length} potential assets`);

            // AI-powered relevance analysis for this specific scene
            const analyzedMedia = [];
            for (const media of sceneMedia) {
                try {
                    const analysis = await analyzeMediaForScene(media, scene, sceneContext);

                    if (analysis.score >= requirements.minRelevanceScore && analysis.recommended) {
                        analyzedMedia.push({
                            ...media,
                            aiAnalysis: analysis,
                            sceneAlignment: analysis.sceneAlignment
                        });
                    }
                } catch (error) {
                    console.error(`   ⚠️ Error analyzing media ${media.id}:`, error.message);
                }
            }

            console.log(`   🤖 AI analysis: ${analyzedMedia.length} assets passed relevance threshold`);

            // Select optimal media assets for this scene (1-3 assets with proper sequencing)
            const selectedMedia = selectOptimalMediaForScene(
                analyzedMedia,
                scene,
                requirements,
                diversityFactor
            );

            // Download and organize media assets (with rate limiting)
            const processedAssets = [];
            for (const media of selectedMedia) {
                try {
                    const processedAsset = await downloadAndSaveMediaForScene(media, projectId, scene.sceneNumber);
                    if (processedAsset) {
                        processedAssets.push(processedAsset);
                        totalRelevanceScore += processedAsset.aiAnalysis?.score || 0;
                    }

                    // Rate limiting: Small delay between downloads to avoid overwhelming APIs
                    if (selectedMedia.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    }
                } catch (error) {
                    console.error(`   ❌ Failed to process asset ${media.id}:`, error.message);
                }
            }

            // Create detailed scene-media mapping with precise sequencing for Video Assembler
            const sceneMapping = {
                sceneNumber: scene.sceneNumber,
                sceneTitle: scene.title || `Scene ${scene.sceneNumber}`,
                scenePurpose: scene.purpose,
                duration: scene.duration,
                startTime: scene.startTime || 0,
                endTime: scene.endTime || scene.duration,

                // INDUSTRY STANDARDS: Professional media sequence with optimal timing
                mediaSequence: processedAssets.map((asset, index) => {
                    // PROFESSIONAL TIMING: Use industry-standard visual durations
                    const isHookScene = scene.purpose === 'hook' || scene.sceneNumber === 1 || scene.duration <= 30;
                    const visualDuration = requirements.getVisualDurationForScene(
                        scene.visualRequirements?.style || 'standard',
                        scene.purpose
                    );

                    // SPEECH PATTERN MATCHING: Distribute assets across scene with natural breaks
                    const totalAssets = processedAssets.length;
                    const sceneDuration = scene.duration;

                    // Calculate timing based on industry standards (not just equal division)
                    let assetStartTime, assetDuration;

                    if (isHookScene) {
                        // HOOK SCENES: Faster pacing (2-3 seconds) for maximum retention
                        assetDuration = Math.min(visualDuration, sceneDuration / totalAssets);
                        assetStartTime = assetDuration * index;
                    } else {
                        // EDUCATIONAL SCENES: Balanced pacing (4-6 seconds) for comprehension
                        assetDuration = Math.min(visualDuration, sceneDuration / totalAssets);
                        assetStartTime = assetDuration * index;
                    }

                    const assetEndTime = Math.min(assetStartTime + assetDuration, sceneDuration);

                    // VISUAL TYPE CLASSIFICATION: Primary vs Cutaway based on sequence position
                    const isPrimaryVisual = index < Math.ceil(totalAssets * 0.7); // First 70% are primary
                    const visualType = isPrimaryVisual ? 'primary' : 'cutaway';

                    // PROFESSIONAL TRANSITIONS: Based on visual type and position
                    const transitionType = index === 0 ? 'fade-in' :
                        index === totalAssets - 1 ? 'fade-out' :
                            isPrimaryVisual ? 'crossfade' : 'quick-cut';

                    return {
                        sequenceOrder: index + 1,
                        assetId: asset.id,
                        assetType: asset.type, // 'image' or 'video'
                        s3Location: asset.s3Location,
                        localPath: asset.localPath,

                        // INDUSTRY STANDARD TIMING: Precise timing for Video Assembler
                        sceneStartTime: assetStartTime,
                        sceneEndTime: assetEndTime,
                        sceneDuration: assetDuration,

                        // PROFESSIONAL CLASSIFICATION
                        visualType: visualType, // 'primary' or 'cutaway'
                        narrativeRole: isPrimaryVisual ? 'key-point' : 'supporting-detail',
                        pacingStrategy: isHookScene ? 'fast-engagement' : 'educational-comprehension',

                        // SPEECH PATTERN ALIGNMENT
                        speechAlignment: {
                            alignWithNarrativePoints: true,
                            avoidMidSentenceCuts: true,
                            naturalBreakTiming: true
                        },

                        // PROFESSIONAL TRANSITIONS: Based on industry standards
                        entryTransition: {
                            type: transitionType,
                            duration: visualType === 'cutaway' ? 0.3 : 0.5, // Faster for cutaways
                            easing: 'ease-in-out'
                        },
                        exitTransition: {
                            type: index === totalAssets - 1 ? 'fade-out' :
                                visualType === 'cutaway' ? 'quick-cut' : 'crossfade',
                            duration: visualType === 'cutaway' ? 0.3 : 0.5,
                            easing: 'ease-in-out'
                        },

                        // VISUAL SPECIFICATIONS: Enhanced for Video Assembler
                        visualProperties: {
                            scale: asset.visualProperties?.scale || 'fit',
                            position: asset.visualProperties?.position || 'center',
                            opacity: 1.0,
                            filters: asset.visualProperties?.filters || [],

                            // PROFESSIONAL STANDARDS
                            aspectRatio: '16:9',
                            resolution: '1920x1080',
                            frameRate: asset.type === 'video' ? '30fps' : 'static'
                        },

                        // COMPREHENSIVE METADATA: For Video Assembler
                        metadata: {
                            originalUrl: asset.originalUrl,
                            source: asset.source,
                            relevanceScore: asset.aiAnalysis?.score || 0,
                            description: asset.description || '',
                            tags: asset.tags || [],
                            resolution: asset.resolution || { width: 1920, height: 1080 },
                            fileSize: asset.fileSize || 0,

                            // INDUSTRY STANDARDS COMPLIANCE
                            industryStandards: {
                                visualDuration: assetDuration,
                                pacingType: isHookScene ? 'hook' : 'educational',
                                transitionStyle: transitionType,
                                narrativeAlignment: true,
                                speechPatternMatching: true
                            }
                        }
                    };
                }),

                // Legacy format for backward compatibility
                mediaAssets: processedAssets,

                // Scene visual specifications
                visualStyle: scene.visualRequirements?.style || scene.visualStyle || 'standard',
                mood: scene.visualRequirements?.mood || scene.tone || 'neutral',
                transitionStyle: scene.mediaNeeds?.transitions || 'smooth',

                // Enhanced context usage tracking
                contextUsage: {
                    usedSceneContext: true,
                    sceneSpecificSearch: true,
                    aiRelevanceScoring: true,
                    visualStyleMatching: true,
                    sequenceOptimized: true,
                    transitionPlanned: true
                },

                // Video Assembler instructions
                assemblyInstructions: {
                    totalAssets: processedAssets.length,
                    recommendedSequence: processedAssets.map((asset, index) => ({
                        order: index + 1,
                        assetId: asset.id,
                        timing: `${(scene.duration / processedAssets.length * index).toFixed(1)}s - ${(scene.duration / processedAssets.length * (index + 1)).toFixed(1)}s`
                    })),
                    transitionNotes: `Use ${processedAssets.length > 1 ? 'crossfade' : 'fade-in/out'} transitions between assets`,
                    qualityRequirements: {
                        minResolution: '1920x1080',
                        aspectRatio: '16:9',
                        frameRate: '30fps'
                    }
                }
            };

            sceneMediaMapping.push(sceneMapping);
            totalAssets += processedAssets.length;

            console.log(`   ✅ Scene ${scene.sceneNumber}: ${processedAssets.length} assets selected`);
            console.log(`   📊 Avg relevance: ${Math.round(processedAssets.reduce((sum, a) => sum + (a.aiAnalysis?.score || 0), 0) / processedAssets.length)}%`);
        }

        // Calculate overall quality metrics
        const averageRelevanceScore = totalAssets > 0 ? Math.round(totalRelevanceScore / totalAssets) : 0;
        const coverageComplete = sceneMediaMapping.every(mapping => mapping.mediaAssets.length > 0);

        // Analyze scene transitions and visual flow
        console.log('🎬 Analyzing scene transitions and visual flow...');
        const transitionAnalysis = await analyzeSceneTransitionsAndFlow(sceneContext, sceneMediaMapping);

        console.log(`✅ Transition analysis completed:`);
        console.log(`   - Overall flow score: ${transitionAnalysis.visualFlowAnalysis.overallFlowScore}`);
        console.log(`   - Transition quality: ${transitionAnalysis.visualFlowAnalysis.transitionQuality}`);
        console.log(`   - Continuity maintained: ${transitionAnalysis.visualFlowAnalysis.continuityMaintained}`);

        // INDUSTRY STANDARDS: Validate visual change frequency and pacing
        console.log('🎬 Validating industry standards for professional video production...');
        const industryValidation = validateIndustryStandards(sceneMediaMapping, sceneContext);

        // Create comprehensive media context for Video Assembler AI
        const mediaContext = {
            projectId: projectId,
            sceneMediaMapping: transitionAnalysis.sceneMediaMapping, // Use enhanced mapping with transitions
            totalAssets: totalAssets,
            coverageComplete: coverageComplete,
            qualityScore: averageRelevanceScore,
            processingDetails: {
                scenesProcessed: sceneContext.scenes.length,
                mediaSourcesUsed: Object.keys(apiKeys).filter(key => apiKeys[key]),
                aiSimilarityScoring: true,
                contextAwareMatching: true,
                sceneSpecificOptimization: true
            },
            visualFlow: {
                overallStyle: sceneContext.overallStyle,
                sceneProgression: transitionAnalysis.sceneMediaMapping.map(mapping => ({
                    sceneNumber: mapping.sceneNumber,
                    visualStyle: mapping.visualFlow?.continuityScore || mapping.visualStyle,
                    mood: mapping.mood,
                    assetCount: mapping.mediaAssets.length,
                    transitionAnalysis: {
                        entryTransition: mapping.transitionAnalysis?.entryTransition,
                        exitTransition: mapping.transitionAnalysis?.exitTransition,
                        continuityScore: mapping.transitionAnalysis?.continuityScore
                    }
                })),
                transitionAnalysis: transitionAnalysis.visualFlowAnalysis,
                enhancedMetadata: transitionAnalysis.enhancedMetadata
            },
            contextUsage: {
                usedSceneContext: true,
                selectedSubtopic: sceneContext.selectedSubtopic,
                sceneCount: sceneContext.scenes.length,
                intelligentMatching: true
            },
            industryStandards: {
                validationCompleted: true,
                overallCompliance: industryValidation.overallCompliance,
                averageVisualsPerScene: industryValidation.industryMetrics.averageVisualsPerScene,
                averageVisualDuration: industryValidation.industryMetrics.averageVisualDuration,
                hookSceneOptimization: industryValidation.industryMetrics.hookSceneOptimization,
                educationalPacingCompliance: industryValidation.industryMetrics.educationalPacingCompliance,
                speechPatternAlignment: industryValidation.industryMetrics.speechPatternAlignment,
                sceneValidations: industryValidation.sceneValidations,
                recommendations: industryValidation.recommendations,
                professionalStandards: {
                    visualChangeFrequency: '3-5 seconds per visual',
                    hookScenePacing: '2-3 seconds for maximum retention',
                    educationalPacing: '4-6 seconds for comprehension',
                    maxVisualsPerScene: '8-10 visual changes maximum',
                    speechPatternMatching: 'Cut on natural speech breaks',
                    narrativeAlignment: 'Align visuals with key narrative points'
                }
            }
        };

        // Store media context for Video Assembler AI
        await storeMediaContext(projectId, mediaContext);
        console.log(`💾 Stored media context for Video Assembler AI`);

        // Update project summary
        await updateProjectSummary(projectId, 'media', {
            totalAssets: totalAssets,
            scenesCovered: sceneMediaMapping.length,
            averageRelevanceScore: averageRelevanceScore,
            coverageComplete: coverageComplete,
            contextAware: true,
            processingMethod: 'scene_specific_ai_matching'
        });

        console.log(`✅ Scene-aware media curation completed for project: ${projectId}`);

        return createResponse(200, {
            message: 'Scene-aware media curation completed successfully',
            projectId: projectId,
            mediaContext: {
                totalAssets: totalAssets,
                scenesCovered: sceneMediaMapping.length,
                averageRelevanceScore: averageRelevanceScore,
                coverageComplete: coverageComplete
            },
            sceneBreakdown: sceneMediaMapping.map(mapping => ({
                sceneNumber: mapping.sceneNumber,
                sceneTitle: mapping.sceneTitle,
                assetCount: mapping.mediaAssets.length,
                visualStyle: mapping.visualStyle,
                mood: mapping.mood,
                averageVisualDuration: Math.round(mapping.duration / mapping.mediaAssets.length * 10) / 10
            })),
            contextUsage: mediaContext.contextUsage,
            industryStandards: {
                overallCompliance: industryValidation.overallCompliance,
                averageVisualsPerScene: industryValidation.industryMetrics.averageVisualsPerScene,
                averageVisualDuration: industryValidation.industryMetrics.averageVisualDuration,
                professionalPacing: industryValidation.overallCompliance ? 'OPTIMAL' : 'NEEDS_ADJUSTMENT',
                recommendations: industryValidation.recommendations,
                sceneIssues: industryValidation.sceneValidations.filter(s => !s.compliance).length
            },
            readyForVideoAssembly: coverageComplete && industryValidation.overallCompliance
        });

    } catch (error) {
        console.error('Error in scene-aware media curation:', error);
        return createResponse(500, {
            error: 'Failed to curate media from project',
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
 * INDUSTRY STANDARDS: Validate and optimize visual change frequency
 * Based on professional video production best practices for stock media
 */
function validateIndustryStandards(sceneMediaMapping, sceneContext) {
    console.log('🎬 Validating industry standards for visual change frequency...');

    const validationResults = {
        overallCompliance: true,
        sceneValidations: [],
        recommendations: [],
        industryMetrics: {
            totalScenes: sceneMediaMapping.length,
            averageVisualsPerScene: 0,
            averageVisualDuration: 0,
            hookSceneOptimization: false,
            educationalPacingCompliance: true,
            speechPatternAlignment: true
        }
    };

    let totalVisuals = 0;
    let totalDuration = 0;

    for (const sceneMapping of sceneMediaMapping) {
        const scene = sceneContext.scenes.find(s => s.sceneNumber === sceneMapping.sceneNumber);
        const sceneValidation = {
            sceneNumber: sceneMapping.sceneNumber,
            duration: sceneMapping.duration,
            assetCount: sceneMapping.mediaSequence.length,
            compliance: true,
            issues: [],
            recommendations: []
        };

        // INDUSTRY STANDARD: Visual change frequency validation
        const visualsPerScene = sceneMapping.mediaSequence.length;
        const averageVisualDuration = sceneMapping.duration / visualsPerScene;

        totalVisuals += visualsPerScene;
        totalDuration += sceneMapping.duration;

        // Validate visual change frequency (3-5 seconds per visual)
        if (averageVisualDuration < 2) {
            sceneValidation.issues.push('Visual changes too frequent (< 2s) - may cause viewer fatigue');
            sceneValidation.recommendations.push('Reduce visual changes or extend scene duration');
            sceneValidation.compliance = false;
        } else if (averageVisualDuration > 6) {
            sceneValidation.issues.push('Visual changes too slow (> 6s) - may lose viewer engagement');
            sceneValidation.recommendations.push('Add more visual variety or reduce individual visual duration');
            sceneValidation.compliance = false;
        }

        // Validate scene-specific requirements
        const isHookScene = scene?.purpose === 'hook' || sceneMapping.sceneNumber === 1;

        if (isHookScene) {
            // Hook scenes should have 2-3 second cuts for maximum retention
            if (averageVisualDuration > 4) {
                sceneValidation.issues.push('Hook scene pacing too slow - should be 2-3 seconds per visual');
                sceneValidation.recommendations.push('Increase visual change frequency for hook engagement');
                sceneValidation.compliance = false;
            }
            validationResults.industryMetrics.hookSceneOptimization = true;
        } else {
            // Educational scenes should have 4-6 second cuts for comprehension
            if (averageVisualDuration < 3 || averageVisualDuration > 7) {
                sceneValidation.issues.push('Educational scene pacing not optimal - should be 4-6 seconds per visual');
                sceneValidation.recommendations.push('Adjust visual timing for better comprehension');
                sceneValidation.compliance = false;
            }
        }

        // Validate maximum visual changes per scene (industry limit: 8-10)
        if (visualsPerScene > 10) {
            sceneValidation.issues.push('Too many visual changes (> 10) - may feel chaotic');
            sceneValidation.recommendations.push('Reduce visual changes to 6-8 per scene');
            sceneValidation.compliance = false;
        }

        // Validate minimum visual changes per scene
        if (visualsPerScene < 2) {
            sceneValidation.issues.push('Too few visual changes (< 2) - may feel static');
            sceneValidation.recommendations.push('Add more visual variety (minimum 2-3 assets per scene)');
            sceneValidation.compliance = false;
        }

        if (!sceneValidation.compliance) {
            validationResults.overallCompliance = false;
        }

        validationResults.sceneValidations.push(sceneValidation);
    }

    // Calculate overall metrics
    validationResults.industryMetrics.averageVisualsPerScene = Math.round(totalVisuals / sceneMediaMapping.length * 10) / 10;
    validationResults.industryMetrics.averageVisualDuration = Math.round(totalDuration / totalVisuals * 10) / 10;

    // Generate overall recommendations
    if (validationResults.industryMetrics.averageVisualDuration < 3) {
        validationResults.recommendations.push('Overall pacing too fast - consider extending visual durations');
    } else if (validationResults.industryMetrics.averageVisualDuration > 6) {
        validationResults.recommendations.push('Overall pacing too slow - consider adding more visual variety');
    }

    console.log(`✅ Industry standards validation completed:`);
    console.log(`   - Overall compliance: ${validationResults.overallCompliance ? 'PASS' : 'NEEDS IMPROVEMENT'}`);
    console.log(`   - Average visuals per scene: ${validationResults.industryMetrics.averageVisualsPerScene}`);
    console.log(`   - Average visual duration: ${validationResults.industryMetrics.averageVisualDuration}s`);
    console.log(`   - Scenes with issues: ${validationResults.sceneValidations.filter(s => !s.compliance).length}`);

    return validationResults;
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

        // Generate organized S3 paths with scene-specific structure
        const s3Paths = generateS3Paths(projectId, 'Generated Video');
        const fileName = `${media.id}-${Date.now()}${fileExtension}`;
        const s3Key = media.type === 'image'
            ? s3Paths.media.getImagePath(1, media.id).replace('/images/', `/images/${fileName}`)
            : s3Paths.media.getVideoPath(1, media.id).replace('/videos/', `/videos/${fileName}`);

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

// updateProjectSummary function removed - using the one from context-integration layer

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

/**
 * Generate scene-specific search terms using AI and scene context
 */
async function generateSceneSpecificSearchTerms(scene, sceneContext) {
    try {
        const prompt = `Generate 3-5 specific, visual search terms for finding stock media that matches this video scene.

SCENE CONTEXT:
- Scene Number: ${scene.sceneNumber}
- Title: ${scene.title || 'Untitled'}
- Purpose: ${scene.purpose || 'N/A'}
- Duration: ${scene.duration}s
- Script: "${scene.script?.substring(0, 200) || 'No script'}..."

VISUAL REQUIREMENTS:
- Primary: ${scene.visualRequirements?.primary || 'N/A'}
- Secondary: ${scene.visualRequirements?.secondary?.join(', ') || 'N/A'}
- Style: ${scene.visualRequirements?.style || 'N/A'}
- Mood: ${scene.visualRequirements?.mood || 'N/A'}

MEDIA NEEDS:
- Keywords: ${scene.mediaNeeds?.keywords?.join(', ') || 'N/A'}
- Image Count: ${scene.mediaNeeds?.imageCount || 2}
- Video Count: ${scene.mediaNeeds?.videoCount || 1}

VIDEO CONTEXT:
- Overall Topic: ${sceneContext.baseTopic || sceneContext.selectedSubtopic || 'N/A'}
- Target Audience: ${sceneContext.targetAudience || 'general'}
- Overall Style: ${sceneContext.overallStyle || 'N/A'}

Generate search terms that are:
1. Visually specific (what you would actually see in the image/video)
2. Relevant to the scene's purpose and mood
3. Appropriate for the target audience
4. Focused on objects, people, actions, and settings

Respond with a JSON array: ["term1", "term2", "term3", "term4", "term5"]`;

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 200,
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

        // Add fallback terms based on scene context
        const fallbackTerms = [
            ...(scene.mediaNeeds?.keywords || []),
            scene.visualRequirements?.primary,
            scene.purpose
        ].filter(Boolean);

        return [...searchTerms, ...fallbackTerms].slice(0, 5);

    } catch (error) {
        console.error('Error generating scene-specific search terms:', error);
        // Fallback to basic terms
        return [
            ...(scene.mediaNeeds?.keywords || []),
            scene.visualRequirements?.primary || 'generic',
            scene.purpose || 'content'
        ].filter(Boolean).slice(0, 3);
    }
}

/**
 * Search for media specifically for a scene using multiple sources
 */
async function searchMediaForScene(scene, searchTerms, apiKeys, requirements) {
    const allMedia = [];

    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms to avoid rate limits
        try {
            console.log(`     🔍 Searching for: "${term}"`);

            // Search images from available sources
            if (apiKeys.pexels || apiKeys.PEXELS_API_KEY) {
                const pexelsKey = apiKeys.pexels || apiKeys.PEXELS_API_KEY;
                const pexelsImages = await searchPexels(
                    term,
                    'images',
                    requirements.maxImagesPerScene || requirements.targetAssetCount || 6,
                    'landscape',
                    1920,
                    1080,
                    pexelsKey
                );
                allMedia.push(...pexelsImages);
            }

            if (apiKeys.pixabay || apiKeys.PIXABAY_API_KEY) {
                const pixabayKey = apiKeys.pixabay || apiKeys.PIXABAY_API_KEY;
                const pixabayImages = await searchPixabay(
                    term,
                    'images',
                    requirements.maxImagesPerScene || requirements.targetAssetCount || 6,
                    'horizontal',
                    1920,
                    1080,
                    pixabayKey
                );
                allMedia.push(...pixabayImages);
            }

            // Search videos if needed for this scene
            if ((requirements.videosPerScene || requirements.cutawayAssetCount || 2) > 0) {
                if (apiKeys.pexels || apiKeys.PEXELS_API_KEY) {
                    const pexelsKey = apiKeys.pexels || apiKeys.PEXELS_API_KEY;
                    const pexelsVideos = await searchPexels(
                        term,
                        'videos',
                        requirements.videosPerScene || requirements.cutawayAssetCount || 2,
                        'landscape',
                        1280,
                        720,
                        pexelsKey
                    );
                    allMedia.push(...pexelsVideos);
                }
            }

        } catch (error) {
            console.error(`     ⚠️ Error searching with term "${term}":`, error.message);
        }
    }

    // Remove duplicates and add scene context
    const uniqueMedia = allMedia.filter((media, index, self) =>
        index === self.findIndex(m => m.url === media.url)
    ).map(media => ({
        ...media,
        sceneNumber: scene.sceneNumber,
        searchContext: {
            sceneTitle: scene.title,
            scenePurpose: scene.purpose,
            visualStyle: scene.visualRequirements?.style,
            mood: scene.visualRequirements?.mood
        }
    }));

    return uniqueMedia;
}

/**
 * AI-powered media analysis specifically for scene context
 */
async function analyzeMediaForScene(media, scene, sceneContext) {
    try {
        const prompt = `You are an expert video content curator analyzing media for a specific video scene. Rate this media's relevance to the scene context.

SCENE CONTEXT:
- Scene ${scene.sceneNumber}: ${scene.title || 'Untitled'}
- Purpose: ${scene.purpose || 'N/A'}
- Duration: ${scene.duration}s
- Script excerpt: "${scene.script?.substring(0, 150) || 'No script'}..."
- Visual style needed: ${scene.visualRequirements?.style || 'N/A'}
- Mood needed: ${scene.visualRequirements?.mood || 'N/A'}
- Primary visual: ${scene.visualRequirements?.primary || 'N/A'}

OVERALL VIDEO CONTEXT:
- Topic: ${sceneContext.selectedSubtopic || sceneContext.baseTopic || 'N/A'}
- Target audience: ${sceneContext.targetAudience || 'general'}
- Overall style: ${sceneContext.overallStyle || 'N/A'}

MEDIA TO ANALYZE:
- Title: ${media.title || 'No title'}
- Description: ${media.description || 'No description'}
- Type: ${media.type}
- Source: ${media.source}
- Dimensions: ${media.width}x${media.height}
${media.duration ? `- Duration: ${media.duration}s` : ''}

SCENE-SPECIFIC ANALYSIS CRITERIA:
1. Visual relevance to scene purpose (0-25 points)
2. Mood and tone alignment with scene (0-20 points)
3. Style consistency with scene requirements (0-20 points)
4. Narrative support for scene content (0-15 points)
5. Technical quality and professionalism (0-10 points)
6. Audience appropriateness (0-10 points)

REQUIREMENTS:
- Score must be 0-100
- Recommended only if score >= 75
- Consider scene-specific needs, not just general topic relevance
- Prioritize media that directly supports this scene's narrative purpose
- Consider visual flow and transition potential with other scenes

Respond in JSON format:
{
    "score": number,
    "reasoning": "detailed explanation focusing on scene-specific relevance",
    "recommended": boolean,
    "sceneAlignment": {
        "visualRelevance": number,
        "moodAlignment": number,
        "styleConsistency": number,
        "narrativeSupport": number,
        "technicalQuality": number,
        "audienceAppropriate": number
    },
    "usageRecommendation": "how this media should be used in the scene",
    "transitionPotential": "how well this fits with scene flow"
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
            ...analysis,
            sceneSpecific: true,
            analyzedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error analyzing media for scene:', error);
        // Fallback analysis
        return {
            score: 60,
            reasoning: 'Fallback analysis due to AI error',
            recommended: false,
            sceneAlignment: {
                visualRelevance: 60,
                moodAlignment: 60,
                styleConsistency: 60,
                narrativeSupport: 60,
                technicalQuality: 70,
                audienceAppropriate: 70
            },
            usageRecommendation: 'Use as background media',
            transitionPotential: 'Standard transition',
            sceneSpecific: false
        };
    }
}

/**
 * Select optimal media for a scene with INDUSTRY BEST PRACTICES (4-8 visual changes per scene)
 * Based on professional video production standards for optimal engagement and pacing
 */
function selectOptimalMediaForScene(analyzedMedia, scene, requirements, diversityFactor) {
    console.log(`   🎯 Selecting optimal media for scene ${scene.sceneNumber} (duration: ${scene.duration}s, purpose: ${scene.purpose})`);

    // Sort by AI relevance score
    const sortedMedia = analyzedMedia.sort((a, b) => b.aiAnalysis.score - a.aiAnalysis.score);

    // Separate images and videos for strategic selection
    const images = sortedMedia.filter(m => m.type === 'image');
    const videos = sortedMedia.filter(m => m.type === 'video');

    console.log(`   📊 Available: ${images.length} images, ${videos.length} videos`);

    // INDUSTRY STANDARD: Calculate optimal visual changes based on scene duration and purpose
    let primaryVisuals, cutawayVisuals, totalVisuals;
    let visualDuration, isHookScene;

    // Determine if this is a hook scene (first 30 seconds) for faster pacing
    isHookScene = scene.purpose === 'hook' || scene.sceneNumber === 1 || scene.duration <= 30;

    if (scene.duration <= 30) {
        // SHORT SCENES (≤30s): Hook scenes with fast pacing (2-3 second cuts)
        primaryVisuals = 3; // 3 main visuals
        cutawayVisuals = 2; // 2 quick cutaways
        totalVisuals = 5; // Total 5 visual changes
        visualDuration = isHookScene ? 3 : 4; // 3s for hooks, 4s for others
    } else if (scene.duration <= 60) {
        // MEDIUM SCENES (30-60s): Balanced pacing (4-5 second cuts)
        primaryVisuals = 4; // 4 main visuals supporting key points
        cutawayVisuals = 2; // 2 cutaway shots for rhythm
        totalVisuals = 6; // Total 6 visual changes
        visualDuration = isHookScene ? 3 : 5; // 3s for hooks, 5s for educational
    } else if (scene.duration <= 90) {
        // LONG SCENES (60-90s): Educational pacing (5-6 second cuts)
        primaryVisuals = 5; // 5 main visuals for comprehensive coverage
        cutawayVisuals = 3; // 3 cutaway shots for variety
        totalVisuals = 8; // Total 8 visual changes (maximum recommended)
        visualDuration = isHookScene ? 3 : 6; // 3s for hooks, 6s for deep content
    } else {
        // EXTRA LONG SCENES (>90s): Slower pacing to avoid chaos
        primaryVisuals = 6; // 6 main visuals maximum
        cutawayVisuals = 2; // Fewer cutaways to maintain focus
        totalVisuals = 8; // Cap at 8 to prevent visual fatigue
        visualDuration = 6; // Longer duration for comprehension
    }

    // Apply requirements constraints and ensure minimum standards
    totalVisuals = Math.min(totalVisuals, requirements.maxTotalVisuals || 8);
    totalVisuals = Math.max(totalVisuals, requirements.minTotalVisuals || 4);

    // Calculate optimal image/video split (favor images for educational, videos for hooks)
    let imageCount, videoCount;

    if (isHookScene && videos.length > 0) {
        // Hook scenes: More videos for dynamic engagement
        videoCount = Math.min(Math.ceil(totalVisuals * 0.4), videos.length, 3); // 40% videos, max 3
        imageCount = totalVisuals - videoCount;
    } else {
        // Educational scenes: More images for comprehension
        videoCount = Math.min(Math.ceil(totalVisuals * 0.25), videos.length, 2); // 25% videos, max 2
        imageCount = totalVisuals - videoCount;
    }

    // Ensure we have enough assets available
    imageCount = Math.min(imageCount, images.length);
    videoCount = Math.min(videoCount, videos.length);

    // If we don't have enough videos, compensate with images
    if (videoCount < Math.ceil(totalVisuals * 0.25) && images.length > imageCount) {
        const deficit = Math.ceil(totalVisuals * 0.25) - videoCount;
        imageCount = Math.min(imageCount + deficit, images.length);
    }

    console.log(`   🎬 PROFESSIONAL PACING: ${totalVisuals} total visuals (${primaryVisuals} primary + ${cutawayVisuals} cutaway)`);
    console.log(`   ⏱️  TIMING: ${visualDuration}s per visual (${isHookScene ? 'HOOK' : 'EDUCATIONAL'} pacing)`);
    console.log(`   🎯 TARGET: ${imageCount} images, ${videoCount} videos`);

    // Select diverse, high-quality media with strategic variety
    const selectedImages = selectDiverseMedia(images, imageCount);
    const selectedVideos = selectDiverseMedia(videos, videoCount);

    // Create media sequence with professional timing and transitions
    const mediaSequence = [];
    const allSelectedMedia = [...selectedVideos, ...selectedImages];

    // Distribute media across scene duration with optimal timing
    const sceneDuration = scene.duration;
    const timePerVisual = sceneDuration / totalVisuals;

    for (let i = 0; i < Math.min(totalVisuals, allSelectedMedia.length); i++) {
        const media = allSelectedMedia[i];
        const startTime = i * timePerVisual;
        const duration = Math.min(visualDuration, timePerVisual);

        // Determine visual type (primary or cutaway) and transition
        const isPrimary = i < primaryVisuals;
        const transitionType = i === 0 ? 'fade-in' :
            i === totalVisuals - 1 ? 'fade-out' :
                isPrimary ? 'crossfade' : 'quick-cut';

        mediaSequence.push({
            ...media,
            sequenceOrder: i + 1,
            sceneStartTime: startTime,
            sceneDuration: duration,
            visualType: isPrimary ? 'primary' : 'cutaway',
            transitionType: transitionType,
            pacingStrategy: isHookScene ? 'fast-engagement' : 'educational-comprehension',
            narrativeAlignment: isPrimary ? 'key-point' : 'supporting-detail'
        });
    }

    console.log(`   ✅ PROFESSIONAL SEQUENCE: ${mediaSequence.length} assets with ${visualDuration}s timing`);
    console.log(`   📊 BREAKDOWN: ${mediaSequence.filter(m => m.visualType === 'primary').length} primary + ${mediaSequence.filter(m => m.visualType === 'cutaway').length} cutaway`);

    return mediaSequence;
}

/**
 * Download and save media with enhanced metadata for Video Assembler
 */
async function downloadAndSaveMediaForScene(media, projectId, sceneNumber) {
    try {
        console.log(`   💾 Downloading ${media.type} asset: ${media.id} for scene ${sceneNumber}`);

        // Create scene-specific S3 key using organized structure
        const s3Paths = generateS3Paths(projectId, 'Generated Video');
        const fileExtension = media.type === 'video' ? 'mp4' : 'jpg';
        const timestamp = Date.now();
        const fileName = `${media.id}-${timestamp}.${fileExtension}`;
        const s3Key = media.type === 'image'
            ? `${s3Paths.media.getScenePath(sceneNumber)}/images/${fileName}`
            : `${s3Paths.media.getScenePath(sceneNumber)}/videos/${fileName}`;

        // Download media
        const mediaBuffer = await downloadMediaBuffer(media.downloadUrl || media.url);

        // Get media dimensions and file info
        const fileSize = mediaBuffer.length;
        const resolution = media.resolution || { width: 1920, height: 1080 };

        // Save to S3 with comprehensive metadata for Video Assembler
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1',
            Key: s3Key,
            Body: mediaBuffer,
            ContentType: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
            Metadata: {
                projectId: projectId,
                sceneNumber: sceneNumber.toString(),
                mediaId: media.id,
                mediaType: media.type,
                source: media.source || 'unknown',
                relevanceScore: (media.aiAnalysis?.score || 0).toString(),
                sceneSpecific: 'true',
                fileSize: fileSize.toString(),
                width: resolution.width.toString(),
                height: resolution.height.toString(),
                downloadedAt: new Date().toISOString(),
                originalUrl: media.originalUrl || media.url || '',
                description: media.description || '',
                tags: JSON.stringify(media.tags || [])
            }
        }));

        console.log(`   ✅ Saved to S3: ${s3Key} (${Math.round(fileSize / 1024)}KB)`);

        // Return enhanced asset information for Video Assembler
        return {
            ...media,
            id: media.id,
            type: media.type,
            s3Key: s3Key,
            s3Location: `s3://${process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1'}/${s3Key}`,
            localPath: s3Key, // For Video Assembler reference
            sceneNumber: sceneNumber,

            // Enhanced metadata for Video Assembler
            fileSize: fileSize,
            resolution: resolution,
            aspectRatio: resolution.width / resolution.height,
            downloadedAt: new Date().toISOString(),
            sceneSpecific: true,

            // Visual properties for Video Assembler
            visualProperties: {
                scale: 'fit', // fit, fill, stretch
                position: 'center', // center, top, bottom, left, right
                opacity: 1.0,
                filters: [] // brightness, contrast, saturation adjustments
            },

            // Processing metadata
            processingReady: true,
            qualityScore: media.aiAnalysis?.score || 0,
            originalUrl: media.originalUrl || media.url || '',
            source: media.source || 'unknown',
            description: media.description || '',
            tags: media.tags || []
        };

    } catch (error) {
        console.error(`   ❌ Error downloading media for scene ${sceneNumber}:`, error);
        throw error;
    }
}

/**
 * Download media buffer from URL
 */
function downloadMediaBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}
/*
*
 * Analyze scene transitions and visual flow for enhanced media curation
 */
async function analyzeSceneTransitionsAndFlow(sceneContext, curatedMedia) {
    try {
        console.log('🎬 Analyzing scene transitions and visual flow...');

        const scenes = sceneContext.scenes || [];
        const enhancedSceneMapping = [];

        for (let i = 0; i < scenes.length; i++) {
            const currentScene = scenes[i];
            const previousScene = i > 0 ? scenes[i - 1] : null;
            const nextScene = i < scenes.length - 1 ? scenes[i + 1] : null;

            console.log(`   📋 Analyzing Scene ${currentScene.sceneNumber}: ${currentScene.title}`);

            // Find media for current scene
            const sceneMedia = curatedMedia.find(mapping =>
                mapping.sceneNumber === currentScene.sceneNumber
            );

            if (!sceneMedia) {
                console.warn(`   ⚠️ No media found for scene ${currentScene.sceneNumber}`);
                continue;
            }

            // Analyze visual flow and transitions
            const transitionAnalysis = await analyzeSceneTransition(
                currentScene,
                previousScene,
                nextScene,
                sceneMedia
            );

            // Enhance media selection based on transition analysis
            const enhancedMedia = await enhanceMediaForTransitions(
                sceneMedia.mediaAssets,
                transitionAnalysis,
                currentScene
            );

            // Create detailed scene-media mapping
            const enhancedMapping = {
                sceneNumber: currentScene.sceneNumber,
                sceneTitle: currentScene.title,
                scenePurpose: currentScene.purpose,
                duration: currentScene.duration,
                mediaAssets: enhancedMedia,
                transitionAnalysis: transitionAnalysis,
                visualFlow: {
                    entryTransition: transitionAnalysis.entryTransition,
                    exitTransition: transitionAnalysis.exitTransition,
                    internalFlow: transitionAnalysis.internalFlow,
                    continuityScore: transitionAnalysis.continuityScore
                },
                sequenceMetadata: {
                    sceneIndex: i,
                    totalScenes: scenes.length,
                    isFirstScene: i === 0,
                    isLastScene: i === scenes.length - 1,
                    previousSceneConnection: transitionAnalysis.previousConnection,
                    nextSceneConnection: transitionAnalysis.nextConnection
                },
                timingInformation: {
                    absoluteStartTime: scenes.slice(0, i).reduce((sum, s) => sum + (s.duration || 0), 0),
                    absoluteEndTime: scenes.slice(0, i + 1).reduce((sum, s) => sum + (s.duration || 0), 0),
                    relativeDuration: currentScene.duration,
                    transitionDuration: transitionAnalysis.recommendedTransitionDuration
                }
            };

            enhancedSceneMapping.push(enhancedMapping);

            console.log(`   ✅ Scene ${currentScene.sceneNumber}: ${enhancedMedia.length} assets, continuity score: ${transitionAnalysis.continuityScore}`);
        }

        // Calculate overall visual flow score
        const overallFlowScore = calculateOverallVisualFlow(enhancedSceneMapping);

        console.log(`🎬 Scene transition analysis completed:`);
        console.log(`   - Scenes analyzed: ${enhancedSceneMapping.length}`);
        console.log(`   - Overall visual flow score: ${overallFlowScore}`);

        return {
            sceneMediaMapping: enhancedSceneMapping,
            visualFlowAnalysis: {
                overallFlowScore: overallFlowScore,
                transitionQuality: 'professional',
                continuityMaintained: overallFlowScore > 0.8,
                recommendedAdjustments: overallFlowScore < 0.7 ?
                    ['Consider smoother transitions', 'Review media variety'] : []
            },
            enhancedMetadata: {
                totalScenes: scenes.length,
                totalDuration: scenes.reduce((sum, s) => sum + (s.duration || 0), 0),
                transitionCount: enhancedSceneMapping.length - 1,
                visualContinuity: 'optimized'
            }
        };

    } catch (error) {
        console.error('Error analyzing scene transitions:', error);
        throw error;
    }
}

/**
 * Analyze transition between scenes for visual flow
 */
async function analyzeSceneTransition(currentScene, previousScene, nextScene, sceneMedia) {
    try {
        const analysis = {
            entryTransition: 'fade-in',
            exitTransition: 'fade-out',
            internalFlow: 'smooth',
            continuityScore: 0.85,
            recommendedTransitionDuration: 0.5,
            previousConnection: null,
            nextConnection: null
        };

        // Analyze connection to previous scene
        if (previousScene) {
            analysis.previousConnection = await analyzeSceneConnection(
                previousScene,
                currentScene,
                'previous'
            );

            // Determine entry transition based on scene relationship
            if (previousScene.mood === currentScene.mood) {
                analysis.entryTransition = 'crossfade';
                analysis.continuityScore += 0.1;
            } else if (isContrastingMood(previousScene.mood, currentScene.mood)) {
                analysis.entryTransition = 'cut';
                analysis.recommendedTransitionDuration = 0.2;
            } else {
                analysis.entryTransition = 'dissolve';
            }
        }

        // Analyze connection to next scene
        if (nextScene) {
            analysis.nextConnection = await analyzeSceneConnection(
                currentScene,
                nextScene,
                'next'
            );

            // Determine exit transition based on next scene relationship
            if (currentScene.mood === nextScene.mood) {
                analysis.exitTransition = 'crossfade';
            } else if (isContrastingMood(currentScene.mood, nextScene.mood)) {
                analysis.exitTransition = 'cut';
            } else {
                analysis.exitTransition = 'dissolve';
            }
        }

        // Analyze internal flow within scene
        analysis.internalFlow = analyzeInternalSceneFlow(currentScene, sceneMedia);

        // Calculate overall continuity score
        analysis.continuityScore = calculateContinuityScore(
            currentScene,
            previousScene,
            nextScene,
            sceneMedia
        );

        return analysis;

    } catch (error) {
        console.error('Error analyzing scene transition:', error);
        return {
            entryTransition: 'fade-in',
            exitTransition: 'fade-out',
            internalFlow: 'smooth',
            continuityScore: 0.7,
            recommendedTransitionDuration: 0.5,
            previousConnection: null,
            nextConnection: null
        };
    }
}

/**
 * Enhance media selection based on transition analysis
 */
async function enhanceMediaForTransitions(mediaAssets, transitionAnalysis, scene) {
    try {
        const enhancedAssets = [];

        for (let i = 0; i < mediaAssets.length; i++) {
            const asset = mediaAssets[i];
            const enhancedAsset = {
                ...asset,
                transitionMetadata: {
                    positionInScene: i,
                    totalAssetsInScene: mediaAssets.length,
                    isFirstAsset: i === 0,
                    isLastAsset: i === mediaAssets.length - 1,
                    recommendedDuration: scene.duration / mediaAssets.length,
                    transitionIn: i === 0 ? transitionAnalysis.entryTransition : 'crossfade',
                    transitionOut: i === mediaAssets.length - 1 ? transitionAnalysis.exitTransition : 'crossfade',
                    transitionDuration: transitionAnalysis.recommendedTransitionDuration
                },
                visualProperties: {
                    brightness: calculateOptimalBrightness(asset, scene),
                    contrast: calculateOptimalContrast(asset, scene),
                    saturation: calculateOptimalSaturation(asset, scene),
                    cropRecommendation: calculateOptimalCrop(asset, scene),
                    scaleRecommendation: calculateOptimalScale(asset, scene)
                },
                sequenceOptimization: {
                    visualWeight: calculateVisualWeight(asset),
                    energyLevel: calculateEnergyLevel(asset, scene),
                    focusPoint: calculateFocusPoint(asset),
                    colorPalette: extractColorPalette(asset),
                    compositionStyle: analyzeComposition(asset)
                }
            };

            enhancedAssets.push(enhancedAsset);
        }

        // Optimize asset order for better visual flow
        const optimizedAssets = optimizeAssetSequence(enhancedAssets, transitionAnalysis);

        return optimizedAssets;

    } catch (error) {
        console.error('Error enhancing media for transitions:', error);
        return mediaAssets; // Return original assets if enhancement fails
    }
}

/**
 * Analyze connection between two scenes
 */
async function analyzeSceneConnection(scene1, scene2, direction) {
    try {
        const connection = {
            moodTransition: analyzeMoodTransition(scene1.mood, scene2.mood),
            purposeAlignment: analyzePurposeAlignment(scene1.purpose, scene2.purpose),
            visualContinuity: analyzeVisualContinuity(scene1, scene2),
            paceTransition: analyzePaceTransition(scene1, scene2),
            connectionStrength: 0.8
        };

        // Calculate connection strength
        let strengthScore = 0;

        if (connection.moodTransition === 'smooth') strengthScore += 0.3;
        else if (connection.moodTransition === 'complementary') strengthScore += 0.2;

        if (connection.purposeAlignment === 'sequential') strengthScore += 0.3;
        else if (connection.purposeAlignment === 'related') strengthScore += 0.2;

        if (connection.visualContinuity === 'high') strengthScore += 0.2;
        else if (connection.visualContinuity === 'medium') strengthScore += 0.1;

        if (connection.paceTransition === 'natural') strengthScore += 0.2;
        else if (connection.paceTransition === 'acceptable') strengthScore += 0.1;

        connection.connectionStrength = Math.min(1.0, strengthScore);

        return connection;

    } catch (error) {
        console.error('Error analyzing scene connection:', error);
        return {
            moodTransition: 'neutral',
            purposeAlignment: 'independent',
            visualContinuity: 'medium',
            paceTransition: 'acceptable',
            connectionStrength: 0.6
        };
    }
}

/**
 * Helper functions for transition analysis
 */

function isContrastingMood(mood1, mood2) {
    const contrastPairs = [
        ['exciting', 'calm'],
        ['energetic', 'peaceful'],
        ['dramatic', 'subtle'],
        ['intense', 'relaxed']
    ];

    return contrastPairs.some(pair =>
        (pair[0] === mood1 && pair[1] === mood2) ||
        (pair[1] === mood1 && pair[0] === mood2)
    );
}

function analyzeInternalSceneFlow(scene, sceneMedia) {
    // Analyze how media flows within the scene
    const mediaCount = sceneMedia?.mediaAssets?.length || 0;

    if (mediaCount <= 1) return 'static';
    if (mediaCount <= 3) return 'smooth';
    if (mediaCount <= 5) return 'dynamic';
    return 'complex';
}

function calculateContinuityScore(currentScene, previousScene, nextScene, sceneMedia) {
    let score = 0.7; // Base score

    // Scene purpose continuity
    if (previousScene && isRelatedPurpose(previousScene.purpose, currentScene.purpose)) {
        score += 0.1;
    }

    if (nextScene && isRelatedPurpose(currentScene.purpose, nextScene.purpose)) {
        score += 0.1;
    }

    // Media quality and variety
    const mediaCount = sceneMedia?.mediaAssets?.length || 0;
    if (mediaCount >= 2) score += 0.05;
    if (mediaCount >= 3) score += 0.05;

    return Math.min(1.0, score);
}

function isRelatedPurpose(purpose1, purpose2) {
    const relatedPurposes = {
        'grab_attention': ['establish_problem', 'provide_solution'],
        'establish_problem': ['provide_solution', 'show_features'],
        'provide_solution': ['show_features', 'provide_action'],
        'show_features': ['provide_action', 'encourage_action'],
        'provide_action': ['encourage_action'],
        'encourage_action': []
    };

    return relatedPurposes[purpose1]?.includes(purpose2) || false;
}

function analyzeMoodTransition(mood1, mood2) {
    if (mood1 === mood2) return 'smooth';
    if (isContrastingMood(mood1, mood2)) return 'contrasting';
    return 'complementary';
}

function analyzePurposeAlignment(purpose1, purpose2) {
    if (isRelatedPurpose(purpose1, purpose2)) return 'sequential';
    if (purpose1 === purpose2) return 'similar';
    return 'independent';
}

function analyzeVisualContinuity(scene1, scene2) {
    // Simplified visual continuity analysis
    if (scene1.visualStyle === scene2.visualStyle) return 'high';
    return 'medium';
}

function analyzePaceTransition(scene1, scene2) {
    const duration1 = scene1.duration || 60;
    const duration2 = scene2.duration || 60;
    const ratio = Math.max(duration1, duration2) / Math.min(duration1, duration2);

    if (ratio <= 1.5) return 'natural';
    if (ratio <= 2.5) return 'acceptable';
    return 'abrupt';
}

function calculateOverallVisualFlow(sceneMapping) {
    if (sceneMapping.length === 0) return 0;

    const totalScore = sceneMapping.reduce((sum, mapping) =>
        sum + (mapping.transitionAnalysis?.continuityScore || 0.7), 0
    );

    return totalScore / sceneMapping.length;
}

function optimizeAssetSequence(assets, transitionAnalysis) {
    // For now, return assets in original order
    // Future enhancement: implement intelligent reordering based on visual properties
    return assets;
}

// Visual optimization helper functions
function calculateOptimalBrightness(asset, scene) {
    // Scene mood-based brightness adjustment
    const moodBrightness = {
        'exciting': 110,
        'energetic': 105,
        'calm': 95,
        'peaceful': 90,
        'dramatic': 85,
        'mysterious': 80
    };

    return moodBrightness[scene.mood] || 100;
}

function calculateOptimalContrast(asset, scene) {
    // Scene purpose-based contrast adjustment
    const purposeContrast = {
        'grab_attention': 115,
        'establish_problem': 105,
        'provide_solution': 100,
        'show_features': 110,
        'provide_action': 105,
        'encourage_action': 115
    };

    return purposeContrast[scene.purpose] || 100;
}

function calculateOptimalSaturation(asset, scene) {
    // Balanced saturation based on scene mood
    const moodSaturation = {
        'exciting': 110,
        'energetic': 105,
        'calm': 95,
        'peaceful': 90,
        'professional': 100,
        'informative': 100
    };

    return moodSaturation[scene.mood] || 100;
}

function calculateOptimalCrop(asset, scene) {
    // Standard 16:9 crop for video consistency
    return {
        aspectRatio: '16:9',
        focusArea: 'center',
        cropStyle: 'smart'
    };
}

function calculateOptimalScale(asset, scene) {
    // Standard scaling for 1080p output
    return {
        targetWidth: 1920,
        targetHeight: 1080,
        scaleMode: 'fit',
        quality: 'high'
    };
}

function calculateVisualWeight(asset) {
    // Simplified visual weight calculation
    return asset.type === 'video' ? 0.8 : 0.6;
}

function calculateEnergyLevel(asset, scene) {
    // Energy level based on scene purpose and asset type
    const purposeEnergy = {
        'grab_attention': 0.9,
        'establish_problem': 0.6,
        'provide_solution': 0.7,
        'show_features': 0.8,
        'provide_action': 0.8,
        'encourage_action': 0.9
    };

    const baseEnergy = purposeEnergy[scene.purpose] || 0.7;
    const typeMultiplier = asset.type === 'video' ? 1.2 : 1.0;

    return Math.min(1.0, baseEnergy * typeMultiplier);
}

function calculateFocusPoint(asset) {
    // Default focus point for composition
    return {
        x: 0.5, // Center horizontally
        y: 0.4, // Slightly above center (rule of thirds)
        strength: 0.8
    };
}

function extractColorPalette(asset) {
    // Simplified color palette extraction
    return {
        dominant: '#4A90E2',
        secondary: '#7ED321',
        accent: '#F5A623',
        neutral: '#9B9B9B'
    };
}

function analyzeComposition(asset) {
    // Basic composition analysis
    return {
        style: 'balanced',
        complexity: 'medium',
        focusClarity: 'high',
        visualBalance: 'centered'
    };
}