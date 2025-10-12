/**
 * 📋 MANIFEST BUILDER/VALIDATOR AI LAMBDA FUNCTION
 * 
 * ROLE: Single Source of Truth Generator & Quality Gatekeeper
 * This Lambda function merges all context files and validates project completeness
 * before allowing video rendering to proceed. It enforces quality standards and
 * creates the unified manifest that drives deterministic video assembly.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 🔍 Validate Structure - Ensure all required files and folders exist
 * 2. 📊 Enforce Quality Rules - ≥3 visuals per scene, audio-scene parity
 * 3. 📋 Generate Unified Manifest - Single source of truth for rendering
 * 4. 📈 Create Project Summary - KPIs, issues, and validation results
 * 5. 🎬 Prepare YouTube Metadata - Upload-ready payload
 * 6. ❌ Hard Fail on Issues - Prevent rendering with incomplete content
 * 
 * TRIGGER CONDITIONS:
 * - All upstream agents complete (Topic, Script, Media, Audio)
 * - File change events in project folder
 * - Manual validation request
 * 
 * OUTPUTS:
 * - 01-context/manifest.json (unified manifest)
 * - 06-metadata/project-summary.json (validation results)
 * - 06-metadata/youtube-metadata.json (upload payload)
 * - 05-video/processing-logs/validation.log (human-readable report)
 * 
 * INTEGRATION FLOW:
 * Upstream Agents Complete → Manifest Builder → Video Assembler → YouTube Publisher
 */

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'automated-video-pipeline-v2-786673323159-us-east-1';

// Configuration
const REQUIRED_FILES = {
  "01-context": [
    "topic-context.json",
    "scene-context.json", 
    "media-context.json",
    "audio-context.json",
    "video-context.json"
  ],
  "02-script": ["script.json"],
  "04-audio": ["narration.mp3", "audio-metadata.json"],
  "05-video": ["processing-logs"], // directory
  "06-metadata": [] // created if missing
};

const VISUAL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.mkv'];

/**
 * Main Lambda handler
 */
const handler = async (event, context) => {
  console.log('Manifest Builder/Validator invoked:', JSON.stringify(event, null, 2));

  const { httpMethod, path, body } = event;
  const requestBody = body ? JSON.parse(body) : {};

  if (httpMethod === 'GET' && path === '/manifest/health') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        service: 'manifest-builder-validator',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: ['structure-validation', 'quality-enforcement', 'manifest-generation']
      })
    };
  }

  if (httpMethod === 'POST' && path === '/manifest/build') {
    console.log('📋 Building and validating project manifest');
    
    const { projectId, minVisuals = 3 } = requestBody;
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'projectId is required'
        })
      };
    }

    try {
      // Step 1: Validate project structure
      console.log(`🔍 Validating structure for project: ${projectId}`);
      const validation = await validateProjectStructure(projectId, minVisuals);
      
      if (validation.issues.length > 0) {
        console.log(`❌ Validation failed with ${validation.issues.length} issues`);
        
        // Write validation log
        await writeValidationLog(projectId, validation);
        
        return {
          statusCode: 422, // Unprocessable Entity
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Project validation failed',
            issues: validation.issues,
            kpis: validation.kpis,
            validationLogPath: `videos/${projectId}/05-video/processing-logs/validation.log`
          })
        };
      }

      // Step 2: Generate unified manifest
      console.log('📋 Generating unified manifest...');
      const manifest = await generateUnifiedManifest(projectId, validation);
      
      // Step 3: Create outputs
      const outputs = await createManifestOutputs(projectId, manifest, validation);
      
      console.log('✅ Manifest building completed successfully');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          projectId: projectId,
          manifestPath: outputs.manifestPath,
          kpis: validation.kpis,
          outputs: outputs,
          readyForRendering: true,
          timestamp: new Date().toISOString()
        })
      };

    } catch (error) {
      console.error('❌ Manifest building failed:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: error.message,
          projectId: projectId
        })
      };
    }
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: false,
      error: 'Endpoint not found'
    })
  };
};

/**
 * Validate project structure and enforce quality rules
 */
