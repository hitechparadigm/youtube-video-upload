/**
 * Standalone Topic Management Handler (no layer dependencies)
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Initialize clients
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));

const handler = async (event, context) => {
  console.log('Standalone Topic Management Handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse request - handle both API Gateway and direct Lambda invocation
    let requestBody;
    if (event.body) {
      // API Gateway format
      requestBody = JSON.parse(event.body);
    } else if (event.httpMethod) {
      // Direct Lambda invocation from workflow orchestrator
      requestBody = event;
    } else {
      // Direct object
      requestBody = event;
    }
        
    const { baseTopic, targetAudience = 'general', projectId } = requestBody;

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

    console.log(`🎯 Generating enhanced context for topic: ${baseTopic}`);

    // Generate AI context using Bedrock
    const prompt = `You are an expert content strategist. Analyze the topic "${baseTopic}" for ${targetAudience} audience.

Provide a JSON response with:
{
  "selectedTopic": "${baseTopic}",
  "expandedTopics": ["subtopic1", "subtopic2", "subtopic3", "subtopic4", "subtopic5"],
  "seoContext": {
    "primaryKeywords": ["keyword1", "keyword2", "keyword3"],
    "longTailKeywords": ["long tail 1", "long tail 2"],
    "trendingTerms": ["trend1", "trend2"]
  },
  "videoStructure": {
    "recommendedScenes": 5,
    "totalDuration": 360,
    "hookDuration": 15,
    "mainContentDuration": 300,
    "conclusionDuration": 45
  },
  "contentGuidance": {
    "quickWins": ["tip1", "tip2"],
    "visualOpportunities": ["visual1", "visual2"],
    "emotionalBeats": ["connection1", "connection2"]
  }
}`;

    let topicContext;
    try {
      const response = await bedrockClient.send(new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        })
      }));

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const aiContent = responseBody.content[0].text;
            
      // Extract JSON from AI response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        topicContext = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (aiError) {
      console.log('AI generation failed, using fallback:', aiError.message);
      // Fallback context
      topicContext = {
        selectedTopic: baseTopic,
        expandedTopics: [
          `Essential guide to ${baseTopic}`,
          `Best practices for ${baseTopic}`,
          `Common mistakes in ${baseTopic}`,
          `Advanced tips for ${baseTopic}`,
          `Future of ${baseTopic}`
        ],
        seoContext: {
          primaryKeywords: [baseTopic, 'guide', '2025'],
          longTailKeywords: [`best ${baseTopic} guide`, `how to ${baseTopic}`],
          trendingTerms: ['trending', 'popular', 'latest']
        },
        videoStructure: {
          recommendedScenes: 5,
          totalDuration: 360,
          hookDuration: 15,
          mainContentDuration: 300,
          conclusionDuration: 45
        },
        contentGuidance: {
          quickWins: ['Quick tip 1', 'Quick tip 2'],
          visualOpportunities: ['Visual 1', 'Visual 2'],
          emotionalBeats: ['Connection 1', 'Connection 2']
        }
      };
    }

    const finalProjectId = projectId || `project-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Store context to S3
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
    if (bucketName) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                
        const contextKey = `videos/${finalProjectId}/01-context/topic-context.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: contextKey,
          Body: JSON.stringify(topicContext, null, 2),
          ContentType: 'application/json'
        }));
                
        console.log(`✅ Stored context to S3: ${contextKey}`);
      } catch (s3Error) {
        console.error('❌ Failed to store context to S3:', s3Error);
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
        baseTopic: baseTopic,
        topicContext: topicContext,
        contextStored: true,
        generatedAt: new Date().toISOString(),
        standalone: true
      })
    };

  } catch (error) {
    console.error('Topic Management error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Topic management failed',
        message: error.message
      })
    };
  }
};

module.exports = { handler };