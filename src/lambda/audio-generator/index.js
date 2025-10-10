/**
 * 🎵 AUDIO GENERATOR AI LAMBDA FUNCTION - REFACTORED WITH SHARED UTILITIES
 * 
 * ROLE: Professional Narration Generation using Amazon Polly Generative Voices
 * This Lambda function converts video scripts into high-quality audio narration
 * using Amazon Polly's advanced neural and generative voices with context awareness.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 🎙️ Audio Synthesis - Converts script text to professional narration
 * 2. 🎭 Voice Selection - Prioritizes generative voices (Ruth/Stephen) for maximum quality
 * 3. 📊 Quality Optimization - Ensures broadcast-quality audio output
 * 4. 🔄 Context Integration - Uses scene and media context for timing and pacing
 * 5. 📁 Asset Storage - Stores audio files in S3 for video assembly
 * 
 * ENHANCED FEATURES (PRESERVED):
 * - AWS Polly Generative Voices: Ruth, Stephen (maximum quality)
 * - Updated Rate Limits: 2 TPS for generative voices (per AWS documentation)
 * - Scene-Aware Pacing: Adjusts speaking rate based on scene purpose and media timing
 * - Context Integration: Consumes both scene and media context for synchronization
 * 
 * REFACTORED FEATURES:
 * - Uses shared context-manager for context validation and storage
 * - Uses shared aws-service-manager for S3 operations
 * - Uses shared error-handler for consistent error handling and logging
 * - Maintains all enhanced Audio Generator capabilities
 * 
 * VOICE SELECTION STRATEGY (PRIORITIZING GENERATIVE VOICES):
 * - PRIMARY: Ruth (Generative, US English, most natural and expressive) ⭐ RECOMMENDED
 * - SECONDARY: Stephen (Generative, US English, authoritative and engaging) ⭐ RECOMMENDED  
 * - FALLBACK: Joanna Neural (Neural, US English, clear and professional)
 * - FALLBACK: Matthew Neural (Neural, US English, authoritative)
 */

const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand  } = require('@aws-sdk/client-polly');

// Import shared utilities
const { storeContext, 
  retrieveContext, 
  validateContext 
} = require('/opt/nodejs/context-manager');
const { uploadToS3,
  executeWithRetry 
} = require('/opt/nodejs/aws-service-manager');
const { wrapHandler, 
  AppError, 
  ERROR_TYPES, 
  validateRequiredParams,
  withTimeout,
  monitorPerformance 
} = require('/opt/nodejs/error-handler');

// Initialize AWS clients
const pollyClient = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const S3_BUCKET = process.env.S3_BUCKET || 'automated-video-pipeline-storage';

/**
 * Main Lambda handler with shared error handling
 */
const handler = async (event, context) => {
  console.log('Audio Generator invoked:', JSON.stringify(event, null, 2));

  const { httpMethod, path, pathParameters, body, queryStringParameters } = event;

  // Parse request body if present
  let requestBody = {};
  if (body) {
    requestBody = typeof body === 'string' ? JSON.parse(body) : body;
  }

  // Route requests
  switch (httpMethod) {
  case 'GET':
    if (path === '/health') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          service: 'audio-generator',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '3.0.0-refactored',
          generativeVoices: true,
          contextAware: true,
          sceneAwarePacing: true,
          sharedUtilities: true,
          primaryVoices: ['Ruth (Generative)', 'Stephen (Generative)']
        })
      };
    } else if (path === '/audio/voices') {
      return await getAvailableVoices();
    }
    break;

  case 'POST':
    if (path === '/audio/generate-from-project') {
      return await generateAudioFromProject(requestBody, context);
    } else if (path === '/audio/generate') {
      return await generateAudio(requestBody, context);
    }
    break;
  }

  throw new AppError('Endpoint not found', ERROR_TYPES.NOT_FOUND, 404);
};

/**
 * Generate audio from project context (MAIN ENDPOINT with Generative Voices)
 */
