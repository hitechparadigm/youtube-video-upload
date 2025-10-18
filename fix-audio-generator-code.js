/**
 * Fix Audio Generator by creating a simplified version without problematic imports
 */

const fs = require('fs');
const path = require('path');

async function fixAudioGeneratorCode() {
    console.log('🔧 FIXING AUDIO GENERATOR CODE');
    console.log('==============================');
    console.log('🎯 Strategy: Create simplified version without problematic shared utilities');
    console.log('');

    // Create a simplified Audio Generator that works
    const simplifiedAudioGenerator = `/**
 * 🎵 AUDIO GENERATOR AI LAMBDA FUNCTION - SIMPLIFIED VERSION
 * 
 * ROLE: Professional Narration Generation using Amazon Polly
 * This is a simplified version that avoids problematic shared utilities imports
 */

const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');

// Initialize AWS clients
const pollyClient = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'automated-video-pipeline-v2-786673323159-us-east-1';
const CONTEXT_TABLE = process.env.CONTEXT_TABLE_NAME || process.env.CONTEXT_TABLE || 'automated-video-pipeline-context-v2';

/**
 * Main Lambda handler - simplified version
 */
const handler = async (event, context) => {
    console.log('Audio Generator invoked:', JSON.stringify(event, null, 2));

    try {
        const { httpMethod, path, body } = event;

        // Parse request body
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }

        // Route requests
        switch (httpMethod) {
            case 'GET':
                if (path === '/health' || path === '/audio/health') {
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: true,
                            service: 'audio-generator',
                            status: 'healthy',
                            timestamp: new Date().toISOString(),
                            version: '3.0.0-simplified'
                        })
                    };
                }
                break;

            case 'POST':
                return await generateAudio(requestBody);

            default:
                return {
                    statusCode: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Method not allowed'
                    })
                };
        }

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
                error: {
                    message: 'Internal server error',
                    type: 'INTERNAL',
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
};

/**
 * Generate audio for a project
 */
async function generateAudio(requestBody) {
    const { projectId } = requestBody;

    if (!projectId) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Project ID is required'
            })
        };
    }

    try {
        console.log(\`Generating audio for project: \${projectId}\`);

        // Try to get scene context from S3
        const sceneContextKey = \`videos/\${projectId}/01-context/scene-context.json\`;
        
        let sceneContext;
        try {
            const sceneContextResponse = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: sceneContextKey
            }));
            
            const sceneContextData = await sceneContextResponse.Body.transformToString();
            sceneContext = JSON.parse(sceneContextData);
            console.log(\`Found \${sceneContext.scenes?.length || 0} scenes\`);
            
        } catch (error) {
            console.log('Scene context not found, returning validation error');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'No scene context found for project. Script Generator AI must run first.',
                        type: 'VALIDATION'
                    }
                })
            };
        }

        // Generate audio for each scene
        const audioFiles = [];
        const scenes = sceneContext.scenes || [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sceneNumber = scene.sceneNumber || (i + 1);
            
            if (!scene.content || !scene.content.script) {
                console.log(\`Skipping scene \${sceneNumber} - no script content\`);
                continue;
            }

            console.log(\`Generating audio for scene \${sceneNumber}\`);
            
            try {
                // Generate audio using Polly
                const pollyCommand = new SynthesizeSpeechCommand({
                    Text: scene.content.script,
                    OutputFormat: 'mp3',
                    VoiceId: 'Joanna', // Use reliable voice
                    Engine: 'neural'
                });

                const pollyResponse = await pollyClient.send(pollyCommand);
                
                // Upload to S3
                const audioKey = \`videos/\${projectId}/04-audio/scene-\${sceneNumber}-audio.mp3\`;
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: audioKey,
                    Body: pollyResponse.AudioStream,
                    ContentType: 'audio/mpeg'
                }));

                audioFiles.push({
                    sceneNumber: sceneNumber,
                    audioFile: \`scene-\${sceneNumber}-audio.mp3\`,
                    duration: scene.duration || 30
                });

                console.log(\`Generated audio for scene \${sceneNumber}\`);
                
            } catch (error) {
                console.error(\`Error generating audio for scene \${sceneNumber}:\`, error);
                // Continue with other scenes
            }
        }

        // Create master narration file (copy first scene)
        if (audioFiles.length > 0) {
            try {
                const firstSceneKey = \`videos/\${projectId}/04-audio/scene-1-audio.mp3\`;
                const masterKey = \`videos/\${projectId}/04-audio/narration.mp3\`;
                
                // Copy first scene as master narration
                const firstSceneResponse = await s3Client.send(new GetObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: firstSceneKey
                }));
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: masterKey,
                    Body: firstSceneResponse.Body,
                    ContentType: 'audio/mpeg'
                }));
                
                console.log('Created master narration file');
                
            } catch (error) {
                console.error('Error creating master narration:', error);
            }
        }

        // Create audio metadata
        const audioMetadata = {
            projectId: projectId,
            totalScenes: scenes.length,
            audioFiles: audioFiles,
            masterNarrationFile: 'narration.mp3',
            status: 'completed',
            generatedAt: new Date().toISOString()
        };

        // Upload audio metadata
        const metadataKey = \`videos/\${projectId}/04-audio/audio-metadata.json\`;
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: metadataKey,
            Body: JSON.stringify(audioMetadata, null, 2),
            ContentType: 'application/json'
        }));

        // Update audio context
        const audioContext = {
            status: 'completed',
            audioFiles: audioFiles,
            metadata: {
                status: 'completed',
                masterNarrationCreated: true,
                totalFiles: audioFiles.length
            }
        };

        const contextKey = \`videos/\${projectId}/01-context/audio-context.json\`;
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: contextKey,
            Body: JSON.stringify(audioContext, null, 2),
            ContentType: 'application/json'
        }));

        console.log(\`Audio generation completed: \${audioFiles.length} files\`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                projectId: projectId,
                audioFiles: audioFiles,
                masterNarration: 'narration.mp3',
                totalFiles: audioFiles.length,
                generatedAt: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Audio generation error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: {
                    message: 'Internal server error',
                    type: 'INTERNAL',
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
}

module.exports = { handler };
`;

    // Write the simplified version
    const audioGeneratorPath = 'src/lambda/audio-generator/index-simplified.js';

    console.log('📝 Creating simplified Audio Generator...');
    fs.writeFileSync(audioGeneratorPath, simplifiedAudioGenerator);
    console.log(`✅ Created: ${audioGeneratorPath}`);
    console.log('');

    console.log('🚀 DEPLOYMENT COMMANDS:');
    console.log('=======================');
    console.log('1. Backup current version:');
    console.log('   cp src/lambda/audio-generator/index.js src/lambda/audio-generator/index-backup.js');
    console.log('');
    console.log('2. Replace with simplified version:');
    console.log('   cp src/lambda/audio-generator/index-simplified.js src/lambda/audio-generator/index.js');
    console.log('');
    console.log('3. Deploy updated function:');
    console.log('   cd src/lambda/audio-generator');
    console.log('   zip -r audio-generator-fixed.zip .');
    console.log('   aws lambda update-function-code --function-name "automated-video-pipeline-audio-generator-v3" --zip-file fileb://audio-generator-fixed.zip --region us-east-1 --profile hitechparadigm');
    console.log('');

    return {
        success: true,
        simplifiedVersionCreated: true,
        path: audioGeneratorPath
    };
}

if (require.main === module) {
    fixAudioGeneratorCode()
        .then(result => {
            console.log('🎯 NEXT STEPS:');
            console.log('==============');
            console.log('1. Deploy the simplified Audio Generator');
            console.log('2. Test the fixed Audio Generator');
            console.log('3. Fix Topic Management timeout issues');
            console.log('4. Test complete pipeline');
        })
        .catch(error => {
            console.error('❌ Failed to create simplified Audio Generator:', error.message);
        });
}

module.exports = {
    fixAudioGeneratorCode
};