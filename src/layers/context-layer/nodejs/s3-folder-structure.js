/**
 * S3 Folder Structure Utility
 * 
 * Provides organized folder structure for video projects with timestamps and clear organization.
 * Each video project gets its own folder with timestamp and descriptive title.
 * 
 * Structure:
 * videos/
 * ├── 2025-10-07_20-30-15_ai-tools-content-creation/
 * │   ├── 01-context/
 * │   │   ├── topic-context.json
 * │   │   ├── scene-context.json
 * │   │   └── media-context.json
 * │   ├── 02-script/
 * │   │   ├── script.json
 * │   │   └── script.txt
 * │   ├── 03-media/
 * │   │   ├── scene-1/
 * │   │   ├── scene-2/
 * │   │   └── scene-N/
 * │   ├── 04-audio/
 * │   │   ├── narration.mp3
 * │   │   └── audio-segments/
 * │   ├── 05-video/
 * │   │   ├── final-video.mp4
 * │   │   └── processing-logs/
 * │   └── 06-metadata/
 * │       ├── youtube-metadata.json
 * │       └── project-summary.json
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
    // ALWAYS use the provided projectId if it exists - don't generate a new one
    // The projectId should already be in the correct timestamp_{title} format
    const folderName = projectId || generateProjectFolderName(title || 'untitled');
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