async function validateProjectStructure(projectId, minVisuals) {
  console.log(`🔍 Validating project structure: ${projectId}`);
  
  const issues = [];
  const warnings = [];
  const kpis = {
    scenes_detected: 0,
    images_total: 0,
    audio_segments: 0,
    has_narration: false,
    min_visuals_required: minVisuals,
    scenes_passing_visual_min: 0
  };

  try {
    // Step 1: Check required files and folders
    for (const [folder, files] of Object.entries(REQUIRED_FILES)) {
      const folderExists = await checkS3Folder(`videos/${projectId}/${folder}/`);
      if (!folderExists) {
        issues.push(`Missing folder: ${folder}/`);
        continue;
      }

      for (const file of files) {
        if (file === 'processing-logs') {
          // Check if directory exists (has any files)
          const hasFiles = await checkS3Folder(`videos/${projectId}/${folder}/${file}/`);
          if (!hasFiles) {
            issues.push(`Missing folder: ${folder}/${file}/`);
          }
        } else {
          const fileExists = await checkS3File(`videos/${projectId}/${folder}/${file}`);
          if (!fileExists) {
            issues.push(`Missing file: ${folder}/${file}`);
          }
        }
      }
    }

    // Step 2: Load and validate context files
    const contexts = await loadAllContexts(projectId);
    
    // Step 3: Validate media organization by scene
    const sceneMediaStats = await validateSceneMedia(projectId, minVisuals);
    kpis.scenes_detected = sceneMediaStats.totalScenes;
    kpis.images_total = sceneMediaStats.totalImages;
    kpis.scenes_passing_visual_min = sceneMediaStats.scenesPassingMin;
    
    // Add issues for scenes with insufficient media
    sceneMediaStats.issues.forEach(issue => issues.push(issue));

    // Step 4: Validate audio segments
    const audioStats = await validateAudioSegments(projectId);
    kpis.audio_segments = audioStats.segmentCount;
    kpis.has_narration = audioStats.hasNarration;
    
    // Add audio-related issues
    audioStats.issues.forEach(issue => issues.push(issue));

    // Step 5: Cross-validate scene counts
    const sceneContext = contexts.scene;
    if (sceneContext && sceneContext.scenes) {
      const contextSceneCount = sceneContext.scenes.length;
      
      if (kpis.audio_segments !== contextSceneCount) {
        issues.push(`Audio segments count (${kpis.audio_segments}) != scenes in context (${contextSceneCount})`);
      }
      
      if (kpis.scenes_detected !== contextSceneCount) {
        warnings.push(`Media scenes detected (${kpis.scenes_detected}) != scenes in context (${contextSceneCount})`);
      }
    }

    return {
      issues,
      warnings,
      kpis,
      contexts,
      sceneMediaStats,
      audioStats
    };

  } catch (error) {
    console.error('❌ Validation error:', error);
    issues.push(`Validation error: ${error.message}`);
    return { issues, warnings, kpis, contexts: {} };
  }
}

/**
 * Check if S3 folder exists (has any objects)
 */
async function checkS3Folder(prefix) {
  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      MaxKeys: 1
    }));
    return response.Contents && response.Contents.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if S3 file exists
 */
async function checkS3File(key) {
  try {
    await s3Client.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    }));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load all context files
 */
async function loadAllContexts(projectId) {
  const contexts = {};
  
  const contextFiles = [
    'topic-context.json',
    'scene-context.json', 
    'media-context.json',
    'audio-context.json',
    'video-context.json'
  ];

  for (const file of contextFiles) {
    try {
      const key = `videos/${projectId}/01-context/${file}`;
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      }));
      
      const content = await streamToBuffer(response.Body);
      const contextName = file.replace('-context.json', '');
      contexts[contextName] = JSON.parse(content.toString());
      
    } catch (error) {
      console.log(`⚠️  Could not load ${file}:`, error.message);
      contexts[file.replace('-context.json', '')] = null;
    }
  }

  return contexts;
}

/**
 * Validate scene media organization
 */
