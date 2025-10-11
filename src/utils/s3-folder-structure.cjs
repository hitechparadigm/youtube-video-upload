/**
 * S3 Folder Structure Utility - Agent Coordination System
 * 
 * This utility provides the standardized folder structure for the automated video pipeline
 * and serves as the foundation for AI agent coordination. Each video project gets its own
 * timestamped folder with a sophisticated structure that enables perfect coordination
 * between all 6 AI agents.
 * 
 * ARCHITECTURAL DESIGN:
 * The folder structure serves dual purposes:
 * 1. Content Organization - Logical separation of different asset types
 * 2. Agent Coordination - Centralized communication hub via 01-context/
 * 
 * WHY ALL CONTEXT FILES ARE IN 01-CONTEXT/:
 * - Centralized Agent Coordination Hub: Single location for all agent communication
 * - Sequential Information Flow: Each context file builds upon previous ones
 * - Cross-Agent Dependencies: Multiple agents read multiple context files
 * - Single Source of Truth: No confusion about project state location
 * - Debugging & Monitoring: Complete project state in one folder
 * - Failure Recovery: All coordination data preserved for resumption
 * 
 * AGENT WORKFLOW:
 * Topic Management → Script Generator → Media Curator → Audio Generator → Video Assembler → YouTube Publisher
 *        ↓                 ↓                ↓               ↓                ↓                ↓
 *   topic-context    scene-context    media-context   audio-context    video-context   youtube-metadata
 * 
 * Structure:
 * videos/
 * ├── {timestamp}_{title}/
 * │   ├── 01-context/              ← AGENT COORDINATION HUB
 * │   │   ├── topic-context.json       ← Topic Management AI (project foundation)
 * │   │   ├── scene-context.json       ← Script Generator AI (video structure)
 * │   │   ├── media-context.json       ← Media Curator AI (visual assets inventory)
 * │   │   ├── audio-context.json       ← Audio Generator AI (audio sync data)
 * │   │   └── video-context.json       ← Video Assembler AI (final assembly metadata)
 * │   ├── 02-script/              ← SCRIPT CONTENT
 * │   │   ├── script.json              ← Complete video script
 * │   │   └── script.txt               ← Human-readable format
 * │   ├── 03-media/               ← VISUAL ASSETS
 * │   │   ├── scene-1/images/          ← Real Pexels/Pixabay images per scene
 * │   │   ├── scene-2/images/          ← Organized by scene number
 * │   │   └── scene-N/images/          ← Scalable structure
 * │   ├── 04-audio/               ← AUDIO FILES
 * │   │   ├── narration.mp3            ← Master audio file
 * │   │   ├── audio-segments/          ← Individual scene audio files
 * │   │   └── audio-metadata.json      ← Technical specifications
 * │   ├── 05-video/               ← VIDEO ASSEMBLY
 * │   │   ├── final-video.mp4          ← Complete assembled video
 * │   │   └── processing-logs/         ← FFmpeg instructions & metadata
 * │   └── 06-metadata/            ← FINAL OUTPUT
 * │       ├── youtube-metadata.json    ← YouTube upload details
 * │       ├── project-summary.json     ← Project completion status
 * │       ├── cost-tracking.json       ← AWS costs & resource usage
 * │       └── analytics.json           ← Performance metrics
 */

/**
 * Generate timestamp-based project folder name
 * @param {string} title - Short descriptive title for the video
 * @returns {string} Formatted folder name with timestamp
 */
function generateProjectFolderName(title) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, ''); // Remove milliseconds and timezone

  // Clean and format title
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .substring(0, 50); // Limit length

  return `${timestamp}_${cleanTitle}`;
}

/**
 * Generate S3 key paths for organized video project structure
 * @param {string} projectId - Project identifier
 * @param {string} title - Video title for folder naming
 * @returns {object} Object containing all S3 key paths
 */
