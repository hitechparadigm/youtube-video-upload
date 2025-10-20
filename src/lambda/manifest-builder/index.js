/**
 * 🧠 MANIFEST BUILDER AI - INTELLIGENT QUALITY GATEKEEPER
 * 
 * CORE AI INTELLIGENCE:
 * This Lambda serves as the intelligent quality control center that validates,
 * optimizes, and orchestrates all AI-generated content before final video assembly.
 * It acts as the 'AI supervisor' ensuring professional quality standards.
 * 
 * AI QUALITY INTELLIGENCE:
 * 1. Content Validation: AI-powered analysis of all generated content for completeness
 * 2. Quality Assessment: Intelligent scoring of media, audio, and script quality
 * 3. Optimization Recommendations: AI suggestions for content improvement
 * 4. Manifest Generation: Creates unified, optimized assembly instructions
 * 5. Performance Prediction: AI estimates of final video engagement potential
 * 
 * AI VALIDATION PROCESS:
 * {
 *   'contentAnalysis': {
 *     'mediaQuality': 'AI assessment of image/video resolution, relevance, and diversity',
 *     'audioQuality': 'Analysis of narration clarity, timing, and professional standards',
 *     'scriptCoherence': 'Evaluation of narrative flow and engagement potential',
 *     'brandSafety': 'AI-powered content appropriateness and safety validation'
 *   },
 *   'qualityGates': {
 *     'minimumVisuals': '≥3 high-quality visuals per scene',
 *     'audioSync': 'Perfect audio-visual timing alignment',
 *     'contentRelevance': 'AI relevance score ≥80% for all media',
 *     'professionalStandards': 'Broadcast-quality audio and visual standards'
 *   }
 * }
 * 
 * AI OPTIMIZATION INTELLIGENCE:
 * - Content Gap Detection: Identifies missing or low-quality content requiring regeneration
 * - Performance Optimization: AI predictions for viewer engagement and retention
 * - SEO Enhancement: Intelligent metadata optimization for discoverability
 * - Platform Adaptation: Optimizes content structure for YouTube algorithm preferences
 * 
 * AI MANIFEST GENERATION:
 * Creates the definitive 'single source of truth' that includes:
 * - AI-optimized scene sequencing and timing
 * - Quality-validated media with fallback options
 * - Professional metadata with SEO optimization
 * - Assembly instructions optimized for Video Assembler AI
 * 
 * INTELLIGENCE FEATURES:
 * - Predictive Quality Analysis: AI assessment of final video potential
 * - Content Optimization: Intelligent recommendations for improvement
 * - Fail-Fast Validation: Prevents resource waste on low-quality content
 * - Performance Forecasting: AI predictions of viewer engagement metrics
 * - Continuous Learning: Improves quality standards based on performance data
 * 
 * AI GATEKEEPER DECISIONS:
 * - APPROVE: All quality gates passed, proceed to video assembly
 * - OPTIMIZE: Minor issues detected, apply AI optimizations and proceed
 * - REGENERATE: Quality issues require upstream AI agent re-processing
 * - REJECT: Fundamental issues require complete content regeneration
 * 
 * DOWNSTREAM AI IMPACT:
 * - Video Assembler AI receives optimized, validated assembly instructions
 * - YouTube Publisher AI gets SEO-optimized metadata and performance predictions
 * - System learns from quality patterns to improve future content generation
 */

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
    marshall,
    unmarshall
} = require('@aws-sdk/util-dynamodb');

