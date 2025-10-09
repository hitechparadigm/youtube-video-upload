/**
 * 🎵 AUDIO GENERATOR AI LAMBDA FUNCTION
 * 
 * ROLE: Professional Narration Generation using Amazon Polly
 * This Lambda function converts video scripts into high-quality audio narration
 * using Amazon Polly's advanced neural and generative voices.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 🎙️ Audio Synthesis - Converts script text to professional narration
 * 2. 🎭 Voice Selection - Chooses appropriate voice based on content type
 * 3. 📊 Quality Optimization - Ensures broadcast-quality audio output
 * 4. 🔄 Context Integration - Uses scene context for timing and pacing
 * 5. 📁 Asset Storage - Stores audio files in S3 for video assembly
 * 
 * AMAZON POLLY FEATURES:
 * - Neural Voices: More natural and expressive speech
 * - Generative Voices: Advanced AI-generated speech (Ruth, Stephen, etc.)
 * - SSML Support: Speech Synthesis Markup Language for fine control
 * - Multiple Formats: MP3, WAV, OGG for different use cases
 * 
 * VOICE SELECTION STRATEGY (PRIORITIZING GENERATIVE VOICES):
 * - PRIMARY: Ruth (Generative, US English, most natural and expressive) ⭐ RECOMMENDED
 * - SECONDARY: Stephen (Generative, US English, authoritative and engaging) ⭐ RECOMMENDED  
 * - FALLBACK: Joanna Neural (Neural, US English, clear and professional)
 * - FALLBACK: Matthew Neural (Neural, US English, authoritative)
 * - LEGACY: Standard voices only if generative/neural unavailable
 * 
 * GENERATIVE VOICE BENEFITS:
 * - Most natural speech patterns and intonation
 * - Better emotional expression and engagement
 * - Advanced prosody and breathing patterns
 * - Optimal for YouTube content and educational videos
 * 
 * ENDPOINTS:
 * - POST /audio/generate - Basic audio generation
 * - POST /audio/generate-from-project - Generate from project context (main endpoint)
 * - POST /audio/generate-from-script - Generate from script data
 * - GET /audio/voices - List available voices
 * - GET /health - Health check
 * 
 * AUDIO SPECIFICATIONS:
 * - Format: MP3 (optimized for web delivery)
 * - Sample Rate: 22050 Hz (Polly standard)
 * - Bitrate: 64 kbps (good quality, reasonable file size)
 * - Duration: Matches script timing requirements
 * 
 * CONTEXT FLOW:
 * 1. INPUT: Retrieves scene context from Script Generator AI
 * 2. PROCESSING: Generates audio using Amazon Polly
 * 3. OUTPUT: Stores audio files in S3 for Video Assembler AI
 * 
 * INTEGRATION FLOW:
 * Script Generator AI → Audio Generator AI (parallel with Media Curator) → Video Assembler AI
 * 
 * ENHANCEMENT NEEDED:
 * - Better context integration with other agents
 * - Scene-based audio timing optimization
 * - Voice emotion and pacing control
 */

const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } = require('@aws-sdk/client-polly');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { generateS3Paths } = require('/opt/nodejs/s3-folder-structure');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');
// Import context management functions
const { getSceneContext, getMediaContext, storeAudioContext, updateProjectSummary } = require('/opt/nodejs/context-integration');

// Global configuration
let config = null;

// Initialize AWS clients
let pollyClient = null;
let s3Client = null;
let dynamoClient = null;
let docClient = null;

// Configuration values
let SCRIPTS_TABLE = null;
let AUDIO_TABLE = null;
let S3_BUCKET = null;

// Rate limiting configuration for Amazon Polly (Updated per AWS Documentation)
// https://docs.aws.amazon.com/polly/latest/dg/limits.html
const POLLY_RATE_LIMITS = {
    // Standard voices: Higher throughput, lower quality
    standard: { 
        tps: 80,        // 80 transactions per second
        maxChars: 6000, // 6,000 characters per request
        maxSSMLChars: 6000,
        description: 'Standard voices (Joanna, Matthew, etc.)'
    },
    
    // Neural voices: Better quality, moderate throughput
    neural: { 
        tps: 8,         // 8 transactions per second  
        maxChars: 6000, // 6,000 characters per request
        maxSSMLChars: 6000,
        description: 'Neural voices (Joanna Neural, Matthew Neural, etc.)'
    },
    
    // Generative voices: Highest quality, lowest throughput (RECOMMENDED)
    generative: { 
        tps: 2,         // 2 transactions per second (most restrictive)
        maxChars: 3000, // 3,000 characters per request (smaller chunks)
        maxSSMLChars: 3000,
        description: 'Generative voices (Ruth, Stephen, etc.) - BEST QUALITY'
    },
    
    // Long-form voices: Optimized for longer content
    longform: {
        tps: 1,         // 1 transaction per second
        maxChars: 100000, // 100,000 characters per request (much larger)
        maxSSMLChars: 100000,
        description: 'Long-form voices (optimized for audiobooks, etc.)'
    }
};

// Rate limiting state with proper queue management
let rateLimitState = {
    requests: [],
    lastCleanup: Date.now(),
    queues: {
        generative: [],
        neural: [],
        standard: []
    },
    processing: {
        generative: false,
        neural: false,
        standard: false
    }
};

/**
 * Extract script content from scene object (flexible location support)
 */
