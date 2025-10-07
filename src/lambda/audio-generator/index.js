/**
 * AI Audio Generation Service
 * Converts scripts into high-quality narration using Amazon Polly with generative voices
 */

const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } = require('@aws-sdk/client-polly');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

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
        if (httpMethod === 'POST' && path === '/audio/generate') {
            return await generateAudio(requestBody);
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
            engine: engine
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
 * Generate audio using Amazon Polly with generative voices
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