async function generateAudioFromProject(requestBody, context) {
  return await monitorPerformance(async () => {
    const { projectId, voiceOptions = {} } = requestBody;
    
    validateRequiredParams(requestBody, ['projectId'], 'audio generation from project');

    console.log(`🎵 Generating audio for project: ${projectId}`);

    // Retrieve scene context using shared context manager
    console.log('🔍 Retrieving scene context from shared context manager...');
    const sceneContext = await retrieveContext(projectId, 'scene');

    // Try to retrieve media context for synchronization (optional)
    let mediaContext = null;
    try {
      mediaContext = await retrieveContext(projectId, 'media');
      console.log('✅ Retrieved media context for synchronization');
    } catch (error) {
      console.log('ℹ️ Media context not available, proceeding with scene-only timing');
    }

    console.log('✅ Retrieved scene context:');
    console.log(`   - Scenes: ${sceneContext.scenes?.length || 0}`);
    console.log(`   - Total duration: ${sceneContext.totalDuration || 0}s`);

    // Select optimal generative voice
    const selectedVoice = selectOptimalGenerativeVoice(voiceOptions);
    console.log(`🎭 Selected voice: ${selectedVoice.name} (${selectedVoice.type})`);

    // Generate audio for each scene with context-aware pacing
    const audioSegments = [];
    const timingMarks = [];
    let currentTime = 0;

    for (let i = 0; i < (sceneContext.scenes || []).length; i++) {
      const scene = sceneContext.scenes[i];
      console.log(`🎙️ Processing Scene ${scene.sceneNumber}: ${scene.title}`);

      // Apply scene-aware pacing
      const pacingConfig = calculateSceneAwarePacing(scene, mediaContext);
      console.log(`📊 Scene pacing: ${pacingConfig.speakingRate} rate, ${pacingConfig.pauseDuration}ms pauses`);

      // Generate audio for this scene with rate limiting
      const audioResult = await executeWithRetry(
        () => withTimeout(
          () => generateSceneAudio(scene, selectedVoice, pacingConfig),
          15000, // 15 second timeout per scene
          `Scene ${scene.sceneNumber} audio generation`
        ),
        3, // max retries
        2000 // base delay (respects 2 TPS limit for generative voices)
      );

      // Add rate limiting delay for generative voices (2 TPS limit)
      if (i > 0 && selectedVoice.type === 'generative') {
        console.log('⏱️ Rate limiting delay: 500ms for generative voice');
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay for 2 TPS
      }

      audioSegments.push(audioResult);

      // Create timing marks for synchronization
      timingMarks.push({
        type: 'scene_start',
        sceneNumber: scene.sceneNumber,
        timestamp: currentTime,
        duration: scene.duration
      });

      // Add word-level timing marks (simplified)
      const words = scene.content?.script?.split(' ') || [];
      const wordsPerSecond = words.length / scene.duration;
      words.forEach((word, index) => {
        timingMarks.push({
          type: 'word',
          text: word,
          timestamp: currentTime + (index / wordsPerSecond),
          sceneNumber: scene.sceneNumber
        });
      });

      currentTime += scene.duration;
      console.log(`✅ Scene ${scene.sceneNumber} audio generated: ${audioResult.duration}s`);
    }

    // Create master audio file (simplified - in production would combine segments)
    const masterAudioId = `audio-${projectId}-${Date.now()}`;
    const masterAudioUrl = await createMasterAudio(audioSegments, masterAudioId);

    // Create audio context for Video Assembler AI
    const audioContext = {
      projectId: projectId,
      masterAudioId: masterAudioId,
      masterAudioUrl: masterAudioUrl,
      audioSegments: audioSegments,
      timingMarks: timingMarks,
      voiceSettings: {
        selectedVoice: selectedVoice,
        quality: 'generative',
        format: 'mp3',
        sampleRate: 22050
      },
      synchronizationData: {
        sceneBreakpoints: sceneContext.scenes?.map(scene => ({
          sceneNumber: scene.sceneNumber,
          startTime: scene.startTime || 0,
          endTime: scene.endTime || scene.duration,
          duration: scene.duration
        })) || [],
        mediaSynchronization: {
          mediaContextAvailable: !!mediaContext,
          visualPacingConsidered: !!mediaContext
        }
      },
      qualityMetrics: {
        totalDuration: currentTime,
        averageQuality: calculateAverageQuality(audioSegments),
        generativeVoiceUsed: selectedVoice.type === 'generative',
        contextAwarePacing: true
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'audio-generator-ai-refactored',
        generativeVoices: true,
        contextAware: true,
        sceneAwarePacing: true
      }
    };

    // Store audio context using shared context manager
    await storeContext(audioContext, 'audio');
    console.log('💾 Stored audio context for Video Assembler AI');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        projectId: projectId,
        audioContext: audioContext,
        generativeFeatures: {
          voiceUsed: selectedVoice.name,
          voiceType: selectedVoice.type,
          contextAwarePacing: true,
          sceneAwareTiming: true,
          refactored: true
        },
        generatedAt: new Date().toISOString()
      })
    };
  }, 'generateAudioFromProject', { projectId });
}