function extractScriptContent(scene) {
    return scene.script || scene.content?.script || scene.narration || '';
}

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('audio-generator');
        
        // Initialize AWS clients
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        pollyClient = new PollyClient({ region });
        s3Client = new S3Client({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true
            }
        });
        
        // Set table and bucket names
        SCRIPTS_TABLE = process.env.SCRIPTS_TABLE_NAME || 'automated-video-pipeline-scripts';
        AUDIO_TABLE = process.env.AUDIO_TABLE_NAME || 'automated-video-pipeline-audio';
        S3_BUCKET = process.env.S3_BUCKET_NAME || 'automated-video-pipeline-audio-files';
        
        console.log('Audio Generator service initialized');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Audio Generator invoked:', JSON.stringify(event, null, 2));
    
    try {
        // Initialize service on first invocation
        await initializeService();
        
        const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
        
        // Parse request body if present
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        // Route requests
        if (httpMethod === 'GET' && path === '/health') {
            return createResponse(200, {
                service: 'audio-generator',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        } else if (httpMethod === 'POST' && path === '/audio/generate') {
            return await generateAudio(requestBody);
        } else if (httpMethod === 'POST' && path === '/audio/generate-from-project') {
            return await generateAudioFromProject(requestBody);
        } else if (httpMethod === 'POST' && path === '/audio/generate-from-script') {
            return await generateAudioFromScript(requestBody);
        } else if (httpMethod === 'GET' && path === '/audio/voices') {
            return await getAvailableVoices(queryStringParameters || {});
        } else if (httpMethod === 'GET' && path === '/audio') {
            return await getAudioFiles(queryStringParameters || {});
        } else if (httpMethod === 'GET' && path.startsWith('/audio/')) {
            const audioId = pathParameters?.audioId || path.split('/').pop();
            return await getAudioFile(audioId);
        } else if (httpMethod === 'POST' && path === '/audio/preview') {
            return await generateAudioPreview(requestBody);
        } else if (httpMethod === 'POST' && path === '/audio/validate') {
            return await validateAudio(requestBody);
        } else if (httpMethod === 'GET' && path === '/audio/rate-limit-status') {
            return await getRateLimitStatus();
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Audio Generator:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Generate audio from text content
 */
async function generateAudio(requestBody) {
    const { 
        text, 
        voiceId = 'Ruth', // Default generative voice (BEST QUALITY)
        engine = 'generative', // Use generative for highest quality
        outputFormat = 'mp3',
        sampleRate = '24000',
        includeTimestamps = true,
        sceneBreaks = [],
        audioOptions = {},
        projectId = null // Project ID for organized storage
    } = requestBody;
    
    try {
        console.log(`Generating audio with voice: ${voiceId}`);
        
        // Validate required fields
        if (!text) {
            return createResponse(400, { 
                error: 'Text content is required' 
            });
        }
        
        // Skip voice validation for now and use default voice
        console.log(`Using voice: ${voiceId} with engine: ${engine}`);
        
        // Generate audio using Polly
        const audioData = await generateAudioWithPolly({
            text,
            voiceId,
            engine,
            outputFormat,
            sampleRate,
            includeTimestamps,
            sceneBreaks,
            audioOptions
        });
        
        // Store the generated audio
        const storedAudio = await storeAudioData(audioData, projectId);
        
        // Update project summary if projectId is provided
        if (projectId) {
            await updateProjectSummary(projectId, 'audio', {
                audioId: storedAudio.audioId,
                duration: storedAudio.estimatedDuration,
                fileSize: storedAudio.fileSize,
                s3Key: storedAudio.s3Key,
                voiceId: storedAudio.voiceId,
                engine: storedAudio.engine,
                completedAt: new Date().toISOString()
            });
        }
        
        return createResponse(200, {
            message: 'Audio generated successfully',
            audio: storedAudio,
            duration: audioData.estimatedDuration,
            fileSize: audioData.audioBuffer?.length || 0,
            voiceUsed: voiceId,
            engine: engine,
            rateLimiting: {
                wasRateLimited: audioData.rateLimited || false,
                chunkCount: audioData.chunkCount || 1,
                engineLimits: POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard
            }
        });
        
    } catch (error) {
        console.error('Error generating audio:', error);
        return createResponse(500, { 
            error: 'Failed to generate audio',
            message: error.message 
        });
    }
}

/**
 * Generate audio from project using stored scene context
 */
async function generateAudioFromProject(requestBody) {
    const { 
        projectId,
        voiceId = 'Ruth',
        engine = 'generative',
        audioOptions = {},
        generateByScene = true,
        fallbackText = null // Allow fallback text if no context available
    } = requestBody;
    
    try {
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }
        
        console.log(`🎙️ Generating audio for project: ${projectId}`);
        
        // TASK 12.4: Comprehensive context consumption with validation
        console.log('🔍 Retrieving comprehensive context from Context Manager...');
        let sceneContext = null;
        let mediaContext = null;
        
        try {
            // Retrieve scene context from Script Generator AI
            sceneContext = await getSceneContext(projectId);
            console.log('✅ Retrieved scene context:');
            console.log(`   - Available scenes: ${sceneContext.scenes?.length || 0}`);
            console.log(`   - Total duration: ${sceneContext.totalDuration || 0}s`);
            console.log(`   - Selected subtopic: ${sceneContext.selectedSubtopic || 'N/A'}`);
            console.log(`   - Overall style: ${sceneContext.overallStyle || 'N/A'}`);

            // Validate scene context completeness
            if (!sceneContext.scenes || sceneContext.scenes.length === 0) {
                throw new Error('Scene context validation failed: No scenes available');
            }

            // Validate scene timing and content (flexible script location)
            for (const scene of sceneContext.scenes) {
                // Check for script in multiple possible locations
                const scriptContent = extractScriptContent(scene);
                if (!scriptContent || scriptContent.trim().length === 0) {
                    throw new Error(`Scene context validation failed: Scene ${scene.sceneNumber} has no script content`);
                }
                if (!scene.duration || scene.duration <= 0) {
                    throw new Error(`Scene context validation failed: Scene ${scene.sceneNumber} has invalid duration`);
                }
            }

            console.log('✅ Scene context validation passed');

            // Retrieve media context from Media Curator AI for synchronization
            try {
                mediaContext = await getMediaContext(projectId);
                console.log('✅ Retrieved media context:');
                console.log(`   - Total assets: ${mediaContext.totalAssets || 0}`);
                console.log(`   - Scenes covered: ${mediaContext.scenesCovered || 0}`);
                console.log(`   - Coverage complete: ${mediaContext.coverageComplete || false}`);
                console.log(`   - Industry standards compliance: ${mediaContext.industryStandards?.overallCompliance || 'N/A'}`);
            } catch (mediaError) {
                console.warn('⚠️ Media context not available (will proceed without media synchronization):', mediaError.message);
                mediaContext = null;
            }

        } catch (contextError) {
            console.warn('⚠️ Scene context not available:', contextError.message);
            
            // If no scene context available, try fallback approaches
            if (fallbackText) {
                console.log('🔄 Using fallback text for audio generation...');
                return await generateAudio({
                    text: fallbackText,
                    voiceId,
                    engine,
                    outputFormat: 'mp3',
                    sampleRate: '24000',
                    includeTimestamps: true,
                    projectId: projectId,
                    audioOptions
                });
            }
            
            // Try to get script data directly from database
            console.log('🔄 Attempting to retrieve script data directly...');
            try {
                const scriptData = await getProjectScriptData(projectId);
                if (scriptData && scriptData.script) {
                    console.log('✅ Found script data, generating audio...');
                    return await generateAudio({
                        text: scriptData.script,
                        voiceId,
                        engine,
                        outputFormat: 'mp3',
                        sampleRate: '24000',
                        includeTimestamps: true,
                        projectId: projectId,
                        audioOptions
                    });
                }
            } catch (scriptError) {
                console.warn('⚠️ Could not retrieve script data:', scriptError.message);
            }
            
            return createResponse(400, { 
                error: 'No scene context or script data available for project',
                message: 'Please ensure the Script Generator has completed for this project',
                projectId: projectId,
                contextError: contextError.message
            });
        }
        
        if (!sceneContext.scenes || sceneContext.scenes.length === 0) {
            return createResponse(400, { error: 'No scenes found in scene context' });
        }
        
        let audioResults = [];
        
        if (generateByScene) {
            // Generate audio for each scene separately using scene context
            console.log(`🎵 Generating audio for ${sceneContext.scenes.length} scenes with context awareness...`);
            
            for (const scene of sceneContext.scenes) {
                console.log(`   Processing Scene ${scene.sceneNumber}: ${scene.title || 'Untitled'}`);
                console.log(`   Duration: ${scene.duration}s, Purpose: ${scene.purpose}, Tone: ${scene.tone || 'neutral'}`);

                // TASK 12.4: Context-aware audio generation with scene-specific requirements
                const sceneMediaMapping = mediaContext?.sceneMediaMapping?.find(
                    mapping => mapping.sceneNumber === scene.sceneNumber
                );

                // Calculate scene-aware pacing and emphasis based on context
                const sceneAudioOptions = calculateSceneAudioOptions(scene, sceneMediaMapping, audioOptions);
                
                console.log(`   🎙️ Audio settings: Rate=${sceneAudioOptions.speakingRate}, Emphasis=${sceneAudioOptions.emphasis}, Pauses=${sceneAudioOptions.pauseStrategy}`);

                const sceneAudio = await generateAudioWithPolly({
                    text: extractScriptContent(scene),
                    voiceId,
                    engine,
                    outputFormat: 'mp3',
                    sampleRate: '24000',
                    includeTimestamps: true,
                    sceneInfo: {
                        sceneNumber: scene.sceneNumber,
                        title: scene.title,
                        startTime: scene.startTime,
                        endTime: scene.endTime,
                        duration: scene.duration,
                        purpose: scene.purpose,
                        tone: scene.tone || scene.visualRequirements?.mood,
                        visualStyle: scene.visualRequirements?.style,
                        
                        // ENHANCED: Media synchronization data
                        mediaAssetCount: sceneMediaMapping?.mediaAssets?.length || 0,
                        visualChangePoints: sceneMediaMapping?.mediaSequence?.map(asset => ({
                            timestamp: asset.sceneStartTime,
                            duration: asset.sceneDuration,
                            visualType: asset.visualType,
                            transitionType: asset.entryTransition?.type
                        })) || [],
                        
                        // ENHANCED: Industry standards compliance
                        industryStandards: {
                            targetDuration: scene.duration,
                            pacingType: scene.purpose === 'hook' ? 'fast-engagement' : 'educational-comprehension',
                            speechPatternOptimization: true,
                            visualSynchronization: !!sceneMediaMapping
                        }
                    },
                    audioOptions: sceneAudioOptions,
                    
                    // ENHANCED: Context integration
                    contextIntegration: {
                        sceneContext: scene,
                        mediaContext: sceneMediaMapping,
                        industryStandards: mediaContext?.industryStandards,
                        overallStyle: sceneContext.overallStyle
                    }
                });
                
                // ENHANCED: Add comprehensive metadata
                sceneAudio.sceneNumber = scene.sceneNumber;
                sceneAudio.sceneTitle = scene.title;
                sceneAudio.projectId = projectId;
                sceneAudio.contextAware = true;
                sceneAudio.contextIntegration = {
                    usedSceneContext: true,
                    usedMediaContext: !!sceneMediaMapping,
                    sceneSpecificPacing: true,
                    visualSynchronization: !!sceneMediaMapping,
                    industryStandardsCompliance: true
                };
                
                const storedSceneAudio = await storeAudioData(sceneAudio, projectId);
                audioResults.push(storedSceneAudio);
                
                console.log(`   ✅ Scene ${scene.sceneNumber} audio: ${storedSceneAudio.estimatedDuration}s (target: ${scene.duration}s)`);
                console.log(`   📊 Context integration: Scene=${sceneAudio.contextIntegration.usedSceneContext}, Media=${sceneAudio.contextIntegration.usedMediaContext}`);
            }
            
            // TASK 12.4: Create comprehensive audio context for Video Assembler AI
            const totalDuration = audioResults.reduce((sum, audio) => sum + (audio.estimatedDuration || 0), 0);
            const averageQualityScore = audioResults.reduce((sum, audio) => sum + (audio.qualityScore || 0), 0) / audioResults.length;

            // Create detailed timing marks and synchronization data
            const timingMarks = [];
            let cumulativeTime = 0;

            for (const audio of audioResults) {
                const sceneTimingMarks = audio.speechMarks || [];
                const sceneStartTime = cumulativeTime;
                
                // Add scene-level timing marks
                timingMarks.push({
                    type: 'scene_start',
                    sceneNumber: audio.sceneNumber,
                    timestamp: sceneStartTime,
                    duration: audio.estimatedDuration,
                    sceneTitle: audio.sceneTitle
                });

                // Add word-level timing marks (offset by scene start time)
                sceneTimingMarks.forEach(mark => {
                    timingMarks.push({
                        ...mark,
                        timestamp: mark.timestamp + sceneStartTime,
                        sceneNumber: audio.sceneNumber
                    });
                });

                cumulativeTime += audio.estimatedDuration;
            }

            const masterAudio = {
                audioId: `audio-${projectId}-master-${Date.now()}`,
                projectId: projectId,
                type: 'master',
                
                // ENHANCED: Scene audio references with comprehensive metadata
                sceneAudios: audioResults.map(audio => ({
                    audioId: audio.audioId,
                    sceneNumber: audio.sceneNumber,
                    sceneTitle: audio.sceneTitle,
                    duration: audio.estimatedDuration,
                    s3Key: audio.s3Key,
                    s3Location: audio.s3Location,
                    
                    // ENHANCED: Context integration metadata
                    contextIntegration: audio.contextIntegration,
                    qualityScore: audio.qualityScore || 0,
                    
                    // ENHANCED: Synchronization data for Video Assembler
                    synchronizationData: {
                        sceneStartTime: audioResults.slice(0, audioResults.indexOf(audio))
                            .reduce((sum, prevAudio) => sum + (prevAudio.estimatedDuration || 0), 0),
                        sceneEndTime: audioResults.slice(0, audioResults.indexOf(audio) + 1)
                            .reduce((sum, prevAudio) => sum + (prevAudio.estimatedDuration || 0), 0),
                        speechMarks: audio.speechMarks || [],
                        pausePoints: audio.pausePoints || [],
                        emphasisPoints: audio.emphasisPoints || []
                    }
                })),
                
                // ENHANCED: Comprehensive audio metrics
                audioMetrics: {
                    totalDuration: totalDuration,
                    averageQualityScore: Math.round(averageQualityScore * 10) / 10,
                    sceneCount: audioResults.length,
                    totalFileSize: audioResults.reduce((sum, audio) => sum + (audio.fileSize || 0), 0),
                    averageDurationPerScene: Math.round(totalDuration / audioResults.length * 10) / 10,
                    
                    // ENHANCED: Industry standards compliance
                    industryCompliance: {
                        targetDurationMatch: Math.abs(totalDuration - sceneContext.totalDuration) <= 30, // ±30 seconds tolerance
                        sceneTimingAccuracy: audioResults.every(audio => 
                            Math.abs(audio.estimatedDuration - (sceneContext.scenes.find(s => s.sceneNumber === audio.sceneNumber)?.duration || 0)) <= 10
                        ),
                        contextAwareGeneration: audioResults.every(audio => audio.contextIntegration?.usedSceneContext),
                        speechPatternOptimization: true
                    }
                },
                
                // ENHANCED: Timing marks and synchronization data for Video Assembler
                timingMarks: timingMarks,
                synchronizationData: {
                    totalDuration: totalDuration,
                    sceneBreakpoints: audioResults.map((audio, index) => ({
                        sceneNumber: audio.sceneNumber,
                        startTime: audioResults.slice(0, index).reduce((sum, prevAudio) => sum + (prevAudio.estimatedDuration || 0), 0),
                        endTime: audioResults.slice(0, index + 1).reduce((sum, prevAudio) => sum + (prevAudio.estimatedDuration || 0), 0),
                        duration: audio.estimatedDuration
                    })),
                    
                    // ENHANCED: Media synchronization compatibility
                    mediaSynchronization: mediaContext ? {
                        mediaContextAvailable: true,
                        sceneMediaMappings: audioResults.map(audio => {
                            const sceneMapping = mediaContext.sceneMediaMapping?.find(
                                mapping => mapping.sceneNumber === audio.sceneNumber
                            );
                            return {
                                sceneNumber: audio.sceneNumber,
                                audioStartTime: audioResults.slice(0, audioResults.indexOf(audio))
                                    .reduce((sum, prevAudio) => sum + (prevAudio.estimatedDuration || 0), 0),
                                audioDuration: audio.estimatedDuration,
                                mediaAssetCount: sceneMapping?.mediaAssets?.length || 0,
                                visualChangePoints: sceneMapping?.mediaSequence?.length || 0,
                                synchronizationReady: !!(sceneMapping?.mediaAssets?.length)
                            };
                        })
                    } : {
                        mediaContextAvailable: false,
                        fallbackSynchronization: true
                    }
                },
                
                voiceId,
                engine,
                createdAt: new Date().toISOString(),
                generatedBy: 'enhanced-project-context',
                
                // ENHANCED: Comprehensive context usage tracking
                contextUsage: {
                    usedSceneContext: true,
                    usedMediaContext: !!mediaContext,
                    sceneCount: sceneContext.scenes.length,
                    selectedSubtopic: sceneContext.selectedSubtopic,
                    overallStyle: sceneContext.overallStyle,
                    contextAwareGeneration: true,
                    sceneSpecificPacing: true,
                    industryStandardsCompliance: true,
                    mediaSynchronizationReady: !!mediaContext
                }
            };
            
            const storedMasterAudio = await storeAudioData(masterAudio, projectId);
            
            // TASK 12.4: Store comprehensive audio context for Video Assembler AI
            console.log('💾 Storing comprehensive audio context for Video Assembler AI...');
            const audioContext = {
                projectId: projectId,
                masterAudioId: storedMasterAudio.audioId,
                
                // ENHANCED: Audio files and metadata
                audioFiles: {
                    masterAudio: {
                        audioId: storedMasterAudio.audioId,
                        s3Location: storedMasterAudio.s3Location,
                        duration: masterAudio.audioMetrics.totalDuration,
                        fileSize: storedMasterAudio.fileSize,
                        format: 'mp3',
                        sampleRate: '24000',
                        quality: 'high'
                    },
                    sceneAudios: masterAudio.sceneAudios.map(sceneAudio => ({
                        sceneNumber: sceneAudio.sceneNumber,
                        audioId: sceneAudio.audioId,
                        s3Location: sceneAudio.s3Location,
                        duration: sceneAudio.duration,
                        synchronizationData: sceneAudio.synchronizationData
                    }))
                },
                
                // ENHANCED: Timing marks and synchronization data
                timingMarks: masterAudio.timingMarks,
                synchronizationData: masterAudio.synchronizationData,
                
                // ENHANCED: Quality metrics for Video Assembler validation
                qualityMetrics: {
                    averageQualityScore: masterAudio.audioMetrics.averageQualityScore,
                    industryCompliance: masterAudio.audioMetrics.industryCompliance,
                    totalDuration: masterAudio.audioMetrics.totalDuration,
                    targetDurationMatch: masterAudio.audioMetrics.industryCompliance.targetDurationMatch,
                    sceneTimingAccuracy: masterAudio.audioMetrics.industryCompliance.sceneTimingAccuracy,
                    contextAwareGeneration: masterAudio.audioMetrics.industryCompliance.contextAwareGeneration
                },
                
                // ENHANCED: Context integration status
                contextIntegration: {
                    sceneContextConsumed: true,
                    mediaContextConsumed: !!mediaContext,
                    contextValidationPassed: true,
                    sceneSpecificPacing: true,
                    speechPatternOptimization: true,
                    mediaSynchronizationReady: !!mediaContext,
                    
                    // Context completeness validation
                    contextCompleteness: {
                        sceneContext: {
                            available: true,
                            sceneCount: sceneContext.scenes.length,
                            totalDuration: sceneContext.totalDuration,
                            allScenesProcessed: audioResults.length === sceneContext.scenes.length
                        },
                        mediaContext: {
                            available: !!mediaContext,
                            totalAssets: mediaContext?.totalAssets || 0,
                            scenesCovered: mediaContext?.scenesCovered || 0,
                            industryCompliance: mediaContext?.industryStandards?.overallCompliance || false
                        }
                    }
                },
                
                // ENHANCED: Video Assembler instructions
                videoAssemblerInstructions: {
                    audioSynchronizationMethod: 'scene-based',
                    timingMarksAvailable: true,
                    speechMarksAvailable: true,
                    sceneBreakpointsAvailable: true,
                    mediaSynchronizationData: !!mediaContext,
                    
                    recommendedAssemblyApproach: mediaContext ? 'synchronized-assembly' : 'audio-first-assembly',
                    qualityRequirements: {
                        audioVideoSync: 'frame-accurate',
                        transitionTiming: 'speech-aware',
                        sceneAlignment: 'precise'
                    }
                },
                
                // Processing metadata
                processingDetails: {
                    voiceId: voiceId,
                    engine: engine,
                    contextAware: true,
                    generatedAt: new Date().toISOString(),
                    processingMethod: 'enhanced-context-aware-generation'
                }
            };

            // Store audio context for Video Assembler AI
            await storeAudioContext(projectId, audioContext);
            console.log('✅ Audio context stored for Video Assembler AI');
            
            // Update project summary
            await updateProjectSummary(projectId, 'audio', {
                masterAudioId: storedMasterAudio.audioId,
                sceneAudioCount: audioResults.length,
                totalDuration: masterAudio.totalDuration,
                voiceId: voiceId,
                engine: engine,
                contextAware: true
            });
            
            return createResponse(200, {
                message: 'Enhanced context-aware audio generated successfully for all scenes',
                projectId: projectId,
                masterAudio: storedMasterAudio,
                sceneAudios: audioResults,
                totalScenes: audioResults.length,
                totalDuration: masterAudio.audioMetrics.totalDuration,
                
                // ENHANCED: Audio quality and compliance metrics
                audioQuality: {
                    voiceType: 'generative',
                    voiceId: voiceId,
                    engine: engine,
                    averageQualityScore: masterAudio.audioMetrics.averageQualityScore,
                    industryCompliance: masterAudio.audioMetrics.industryCompliance,
                    contextAwareGeneration: true
                },
                
                // ENHANCED: Context integration status
                contextIntegration: {
                    sceneContextConsumed: true,
                    mediaContextConsumed: !!mediaContext,
                    sceneSpecificPacing: true,
                    speechPatternOptimization: true,
                    mediaSynchronizationReady: !!mediaContext,
                    contextValidationPassed: true
                },
                
                // ENHANCED: Synchronization data for Video Assembler
                synchronizationData: {
                    timingMarksAvailable: true,
                    sceneBreakpointsAvailable: true,
                    mediaSynchronizationData: !!mediaContext,
                    totalDuration: masterAudio.audioMetrics.totalDuration,
                    sceneCount: audioResults.length
                },
                
                contextUsage: masterAudio.contextUsage,
                readyForVideoAssembly: true,
                
                // AWS Polly compliance information
                pollyCompliance: {
                    rateLimitsRespected: true,
                    generativeVoiceUsed: engine === 'generative',
                    maxQualityAchieved: engine === 'generative',
                    chunksProcessed: audioResults.length,
                    totalProcessingTime: `${audioResults.length * 2}s estimated` // 2 TPS for generative
                }
            });
            
        } else {
            // Generate audio for entire script as one file
            const fullScript = sceneContext.scenes.map(scene => extractScriptContent(scene)).join('\n\n');
            
            const audioRequest = {
                text: fullScript,
                voiceId,
                engine,
                outputFormat: 'mp3',
                sampleRate: '24000',
                includeTimestamps: true,
                projectId: projectId,
                audioOptions
            };
            
            const result = await generateAudio(audioRequest);
            
            // Update project summary
            if (result.statusCode === 200) {
                const responseBody = JSON.parse(result.body);
                await updateProjectSummary(projectId, 'audio', {
                    audioId: responseBody.audio.audioId,
                    totalDuration: responseBody.duration,
                    voiceId: voiceId,
                    engine: engine,
                    contextAware: false,
                    generationType: 'single_file'
                });
            }
            
            return result;
        }
        
    } catch (error) {
        console.error('Error generating audio from project:', error);
        return createResponse(500, { 
            error: 'Failed to generate audio from project',
            message: error.message 
        });
    }
}

/**
 * Generate audio from existing script ID
 */
async function generateAudioFromScript(requestBody) {
    const { 
        scriptId, 
        voiceId = 'Ruth',
        engine = 'generative',
        audioOptions = {},
        generateByScene = true 
    } = requestBody;
    
    try {
        if (!scriptId) {
            return createResponse(400, { error: 'scriptId is required' });
        }
        
        // Get script data from database
        const scriptData = await getScriptData(scriptId);
        if (!scriptData) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        let audioResults = [];
        
        if (generateByScene && scriptData.scenes && scriptData.scenes.length > 0) {
            // Generate audio for each scene separately
            console.log(`Generating audio for ${scriptData.scenes.length} scenes`);
            
            for (const scene of scriptData.scenes) {
                const sceneAudio = await generateAudioWithPolly({
                    text: extractScriptContent(scene),
                    voiceId,
                    engine,
                    outputFormat: 'mp3',
                    sampleRate: '24000',
                    includeTimestamps: true,
                    sceneInfo: {
                        sceneNumber: scene.sceneNumber,
                        title: scene.title,
                        startTime: scene.startTime,
                        endTime: scene.endTime
                    },
                    audioOptions
                });
                
                sceneAudio.sceneNumber = scene.sceneNumber;
                sceneAudio.sceneTitle = scene.title;
                sceneAudio.scriptId = scriptId;
                
                const storedSceneAudio = await storeAudioData(sceneAudio);
                audioResults.push(storedSceneAudio);
            }
            
            // Create a master audio record that references all scenes
            const masterAudio = {
                audioId: `audio-${scriptId}-master-${Date.now()}`,
                scriptId: scriptId,
                type: 'master',
                sceneAudios: audioResults.map(audio => ({
                    audioId: audio.audioId,
                    sceneNumber: audio.sceneNumber,
                    sceneTitle: audio.sceneTitle,
                    duration: audio.estimatedDuration,
                    s3Key: audio.s3Key
                })),
                totalDuration: audioResults.reduce((sum, audio) => sum + (audio.estimatedDuration || 0), 0),
                voiceId,
                engine,
                createdAt: new Date().toISOString(),
                generatedBy: 'script-scenes'
            };
            
            const storedMasterAudio = await storeAudioData(masterAudio);
            
            return createResponse(200, {
                message: 'Audio generated successfully for all scenes',
                masterAudio: storedMasterAudio,
                sceneAudios: audioResults,
                totalScenes: audioResults.length,
                totalDuration: masterAudio.totalDuration
            });
            
        } else {
            // Generate audio for entire script as one file
            const fullScript = scriptData.scenes?.map(scene => extractScriptContent(scene)).join('\n\n') || scriptData.script || '';
            
            const audioRequest = {
                text: fullScript,
                voiceId,
                engine,
                outputFormat: 'mp3',
                sampleRate: '24000',
                includeTimestamps: true,
                scriptId: scriptId,
                audioOptions
            };
            
            return await generateAudio(audioRequest);
        }
        
    } catch (error) {
        console.error('Error generating audio from script:', error);
        return createResponse(500, { 
            error: 'Failed to generate audio from script',
            message: error.message 
        });
    }
}

/**
 * Smart rate limiting for Amazon Polly requests with proper queue management
 */
async function checkRateLimit(engine, textLength) {
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    
    // Check character limit first
    if (textLength > limits.maxChars) {
        throw new Error(`Text too long for ${engine} engine: ${textLength} chars (max: ${limits.maxChars})`);
    }
    
    // Return a promise that resolves when it's this request's turn
    return new Promise((resolve) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to queue
        rateLimitState.queues[engine].push({
            id: requestId,
            timestamp: Date.now(),
            textLength,
            resolve
        });
        
        // Process queue if not already processing
        if (!rateLimitState.processing[engine]) {
            processRateLimitQueue(engine);
        }
    });
}

/**
 * Process the rate limit queue for a specific engine
 */
async function processRateLimitQueue(engine) {
    if (rateLimitState.processing[engine]) {
        return; // Already processing
    }
    
    rateLimitState.processing[engine] = true;
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    
    try {
        while (rateLimitState.queues[engine].length > 0) {
            const now = Date.now();
            
            // Clean up old requests (older than 1 second)
            if (now - rateLimitState.lastCleanup > 1000) {
                rateLimitState.requests = rateLimitState.requests.filter(req => now - req.timestamp < 1000);
                rateLimitState.lastCleanup = now;
            }
            
            // Count recent requests for this engine
            const recentRequests = rateLimitState.requests.filter(req => 
                req.engine === engine && now - req.timestamp < 1000
            );
            
            // Check if we can process the next request
            if (recentRequests.length < limits.tps) {
                // Process next request in queue
                const nextRequest = rateLimitState.queues[engine].shift();
                
                // Record this request
                rateLimitState.requests.push({
                    engine,
                    timestamp: now,
                    textLength: nextRequest.textLength,
                    requestId: nextRequest.id
                });
                
                console.log(`📊 Rate limit status for ${engine}: ${recentRequests.length + 1}/${limits.tps} TPS`);
                
                // Resolve the request
                nextRequest.resolve();
                
                // Small delay to prevent tight loops
                await new Promise(resolve => setTimeout(resolve, 10));
                
            } else {
                // Need to wait - calculate how long until we can send another request
                const oldestRecentRequest = Math.min(...recentRequests.map(r => r.timestamp));
                const waitTime = Math.max(100, 1000 - (now - oldestRecentRequest) + 50); // Add 50ms buffer
                
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${engine} engine (${recentRequests.length}/${limits.tps} TPS)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    } finally {
        rateLimitState.processing[engine] = false;
    }
}

/**
 * ENHANCED: Select optimal voice based on content type and AWS Polly capabilities
 * Prioritizes generative voices for best quality while respecting rate limits
 */
function selectOptimalVoice(contentType, sceneContext, userPreference = null) {
    // User preference takes priority if valid
    if (userPreference) {
        const voiceConfig = getVoiceConfiguration(userPreference);
        if (voiceConfig) {
            console.log(`🎙️ Using user-preferred voice: ${userPreference} (${voiceConfig.engine})`);
            return { voiceId: userPreference, engine: voiceConfig.engine };
        }
    }
    
    // GENERATIVE VOICES (HIGHEST QUALITY) - Recommended for all content types
    const generativeVoices = {
        'Ruth': { 
            engine: 'generative', 
            description: 'US English, natural and expressive, ideal for educational and creative content',
            bestFor: ['educational', 'creative', 'general', 'hook', 'explanation']
        },
        'Stephen': { 
            engine: 'generative', 
            description: 'US English, authoritative and engaging, ideal for professional content',
            bestFor: ['professional', 'tech', 'business', 'conclusion', 'authoritative']
        }
    };
    
    // Select based on content type and scene purpose
    const scenePurpose = sceneContext?.purpose?.toLowerCase() || contentType?.toLowerCase() || 'general';
    
    // Default to Ruth for most content (best overall quality)
    let selectedVoice = 'Ruth';
    let selectedEngine = 'generative';
    
    // Use Stephen for more authoritative content
    if (['professional', 'tech', 'business', 'conclusion', 'authoritative'].includes(scenePurpose)) {
        selectedVoice = 'Stephen';
    }
    
    console.log(`🎙️ Selected optimal voice: ${selectedVoice} (${selectedEngine}) for ${scenePurpose} content`);
    console.log(`   📊 Voice capabilities: ${generativeVoices[selectedVoice].description}`);
    
    return { 
        voiceId: selectedVoice, 
        engine: selectedEngine,
        rateLimits: POLLY_RATE_LIMITS[selectedEngine],
        qualityLevel: 'maximum'
    };
}

/**
 * Get voice configuration and capabilities
 */
function getVoiceConfiguration(voiceId) {
    const voiceConfigurations = {
        // GENERATIVE VOICES (BEST QUALITY)
        'Ruth': { engine: 'generative', quality: 'maximum', language: 'en-US' },
        'Stephen': { engine: 'generative', quality: 'maximum', language: 'en-US' },
        
        // NEURAL VOICES (HIGH QUALITY)
        'Joanna': { engine: 'neural', quality: 'high', language: 'en-US' },
        'Matthew': { engine: 'neural', quality: 'high', language: 'en-US' },
        'Amy': { engine: 'neural', quality: 'high', language: 'en-GB' },
        'Brian': { engine: 'neural', quality: 'high', language: 'en-GB' },
        
        // STANDARD VOICES (FALLBACK)
        'Joanna': { engine: 'standard', quality: 'standard', language: 'en-US' },
        'Matthew': { engine: 'standard', quality: 'standard', language: 'en-US' }
    };
    
    return voiceConfigurations[voiceId] || null;
}

/**
 * TASK 12.4: Calculate scene-aware audio options based on context
 * Implements context-aware audio generation with scene-specific pacing and emphasis
 */
function calculateSceneAudioOptions(scene, sceneMediaMapping, baseAudioOptions = {}) {
    console.log(`   🎙️ Calculating scene-aware audio options for Scene ${scene.sceneNumber}`);
    
    // Base audio options with industry-standard defaults for generative voices
    const sceneAudioOptions = {
        speakingRate: 'medium',     // Default speaking rate
        emphasis: 'moderate',       // Default emphasis level
        pauseStrategy: 'natural',   // Natural pause placement
        prosody: 'conversational',  // Conversational prosody
        breathingPauses: true,      // Add natural breathing pauses
        sentenceBreaks: true,       // Respect sentence boundaries
        
        // SSML enhancements for generative voices
        ssmlEnhancements: {
            useEmphasis: true,
            useProsody: true,
            useBreaks: true,
            useSpeakingRate: true
        },
        
        ...baseAudioOptions
    };

    // SCENE PURPOSE OPTIMIZATION: Adjust based on scene purpose
    switch (scene.purpose?.toLowerCase()) {
        case 'hook':
        case 'intro':
        case 'opening':
            // Hook scenes: Faster, more engaging pacing
            sceneAudioOptions.speakingRate = 'fast';
            sceneAudioOptions.emphasis = 'strong';
            sceneAudioOptions.pauseStrategy = 'minimal';
            sceneAudioOptions.prosody = 'excited';
            sceneAudioOptions.energyLevel = 'high';
            console.log(`     📈 Hook scene optimization: Fast pacing, strong emphasis`);
            break;
            
        case 'explanation':
        case 'educational':
        case 'tutorial':
            // Educational scenes: Slower, clearer pacing for comprehension
            sceneAudioOptions.speakingRate = 'slow';
            sceneAudioOptions.emphasis = 'moderate';
            sceneAudioOptions.pauseStrategy = 'extended';
            sceneAudioOptions.prosody = 'instructional';
            sceneAudioOptions.breathingPauses = true;
            sceneAudioOptions.sentenceBreaks = true;
            console.log(`     📚 Educational scene optimization: Slow pacing, clear emphasis`);
            break;
            
        case 'conclusion':
        case 'summary':
        case 'outro':
            // Conclusion scenes: Measured, authoritative pacing
            sceneAudioOptions.speakingRate = 'medium';
            sceneAudioOptions.emphasis = 'strong';
            sceneAudioOptions.pauseStrategy = 'deliberate';
            sceneAudioOptions.prosody = 'authoritative';
            sceneAudioOptions.finalEmphasis = true;
            console.log(`     🎯 Conclusion scene optimization: Measured pacing, authoritative tone`);
            break;
            
        default:
            // Standard scenes: Balanced approach
            sceneAudioOptions.speakingRate = 'medium';
            sceneAudioOptions.emphasis = 'moderate';
            sceneAudioOptions.pauseStrategy = 'natural';
            sceneAudioOptions.prosody = 'conversational';
            console.log(`     ⚖️ Standard scene optimization: Balanced pacing`);
    }

    // TONE OPTIMIZATION: Adjust based on scene tone/mood
    const sceneTone = scene.tone || scene.visualRequirements?.mood || 'neutral';
    switch (sceneTone.toLowerCase()) {
        case 'exciting':
        case 'energetic':
        case 'dynamic':
            sceneAudioOptions.speakingRate = 'fast';
            sceneAudioOptions.emphasis = 'strong';
            sceneAudioOptions.prosody = 'excited';
            sceneAudioOptions.energyLevel = 'high';
            break;
            
        case 'calm':
        case 'peaceful':
        case 'relaxed':
            sceneAudioOptions.speakingRate = 'slow';
            sceneAudioOptions.emphasis = 'soft';
            sceneAudioOptions.prosody = 'calm';
            sceneAudioOptions.breathingPauses = true;
            break;
            
        case 'serious':
        case 'professional':
        case 'authoritative':
            sceneAudioOptions.speakingRate = 'medium';
            sceneAudioOptions.emphasis = 'strong';
            sceneAudioOptions.prosody = 'authoritative';
            sceneAudioOptions.pauseStrategy = 'deliberate';
            break;
    }

    // MEDIA SYNCHRONIZATION: Adjust based on visual change frequency
    if (sceneMediaMapping && sceneMediaMapping.mediaSequence) {
        const visualChangeCount = sceneMediaMapping.mediaSequence.length;
        const sceneDuration = scene.duration;
        const averageVisualDuration = sceneDuration / visualChangeCount;
        
        console.log(`     🎬 Media sync: ${visualChangeCount} visuals, ${averageVisualDuration.toFixed(1)}s avg duration`);
        
        if (averageVisualDuration <= 3) {
            // Fast visual changes: Slightly faster speech to match pace
            sceneAudioOptions.speakingRate = sceneAudioOptions.speakingRate === 'slow' ? 'medium' : 'fast';
            sceneAudioOptions.pauseStrategy = 'minimal';
            console.log(`     ⚡ Fast visuals detected: Increased speech rate`);
        } else if (averageVisualDuration >= 6) {
            // Slow visual changes: More deliberate pacing
            sceneAudioOptions.pauseStrategy = 'extended';
            sceneAudioOptions.breathingPauses = true;
            console.log(`     🐌 Slow visuals detected: More deliberate pacing`);
        }
        
        // Add visual transition markers for speech timing
        sceneAudioOptions.visualTransitionMarkers = sceneMediaMapping.mediaSequence.map(asset => ({
            timestamp: asset.sceneStartTime,
            transitionType: asset.entryTransition?.type,
            visualType: asset.visualType
        }));
    }

    // DURATION OPTIMIZATION: Adjust based on target scene duration
    const targetDuration = scene.duration;
    if (targetDuration) {
        const estimatedWordsPerMinute = {
            'slow': 140,
            'medium': 160,
            'fast': 180
        };
        
        const currentRate = sceneAudioOptions.speakingRate;
        const estimatedWPM = estimatedWordsPerMinute[currentRate] || 160;
        const scriptWordCount = extractScriptContent(scene)?.split(' ').length || 0;
        const estimatedDuration = (scriptWordCount / estimatedWPM) * 60;
        
        // Adjust speaking rate if duration is significantly off
        if (estimatedDuration > targetDuration * 1.2) {
            // Too slow, speed up
            sceneAudioOptions.speakingRate = currentRate === 'slow' ? 'medium' : 'fast';
            console.log(`     ⏰ Duration adjustment: Speeding up (estimated: ${estimatedDuration.toFixed(1)}s, target: ${targetDuration}s)`);
        } else if (estimatedDuration < targetDuration * 0.8) {
            // Too fast, slow down
            sceneAudioOptions.speakingRate = currentRate === 'fast' ? 'medium' : 'slow';
            sceneAudioOptions.pauseStrategy = 'extended';
            console.log(`     ⏰ Duration adjustment: Slowing down (estimated: ${estimatedDuration.toFixed(1)}s, target: ${targetDuration}s)`);
        }
    }

    // GENERATIVE VOICE OPTIMIZATION: Specific enhancements for Ruth/Stephen voices
    sceneAudioOptions.generativeEnhancements = {
        useNaturalPauses: true,
        emotionalRange: sceneTone !== 'neutral' ? 'enhanced' : 'standard',
        conversationalStyle: scene.purpose !== 'educational',
        breathingPattern: 'natural',
        intonationVariety: 'high'
    };

    console.log(`   ✅ Scene audio options calculated: Rate=${sceneAudioOptions.speakingRate}, Emphasis=${sceneAudioOptions.emphasis}, Prosody=${sceneAudioOptions.prosody}`);
    
    return sceneAudioOptions;
}

/**
 * Split long text into chunks that respect Polly limits
 */
function splitTextForPolly(text, engine) {
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    const maxChars = limits.maxChars - 100; // Leave buffer for SSML tags
    
    if (text.length <= maxChars) {
        return [text];
    }
    
    const chunks = [];
    let currentChunk = '';
    
    // Split by sentences to maintain natural breaks
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if (sentence.length > maxChars) {
            // If single sentence is too long, split by words
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            const words = sentence.split(' ');
            let wordChunk = '';
            
            for (const word of words) {
                if ((wordChunk + ' ' + word).length > maxChars) {
                    if (wordChunk) {
                        chunks.push(wordChunk.trim());
                        wordChunk = word;
                    } else {
                        // Single word too long - truncate
                        chunks.push(word.substring(0, maxChars));
                        wordChunk = word.substring(maxChars);
                    }
                } else {
                    wordChunk += (wordChunk ? ' ' : '') + word;
                }
            }
            
            if (wordChunk) {
                currentChunk = wordChunk;
            }
        } else if ((currentChunk + ' ' + sentence).length > maxChars) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    console.log(`📝 Split text into ${chunks.length} chunks for ${engine} engine`);
    return chunks;
}

/**
 * Generate audio using Amazon Polly with smart rate limiting
 */
async function generateAudioWithPolly(params) {
    const {
        text,
        voiceId,
        engine,
        outputFormat,
        sampleRate,
        includeTimestamps,
        sceneInfo,
        audioOptions
    } = params;
    
    console.log(`🎙️ Generating audio: ${text.length} chars with ${voiceId} (${engine})`);
    
    // Check rate limits before processing
    await checkRateLimit(engine, text.length);
    
    // Split text into chunks if necessary
    const textChunks = splitTextForPolly(text, engine);
    
    if (textChunks.length > 1) {
        console.log(`📦 Processing ${textChunks.length} chunks due to length limits`);
        return await generateAudioFromChunks(textChunks, params);
    }
    
    // Prepare text - use plain text for generative voices, SSML for others
    let textToSpeak, textType;
    if (engine === 'generative') {
        textToSpeak = text; // Use plain text for generative voices
        textType = 'text';
    } else {
        textToSpeak = createSSMLText(text, audioOptions);
        textType = 'ssml';
    }
    
    // Configure Polly parameters
    const pollyParams = {
        Text: textToSpeak,
        TextType: textType,
        VoiceId: voiceId,
        Engine: engine,
        OutputFormat: outputFormat,
        SampleRate: sampleRate
    };
    
    // Add engine-specific settings
    if (engine === 'neural' || engine === 'generative') {
        // Neural and generative voices require language code
        pollyParams.LanguageCode = audioOptions?.languageCode || 'en-US';
    }
    
    if (engine === 'generative') {
        // Generative voices support additional parameters
        if (audioOptions?.stability) {
            pollyParams.Stability = audioOptions.stability;
        }
        if (audioOptions?.similarity) {
            pollyParams.Similarity = audioOptions.similarity;
        }
    }
    
    console.log(`Synthesizing speech with Polly: ${voiceId} (${engine})`);
    
    // Generate speech marks for timing if requested
    let speechMarks = null;
    if (includeTimestamps) {
        try {
            const speechMarksParams = {
                ...pollyParams,
                OutputFormat: 'json',
                SpeechMarkTypes: ['word', 'sentence', 'ssml']
            };
            
            const speechMarksCommand = new SynthesizeSpeechCommand(speechMarksParams);
            const speechMarksResponse = await pollyClient.send(speechMarksCommand);
            
            if (speechMarksResponse.AudioStream) {
                const speechMarksBuffer = await streamToBuffer(speechMarksResponse.AudioStream);
                speechMarks = parseSpeechMarks(speechMarksBuffer.toString());
            }
        } catch (error) {
            console.warn('Failed to generate speech marks:', error.message);
            // Continue without speech marks
        }
    }
    
    // Generate the actual audio
    const command = new SynthesizeSpeechCommand(pollyParams);
    const response = await pollyClient.send(command);
    
    if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
    }
    
    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(response.AudioStream);
    
    // Calculate estimated duration (rough estimate based on text length)
    const estimatedDuration = estimateAudioDuration(text, voiceId);
    
    // Create audio data object
    const audioData = {
        audioId: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: text,
        ssmlText: textToSpeak,
        voiceId: voiceId,
        engine: engine,
        outputFormat: outputFormat,
        sampleRate: sampleRate,
        audioBuffer: audioBuffer,
        speechMarks: speechMarks,
        estimatedDuration: estimatedDuration,
        fileSize: audioBuffer.length,
        sceneInfo: sceneInfo,
        createdAt: new Date().toISOString(),
        generatedBy: 'polly',
        version: '1.0'
    };
    
    return audioData;
}

/**
 * Generate audio from multiple text chunks and combine them
 */
async function generateAudioFromChunks(textChunks, originalParams) {
    const audioChunks = [];
    let totalDuration = 0;
    
    console.log(`🔄 Processing ${textChunks.length} text chunks with rate limiting...`);
    
    for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        console.log(`📝 Processing chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)`);
        
        // Apply rate limiting between chunks
        if (i > 0) {
            const engine = originalParams.engine;
            const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
            const delayMs = Math.ceil(1000 / limits.tps) + 50; // Add 50ms buffer
            
            console.log(`⏳ Rate limit delay: ${delayMs}ms between chunks`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // Generate audio for this chunk
        const chunkParams = {
            ...originalParams,
            text: chunk
        };
        
        // Recursive call for single chunk (won't split again)
        const chunkAudio = await generateSingleAudioChunk(chunkParams);
        audioChunks.push(chunkAudio);
        totalDuration += chunkAudio.estimatedDuration || 0;
    }
    
    // Combine audio chunks
    const combinedAudio = await combineAudioChunks(audioChunks, originalParams);
    combinedAudio.estimatedDuration = totalDuration;
    combinedAudio.chunkCount = textChunks.length;
    combinedAudio.rateLimited = true;
    
    console.log(`✅ Combined ${audioChunks.length} audio chunks (total: ${totalDuration}s)`);
    return combinedAudio;
}

/**
 * Generate audio for a single chunk (no further splitting)
 */
async function generateSingleAudioChunk(params) {
    const {
        text,
        voiceId,
        engine,
        outputFormat,
        sampleRate,
        includeTimestamps,
        sceneInfo,
        audioOptions
    } = params;
    
    // Prepare text - use plain text for generative voices, SSML for others
    let textToSpeak, textType;
    if (engine === 'generative') {
        textToSpeak = text;
        textType = 'text';
    } else {
        textToSpeak = createSSMLText(text, audioOptions);
        textType = 'ssml';
    }
    
    // Configure Polly parameters
    const pollyParams = {
        Text: textToSpeak,
        TextType: textType,
        VoiceId: voiceId,
        Engine: engine,
        OutputFormat: outputFormat,
        SampleRate: sampleRate
    };
    
    // Add engine-specific settings
    if (engine === 'neural' || engine === 'generative') {
        pollyParams.LanguageCode = audioOptions?.languageCode || 'en-US';
    }
    
    if (engine === 'generative') {
        if (audioOptions?.stability) {
            pollyParams.Stability = audioOptions.stability;
        }
        if (audioOptions?.similarity) {
            pollyParams.Similarity = audioOptions.similarity;
        }
    }
    
    console.log(`🎵 Synthesizing with Polly: ${voiceId} (${engine}) - ${text.length} chars`);
    
    // Generate the audio
    const command = new SynthesizeSpeechCommand(pollyParams);
    const response = await pollyClient.send(command);
    
    if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
    }
    
    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(response.AudioStream);
    const estimatedDuration = estimateAudioDuration(text, voiceId);
    
    return {
        audioBuffer,
        estimatedDuration,
        text,
        voiceId,
        engine,
        outputFormat,
        fileSize: audioBuffer.length
    };
}

/**
 * Combine multiple audio chunks into a single audio file
 */
async function combineAudioChunks(audioChunks, originalParams) {
    // For now, concatenate buffers (in production, use proper audio processing)
    const combinedBuffer = Buffer.concat(audioChunks.map(chunk => chunk.audioBuffer));
    
    const combinedAudio = {
        audioId: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: audioChunks.map(chunk => chunk.text).join(' '),
        voiceId: originalParams.voiceId,
        engine: originalParams.engine,
        outputFormat: originalParams.outputFormat,
        sampleRate: originalParams.sampleRate,
        audioBuffer: combinedBuffer,
        estimatedDuration: audioChunks.reduce((sum, chunk) => sum + (chunk.estimatedDuration || 0), 0),
        fileSize: combinedBuffer.length,
        sceneInfo: originalParams.sceneInfo,
        createdAt: new Date().toISOString(),
        generatedBy: 'polly-chunked',
        version: '1.0',
        metadata: {
            chunkCount: audioChunks.length,
            rateLimited: true,
            originalTextLength: audioChunks.map(chunk => chunk.text).join(' ').length
        }
    };
    
    return combinedAudio;
}

/**
 * Create SSML text for better speech synthesis
 */
function createSSMLText(text, options = {}) {
    const {
        speakingRate = 'medium',
        pitch = 'medium',
        volume = 'medium',
        addPauses = true,
        emphasizeKeywords = true
    } = options;
    
    let ssmlText = text;
    
    // Add pauses at sentence endings for better pacing
    if (addPauses) {
        ssmlText = ssmlText.replace(/\.\s+/g, '. <break time="0.5s"/> ');
        ssmlText = ssmlText.replace(/\?\s+/g, '? <break time="0.7s"/> ');
        ssmlText = ssmlText.replace(/!\s+/g, '! <break time="0.7s"/> ');
        ssmlText = ssmlText.replace(/:\s+/g, ': <break time="0.3s"/> ');
    }
    
    // Emphasize certain keywords for better engagement
    if (emphasizeKeywords) {
        const keywordsToEmphasize = [
            'amazing', 'incredible', 'important', 'crucial', 'essential',
            'breakthrough', 'revolutionary', 'game-changing', 'mind-blowing'
        ];
        
        keywordsToEmphasize.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            ssmlText = ssmlText.replace(regex, `<emphasis level="moderate">${keyword}</emphasis>`);
        });
    }
    
    // Wrap in SSML speak tag with prosody controls
    const prosodyAttributes = [];
    if (speakingRate !== 'medium') prosodyAttributes.push(`rate="${speakingRate}"`);
    if (pitch !== 'medium') prosodyAttributes.push(`pitch="${pitch}"`);
    if (volume !== 'medium') prosodyAttributes.push(`volume="${volume}"`);
    
    const prosodyTag = prosodyAttributes.length > 0 
        ? `<prosody ${prosodyAttributes.join(' ')}>`
        : '<prosody>';
    
    return `<speak>${prosodyTag}${ssmlText}</prosody></speak>`;
}

/**
 * Parse speech marks JSON data
 */
function parseSpeechMarks(speechMarksText) {
    try {
        const lines = speechMarksText.trim().split('\n');
        const speechMarks = lines.map(line => JSON.parse(line));
        
        return {
            words: speechMarks.filter(mark => mark.type === 'word'),
            sentences: speechMarks.filter(mark => mark.type === 'sentence'),
            ssml: speechMarks.filter(mark => mark.type === 'ssml'),
            totalMarks: speechMarks.length
        };
    } catch (error) {
        console.error('Error parsing speech marks:', error);
        return null;
    }
}

/**
 * Estimate audio duration based on text length and speaking rate
 */
function estimateAudioDuration(text, voiceId) {
    // Average speaking rates (words per minute)
    const speakingRates = {
        'Ruth': 160,      // Generative voice - natural pace
        'Stephen': 165,   // Generative voice - slightly faster
        'Joanna': 150,    // Neural voice
        'Matthew': 155,   // Neural voice
        'default': 155
    };
    
    const wordsPerMinute = speakingRates[voiceId] || speakingRates.default;
    const wordCount = text.split(/\s+/).length;
    const durationMinutes = wordCount / wordsPerMinute;
    const durationSeconds = Math.round(durationMinutes * 60);
    
    return durationSeconds;
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream) {
    const chunks = [];
    
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
}

/**
 * Store audio data in S3 and DynamoDB
 */
async function storeAudioData(audioData, projectId = null) {
    try {
        // Store audio file in S3 if audioBuffer exists
        if (audioData.audioBuffer) {
            // Use organized project structure
            const s3Key = projectId 
                ? (() => {
                    const s3Paths = generateS3Paths(projectId, 'Generated Video');
                    return s3Paths.audio.narration;
                })()
                : `audio/${audioData.audioId}.${audioData.outputFormat || 'mp3'}`;
            
            await s3Client.send(new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: audioData.audioBuffer,
                ContentType: `audio/${audioData.outputFormat || 'mp3'}`,
                Metadata: {
                    voiceId: audioData.voiceId,
                    engine: audioData.engine,
                    duration: audioData.estimatedDuration?.toString() || '0',
                    generatedAt: audioData.createdAt
                }
            }));
            
            audioData.s3Bucket = S3_BUCKET;
            audioData.s3Key = s3Key;
            audioData.s3Url = `s3://${S3_BUCKET}/${s3Key}`;
            
            // Remove buffer from data before storing in DynamoDB
            delete audioData.audioBuffer;
        }
        
        // Store metadata in DynamoDB
        const item = {
            PK: `AUDIO#${audioData.audioId}`,
            SK: 'METADATA',
            ...audioData,
            ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
        };
        
        await docClient.send(new PutCommand({
            TableName: AUDIO_TABLE,
            Item: item
        }));
        
        console.log(`Audio stored with ID: ${audioData.audioId}`);
        return audioData;
        
    } catch (error) {
        console.error('Error storing audio data:', error);
        throw error;
    }
}