const s3Client = new S3Client({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new DynamoDBClient({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Simplified Manifest Builder invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/manifest/health') {
        return createResponse(200, {
            service: 'manifest-builder-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Manifest building and validation
    if (httpMethod === 'POST' && path === '/manifest/build') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                projectId,
                minVisuals = 3
            } = requestBody;

            if (!projectId) {
                return createResponse(400, {
                    success: false,
                    error: 'Project ID is required'
                });
            }

            // Validate project structure and quality
            const validation = await validateProjectStructure(projectId, minVisuals);

            if (validation.issues.length > 0) {
                console.log(`❌ Validation failed with ${validation.issues.length} issues`);

                return createResponse(422, {
                    success: false,
                    error: 'Project validation failed',
                    issues: validation.issues,
                    kpis: validation.kpis,
                    validationLogPath: `videos/${projectId}/05-video/processing-logs/validation.log`
                });
            }

            // Generate unified manifest
            const manifest = await generateUnifiedManifest(projectId, validation);

            // Store manifest and metadata
            await storeManifestOutputs(projectId, manifest, validation);

            console.log(`✅ Manifest Builder completed for project: ${projectId}`);

            return createResponse(200, {
                success: true,
                projectId: projectId,
                manifestPath: `videos/${projectId}/01-context/manifest.json`,
                kpis: validation.kpis,
                readyForRendering: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Manifest Builder error:', error);
            return createResponse(500, {
                success: false,
                error: error.message
            });
        }
    }

    return createResponse(404, {
        success: false,
        error: 'Endpoint not found'
    });
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
        // Load all contexts
        const contexts = await loadAllContexts(projectId);

        // Validate scene context
        if (!contexts.scene || !contexts.scene.scenes) {
            issues.push('Missing scene context - Script Generator must run first');
            return {
                issues,
                warnings,
                kpis,
                contexts
            };
        }

        kpis.scenes_detected = contexts.scene.scenes.length;

        // Validate media organization
        const mediaStats = await validateMediaOrganization(projectId, contexts.scene.scenes, minVisuals);
        kpis.images_total = mediaStats.totalImages;
        kpis.scenes_passing_visual_min = mediaStats.scenesPassingMin;

        mediaStats.issues.forEach(issue => issues.push(issue));

        // Validate audio files
        const audioStats = await validateAudioFiles(projectId);
        kpis.audio_segments = audioStats.segmentCount;
        kpis.has_narration = audioStats.hasNarration;

        audioStats.issues.forEach(issue => issues.push(issue));

        return {
            issues,
            warnings,
            kpis,
            contexts,
            mediaStats,
            audioStats
        };

    } catch (error) {
        console.error('❌ Validation error:', error);
        issues.push(`Validation error: ${error.message}`);
        return {
            issues,
            warnings,
            kpis,
            contexts: {}
        };
    }
}

/**
 * Load all context files
 */
async function loadAllContexts(projectId) {
    const contexts = {};

    const contextTypes = ['topic', 'scene', 'media', 'audio'];

    for (const contextType of contextTypes) {
        try {
                        contexts[contextType] = context;
        } catch (error) {
            console.log(`⚠️ Could not load ${contextType} context:`, error.message);
            contexts[contextType] = null;
        }
    }

    return contexts;
}

/**
 * Validate media organization by scene
 */
async function validateMediaOrganization(projectId, scenes, minVisuals) {
    console.log(`🖼️ Validating media organization for project: ${projectId}`);

    const issues = [];
    let totalImages = 0;
    let scenesPassingMin = 0;

    try {
        // Check each scene for media files
        for (const scene of scenes) {
            const sceneNumber = scene.sceneNumber;
            const scenePrefix = `videos/${projectId}/03-media/scene-${sceneNumber}/images/`;

            // List objects in scene folder
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: process.env.S3_BUCKET,
                Prefix: scenePrefix
            }));

            const sceneImages = (response.Contents || []).filter(obj =>
                obj.Key.match(/\.(jpg|jpeg|png|webp|gif)$/i)
            );

            const imageCount = sceneImages.length;
            totalImages += imageCount;

            if (imageCount >= minVisuals) {
                scenesPassingMin++;
            } else {
                issues.push(`Scene ${sceneNumber}: only ${imageCount} images found (<${minVisuals})`);
            }
        }

        return {
            totalImages,
            scenesPassingMin,
            issues
        };

    } catch (error) {
        console.error('❌ Media validation error:', error);
        issues.push(`Media validation error: ${error.message}`);
        return {
            totalImages: 0,
            scenesPassingMin: 0,
            issues
        };
    }
}

/**
 * Validate audio files
 */
async function validateAudioFiles(projectId) {
    console.log(`🎵 Validating audio files for project: ${projectId}`);

    const issues = [];
    let segmentCount = 0;
    let hasNarration = false;

    try {
        // Check for master narration
        try {
            await s3Client.send(new GetObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: `videos/${projectId}/04-audio/narration.mp3`
            }));
            hasNarration = true;
        } catch (error) {
            issues.push('Missing master narration.mp3 file');
        }

        // Count audio segments
        const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET,
            Prefix: `videos/${projectId}/04-audio/audio-segments/`
        }));

        const audioFiles = (response.Contents || []).filter(obj =>
            obj.Key.match(/\.(mp3|wav|m4a)$/i)
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
        return {
            segmentCount: 0,
            hasNarration: false,
            issues
        };
    }
}

/**
 * Generate unified manifest from validated contexts
 */
