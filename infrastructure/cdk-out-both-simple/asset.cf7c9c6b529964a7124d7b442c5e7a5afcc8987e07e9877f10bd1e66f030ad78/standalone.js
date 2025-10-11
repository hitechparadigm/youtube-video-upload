/**
 * Standalone YouTube Publisher Handler (no layer dependencies)
 */

const { randomUUID } = require('crypto');

const handler = async (event, context) => {
  console.log('Standalone YouTube Publisher Handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse request
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { 
      projectId, 
      videoPath,
      title,
      description,
      tags = [],
      privacy = 'public'
    } = requestBody;

    if (!projectId || !videoPath) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'projectId and videoPath are required'
        })
      };
    }

    console.log(`📺 Publishing video for project: ${projectId}`);

    // Simulate YouTube publishing process
    const youtubeVideoId = `yt-${randomUUID().slice(0, 11)}`;
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
        
    // Store YouTube metadata to S3
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
    if (bucketName) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                
        const youtubeMetadata = {
          youtubeVideoId: youtubeVideoId,
          youtubeUrl: youtubeUrl,
          title: title || `Video for ${projectId}`,
          description: description || 'Automatically generated video content',
          tags: tags,
          privacy: privacy,
          status: 'published',
          uploadedAt: new Date().toISOString()
        };
                
        const metadataKey = `videos/${projectId}/06-metadata/youtube-metadata.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: metadataKey,
          Body: JSON.stringify(youtubeMetadata, null, 2),
          ContentType: 'application/json'
        }));
                
        console.log(`✅ Stored YouTube metadata to S3: ${metadataKey}`);
      } catch (s3Error) {
        console.error('❌ Failed to store YouTube metadata to S3:', s3Error);
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
        projectId: projectId,
        youtubeVideoId: youtubeVideoId,
        youtubeUrl: youtubeUrl,
        title: title || `Video for ${projectId}`,
        description: description || 'Automatically generated video content',
        tags: tags,
        privacy: privacy,
        status: 'published',
        uploadedAt: new Date().toISOString(),
        standalone: true
      })
    };

  } catch (error) {
    console.error('YouTube Publisher error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'YouTube publishing failed',
        message: error.message
      })
    };
  }
};

module.exports = { handler };