async function validateSceneMedia(projectId, minVisuals) {
  console.log(`🖼️  Validating scene media for project: ${projectId}`);
  
  const issues = [];
  let totalScenes = 0;
  let totalImages = 0;
  let scenesPassingMin = 0;

  try {
    // List all objects in media folder
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `videos/${projectId}/03-media/`
    }));

    const mediaFiles = response.Contents || [];
    
    // Group by scene
    const sceneGroups = {};
    
    for (const file of mediaFiles) {
      const key = file.Key;
      
      // Check if it's in scene-N/images/ structure
      const sceneMatch = key.match(/\/scene-(\d+)\/images\/[^\/]+$/);
      if (sceneMatch) {
        const sceneNumber = parseInt(sceneMatch[1]);
        if (!sceneGroups[sceneNumber]) {
          sceneGroups[sceneNumber] = [];
        }
        
        // Check if it's a valid visual file
        const extension = key.toLowerCase().substring(key.lastIndexOf('.'));
        if (VISUAL_EXTENSIONS.includes(extension)) {
          sceneGroups[sceneNumber].push(key);
          totalImages++;
        }
      }
    }

    // Validate each scene
    totalScenes = Object.keys(sceneGroups).length;
    
    for (const [sceneNumber, files] of Object.entries(sceneGroups)) {
      const fileCount = files.length;
      
      if (fileCount >= minVisuals) {
        scenesPassingMin++;
      } else {
        issues.push(`Scene ${sceneNumber}: only ${fileCount} visuals found (<${minVisuals}). Path: videos/${projectId}/03-media/scene-${sceneNumber}/images/`);
      }
    }

    return {
      totalScenes,
      totalImages,
      scenesPassingMin,
      sceneGroups,
      issues
    };

  } catch (error) {
    console.error('❌ Media validation error:', error);
    issues.push(`Media validation error: ${error.message}`);
    return { totalScenes: 0, totalImages: 0, scenesPassingMin: 0, issues };
  }
}

/**
 * Validate audio segments
 */
async function validateAudioSegments(projectId) {
  console.log(`🎵 Validating audio segments for project: ${projectId}`);
  
  const issues = [];
  let segmentCount = 0;
  let hasNarration = false;

  try {
    // Check for narration.mp3
    const narrationExists = await checkS3File(`videos/${projectId}/04-audio/narration.mp3`);
    hasNarration = narrationExists;
    
    if (!narrationExists) {
      issues.push('Missing master narration.mp3 file');
    }

    // Count audio segments
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `videos/${projectId}/04-audio/audio-segments/`
    }));

    const audioFiles = (response.Contents || []).filter(file => 
      file.Key.endsWith('.mp3') || file.Key.endsWith('.wav') || file.Key.endsWith('.m4a')
    );
    
    segmentCount = audioFiles.length;

    return {
      segmentCount,
      hasNarration,
      audioFiles: audioFiles.map(f => f.Key),
      issues
    };

  } catch (error) {
    console.error('❌ Audio validation error:', error);
    issues.push(`Audio validation error: ${error.message}`);
    return { segmentCount: 0, hasNarration: false, issues };
  }
}

/**
 * Generate unified manifest from validated contexts
 */
async function generateUnifiedManifest(projectId, validation) {
  console.log(`📋 Generating unified manifest for project: ${projectId}`);
  
  const { contexts, sceneMediaStats } = validation;
  
  // Build manifest structure
  const manifest = {
    videoId: contexts.video?.videoId || contexts.topic?.slug || projectId,
    title: contexts.topic?.title || contexts.video?.title || `Video ${projectId}`,
    visibility: contexts.video?.visibility || "unlisted",
    seo: {
      tags: [
        ...(contexts.topic?.seoContext?.primaryKeywords || []),
        ...(contexts.topic?.seoContext?.longTailKeywords || [])
      ].slice(0, 50) // YouTube tag limit
    },
    chapters: generateChaptersFromScenes(contexts.scene?.scenes || []),
    scenes: buildScenesFromValidation(projectId, contexts, sceneMediaStats),
    export: {
      resolution: "1920x1080",
      fps: 30,
      codec: "h264",
      preset: "medium"
    },
    upload: {
      category: "Education",
      madeForKids: false,
      finalVideoPath: `videos/${projectId}/05-video/final-video.mp4`,
      masterAudioPath: `videos/${projectId}/04-audio/narration.mp3`
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      projectId: projectId,
      manifestVersion: "1.0.0",
      validationPassed: true,
      kpis: validation.kpis
    }
  };

  return manifest;
}

/**
 * Generate YouTube chapters from scenes
 */
function generateChaptersFromScenes(scenes) {
  if (!scenes || scenes.length === 0) return [];
  
  return scenes.map(scene => ({
    t: scene.startTime || 0,
    label: scene.title || `Scene ${scene.sceneNumber}`
  }));
}

/**
 * Build scenes array from validation results
 */
