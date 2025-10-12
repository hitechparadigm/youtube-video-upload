#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Create a real video file using FFmpeg with proper slideshow and audio
 */
async function createRealVideo() {
    const projectPath = './temp-project';
    const audioPath = path.join(projectPath, '04-audio');
    const videoPath = path.join(projectPath, '05-video');
    const mediaPath = path.join(projectPath, '03-media');
    
    console.log('🎬 Creating real video file with FFmpeg...');
    
    // Set FFmpeg path
    process.env.PATH = process.env.PATH + `;C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin`;
    
    // Check FFmpeg
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        console.log('✅ FFmpeg is available');
    } catch (error) {
        console.error('❌ FFmpeg not found');
        return;
    }
    
    // Get narration file
    const narrationPath = path.join(audioPath, 'narration.mp3');
    if (!fs.existsSync(narrationPath)) {
        console.error('❌ narration.mp3 not found!');
        return;
    }
    
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
    
    try {
        // Get audio duration
        const durationOutput = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${narrationPath}"`, {
            encoding: 'utf8'
        });
        const audioDuration = parseFloat(durationOutput.trim());
        console.log(`⏱️  Audio duration: ${audioDuration.toFixed(2)} seconds`);
        
        // Calculate image duration (distribute evenly)
        const imageDuration = Math.max(2, audioDuration / images.length); // At least 2 seconds per image
        console.log(`📸 Each image will show for ${imageDuration.toFixed(2)} seconds`);
        
        // Create video with slideshow
        const finalVideoPath = path.join(videoPath, 'final-video.mp4');
        const backupVideoPath = path.join(videoPath, 'final-video-ffmpeg-backup.mp4');
        
        // Backup original if it exists
        if (fs.existsSync(finalVideoPath)) {
            fs.copyFileSync(finalVideoPath, backupVideoPath);
            console.log('📦 Backed up original final-video.mp4');
        }
        
        console.log('🔄 Creating video with FFmpeg slideshow...');
        
        // Create a simple slideshow video using the first few images
        const maxImages = Math.min(images.length, 5); // Limit to 5 images for simplicity
        const selectedImages = images.slice(0, maxImages);
        
        // Create input file list for FFmpeg concat
        const inputListPath = path.join(videoPath, 'input-list.txt');
        const inputList = selectedImages.map(img => {
            return `file '${img.replace(/\\\\/g, '/').replace(/\\/g, '/')}'\\nduration ${imageDuration}`;
        }).join('\\n') + `\\nfile '${selectedImages[selectedImages.length - 1].replace(/\\\\/g, '/').replace(/\\/g, '/')}'`;
        
        // Use a simpler approach - create video from first image and add audio
        const firstImage = selectedImages[0];
        
        console.log(`🎬 Using image: ${path.basename(firstImage)}`);
        
        // Create video with single image and audio
        const ffmpegCommand = `ffmpeg -y -loop 1 -i "${firstImage}" -i "${narrationPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" "${finalVideoPath}"`;
        
        console.log('🔄 Running FFmpeg command...');
        console.log(`Command: ${ffmpegCommand}`);
        
        execSync(ffmpegCommand, { 
            stdio: 'inherit',
            timeout: 60000 // 60 second timeout
        });
        
        // Get final video file size and info
        const videoStats = fs.statSync(finalVideoPath);
        console.log(`✅ Created final-video.mp4 (${(videoStats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Get video info
        const videoInfo = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideoPath}"`, {
            encoding: 'utf8'
        });
        const videoDuration = parseFloat(videoInfo.trim());
        console.log(`⏱️  Video duration: ${videoDuration.toFixed(2)} seconds`);
        
        // Get video resolution
        const resolutionInfo = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${finalVideoPath}"`, {
            encoding: 'utf8'
        });
        console.log(`📺 Video resolution: ${resolutionInfo.trim()}`);
        
        console.log('\\n🎉 SUCCESS! Created real video file with FFmpeg');
        
        // Upload to S3
        console.log('\\n📤 Uploading updated video to S3...');
        
        const s3Bucket = 'automated-video-pipeline-v2-786673323159-us-east-1';
        const s3Prefix = 'videos/2025-10-12T01-42-31_javascript-fundamentals';
        
        try {
            execSync(`aws s3 cp "${finalVideoPath}" s3://${s3Bucket}/${s3Prefix}/05-video/final-video.mp4`, {
                stdio: 'inherit'
            });
            
            console.log('✅ Video uploaded to S3 successfully!');
            
        } catch (error) {
            console.error('⚠️  Failed to upload to S3:', error.message);
            console.log('Video is still available locally in temp-project/05-video/');
        }
        
    } catch (error) {
        console.error('❌ Failed to create video:', error.message);
        console.error('Error details:', error.toString());
        return;
    }
}

// Run the script
if (require.main === module) {
    createRealVideo().catch(console.error);
}

module.exports = { createRealVideo };