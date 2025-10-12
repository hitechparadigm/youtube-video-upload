/**
 * Context Integration - Proper Folder Structure Implementation
 * 
 * This module implements our approved folder structure using the S3 utilities
 * and ensures all agents create real content files in the correct locations.
 */

const { uploadToS3 } = require('./aws-service-manager');
const { storeContext } = require('./context-manager');

// Import our approved S3 folder structure utility
const { generateS3Paths } = require('./s3-folder-structure.js');

/**
 * Create a new project with proper folder structure
 */
const createProject = async (baseTopic) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const topicSlug = baseTopic.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  
  const projectId = `${timestamp}_${topicSlug}`;
  console.log(`📁 Created project with approved structure: ${projectId}`);
  return projectId;
};

/**
 * Store script content in proper 02-script/ folder
 */
const storeScriptContent = async (projectId, scriptContent, title = 'Video Script') => {
  const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
  const paths = generateS3Paths(projectId, title);
  
  try {
    // Store the actual script file in 02-script/
    await uploadToS3(
      bucket,
      paths.script.json,
      JSON.stringify(scriptContent, null, 2),
      'application/json'
    );
    
    console.log(`📝 Stored script content: ${paths.script.json}`);
    
    // Also store context for agent coordination in 01-context/
    await storeContext(scriptContent, 'scene', projectId);
    
    return {
      success: true,
      scriptPath: paths.script.json,
      contextPath: `videos/${projectId}/01-context/scene-context.json`
    };
    
  } catch (error) {
    console.error('❌ Failed to store script content:', error);
    throw error;
  }
};

/**
 * Store audio content in proper 04-audio/ folder
 */
const storeAudioContent = async (projectId, audioBuffer, metadata = {}, title = 'Video Audio') => {
  const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
  const paths = generateS3Paths(projectId, title);
  
  try {
    // Store the actual audio file in 04-audio/
    await uploadToS3(
      bucket,
      paths.audio.narration,
      audioBuffer,
      'audio/mpeg'
    );
    
    // Store audio metadata
    await uploadToS3(
      bucket,
      paths.audio.metadata,
      JSON.stringify(metadata, null, 2),
      'application/json'
    );
    
    console.log(`🎵 Stored audio content: ${paths.audio.narration}`);
    
    // Also store context for agent coordination in 01-context/
    await storeContext(metadata, 'audio', projectId);
    
    return {
      success: true,
      audioPath: paths.audio.narration,
      metadataPath: paths.audio.metadata,
      contextPath: `videos/${projectId}/01-context/audio-context.json`
    };
    
  } catch (error) {
    console.error('❌ Failed to store audio content:', error);
    throw error;
  }
};

/**
 * Store video content in proper 05-video/ folder
 */
const storeVideoContent = async (projectId, videoMetadata, title = 'Video Assembly') => {
  const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
  const paths = generateS3Paths(projectId, title);
  
  try {
    // Store video assembly metadata in 05-video/
    await uploadToS3(
      bucket,
      paths.video.manifest,
      JSON.stringify(videoMetadata, null, 2),
      'application/json'
    );
    
    console.log(`🎬 Stored video metadata: ${paths.video.manifest}`);
    
    // Also store context for agent coordination in 01-context/
    await storeContext(videoMetadata, 'video', projectId);
    
    return {
      success: true,
      videoMetadataPath: paths.video.manifest,
      contextPath: `videos/${projectId}/01-context/video-context.json`
    };
    
  } catch (error) {
    console.error('❌ Failed to store video content:', error);
    throw error;
  }
};

/**
 * Store YouTube metadata in proper 06-metadata/ folder
 */
const storeYouTubeMetadata = async (projectId, youtubeData, title = 'YouTube Upload') => {
  const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
  const paths = generateS3Paths(projectId, title);
  
  try {
    // Store YouTube metadata in 06-metadata/
    await uploadToS3(
      bucket,
      paths.metadata.youtube,
      JSON.stringify(youtubeData, null, 2),
      'application/json'
    );
    
    // Store project summary
    const projectSummary = {
      projectId,
      title,
      createdAt: new Date().toISOString(),
      youtubeData,
      status: 'completed'
    };
    
    await uploadToS3(
      bucket,
      paths.metadata.project,
      JSON.stringify(projectSummary, null, 2),
      'application/json'
    );
    
    console.log(`📺 Stored YouTube metadata: ${paths.metadata.youtube}`);
    
    return {
      success: true,
      youtubePath: paths.metadata.youtube,
      projectSummaryPath: paths.metadata.project
    };
    
  } catch (error) {
    console.error('❌ Failed to store YouTube metadata:', error);
    throw error;
  }
};

/**
 * Validate context flow between agents
 */
const validateContextFlow = async (projectId) => {
  // This would check that all required contexts exist
  // For now, return valid
  return { valid: true, projectId };
};

/**
 * Get project summary with proper folder structure
 */
const getProjectSummary = async (projectId, title = 'Project Summary') => {
  const paths = generateS3Paths(projectId, title);
  
  return {
    projectId,
    paths,
    summary: 'Project using approved folder structure'
  };
};

module.exports = {
  createProject,
  storeScriptContent,
  storeAudioContent,
  storeVideoContent,
  storeYouTubeMetadata,
  validateContextFlow,
  getProjectSummary
};