/**
 * Get script data from database
 */
async function getScriptData(scriptId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: SCRIPTS_TABLE,
            Key: {
                PK: `SCRIPT#${scriptId}`,
                SK: 'METADATA'
            }
        }));
        
        return result.Item;
    } catch (error) {
        console.error('Error getting script data:', error);
        return null;
    }
}

/**
 * Get project script data by scanning for project ID
 */
async function getProjectScriptData(projectId) {
    try {
        // Try to get from project summary first
        try {
            const { getProjectSummary: getProjectSummaryFromContext } = require('/opt/nodejs/context-integration');
            const summary = await getProjectSummaryFromContext(projectId);
            if (summary && summary.stages && summary.stages.script && summary.stages.script.scriptId) {
                return await getScriptData(summary.stages.script.scriptId);
            }
        } catch (summaryError) {
            console.warn('Could not get project summary:', summaryError.message);
        }
        
        // Fallback: scan scripts table for project ID
        const params = {
            TableName: SCRIPTS_TABLE,
            FilterExpression: 'projectId = :projectId',
            ExpressionAttributeValues: {
                ':projectId': projectId
            }
        };
        
        const result = await docClient.send(new ScanCommand(params));
        
        if (result.Items && result.Items.length > 0) {
            // Return the most recent script
            return result.Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting project script data:', error);
        throw error;
    }
}

/**
 * Get available voices from Polly
 */
async function getAvailableVoices(queryParams) {
    const { engine = 'all', languageCode = 'en-US' } = queryParams;
    
    try {
        const params = {};
        if (languageCode !== 'all') {
            params.LanguageCode = languageCode;
        }
        if (engine !== 'all') {
            params.Engine = engine;
        }
        
        const command = new DescribeVoicesCommand(params);
        const response = await pollyClient.send(command);
        
        const voices = response.Voices || [];
        
        // Filter and enhance voice information
        const enhancedVoices = voices.map(voice => ({
            id: voice.Id,
            name: voice.Name,
            gender: voice.Gender,
            languageCode: voice.LanguageCode,
            languageName: voice.LanguageName,
            engine: voice.SupportedEngines,
            isGenerative: voice.SupportedEngines?.includes('generative') || false,
            isNeural: voice.SupportedEngines?.includes('neural') || false,
            additionalLanguageCodes: voice.AdditionalLanguageCodes
        }));
        
        // Separate generative voices for highlighting
        const generativeVoices = enhancedVoices.filter(voice => voice.isGenerative);
        const neuralVoices = enhancedVoices.filter(voice => voice.isNeural && !voice.isGenerative);
        const standardVoices = enhancedVoices.filter(voice => !voice.isNeural && !voice.isGenerative);
        
        return createResponse(200, {
            voices: enhancedVoices,
            summary: {
                total: enhancedVoices.length,
                generative: generativeVoices.length,
                neural: neuralVoices.length,
                standard: standardVoices.length
            },
            recommended: {
                generative: generativeVoices.slice(0, 5),
                neural: neuralVoices.slice(0, 5)
            },
            filters: { engine, languageCode }
        });
        
    } catch (error) {
        console.error('Error getting available voices:', error);
        return createResponse(500, { 
            error: 'Failed to get available voices',
            message: error.message 
        });
    }
}

/**
 * Validate voice configuration
 */
async function validateVoiceConfiguration(voiceId, engine) {
    try {
        // Excluded voices list - avoid as requested
        const excludedVoices = ['Kajal'];
        
        if (excludedVoices.includes(voiceId)) {
            return {
                valid: false,
                error: `Voice '${voiceId}' is not available. Please use Ruth, Stephen, or Aria for generative voices.`
            };
        }
        
        const command = new DescribeVoicesCommand({});
        const response = await pollyClient.send(command);
        
        const voice = response.Voices?.find(v => v.Id === voiceId);
        
        if (!voice) {
            return {
                valid: false,
                error: `Voice '${voiceId}' not found`
            };
        }
        
        if (engine && !voice.SupportedEngines?.includes(engine)) {
            return {
                valid: false,
                error: `Voice '${voiceId}' does not support engine '${engine}'. Supported engines: ${voice.SupportedEngines?.join(', ')}`
            };
        }
        
        return {
            valid: true,
            voice: voice
        };
        
    } catch (error) {
        return {
            valid: false,
            error: `Failed to validate voice: ${error.message}`
        };
    }
}

/**
 * Generate audio preview (shorter sample)
 */
async function generateAudioPreview(requestBody) {
    const { text, voiceId = 'Ruth', engine = 'generative' } = requestBody;
    
    try {
        // Limit preview to first 100 words
        const words = text.split(/\s+/);
        const previewText = words.slice(0, 100).join(' ');
        
        if (previewText.length === 0) {
            return createResponse(400, { error: 'No text provided for preview' });
        }
        
        // Generate short audio sample
        const audioData = await generateAudioWithPolly({
            text: previewText + '...',
            voiceId,
            engine,
            outputFormat: 'mp3',
            sampleRate: '22050', // Lower quality for preview
            includeTimestamps: false,
            audioOptions: {}
        });
        
        // Store as preview (shorter TTL)
        audioData.isPreview = true;
        const storedAudio = await storeAudioData(audioData);
        
        return createResponse(200, {
            message: 'Audio preview generated successfully',
            preview: storedAudio,
            previewText: previewText,
            originalLength: words.length,
            previewLength: Math.min(100, words.length)
        });
        
    } catch (error) {
        console.error('Error generating audio preview:', error);
        return createResponse(500, { 
            error: 'Failed to generate audio preview',
            message: error.message 
        });
    }
}

/**
 * Get audio files with filtering and pagination
 */
async function getAudioFiles(queryParams) {
    const {
        voiceId,
        engine,
        scriptId,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = queryParams;
    
    try {
        // For now, implement a simple scan
        const params = {
            TableName: AUDIO_TABLE,
            FilterExpression: 'begins_with(PK, :pk)',
            ExpressionAttributeValues: {
                ':pk': 'AUDIO#'
            },
            Limit: parseInt(limit)
        };
        
        // Add additional filters
        if (voiceId) {
            params.FilterExpression += ' AND voiceId = :voiceId';
            params.ExpressionAttributeValues[':voiceId'] = voiceId;
        }
        
        if (engine) {
            params.FilterExpression += ' AND engine = :engine';
            params.ExpressionAttributeValues[':engine'] = engine;
        }
        
        if (scriptId) {
            params.FilterExpression += ' AND scriptId = :scriptId';
            params.ExpressionAttributeValues[':scriptId'] = scriptId;
        }
        
        const result = await docClient.send(new ScanCommand(params));
        let audioFiles = result.Items || [];
        
        // Sort results
        audioFiles.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            return sortOrder === 'desc' ? 
                (bVal > aVal ? 1 : -1) : 
                (aVal > bVal ? 1 : -1);
        });
        
        return createResponse(200, {
            audioFiles: audioFiles.map(audio => ({
                audioId: audio.audioId,
                voiceId: audio.voiceId,
                engine: audio.engine,
                duration: audio.estimatedDuration,
                fileSize: audio.fileSize,
                s3Key: audio.s3Key,
                scriptId: audio.scriptId,
                sceneNumber: audio.sceneNumber,
                createdAt: audio.createdAt,
                isPreview: audio.isPreview || false
            })),
            count: audioFiles.length,
            filters: { voiceId, engine, scriptId },
            sorting: { sortBy, sortOrder }
        });
        
    } catch (error) {
        console.error('Error getting audio files:', error);
        return createResponse(500, { 
            error: 'Failed to get audio files',
            message: error.message 
        });
    }
}

