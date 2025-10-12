#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Create a complete narration.mp3 from scene audio files and generate a real video
 */
async function createNarrationAndVideo() {
    const projectPath = './temp-project';
    const audioPath = path.join(projectPath, '04-audio');
    const videoPath = path.join(projectPath, '05-video');
    const mediaPath = path.join(projectPath, '03-media');
    
    console.log('🎵 Creating complete narration.mp3 from scene audio files...');
    
    // Check if FFmpeg is available
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        console.log('✅ FFmpeg is available');
    } catch (error) {
        console.log('❌ FFmpeg not found. Installing via chocolatey...');
        try {
            execSync('choco install ffmpeg -y', { stdio: 'inherit' });
            console.log('✅ FFmpeg installed successfully');
        } catch (installError) {
            console.error('❌ Failed to install FFmpeg. Please install manually.');
            console.log('You can download from: https://ffmpeg.org/download.html');
            return;
        }
    }
    
    // Read script to get scene order and timing
    const scriptPath = path.join(projectPath, '02-script', 'script.json');
    const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
    
    console.log(`📋 Found ${script.scenes.length} scenes in script`);
    
    // Create file list for FFmpeg concatenation
    const audioFiles = [];
    const sceneAudioFiles = [];
    
    for (let i = 1; i <= script.scenes.length; i++) {
        const sceneAudioFile = path.join(audioPath, `scene-${i}-audio.mp3`);
        if (fs.existsSync(sceneAudioFile)) {
            sceneAudioFiles.push(sceneAudioFile);
            audioFiles.push(`file '${sceneAudioFile.replace(/\\/g, '/')}'`);
            console.log(`✅ Found scene ${i} audio: ${path.basename(sceneAudioFile)}`);
        } else {
            console.log(`⚠️  Missing scene ${i} audio file`);
        }
    }
    
    if (sceneAudioFiles.length === 0) {
        console.error('❌ No scene audio files found!');
        return;
    }
    
    // Create temporary file list for FFmpeg
    const fileListPath = path.join(audioPath, 'audio-files.txt');
    fs.writeFileSync(fileListPath, audioFiles.join('\n'));
    
    // Create complete narration.mp3
    const narrationPath = path.join(audioPath, 'narration.mp3');
    const backupPath = path.join(audioPath, 'narration-original.mp3');
    
    // Backup original if it exists
    if (fs.existsSync(narrationPath)) {
        fs.copyFileSync(narrationPath, backupPath);
        console.log('📦 Backed up original narration.mp3');
    }
    
    try {
        console.log('🔄 Concatenating audio files...');
        execSync(`ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${narrationPath}" -y`, {
            stdio: 'inherit',
            cwd: audioPath
        });
        
        // Get file size
        const stats = fs.statSync(narrationPath);
        console.log(`✅ Created narration.mp3 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
    } catch (error) {
        console.error('❌ Failed to create narration.mp3:', error.message);
        return;
    }
    
    // Clean up temporary file
    fs.unlinkSync(fileListPath);
    
    // Now create a real video file
    console.log('\n🎬 Creating real video file...');
    
    // Get all available images
    const images = [];
    const scene1ImagesPath = path.join(mediaPath, 'scene-1', 'images');
    const scene2ImagesPath = path.join(mediaPath, 'scene-2', 'images');
    
    if (fs.existsSync(scene1ImagesPath)) {
        const scene1Images = fs.readdirSync(scene1ImagesPath)
            .filter(file => file.toLowerCase().endsWith('.jpg'))
            .map(file => path.join(scene1ImagesPath, file));
        images.push(...scene1Images);
    }
    
    if (fs.existsSync(scene2ImagesPath)) {
        const scene2Images = fs.readdirSync(scene2ImagesPath)
            .filter(file => file.toLowerCase().endsWith('.jpg'))
            .map(file => path.join(scene2ImagesPath, file));
        images.push(...scene2Images);
    }
    
    console.log(`📸 Found ${images.length} images for video`);
    
    if (images.length === 0) {
        console.error('❌ No images found for video creation!');
        return;
    }
    
    // Create video with slideshow effect
    const finalVideoPath = path.join(videoPath, 'final-video.mp4');
    const backupVideoPath = path.join(videoPath, 'final-video-original.mp4');
    
    // Backup original if it exists
    if (fs.existsSync(finalVideoPath)) {
        fs.copyFileSync(finalVideoPath, backupVideoPath);
        console.log('📦 Backed up original final-video.mp4');
    }
    
    try {
        // Get audio duration
        const durationOutput = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${narrationPath}"`, {
            encoding: 'utf8'
        });
        const audioDuration = parseFloat(durationOutput.trim());
        console.log(`⏱️  Audio duration: ${audioDuration.toFixed(2)} seconds`);
        
        // Calculate image duration (distribute evenly)
        const imageDuration = audioDuration / images.length;
        console.log(`📸 Each image will show for ${imageDuration.toFixed(2)} seconds`);
        
        // Create video with slideshow
        console.log('🔄 Creating video with slideshow effect...');
        
        // Use first image as base, then create slideshow
        const firstImage = images[0];
        
        // Create a simple slideshow video
        let ffmpegCommand = `ffmpeg -y`;
        
        // Add all images as inputs
        images.forEach(image => {
            ffmpegCommand += ` -loop 1 -t ${imageDuration} -i "${image}"`;
        });
        
        // Add audio input
        ffmpegCommand += ` -i "${narrationPath}"`;
        
        // Create filter complex for slideshow
        let filterComplex = '';
        for (let i = 0; i < images.length; i++) {
            if (i === 0) {
                filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[v${i}];`;
            } else {
                filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS+${(i * imageDuration).toFixed(2)}/TB[v${i}];`;
            }
        }
        
        // Concatenate all video segments
        filterComplex += images.map((_, i) => `[v${i}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`;
        
        ffmpegCommand += ` -filter_complex "${filterComplex}" -map "[outv]" -map ${images.length}:a -c:v libx264 -c:a aac -shortest "${finalVideoPath}"`;
        
        console.log('🔄 Running FFmpeg command...');
        execSync(ffmpegCommand, { stdio: 'inherit' });
        
        // Get final video file size
        const videoStats = fs.statSync(finalVideoPath);
        console.log(`✅ Created final-video.mp4 (${(videoStats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Get video info
        const videoInfo = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideoPath}"`, {
            encoding: 'utf8'
        });
        const videoDuration = parseFloat(videoInfo.trim());
        console.log(`⏱️  Video duration: ${videoDuration.toFixed(2)} seconds`);
        
    } catch (error) {
        console.error('❌ Failed to create video:', error.message);
        return;
    }
    
    console.log('\n🎉 SUCCESS! Created both narration.mp3 and final-video.mp4');
    console.log('\n📊 Summary:');
    console.log(`   📁 Project: ${path.basename(projectPath)}`);
    console.log(`   🎵 Audio: ${sceneAudioFiles.length} scenes combined`);
    console.log(`   📸 Images: ${images.length} images used`);
    console.log(`   🎬 Video: Real MP4 file with slideshow`);
    
    // Upload back to S3
    console.log('\n📤 Uploading updated files to S3...');
    
    const s3Bucket = 'automated-video-pipeline-v2-786673323159-us-east-1';
    const s3Prefix = 'videos/2025-10-12T01-42-31_javascript-fundamentals';
    
    try {
        // Upload narration.mp3
        execSync(`aws s3 cp "${narrationPath}" s3://${s3Bucket}/${s3Prefix}/04-audio/narration.mp3`, {
            stdio: 'inherit'
        });
        
        // Upload final-video.mp4
        execSync(`aws s3 cp "${finalVideoPath}" s3://${s3Bucket}/${s3Prefix}/05-video/final-video.mp4`, {
            stdio: 'inherit'
        });
        
        console.log('✅ Files uploaded to S3 successfully!');
        
    } catch (error) {
        console.error('⚠️  Failed to upload to S3:', error.message);
        console.log('Files are still available locally in temp-project/');
    }
}

// Run the script
if (require.main === module) {
    createNarrationAndVideo().catch(console.error);
}

module.exports = { createNarrationAndVideo };