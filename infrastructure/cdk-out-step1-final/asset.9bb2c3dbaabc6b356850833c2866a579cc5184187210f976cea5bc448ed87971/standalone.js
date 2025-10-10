/**
 * Standalone Script Generator Handler (no layer dependencies)
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Initialize clients
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));

const handler = async (event, context) => {
    console.log('Standalone Script Generator Handler invoked:', JSON.stringify(event, null, 2));

    try {
        // Parse request
        const requestBody = event.body ? JSON.parse(event.body) : {};
        const { 
            projectId, 
            baseTopic, 
            targetLength = 360, 
            videoStyle = 'informative and engaging',
            targetAudience = 'general'
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

        console.log(`📝 Generating script for topic: ${baseTopic}`);

        // Generate script using Bedrock
        const prompt = `You are a professional video script writer. Create an engaging ${targetLength}-second video script about "${baseTopic}" for ${targetAudience} audience in ${videoStyle} style.

Structure the script with:
1. Hook (first 15 seconds) - grab attention immediately
2. Main content (${Math.floor(targetLength * 0.8)} seconds) - deliver value
3. Conclusion (${Math.floor(targetLength * 0.15)} seconds) - call to action

Format as JSON:
{
  "title": "Engaging video title",
  "hook": "Attention-grabbing opening (15s)",
  "mainContent": [
    {
      "section": "Section 1 title",
      "content": "Section content",
      "duration": 60,
      "visualCues": ["Visual suggestion 1", "Visual suggestion 2"]
    }
  ],
  "conclusion": "Strong conclusion with CTA",
  "totalDuration": ${targetLength},
  "sceneCount": 5,
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "visualRequirements": ["Visual 1", "Visual 2", "Visual 3"]
}`;

        let scriptData;
        try {
            const response = await bedrockClient.send(new InvokeModelCommand({
                modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: 3000,
                    temperature: 0.7,
                    messages: [{ role: 'user', content: prompt }]
                })
            }));

            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiContent = responseBody.content[0].text;
            
            // Extract JSON from AI response
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                scriptData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (aiError) {
            console.log('AI generation failed, using fallback:', aiError.message);
            // Fallback script
            scriptData = {
                title: `Complete Guide to ${baseTopic}`,
                hook: `Are you ready to master ${baseTopic}? In the next ${targetLength} seconds, I'll show you everything you need to know.`,
                mainContent: [
                    {
                        section: "Introduction",
                        content: `Let's start with the basics of ${baseTopic}`,
                        duration: 60,
                        visualCues: ["Title screen", "Introduction graphics"]
                    },
                    {
                        section: "Key Points",
                        content: `Here are the most important aspects of ${baseTopic}`,
                        duration: 120,
                        visualCues: ["Key points animation", "Supporting visuals"]
                    },
                    {
                        section: "Practical Tips",
                        content: `Now let's look at practical applications`,
                        duration: 120,
                        visualCues: ["Demonstration", "Examples"]
                    }
                ],
                conclusion: `That's everything you need to know about ${baseTopic}. Subscribe for more guides like this!`,
                totalDuration: targetLength,
                sceneCount: 5,
                keyPoints: ["Key point 1", "Key point 2", "Key point 3"],
                visualRequirements: ["Graphics", "Text overlays", "B-roll footage"]
            };
        }

        const scriptId = `script-${Date.now()}`;
        const finalProjectId = projectId || `project-${Date.now()}-${randomUUID().slice(0, 8)}`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                projectId: finalProjectId,
                scriptId: scriptId,
                baseTopic: baseTopic,
                script: scriptData,
                sceneCount: scriptData.sceneCount,
                totalDuration: scriptData.totalDuration,
                generatedAt: new Date().toISOString(),
                standalone: true
            })
        };

    } catch (error) {
        console.error('Script Generator error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Script generation failed',
                message: error.message
            })
        };
    }
};

module.exports = { handler };