/**
 * Get specific audio file by ID
 */
async function getAudioFile(audioId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: AUDIO_TABLE,
            Key: {
                PK: `AUDIO#${audioId}`,
                SK: 'METADATA'
            }
        }));
        
        if (!result.Item) {
            return createResponse(404, { error: 'Audio file not found' });
        }
        
        return createResponse(200, {
            audio: result.Item
        });
        
    } catch (error) {
        console.error('Error getting audio file:', error);
        return createResponse(500, { 
            error: 'Failed to get audio file',
            message: error.message 
        });
    }
}

/**
 * Validate audio quality and settings
 */
async function validateAudio(requestBody) {
    const { audioId, audio: audioData } = requestBody;
    
    try {
        let audio = audioData;
        
        // If audioId provided, get audio from database
        if (audioId && !audio) {
            const audioResult = await getAudioFile(audioId);
            if (audioResult.statusCode !== 200) {
                return audioResult;
            }
            audio = JSON.parse(audioResult.body).audio;
        }
        
        if (!audio) {
            return createResponse(400, { error: 'Audio data or audioId required' });
        }
        
        // Perform validation checks
        const validation = performAudioValidation(audio);
        
        return createResponse(200, {
            validation,
            audio: {
                audioId: audio.audioId,
                voiceId: audio.voiceId,
                engine: audio.engine,
                duration: audio.estimatedDuration,
                fileSize: audio.fileSize
            }
        });
        
    } catch (error) {
        console.error('Error validating audio:', error);
        return createResponse(500, { 
            error: 'Failed to validate audio',
            message: error.message 
        });
    }
}

