const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const s3 = new AWS.S3();

async function cleanupAudioSegments() {
    console.log('🧹 Cleaning up duplicate audio segments...');

    const projectId = '2025-10-17T00-26-06_travel-to-peru';
    const bucket = 'automated-video-pipeline-v2-786673323159-us-east-1';

    // Remove the duplicate files (keep scene-N.mp3, remove scene-N-audio.mp3)
    const filesToRemove = [
        'scene-1-audio.mp3',
        'scene-2-audio.mp3',
        'scene-3-audio.mp3',
        'scene-4-audio.mp3'
    ];

    try {
        for (const file of filesToRemove) {
            await s3.deleteObject({
                Bucket: bucket,
                Key: `videos/${projectId}/04-audio/audio-segments/${file}`
            }).promise();

            console.log(`✅ Removed duplicate: ${file}`);
        }

        console.log('\n🎉 Audio segments cleanup completed!');
        console.log('📋 Should now have exactly 4 audio segments (scene-1.mp3 through scene-4.mp3)');

    } catch (error) {
        console.error('❌ Error cleaning up audio segments:', error);
    }
}

cleanupAudioSegments();