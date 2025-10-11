/**
 * Standalone Media Curator Handler (no layer dependencies)
 */

const { randomUUID } = require('crypto');

const handler = async (event, context) => {
  console.log('Standalone Media Curator Handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse request
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { 
      projectId, 
      baseTopic, 
      sceneCount = 5,
      visualRequirements = []
    } = requestBody;

    if (!baseTopic) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'baseTopic is required'
        })
      };
    }

    console.log(`🎨 Curating media for topic: ${baseTopic}`);

    // Generate media suggestions (simplified for standalone version)
    const mediaAssets = [];
    for (let i = 1; i <= sceneCount; i++) {
      mediaAssets.push({
        sceneId: i,
        mediaType: 'image',
        searchQuery: `${baseTopic} scene ${i}`,
        suggestedKeywords: [`${baseTopic}`, 'professional', 'high-quality'],
        duration: 60,
        placement: 'background',
        source: 'pexels' // Would integrate with actual API in full version
      });
    }

    const mediaId = `media-${Date.now()}`;
    const finalProjectId = projectId || `project-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Store media assets to S3
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
    if (bucketName) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                
        const mediaKey = `videos/${finalProjectId}/03-media/media-assets.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: mediaKey,
          Body: JSON.stringify(mediaAssets, null, 2),
          ContentType: 'application/json'
        }));
                
        console.log(`✅ Stored media assets to S3: ${mediaKey}`);
      } catch (s3Error) {
        console.error('❌ Failed to store media assets to S3:', s3Error);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        projectId: finalProjectId,
        mediaId: mediaId,
        baseTopic: baseTopic,
        mediaAssets: mediaAssets,
        totalAssets: mediaAssets.length,
        scenesCovered: sceneCount,
        generatedAt: new Date().toISOString(),
        standalone: true
      })
    };

  } catch (error) {
    console.error('Media Curator error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Media curation failed',
        message: error.message
      })
    };
  }
};

module.exports = { handler };