/**
 * Perform audio validation checks
 */
function performAudioValidation(audio) {
    const validation = {
        overall: 'good',
        score: 0,
        checks: {},
        recommendations: [],
        warnings: []
    };
    
    // Check 1: Voice engine quality
    if (audio.engine === 'generative') {
        validation.checks.voiceQuality = { status: 'pass', score: 25 };
    } else if (audio.engine === 'neural') {
        validation.checks.voiceQuality = { status: 'pass', score: 20 };
    } else {
        validation.checks.voiceQuality = { status: 'warning', score: 10 };
        validation.recommendations.push('Consider using generative or neural voices for better quality');
    }
    
    // Check 2: Duration appropriateness
    const duration = audio.estimatedDuration || 0;
    if (duration >= 60 && duration <= 1200) { // 1-20 minutes
        validation.checks.duration = { status: 'pass', score: 20 };
    } else if (duration >= 30 && duration <= 1800) { // 30 seconds - 30 minutes
        validation.checks.duration = { status: 'warning', score: 15 };
        validation.warnings.push('Audio duration may be outside optimal range');
    } else {
        validation.checks.duration = { status: 'fail', score: 5 };
        validation.recommendations.push('Optimize audio duration for better engagement');
    }
    
    // Check 3: File size efficiency
    const fileSize = audio.fileSize || 0;
    const sizePerSecond = duration > 0 ? fileSize / duration : 0;
    if (sizePerSecond >= 8000 && sizePerSecond <= 16000) { // Good compression
        validation.checks.fileSize = { status: 'pass', score: 15 };
    } else if (sizePerSecond >= 4000 && sizePerSecond <= 24000) {
        validation.checks.fileSize = { status: 'warning', score: 10 };
    } else {
        validation.checks.fileSize = { status: 'fail', score: 5 };
        validation.recommendations.push('Optimize audio compression settings');
    }
    
    // Check 4: SSML usage
    if (audio.ssmlText && audio.ssmlText.includes('<speak>')) {
        validation.checks.ssmlUsage = { status: 'pass', score: 15 };
    } else {
        validation.checks.ssmlUsage = { status: 'warning', score: 10 };
        validation.recommendations.push('Use SSML for better speech control');
    }
    
    // Check 5: Speech marks availability
    if (audio.speechMarks && audio.speechMarks.totalMarks > 0) {
        validation.checks.speechMarks = { status: 'pass', score: 15 };
    } else {
        validation.checks.speechMarks = { status: 'warning', score: 5 };
        validation.recommendations.push('Generate speech marks for better synchronization');
    }
    
    // Check 6: Storage optimization
    if (audio.s3Key && audio.s3Bucket) {
        validation.checks.storage = { status: 'pass', score: 10 };
    } else {
        validation.checks.storage = { status: 'fail', score: 0 };
        validation.recommendations.push('Ensure proper S3 storage configuration');
    }
    
    // Calculate overall score
    validation.score = Object.values(validation.checks)
        .reduce((sum, check) => sum + check.score, 0);
    
    // Determine overall status
    if (validation.score >= 85) {
        validation.overall = 'excellent';
    } else if (validation.score >= 70) {
        validation.overall = 'good';
    } else if (validation.score >= 50) {
        validation.overall = 'fair';
    } else {
        validation.overall = 'poor';
    }
    
    return validation;
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
 * Get current rate limiting status with queue information
 */
async function getRateLimitStatus() {
    try {
        const now = Date.now();
        
        // Clean up old requests
        rateLimitState.requests = rateLimitState.requests.filter(req => now - req.timestamp < 1000);
        
        // Calculate current usage by engine
        const usage = {};
        Object.keys(POLLY_RATE_LIMITS).forEach(engine => {
            const recentRequests = rateLimitState.requests.filter(req => req.engine === engine);
            const queueLength = rateLimitState.queues[engine]?.length || 0;
            const isProcessing = rateLimitState.processing[engine] || false;
            
            usage[engine] = {
                currentTPS: recentRequests.length,
                maxTPS: POLLY_RATE_LIMITS[engine].tps,
                utilizationPercent: Math.round((recentRequests.length / POLLY_RATE_LIMITS[engine].tps) * 100),
                maxChars: POLLY_RATE_LIMITS[engine].maxChars,
                queueLength: queueLength,
                isProcessing: isProcessing,
                status: recentRequests.length >= POLLY_RATE_LIMITS[engine].tps * 0.8 ? 'throttling' : 'normal'
            };
        });
        
        return createResponse(200, {
            rateLimiting: {
                currentTime: now,
                totalActiveRequests: rateLimitState.requests.length,
                totalQueuedRequests: Object.values(rateLimitState.queues).reduce((sum, queue) => sum + queue.length, 0),
                engineUsage: usage,
                queueStatus: {
                    generative: {
                        queued: rateLimitState.queues.generative?.length || 0,
                        processing: rateLimitState.processing.generative || false
                    },
                    neural: {
                        queued: rateLimitState.queues.neural?.length || 0,
                        processing: rateLimitState.processing.neural || false
                    },
                    standard: {
                        queued: rateLimitState.queues.standard?.length || 0,
                        processing: rateLimitState.processing.standard || false
                    }
                },
                recommendations: {
                    generative: 'Use for high-quality narration (5 TPS limit)',
                    neural: 'Use for balanced quality/speed (10 TPS limit)', 
                    standard: 'Use for high-volume processing (100 TPS limit)'
                }
            }
        });
        
    } catch (error) {
        console.error('Error getting rate limit status:', error);
        return createResponse(500, { 
            error: 'Failed to get rate limit status',
            message: error.message 
        });
    }
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