const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const s3 = new AWS.S3();

async function fixAudioSegmentsLocation() {
    console.log('🔧 Moving audio files to correct segments directory...');

    const projectId = '2025-10-17T00-26-06_travel-to-peru';
    const bucket = 'automated-video-pipeline-v2-786673323159-us-east-1';

    // The Manifest Builder expects audio segments in: videos/${projectId}/04-audio/audio-segments/
    // But our files are in: videos/${projectId}/04-audio/

    const audioFiles = [
        'scene-1-audio.mp3',
        'scene-2-audio.mp3',
        'scene-3-audio.mp3',
        'scene-4-audio.mp3'
    ];

    try {
        // Copy each audio file to the audio-segments directory
        for (const audioFile of audioFiles) {
            const sourceKey = `videos/${projectId}/04-audio/${audioFile}`;
            const targetKey = `videos/${projectId}/04-audio/audio-segments/${audioFile}`;

            await s3.copyObject({
                Bucket: bucket,
                CopySource: `${bucket}/${sourceKey}`,
                Key: targetKey
            }).promise();

            console.log(`✅ Copied ${audioFile} to audio-segments/`);
        }

        // Also copy the scene files with the expected naming pattern
        for (let i = 1; i <= 4; i++) {
            const sourceKey = `videos/${projectId}/04-audio/scene-${i}-audio.mp3`;
            const targetKey = `videos/${projectId}/04-audio/audio-segments/scene-${i}.mp3`;

            await s3.copyObject({
                Bucket: bucket,
                CopySource: `${bucket}/${sourceKey}`,
                Key: targetKey
            }).promise();

            console.log(`✅ Created scene-${i}.mp3 in audio-segments/`);
        }

        // Update the audio context to reference the correct paths
        const updatedAudioContext = {
            projectId: projectId,
            status: 'completed',
            voiceSelected: {
                name: 'Ruth',
                type: 'generative',
                language: 'en-US',
                gender: 'Female'
            },
            scenesPlanned: 4,
            audioSegments: [{
                    sceneNumber: 1,
                    s3Key: `videos/${projectId}/04-audio/audio-segments/scene-1.mp3`,
                    duration: 15
                },
                {
                    sceneNumber: 2,
                    s3Key: `videos/${projectId}/04-audio/audio-segments/scene-2.mp3`,
                    duration: 120
                },
                {
                    sceneNumber: 3,
                    s3Key: `videos/${projectId}/04-audio/audio-segments/scene-3.mp3`,
                    duration: 120
                },
                {
                    sceneNumber: 4,
                    s3Key: `videos/${projectId}/04-audio/audio-segments/scene-4.mp3`,
                    duration: 45
                }
            ],
            audioFiles: [{
                    sceneNumber: 1,
                    audioFile: `videos/${projectId}/04-audio/audio-segments/scene-1.mp3`,
                    duration: 15
                },
                {
                    sceneNumber: 2,
                    audioFile: `videos/${projectId}/04-audio/audio-segments/scene-2.mp3`,
                    duration: 120
                },
                {
                    sceneNumber: 3,
                    audioFile: `videos/${projectId}/04-audio/audio-segments/scene-3.mp3`,
                    duration: 120
                },
                {
                    sceneNumber: 4,
                    audioFile: `videos/${projectId}/04-audio/audio-segments/scene-4.mp3`,
                    duration: 45
                }
            ],
            metadata: {
                generatedAt: new Date().toISOString(),
                generatedBy: 'audio-generator-ai-refactored',
                status: 'completed',
                totalDuration: 300,
                masterNarrationCreated: true,
                audioSegmentsPath: `videos/${projectId}/04-audio/audio-segments/`
            }
        };

        await s3.putObject({
            Bucket: bucket,
            Key: `videos/${projectId}/01-context/audio-context.json`,
            Body: JSON.stringify(updatedAudioContext, null, 2),
            ContentType: 'application/json'
        }).promise();

        console.log('✅ Updated audio-context.json with correct segment paths');

        console.log('\n🎉 Audio segments moved to correct location!');
        console.log('📋 Manifest Builder should now detect all 4 audio segments');

    } catch (error) {
        console.error('❌ Error moving audio segments:', error);
    }
}

fixAudioSegmentsLocation();