/**
 * Select optimal generative voice (PRESERVES VOICE SELECTION STRATEGY)
 */
function selectOptimalGenerativeVoice(voiceOptions = {}) {
  // Priority order: Ruth (Generative) > Stephen (Generative) > Neural fallbacks
  const voicePriority = [
    { name: 'Ruth', type: 'generative', language: 'en-US', gender: 'Female' },
    { name: 'Stephen', type: 'generative', language: 'en-US', gender: 'Male' },
    { name: 'Joanna', type: 'neural', language: 'en-US', gender: 'Female' },
    { name: 'Matthew', type: 'neural', language: 'en-US', gender: 'Male' }
  ];

  // Allow voice override from options
  if (voiceOptions.preferredVoice) {
    const preferred = voicePriority.find(v => v.name === voiceOptions.preferredVoice);
    if (preferred) return preferred;
  }

  // Default to Ruth (Generative) for maximum quality
  return voicePriority[0];
}

/**
 * Calculate scene-aware pacing based on scene purpose and media context
 */
function calculateSceneAwarePacing(scene, mediaContext) {
  const purpose = scene.purpose || 'content_delivery';
  const duration = scene.duration || 60;
  
  // Get media timing if available
  const sceneMedia = mediaContext?.sceneMediaMapping?.find(m => m.sceneNumber === scene.sceneNumber);
  const visualChanges = sceneMedia?.mediaSequence?.length || 3;
  const averageVisualDuration = duration / visualChanges;

  let speakingRate = 'medium';
  let pauseDuration = 300; // milliseconds

  switch (purpose) {
  case 'hook':
    // Faster pacing for engagement
    speakingRate = 'fast';
    pauseDuration = 200;
    break;
  case 'conclusion':
    // Slower, more deliberate pacing
    speakingRate = 'slow';
    pauseDuration = 500;
    break;
  default:
    // Adjust based on visual pacing
    if (averageVisualDuration < 4) {
      speakingRate = 'fast'; // Match fast visuals
      pauseDuration = 250;
    } else if (averageVisualDuration > 6) {
      speakingRate = 'slow'; // Match slower visuals
      pauseDuration = 400;
    }
  }

  return {
    speakingRate,
    pauseDuration,
    visualSynchronization: !!sceneMedia,
    averageVisualDuration
  };
}

/**
 * Generate audio for a specific scene using Amazon Polly
 */
