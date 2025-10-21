#!/bin/bash

# Simple FFmpeg Layer Creation Script
# Run this on a Linux system or AWS CloudShell

echo "🎬 Creating simple FFmpeg layer..."

# Create layer directory structure
mkdir -p ffmpeg-layer/bin

# Download static FFmpeg binaries
cd ffmpeg-layer/bin
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz --strip-components=1
rm ffmpeg-release-amd64-static.tar.xz

# Keep only needed binaries
mv ffmpeg-*-amd64-static/ffmpeg .
mv ffmpeg-*-amd64-static/ffprobe .
rm -rf ffmpeg-*-amd64-static

# Make executable
chmod +x ffmpeg ffprobe

# Create layer package
cd ..
zip -r ../ffmpeg-layer.zip .

echo "✅ FFmpeg layer created: ffmpeg-layer.zip"
echo "📤 Upload this to your S3 bucket and update the SAM template"