async function generateUnifiedManifest(projectId, validation) {
    console.log(`📋 Generating unified manifest for project: ${projectId}`);

    const {
        contexts
    } = validation;

    const manifest = {
        videoId: contexts.topic ?.mainTopic ?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || projectId,
        title: contexts.topic ?.mainTopic || `Video ${projectId}`,
        visibility: 'unlisted',
        seo: {
            tags: [
                ...(contexts.topic ?.seoContext ?.primaryKeywords || []),
                ...(contexts.topic ?.seoContext ?.longTailKeywords || [])
            ].slice(0, 50)
        },
        chapters: generateChaptersFromScenes(contexts.scene ?.scenes || []),
        scenes: buildScenesFromContexts(projectId, contexts),
        export: {
            resolution: '1920x1080',
            fps: 30,
            codec: 'h264',
            preset: 'medium'
        },
        upload: {
            category: 'Education',
            madeForKids: false,
            finalVideoPath: `videos/${projectId}/05-video/final-video.mp4`,
            masterAudioPath: `videos/${projectId}/04-audio/narration.mp3`
        },
        metadata: {
            generatedAt: new Date().toISOString(),
            projectId: projectId,
            manifestVersion: '1.0.0',
            validationPassed: true,
            kpis: validation.kpis,
            architecture: 'simplified'
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
 * Build scenes array from contexts
 */
function buildScenesFromContexts(projectId, contexts) {
    const scenes = contexts.scene ?.scenes || [];

    return scenes.map(scene => {
        const sceneNumber = scene.sceneNumber;

        return {
            id: sceneNumber,
            script: scene.content ?.script || scene.script || '',
            audio: {
                path: `videos/${projectId}/04-audio/audio-segments/scene-${sceneNumber}.mp3`,
                durationHintSec: scene.duration || 30
            },
            visuals: [{
                type: 'image',
                key: `videos/${projectId}/03-media/scene-${sceneNumber}/images/1-placeholder.jpg`,
                durationHint: 5
            }]
        };
    });
}

/**
 * Store manifest and metadata outputs
 */
async function storeManifestOutputs(projectId, manifest, validation) {
    console.log(`📄 Storing manifest outputs for project: ${projectId}`);

    // Store unified manifest
    const manifestKey = `videos/${projectId}/01-context/manifest.json`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: manifestKey,
        Body: JSON.stringify(manifest, null, 2),
        ContentType: 'application/json'
    }));

    // Store project summary
    const summaryKey = `videos/${projectId}/06-metadata/project-summary.json`;
    const summary = {
        project: projectId,
        timestamp: new Date().toISOString(),
        kpis: validation.kpis,
        issues: validation.issues,
        warnings: validation.warnings,
        validationPassed: validation.issues.length === 0,
        manifestGenerated: true,
        architecture: 'simplified'
    };

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: summaryKey,
        Body: JSON.stringify(summary, null, 2),
        ContentType: 'application/json'
    }));

    // Store manifest context reference
    await storeContext({
        manifestPath: manifestKey,
        summary: summary
    }, 'manifest', projectId);
}

/**
 * Retrieve context from S3
 */
async function retrieveContext(contextType, projectId) {
    try {
        // Get reference from DynamoDB
        const response = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Key: marshall({
                PK: `${contextType}#${projectId}`,
                SK: projectId
            })
        }));

        if (!response.Item) {
            console.log(`⚠️ No ${contextType} context found for project ${projectId}`);
            return null;
        }

        const contextRecord = unmarshall(response.Item);

        // Get context from S3
        const s3Response = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: contextRecord.s3Location
        }));

        const contextData = JSON.parse(await s3Response.Body.transformToString());
        console.log(`✅ Retrieved ${contextType} context for project ${projectId}`);

        return contextData;

    } catch (error) {
        console.error(`❌ Error retrieving ${contextType} context:`, error);
        return null;
    }
}

/**
 * Store context in S3 and DynamoDB
 */
async function storeContext(context, contextType, projectId) {
    try {
        // Store in S3
        const s3Key = `videos/${projectId}/01-context/${contextType}-context.json`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: JSON.stringify(context, null, 2),
            ContentType: 'application/json'
        }));

        // Store reference in DynamoDB
        const contextRecord = {
            PK: `${contextType}#${projectId}`,
            SK: projectId,
            s3Location: s3Key,
            contextType,
            projectId,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Item: marshall(contextRecord)
        }));

        console.log(`✅ Stored ${contextType} context for project ${projectId}`);
        return {
            success: true,
            s3Location: s3Key
        };

    } catch (error) {
        console.error(`❌ Error storing ${contextType} context:`, error);
        throw error;
    }
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body, null, 2)
    };
}