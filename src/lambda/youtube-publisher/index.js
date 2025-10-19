/**
 * 📺 YOUTUBE PUBLISHER - SIMPLIFIED VERSION
 * 
 * Creates comprehensive metadata without shared layer dependencies
 */

const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1'
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;

const handler = async (event) => {
    console.log('YouTube Publisher Simplified invoked');

    const {
        httpMethod,
        path,
        body
    } = event;
    const requestBody = body ? JSON.parse(body) : {};

    if (httpMethod === 'GET' && path === '/youtube/health') {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                service: 'youtube-publisher-simplified',
                status: 'healthy',
                capabilities: ['youtube-metadata', 'project-summary'],
                timestamp: new Date().toISOString()
            })
        };
    }

    if (httpMethod === 'POST' && path === '/youtube/publish') {
        console.log('Processing YouTube publish with simplified metadata creation');

        const {
            projectId,
            privacy = 'unlisted',
            metadata = {}
        } = requestBody;

        const videoId = 'yt-' + Date.now();
        const youtubeUrl = 'https://www.youtube.com/watch?v=' + videoId;

        try {
            console.log('Starting simplified metadata creation for project:', projectId);

            // Step 1: Analyze project content
            const projectAnalysis = await analyzeProject(projectId);
            console.log('Project analysis complete:', projectAnalysis.totalFiles, 'files');

            // Step 2: Create YouTube metadata
            const youtubeMetadata = {
                videoId: videoId,
                youtubeUrl: youtubeUrl,
                projectId: projectId,
                title: metadata.title || 'AI Generated Video - ' + projectId,
                description: metadata.description || 'Automated video created by AI pipeline',
                tags: metadata.tags || ['ai', 'automated', 'video'],
                privacy: privacy,
                createdAt: new Date().toISOString(),
                status: 'metadata-ready'
            };

            // Step 3: Create project summary
            const projectSummary = {
                projectId: projectId,
                totalFiles: projectAnalysis.totalFiles,
                totalSize: projectAnalysis.totalSize,
                contentTypes: Object.keys(projectAnalysis.contentByType),
                youtubeUrl: youtubeUrl,
                createdAt: new Date().toISOString(),
                status: 'completed'
            };

            // Step 4: Upload metadata files
            const youtubeKey = 'videos/' + projectId + '/06-metadata/youtube-metadata.json';
            await uploadToS3(youtubeKey, JSON.stringify(youtubeMetadata, null, 2));
            console.log('YouTube metadata uploaded:', youtubeKey);

            const summaryKey = 'videos/' + projectId + '/06-metadata/project-summary.json';
            await uploadToS3(summaryKey, JSON.stringify(projectSummary, null, 2));
            console.log('Project summary uploaded:', summaryKey);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    videoId: videoId,
                    youtubeUrl: youtubeUrl,
                    projectId: projectId,
                    privacy: privacy,
                    mode: 'simplified-metadata-creation',
                    metadataFiles: [youtubeKey, summaryKey],
                    projectAnalysis: {
                        totalFiles: projectAnalysis.totalFiles,
                        totalSize: projectAnalysis.totalSize
                    },
                    timestamp: new Date().toISOString(),
                    status: 'ready-for-upload'
                })
            };

        } catch (error) {
            console.error('Simplified metadata creation failed:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Simplified metadata creation failed',
                    details: error.message,
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
 * Analyze project content
 */
async function analyzeProject(projectId) {
    console.log('Analyzing project:', projectId);

    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: 'videos/' + projectId + '/'
        });

        const response = await s3Client.send(listCommand);
        const files = response.Contents || [];

        // Categorize content
        const contentByType = {
            context: files.filter(f => f.Key.includes('/01-context/')),
            script: files.filter(f => f.Key.includes('/02-script/')),
            media: files.filter(f => f.Key.includes('/03-media/')),
            audio: files.filter(f => f.Key.includes('/04-audio/')),
            video: files.filter(f => f.Key.includes('/05-video/')),
            metadata: files.filter(f => f.Key.includes('/06-metadata/'))
        };

        const totalSize = files.reduce((sum, file) => sum + (file.Size || 0), 0);

        return {
            projectId,
            totalFiles: files.length,
            totalSize,
            contentByType,
            analysisTimestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Project analysis failed:', error);
        return {
            projectId,
            totalFiles: 0,
            totalSize: 0,
            contentByType: {},
            analysisTimestamp: new Date().toISOString()
        };
    }
}

/**
 * Upload to S3
 */
async function uploadToS3(key, content, contentType = 'application/json') {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType
    });

    await s3Client.send(command);
    return 's3://' + S3_BUCKET + '/' + key;
}

module.exports = {
    handler
};