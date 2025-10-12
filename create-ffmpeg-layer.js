#!/usr/bin/env node

/**
 * Create FFmpeg Lambda Layer for real media processing
 * This script downloads and packages FFmpeg for AWS Lambda
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function createFFmpegLayer() {
  console.log('🎬 Creating FFmpeg Lambda Layer');
  console.log('================================');
  
  const layerDir = './ffmpeg-lambda-layer';
  const binDir = path.join(layerDir, 'opt', 'bin');
  
  try {
    // Step 1: Create directory structure
    console.log('📁 Creating directory structure...');
    if (fs.existsSync(layerDir)) {
      execSync(`rmdir /s /q "${layerDir}"`, { stdio: 'inherit' });
    }
    fs.mkdirSync(layerDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    console.log(`   ✅ Created: ${layerDir}`);
    
    // Step 2: Download FFmpeg static build
    console.log('📥 Downloading FFmpeg static build...');
    const ffmpegUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
    const downloadPath = path.join(layerDir, 'ffmpeg-static.tar.xz');
    
    // Use curl to download (available on most systems)
    try {
      execSync(`curl -L "${ffmpegUrl}" -o "${downloadPath}"`, { stdio: 'inherit' });
      console.log(`   ✅ Downloaded: ${downloadPath}`);
    } catch (error) {
      console.log('   ❌ Curl failed, trying alternative download...');
      
      // Alternative: Use PowerShell Invoke-WebRequest
      execSync(`powershell -Command "Invoke-WebRequest -Uri '${ffmpegUrl}' -OutFile '${downloadPath}'"`, { stdio: 'inherit' });
      console.log(`   ✅ Downloaded with PowerShell: ${downloadPath}`);
    }
    
    // Step 3: Extract FFmpeg binaries
    console.log('📦 Extracting FFmpeg binaries...');
    
    // Extract using tar (if available) or 7-zip
    try {
      execSync(`tar -xf "${downloadPath}" -C "${layerDir}"`, { stdio: 'inherit' });
      console.log('   ✅ Extracted with tar');
    } catch (error) {
      console.log('   ❌ tar not available, trying 7-zip...');
      try {
        execSync(`7z x "${downloadPath}" -o"${layerDir}"`, { stdio: 'inherit' });
        console.log('   ✅ Extracted with 7-zip');
      } catch (error2) {
        console.error('   ❌ Could not extract archive. Please extract manually:');
        console.error(`      1. Extract ${downloadPath}`);
        console.error(`      2. Copy ffmpeg and ffprobe to ${binDir}`);
        return;
      }
    }
    
    // Step 4: Find and copy FFmpeg binaries
    console.log('🔍 Finding FFmpeg binaries...');
    const extractedDirs = fs.readdirSync(layerDir).filter(dir => 
      dir.startsWith('ffmpeg-') && fs.statSync(path.join(layerDir, dir)).isDirectory()
    );
    
    if (extractedDirs.length === 0) {
      throw new Error('No FFmpeg directory found after extraction');
    }
    
    const ffmpegDir = path.join(layerDir, extractedDirs[0]);
    const ffmpegBin = path.join(ffmpegDir, 'ffmpeg');
    const ffprobeBin = path.join(ffmpegDir, 'ffprobe');
    
    if (fs.existsSync(ffmpegBin)) {
      fs.copyFileSync(ffmpegBin, path.join(binDir, 'ffmpeg'));
      console.log(`   ✅ Copied: ffmpeg → ${binDir}`);
    } else {
      throw new Error('ffmpeg binary not found');
    }
    
    if (fs.existsSync(ffprobeBin)) {
      fs.copyFileSync(ffprobeBin, path.join(binDir, 'ffprobe'));
      console.log(`   ✅ Copied: ffprobe → ${binDir}`);
    } else {
      console.log('   ⚠️  ffprobe not found, continuing without it');
    }
    
    // Step 5: Make binaries executable (Linux permissions)
    try {
      execSync(`chmod +x "${path.join(binDir, 'ffmpeg')}"`, { stdio: 'inherit' });
      execSync(`chmod +x "${path.join(binDir, 'ffprobe')}"`, { stdio: 'inherit' });
      console.log('   ✅ Made binaries executable');
    } catch (error) {
      console.log('   ⚠️  Could not set executable permissions (Windows)');
    }
    
    // Step 6: Create layer package
    console.log('📦 Creating Lambda layer package...');
    const layerZip = './ffmpeg-lambda-layer.zip';
    
    // Remove existing zip
    if (fs.existsSync(layerZip)) {
      fs.unlinkSync(layerZip);
    }
    
    // Create zip package
    execSync(`powershell -Command "Compress-Archive -Path '${layerDir}\\opt' -DestinationPath '${layerZip}'"`, { stdio: 'inherit' });
    
    const zipStats = fs.statSync(layerZip);
    console.log(`   ✅ Created layer package: ${layerZip} (${(zipStats.size / 1024 / 1024).toFixed(1)} MB)`);
    
    // Step 7: Deploy layer to AWS
    console.log('🚀 Deploying FFmpeg layer to AWS...');
    
    try {
      const deployResult = execSync(`aws lambda publish-layer-version --layer-name ffmpeg-video-processing --zip-file fileb://${layerZip} --compatible-runtimes nodejs18.x nodejs20.x --description "FFmpeg binaries for video processing"`, { 
        encoding: 'utf8' 
      });
      
      const layerInfo = JSON.parse(deployResult);
      console.log(`   ✅ Layer deployed successfully!`);
      console.log(`   Layer ARN: ${layerInfo.LayerArn}`);
      console.log(`   Version: ${layerInfo.Version}`);
      
      // Step 8: Update Video Assembler Lambda to use the layer
      console.log('🔧 Updating Video Assembler Lambda configuration...');
      
      const updateResult = execSync(`aws lambda update-function-configuration --function-name automated-video-pipeline-video-assembler-v3 --layers ${layerInfo.LayerArn}`, {
        encoding: 'utf8'
      });
      
      console.log('   ✅ Video Assembler Lambda updated with FFmpeg layer');
      
    } catch (error) {
      console.error('❌ AWS deployment failed:', error.message);
      console.log('');
      console.log('Manual deployment steps:');
      console.log(`1. aws lambda publish-layer-version --layer-name ffmpeg-video-processing --zip-file fileb://${layerZip} --compatible-runtimes nodejs20.x`);
      console.log('2. aws lambda update-function-configuration --function-name automated-video-pipeline-video-assembler-v3 --layers <LAYER_ARN>');
    }
    
    console.log('');
    console.log('🎉 FFmpeg Lambda Layer Setup Complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the enhanced Video Assembler');
    console.log('2. Verify real MP3 and MP4 file creation');
    console.log('3. Check file sizes and playability');
    
  } catch (error) {
    console.error('❌ FFmpeg layer creation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
if (require.main === module) {
  createFFmpegLayer().catch(console.error);
}

module.exports = { createFFmpegLayer };