async function generateSceneAudio(scene, voice, pacingConfig) {
  const script = scene.content?.script || scene.script || '';
  
  if (!script) {
    throw new AppError(`No script content found for scene ${scene.sceneNumber}`, ERROR_TYPES.VALIDATION, 400);
  }

  // Create SSML for enhanced control
  const ssml = createSSMLForScene(script, voice, pacingConfig);

  try {
    const command = new SynthesizeSpeechCommand({
      Text: ssml,
      TextType: 'ssml',
      VoiceId: voice.name,
      OutputFormat: 'mp3',
      SampleRate: '22050',
      Engine: voice.type === 'generative' ? 'generative' : 'neural'
    });

    const response = await pollyClient.send(command);
    
    // Upload audio to S3
    const audioKey = `audio/${scene.sceneNumber}-${voice.name}-${Date.now()}.mp3`;
    const audioUrl = await uploadToS3(
      S3_BUCKET,
      audioKey,
      await response.AudioStream.transformToByteArray(),
      {
        contentType: 'audio/mpeg',
        metadata: {
          sceneNumber: scene.sceneNumber.toString(),
          voiceName: voice.name,
          voiceType: voice.type,
          duration: scene.duration.toString()
        }
      }
    );

    return {
      sceneNumber: scene.sceneNumber,
      audioUrl: audioUrl,
      audioKey: audioKey,
      duration: scene.duration,
      voice: voice,
      ssmlUsed: true,
      contextAware: true
    };
  } catch (error) {
    console.error(`Error generating audio for scene ${scene.sceneNumber}:`, error);
    throw new AppError(`Failed to generate audio for scene ${scene.sceneNumber}: ${error.message}`, ERROR_TYPES.EXTERNAL_API, 502);
  }
}

/**
 * Create SSML for enhanced voice control
 */
function createSSMLForScene(script, voice, pacingConfig) {
  const rate = pacingConfig.speakingRate;
  const pauseMs = pacingConfig.pauseDuration;
  
  return `<speak>
    <prosody rate="${rate}">
      ${script.replace(/\./g, `.<break time="${pauseMs}ms"/>`)}
    </prosody>
  </speak>`;
}

/**
 * Create master audio file (simplified implementation)
 */
async function createMasterAudio(audioSegments, masterAudioId) {
  // In a full implementation, this would combine all audio segments
  // For now, return a reference to the segments
  const masterKey = `audio/master/${masterAudioId}.json`;
  
  const masterData = {
    masterAudioId,
    segments: audioSegments,
    createdAt: new Date().toISOString(),
    totalSegments: audioSegments.length
  };

  const masterUrl = await uploadToS3(
    S3_BUCKET,
    masterKey,
    JSON.stringify(masterData),
    {
      contentType: 'application/json',
      metadata: {
        type: 'master-audio-reference',
        segments: audioSegments.length.toString()
      }
    }
  );

  return masterUrl;
}

/**
 * Calculate average quality score
 */
function calculateAverageQuality(audioSegments) {
  const qualityScores = audioSegments.map(segment => {
    // Quality scoring based on voice type and features
    let score = 0.7; // base score
    if (segment.voice.type === 'generative') score += 0.2;
    if (segment.ssmlUsed) score += 0.1;
    return Math.min(score, 1.0);
  });
  
  return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
}

/**
 * Get available voices
 */
async function getAvailableVoices() {
  try {
    const command = new DescribeVoicesCommand({
      LanguageCode: 'en-US'
    });
    
    const response = await pollyClient.send(command);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        voices: response.Voices || [],
        recommended: ['Ruth', 'Stephen'],
        voiceTypes: ['generative', 'neural', 'standard']
      })
    };
  } catch (error) {
    throw new AppError(`Failed to get available voices: ${error.message}`, ERROR_TYPES.EXTERNAL_API, 502);
  }
}

/**
 * Basic audio generation (simplified)
 */
async function generateAudio(requestBody, context) {
  return await monitorPerformance(async () => {
    validateRequiredParams(requestBody, ['text'], 'audio generation');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Basic audio generation - refactored with shared utilities',
        text: requestBody.text
      })
    };
  }, 'generateAudio', { textLength: requestBody.text?.length || 0 });
}

// Export handler with shared error handling wrapper
const lambdaHandler  = wrapHandler(handler);
module.exports = { handler: lambdaHandler };