function generateS3Paths(projectId, title) {
  const folderName = generateProjectFolderName(title);
  const basePath = `videos/${folderName}`;

  return {
    // Base paths
    basePath,
    folderName,

    // Context paths
    context: {
      base: `${basePath}/01-context`,
      topic: `${basePath}/01-context/topic-context.json`,
      scene: `${basePath}/01-context/scene-context.json`,
      media: `${basePath}/01-context/media-context.json`,
      audio: `${basePath}/01-context/audio-context.json`,
      video: `${basePath}/01-context/video-context.json`
    },

    // Script paths
    script: {
      base: `${basePath}/02-script`,
      json: `${basePath}/02-script/script.json`,
      text: `${basePath}/02-script/script.txt`,
      scenes: `${basePath}/02-script/scenes.json`
    },

    // Media paths
    media: {
      base: `${basePath}/03-media`,
      getScenePath: (sceneNumber) => `${basePath}/03-media/scene-${sceneNumber}`,
      getImagePath: (sceneNumber, mediaId) => `${basePath}/03-media/scene-${sceneNumber}/images/${mediaId}.jpg`,
      getVideoPath: (sceneNumber, mediaId) => `${basePath}/03-media/scene-${sceneNumber}/videos/${mediaId}.mp4`,
      manifest: `${basePath}/03-media/media-manifest.json`
    },

    // Audio paths
    audio: {
      base: `${basePath}/04-audio`,
      narration: `${basePath}/04-audio/narration.mp3`,
      segments: `${basePath}/04-audio/audio-segments`,
      getSegmentPath: (sceneNumber) => `${basePath}/04-audio/audio-segments/scene-${sceneNumber}.mp3`,
      metadata: `${basePath}/04-audio/audio-metadata.json`
    },

    // Video paths
    video: {
      base: `${basePath}/05-video`,
      final: `${basePath}/05-video/final-video.mp4`,
      processing: `${basePath}/05-video/processing-logs`,
      instructions: `${basePath}/05-video/processing-logs/ffmpeg-instructions.json`,
      manifest: `${basePath}/05-video/processing-logs/processing-manifest.json`
    },

    // Metadata paths
    metadata: {
      base: `${basePath}/06-metadata`,
      youtube: `${basePath}/06-metadata/youtube-metadata.json`,
      project: `${basePath}/06-metadata/project-summary.json`,
      costs: `${basePath}/06-metadata/cost-tracking.json`,
      analytics: `${basePath}/06-metadata/analytics.json`
    }
  };
}

/**
 * Get legacy S3 path for backward compatibility
 * @param {string} projectId - Project identifier
 * @param {string} type - Type of content (script, media, audio, etc.)
 * @param {string} filename - Filename
 * @returns {string} Legacy S3 key path
 */
function getLegacyPath(projectId, type, filename) {
  return `videos/${projectId}/${type}/${filename}`;
}

/**
 * Extract project info from folder name
 * @param {string} folderName - Folder name with timestamp and title
 * @returns {object} Extracted project information
 */
function parseProjectFolder(folderName) {
  const parts = folderName.split('_');
  if (parts.length < 3) {
    return { timestamp: null, title: folderName, isValid: false };
  }

  const datePart = parts[0];
  const timePart = parts[1];
  const titlePart = parts.slice(2).join('_');

  return {
    timestamp: `${datePart}_${timePart}`,
    title: titlePart.replace(/-/g, ' '),
    date: new Date(`${datePart}T${timePart.replace(/-/g, ':')}`),
    isValid: true
  };
}

/**
 * List all video projects in S3 bucket
 * @param {S3Client} s3Client - AWS S3 client
 * @param {string} bucketName - S3 bucket name
 * @returns {Promise<Array>} List of video projects with metadata
 */
async function listVideoProjects(s3Client, bucketName) {
  const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'videos/',
      Delimiter: '/'
    }));

    const projects = [];
    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        const folderName = prefix.Prefix.replace('videos/', '').replace('/', '');
        const projectInfo = parseProjectFolder(folderName);

        if (projectInfo.isValid) {
          projects.push({
            folderName,
            ...projectInfo,
            s3Prefix: prefix.Prefix
          });
        }
      }
    }

    // Sort by date (newest first)
    projects.sort((a, b) => b.date - a.date);

    return projects;
  } catch (error) {
    console.error('Error listing video projects:', error);
    return [];
  }
}

module.exports = {
  generateProjectFolderName,
  generateS3Paths,
  getLegacyPath,
  parseProjectFolder,
  listVideoProjects
};