function buildScenesFromValidation(projectId, contexts, sceneMediaStats) {
  const scenes = contexts.scene?.scenes || [];
  const mediaMapping = contexts.media?.sceneMediaMapping || {};
  const audioSegments = contexts.audio?.audioSegments || [];
  
  return scenes.map(scene => {
    const sceneNumber = scene.sceneNumber;
    const sceneMedia = sceneMediaStats.sceneGroups[sceneNumber] || [];
    const sceneAudio = audioSegments.find(a => a.sceneNumber === sceneNumber);
    
    return {
      id: sceneNumber,
      script: scene.content?.script || scene.script || "",
      audio: {
        path: sceneAudio?.s3Key || `videos/${projectId}/04-audio/audio-segments/scene-${sceneNumber}.mp3`,
        durationHintSec: scene.duration || 60
      },
      visuals: sceneMedia.map((mediaKey, index) => ({
        type: "image",
        key: mediaKey,
        durationHint: 5
      }))
    };
  });
}

/**
 * Create all manifest outputs
 */
async function createManifestOutputs(projectId, manifest, validation) {
  console.log(`📄 Creating manifest outputs for project: ${projectId}`);
  
  const outputs = {};

  // 1. Unified manifest
  const manifestKey = `videos/${projectId}/01-context/manifest.json`;
  await uploadToS3(manifestKey, JSON.stringify(manifest, null, 2), 'application/json');
  outputs.manifestPath = manifestKey;

  // 2. Project summary
  const summaryKey = `videos/${projectId}/06-metadata/project-summary.json`;
  const summary = {
    project: projectId,
    timestamp: new Date().toISOString(),
    kpis: validation.kpis,
    issues: validation.issues,
    warnings: validation.warnings,
    validationPassed: validation.issues.length === 0,
    manifestGenerated: true
  };
  await uploadToS3(summaryKey, JSON.stringify(summary, null, 2), 'application/json');
  outputs.summaryPath = summaryKey;

  // 3. YouTube metadata
  const youtubeKey = `videos/${projectId}/06-metadata/youtube-metadata.json`;
  const youtubeMetadata = {
    title: manifest.title,
    description: generateYouTubeDescription(manifest),
    tags: manifest.seo.tags.slice(0, 500), // YouTube limit
    categoryId: "27", // Education
    privacyStatus: manifest.visibility === "public" ? "public" : "unlisted",
    defaultLanguage: "en",
    madeForKids: manifest.upload.madeForKids
  };
  await uploadToS3(youtubeKey, JSON.stringify(youtubeMetadata, null, 2), 'application/json');
  outputs.youtubeMetadataPath = youtubeKey;

  // 4. Validation log
  await writeValidationLog(projectId, validation);
  outputs.validationLogPath = `videos/${projectId}/05-video/processing-logs/validation.log`;

  return outputs;
}

/**
 * Generate YouTube description from manifest
 */
function generateYouTubeDescription(manifest) {
  let description = `${manifest.title}\n\n`;
  
  if (manifest.chapters && manifest.chapters.length > 0) {
    description += "Chapters:\n";
    manifest.chapters.forEach(chapter => {
      const minutes = Math.floor(chapter.t / 60);
      const seconds = chapter.t % 60;
      description += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${chapter.label}\n`;
    });
  }
  
  return description;
}

/**
 * Write validation log
 */
async function writeValidationLog(projectId, validation) {
  let log = "";
  
  if (validation.issues.length > 0) {
    log += "CRITICAL ISSUES:\n";
    validation.issues.forEach(issue => {
      log += ` - ${issue}\n`;
    });
  } else {
    log += "No critical issues found.\n";
  }
  
  if (validation.warnings && validation.warnings.length > 0) {
    log += "\nWARNINGS:\n";
    validation.warnings.forEach(warning => {
      log += ` - ${warning}\n`;
    });
  }
  
  log += `\nKPIs:\n`;
  log += ` - Scenes detected: ${validation.kpis.scenes_detected}\n`;
  log += ` - Images total: ${validation.kpis.images_total}\n`;
  log += ` - Audio segments: ${validation.kpis.audio_segments}\n`;
  log += ` - Has narration: ${validation.kpis.has_narration}\n`;
  log += ` - Scenes passing visual minimum: ${validation.kpis.scenes_passing_visual_min}/${validation.kpis.scenes_detected}\n`;
  
  const logKey = `videos/${projectId}/05-video/processing-logs/validation.log`;
  await uploadToS3(logKey, log, 'text/plain');
}

/**
 * Helper functions
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function uploadToS3(key, content, contentType = 'application/json') {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType
  });

  await s3Client.send(command);
  return `s3://${S3_BUCKET}/${key}`;
}

module.exports = { handler };