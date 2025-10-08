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
 * VOICE SELECTION STRATEGY:
 * - Educational Content: Joanna (US English, clear and professional)
 * - Tech Content: Matthew (US English, authoritative)
 * - Creative Content: Ruth (Generative, expressive and engaging)
 * - International: Multilingual voices based on target audience
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
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');
// Import context management functions
const { getSceneContext, updateProjectSummary } = require('/opt/nodejs/context-integration');

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

// Rate limiting configuration for Amazon Polly
const POLLY_RATE_LIMITS = {
    standard: { tps: 100, maxChars: 3000 },
    neural: { tps: 10, maxChars: 3000 },
    generative: { tps: 5, maxChars: 3000 }
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
        voiceId = 'Ruth', // Default generative voice
        engine = 'generative',
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
        generateByScene = true 
    } = requestBody;
    
    try {
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }
        
        console.log(`🎙️ Generating audio for project: ${projectId}`);
        
        // Retrieve scene context from Context Manager
        console.log('🔍 Retrieving scene context from Context Manager...');
        const sceneContext = await getSceneContext(projectId);
        
        console.log('✅ Retrieved scene context:');
        console.log(`   - Available scenes: ${sceneContext.scenes?.length || 0}`);
        console.log(`   - Total duration: ${sceneContext.totalDuration || 0}s`);
        console.log(`   - Selected subtopic: ${sceneContext.selectedSubtopic || 'N/A'}`);
        
        if (!sceneContext.scenes || sceneContext.scenes.length === 0) {
            return createResponse(400, { error: 'No scenes found in scene context' });
        }
        
        let audioResults = [];
        
        if (generateByScene) {
            // Generate audio for each scene separately using scene context
            console.log(`🎵 Generating audio for ${sceneContext.scenes.length} scenes with context awareness...`);
            
            for (const scene of sceneContext.scenes) {
                console.log(`   Processing Scene ${scene.sceneNumber}: ${scene.title || 'Untitled'}`);
                
                const sceneAudio = await generateAudioWithPolly({
                    text: scene.script,
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
                        purpose: scene.purpose,
                        tone: scene.tone || scene.visualRequirements?.mood
                    },
                    audioOptions: {
                        ...audioOptions,
                        // Adjust audio based on scene context
                        speakingRate: scene.tone === 'exciting' ? 'fast' : 'medium',
                        emphasis: scene.purpose === 'hook' ? 'strong' : 'moderate'
                    }
                });
                
                sceneAudio.sceneNumber = scene.sceneNumber;
                sceneAudio.sceneTitle = scene.title;
                sceneAudio.projectId = projectId;
                sceneAudio.contextAware = true;
                
                const storedSceneAudio = await storeAudioData(sceneAudio, projectId);
                audioResults.push(storedSceneAudio);
                
                console.log(`   ✅ Scene ${scene.sceneNumber} audio: ${storedSceneAudio.estimatedDuration}s`);
            }
            
            // Create a master audio record that references all scenes
            const masterAudio = {
                audioId: `audio-${projectId}-master-${Date.now()}`,
                projectId: projectId,
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
                generatedBy: 'project-context',
                contextUsage: {
                    usedSceneContext: true,
                    sceneCount: sceneContext.scenes.length,
                    selectedSubtopic: sceneContext.selectedSubtopic,
                    contextAwareGeneration: true
                }
            };
            
            const storedMasterAudio = await storeAudioData(masterAudio, projectId);
            
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
                message: 'Context-aware audio generated successfully for all scenes',
                projectId: projectId,
                masterAudio: storedMasterAudio,
                sceneAudios: audioResults,
                totalScenes: audioResults.length,
                totalDuration: masterAudio.totalDuration,
                contextUsage: masterAudio.contextUsage,
                readyForVideoAssembly: true
            });
            
        } else {
            // Generate audio for entire script as one file
            const fullScript = sceneContext.scenes.map(scene => scene.script).join('\n\n');
            
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
                    text: scene.script,
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
            const fullScript = scriptData.scenes?.map(scene => scene.script).join('\n\n') || scriptData.script || '';
            
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
            // Use project-based structure if projectId is provided
            const s3Key = projectId 
                ? `videos/${projectId}/audio/${audioData.audioId}.${audioData.outputFormat || 'mp3'}`
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