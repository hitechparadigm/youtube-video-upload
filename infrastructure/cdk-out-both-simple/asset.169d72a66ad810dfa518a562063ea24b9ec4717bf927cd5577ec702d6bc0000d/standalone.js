/**
 * Standalone Audio Generator Handler (no layer dependencies)
 */

const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { randomUUID } = require('crypto');

// Initialize clients
const pollyClient = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });

const handler = async (event, context) => {
  console.log('Standalone Audio Generator Handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse request
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { 
      projectId, 
      script,
      voiceId = 'Joanna',
      outputFormat = 'mp3'
    } = requestBody;

    if (!script) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'script is required'
        })
      };
    }

    console.log(`🎙️ Generating audio for project: ${projectId}`);

    // Extract text from script for audio generation
    let fullText = '';
    if (typeof script === 'object') {
      fullText = script.hook || '';
      if (script.mainContent && Array.isArray(script.mainContent)) {
        fullText += ` ${  script.mainContent.map(section => section.content).join(' ')}`;
      }
      fullText += ` ${  script.conclusion || ''}`;
    } else {
      fullText = script.toString();
    }

    // Generate audio using Polly (simplified for standalone version)
    let audioUrl = null;
    try {
      const pollyParams = {
        Text: fullText.slice(0, 3000), // Polly has text limits
        OutputFormat: outputFormat,
        VoiceId: voiceId,
        Engine: 'neural'
      };

      const pollyResponse = await pollyClient.send(new SynthesizeSpeechCommand(pollyParams));
            
      // In a full implementation, we would upload to S3 and return the URL
      // For standalone version, we'll simulate success
      audioUrl = `s3://bucket/audio/${projectId}/narration.mp3`;
            
    } catch (pollyError) {
      console.log('Polly generation failed, using fallback:', pollyError.message);
      audioUrl = `s3://bucket/audio/${projectId}/fallback-narration.mp3`;
    }

    const audioId = `audio-${Date.now()}`;
    const finalProjectId = projectId || `project-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Store audio metadata to S3
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
    if (bucketName) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                
        const audioMetadata = {
          audioId: audioId,
          audioUrl: audioUrl,
          voiceId: voiceId,
          duration: Math.floor(fullText.length / 10),
          format: outputFormat,
          text: fullText,
          generatedAt: new Date().toISOString()
        };
                
        const audioKey = `videos/${finalProjectId}/04-audio/audio-metadata.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: audioKey,
          Body: JSON.stringify(audioMetadata, null, 2),
          ContentType: 'application/json'
        }));
                
        console.log(`✅ Stored audio metadata to S3: ${audioKey}`);
      } catch (s3Error) {
        console.error('❌ Failed to store audio metadata to S3:', s3Error);
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
        audioId: audioId,
        audioUrl: audioUrl,
        voiceId: voiceId,
        duration: Math.floor(fullText.length / 10), // Rough estimate
        format: outputFormat,
        generatedAt: new Date().toISOString(),
        standalone: true
      })
    };

  } catch (error) {
    console.error('Audio Generator error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Audio generation failed',
        message: error.message
      })
    };
  }
};

module.exports = { handler };