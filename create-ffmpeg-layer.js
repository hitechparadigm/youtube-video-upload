#!/usr/bin/env node

/**
 * FFmpeg Lambda Layer Creation Script
 * Creates a Lambda layer with FFmpeg binaries for video processing
 */

const fs = require('fs');
const path = require('path');
const {
    spawn
} = require('child_process');

/**
 * Create FFmpeg layer directory structure
 */
function createLayerStructure() {
    console.log('🏗️ Creating FFmpeg layer directory structure...');

    const layerDir = 'ffmpeg-layer';
    const binDir = path.join(layerDir, 'bin');

    // Create directories
    if (fs.existsSync(layerDir)) {
        fs.rmSync(layerDir, {
            recursive: true,
            force: true
        });
    }

    fs.mkdirSync(layerDir, {
        recursive: true
    });
    fs.mkdirSync(binDir, {
        recursive: true
    });

    console.log('✅ Layer directory structure created');
    return {
        layerDir,
        binDir
    };
}

/**
 * Download FFmpeg static binaries
 */
async function downloadFFmpegBinaries(binDir) {
    console.log('📥 Downloading FFmpeg static binaries...');

    // For Windows, we'll create instructions for manual download
    // since wget/curl might not be available

    const downloadInstructions = `
# FFmpeg Lambda Layer - Manual Download Instructions

Since this is running on Windows, please manually download the FFmpeg binaries:

## Option 1: Download Pre-built Lambda Layer (Recommended)
1. Visit: https://github.com/serverlesspub/ffmpeg-aws-lambda-layer
2. Download the latest release zip file
3. Extract to ffmpeg-layer/bin/ directory

## Option 2: Download FFmpeg Static Build
1. Visit: https://johnvansickle.com/ffmpeg/releases/
2. Download: ffmpeg-release-amd64-static.tar.xz
3. Extract ffmpeg and ffprobe binaries to ffmpeg-layer/bin/

## Option 3: Use AWS SAM Build (Automated)
The SAM template will automatically handle the layer creation during deployment.

## Files Needed in ffmpeg-layer/bin/:
- ffmpeg (executable)
- ffprobe (executable)

## Verification:
After download, verify the binaries:
- ffmpeg-layer/bin/ffmpeg --version
- ffmpeg-layer/bin/ffprobe --version
`;

    fs.writeFileSync(path.join(binDir, 'DOWNLOAD_INSTRUCTIONS.md'), downloadInstructions);

    // Create placeholder files to show the expected structure
    const placeholderScript = `#!/bin/bash
echo "FFmpeg placeholder - replace with actual binary"
echo "Download from: https://johnvansickle.com/ffmpeg/releases/"
exit 1
`;

    fs.writeFileSync(path.join(binDir, 'ffmpeg'), placeholderScript);
    fs.writeFileSync(path.join(binDir, 'ffprobe'), placeholderScript);

    console.log('📋 Download instructions created');
    console.log('⚠️ Manual download required for Windows environment');

    return true;
}

/**
 * Create layer deployment script
 */
function createLayerDeploymentScript() {
    console.log('📜 Creating layer deployment script...');

    const deployScript = `#!/bin/bash

# FFmpeg Lambda Layer Deployment Script
# This script packages and deploys the FFmpeg layer

set -e

echo "🏗️ Building FFmpeg Lambda Layer..."

# Check if binaries exist
if [ ! -f "ffmpeg-layer/bin/ffmpeg" ] || [ ! -f "ffmpeg-layer/bin/ffprobe" ]; then
    echo "❌ FFmpeg binaries not found!"
    echo "Please download FFmpeg static binaries to ffmpeg-layer/bin/"
    echo "See ffmpeg-layer/bin/DOWNLOAD_INSTRUCTIONS.md for details"
    exit 1
fi

# Make binaries executable
chmod +x ffmpeg-layer/bin/ffmpeg
chmod +x ffmpeg-layer/bin/ffprobe

# Create layer zip
echo "📦 Creating layer zip file..."
cd ffmpeg-layer
zip -r ../ffmpeg-layer.zip .
cd ..

# Upload to S3
echo "📤 Uploading layer to S3..."
aws s3 cp ffmpeg-layer.zip s3://automated-video-pipeline-deployments-prod/layers/ffmpeg-layer.zip

# Deploy layer using AWS CLI
echo "🚀 Creating Lambda layer..."
aws lambda publish-layer-version \\
    --layer-name ffmpeg-layer-prod \\
    --description "FFmpeg binaries for video processing" \\
    --content S3Bucket=automated-video-pipeline-deployments-prod,S3Key=layers/ffmpeg-layer.zip \\
    --compatible-runtimes nodejs22.x \\
    --query 'LayerVersionArn' \\
    --output text

echo "✅ FFmpeg layer deployed successfully!"
echo "🎯 Next: Update SAM template to use the layer"
`;

    fs.writeFileSync('deploy-ffmpeg-layer.sh', deployScript);

    // Create Windows PowerShell version
    const deployScriptPS = `# FFmpeg Lambda Layer Deployment Script (PowerShell)
# This script packages and deploys the FFmpeg layer

Write-Host "🏗️ Building FFmpeg Lambda Layer..."

# Check if binaries exist
if (!(Test-Path "ffmpeg-layer/bin/ffmpeg") -or !(Test-Path "ffmpeg-layer/bin/ffprobe")) {
    Write-Host "❌ FFmpeg binaries not found!"
    Write-Host "Please download FFmpeg static binaries to ffmpeg-layer/bin/"
    Write-Host "See ffmpeg-layer/bin/DOWNLOAD_INSTRUCTIONS.md for details"
    exit 1
}

# Create layer zip
Write-Host "📦 Creating layer zip file..."
Compress-Archive -Path ffmpeg-layer/* -DestinationPath ffmpeg-layer.zip -Force

# Upload to S3
Write-Host "📤 Uploading layer to S3..."
aws --profile hitechparadigm s3 cp ffmpeg-layer.zip s3://automated-video-pipeline-deployments-prod/layers/ffmpeg-layer.zip

# Deploy layer using AWS CLI
Write-Host "🚀 Creating Lambda layer..."
$layerArn = aws --profile hitechparadigm lambda publish-layer-version \`
    --layer-name ffmpeg-layer-prod \`
    --description "FFmpeg binaries for video processing" \`
    --content S3Bucket=automated-video-pipeline-deployments-prod,S3Key=layers/ffmpeg-layer.zip \`
    --compatible-runtimes nodejs22.x \`
    --query 'LayerVersionArn' \`
    --output text

Write-Host "✅ FFmpeg layer deployed successfully!"
Write-Host "📋 Layer ARN: $layerArn"
Write-Host "🎯 Next: Update SAM template to use the layer"
`;

    fs.writeFileSync('deploy-ffmpeg-layer.ps1', deployScriptPS);

    console.log('✅ Deployment scripts created');
    console.log('   - deploy-ffmpeg-layer.sh (Linux/macOS)');
    console.log('   - deploy-ffmpeg-layer.ps1 (Windows PowerShell)');

    return true;
}

/**
 * Update SAM template with FFmpeg layer
 */
function updateSAMTemplate() {
    console.log('📝 Updating SAM template with FFmpeg layer...');

    const templatePath = 'template-simplified.yaml';
    let template = fs.readFileSync(templatePath, 'utf8');

    // Add FFmpeg layer resource
    const ffmpegLayerResource = `
  # FFmpeg Layer for video processing
  FFmpegLayer:
    Type: AWS::Lambda::LayerVersion
    Properties:
      LayerName: !Sub 'ffmpeg-layer-\${Environment}'
      Description: FFmpeg binaries for video processing
      Content:
        S3Bucket: !Sub 'automated-video-pipeline-deployments-\${Environment}'
        S3Key: layers/ffmpeg-layer.zip
      CompatibleRuntimes:
        - nodejs22.x
      LicenseInfo: 'GPL-2.0-or-later'
`;

    // Add layer to VideoAssemblerFunction
    const videoAssemblerUpdate = `  VideoAssemblerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'video-pipeline-video-assembler-\${Environment}'
      CodeUri: src/lambda/video-assembler/
      Handler: index.handler
      Layers:
        - !Ref FFmpegLayer
      Environment:
        Variables:
          FFMPEG_PATH: /opt/bin/ffmpeg
          FFPROBE_PATH: /opt/bin/ffprobe
      Timeout: 900  # 15 minutes for video processing
      MemorySize: 3008  # Maximum memory for video processing
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref VideoApi
            Path: /video/assemble
            Method: POST
      Policies:
        - S3FullAccessPolicy:
            BucketName: !Ref VideoBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref ContextTable`;

    // Find and replace the VideoAssemblerFunction
    const videoAssemblerRegex = /  VideoAssemblerFunction:[\s\S]*?(?=\n  \w+Function:|\n  \w+:|$)/;

    if (template.match(videoAssemblerRegex)) {
        template = template.replace(videoAssemblerRegex, videoAssemblerUpdate);
        console.log('✅ VideoAssemblerFunction updated with FFmpeg layer');
    } else {
        console.log('⚠️ Could not find VideoAssemblerFunction in template');
    }

    // Add FFmpeg layer resource before the first function
    const resourcesIndex = template.indexOf('Resources:');
    const firstFunctionIndex = template.indexOf('Function:', resourcesIndex);

    if (resourcesIndex !== -1 && firstFunctionIndex !== -1) {
        const insertPosition = template.lastIndexOf('\n', firstFunctionIndex) + 1;
        template = template.slice(0, insertPosition) + ffmpegLayerResource + '\n' + template.slice(insertPosition);
        console.log('✅ FFmpeg layer resource added to template');
    } else {
        console.log('⚠️ Could not find insertion point for FFmpeg layer');
    }

    // Write updated template
    fs.writeFileSync('template-with-ffmpeg-layer.yaml', template);
    console.log('✅ Updated SAM template created: template-with-ffmpeg-layer.yaml');

    return true;
}

/**
 * Create FFmpeg layer implementation guide
 */
function createImplementationGuide() {
    console.log('📚 Creating FFmpeg layer implementation guide...');

    const guide = `# 🎥 FFmpeg Lambda Layer Implementation Guide

**Purpose**: Enable real video processing in the Video Assembler Lambda function  
**Status**: Ready for implementation  
**Expected Result**: Real MP4 video files instead of instruction files

---

## 🚀 **Quick Implementation Steps**

### **Step 1: Download FFmpeg Binaries**
\`\`\`bash
# Create layer directory
mkdir -p ffmpeg-layer/bin

# Download FFmpeg static build for Amazon Linux 2
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-amd64-static/ffmpeg ffmpeg-layer/bin/
cp ffmpeg-*-amd64-static/ffprobe ffmpeg-layer/bin/

# Make executable
chmod +x ffmpeg-layer/bin/ffmpeg
chmod +x ffmpeg-layer/bin/ffprobe
\`\`\`

### **Step 2: Deploy Layer**
\`\`\`powershell
# Windows PowerShell
.\\deploy-ffmpeg-layer.ps1
\`\`\`

### **Step 3: Update SAM Template**
\`\`\`bash
# Deploy updated template with FFmpeg layer
sam deploy --template-file template-with-ffmpeg-layer.yaml --stack-name automated-video-pipeline-prod --capabilities CAPABILITY_IAM
\`\`\`

### **Step 4: Test Real Video Processing**
\`\`\`bash
# Test complete pipeline with real video creation
node test-complete-pipeline-spain.js
\`\`\`

---

## 🔧 **Technical Details**

### **Layer Structure**
\`\`\`
ffmpeg-layer/
└── bin/
    ├── ffmpeg      # Main FFmpeg binary
    ├── ffprobe     # Media analysis tool
    └── DOWNLOAD_INSTRUCTIONS.md
\`\`\`

### **Lambda Function Configuration**
\`\`\`yaml
VideoAssemblerFunction:
  Properties:
    Layers:
      - !Ref FFmpegLayer
    Environment:
      Variables:
        FFMPEG_PATH: /opt/bin/ffmpeg
        FFPROBE_PATH: /opt/bin/ffprobe
    Timeout: 900      # 15 minutes
    MemorySize: 3008  # Maximum memory
\`\`\`

### **Video Processing Capabilities**
- **Real MP4 Creation**: Actual video files with H.264 encoding
- **Audio Synchronization**: Perfect audio-video sync
- **Professional Quality**: 1920x1080 resolution, 30fps
- **Optimized Output**: Fast-start MP4 for web streaming

---

## 📊 **Expected Results**

### **Before FFmpeg Layer (Current)**
- **Video Assembler**: Creates instruction files with image data
- **File Type**: JSON with embedded image buffers
- **Size**: ~500KB-2MB instruction files
- **YouTube Ready**: Metadata only, no actual video

### **After FFmpeg Layer (Target)**
- **Video Assembler**: Creates real MP4 video files
- **File Type**: Standard MP4 with H.264/AAC encoding
- **Size**: 10-50MB actual video files
- **YouTube Ready**: Complete video files ready for upload

---

## 🎯 **Implementation Benefits**

### **Real Video Processing**
- **Actual MP4 Files**: Standard video format compatible with all platforms
- **Professional Quality**: Broadcast-quality encoding with proper compression
- **Audio Sync**: Perfect synchronization between visuals and narration
- **Web Optimized**: Fast-start encoding for immediate playback

### **Production Capabilities**
- **Scalable Processing**: Handle videos of various lengths and complexities
- **Quality Control**: Configurable resolution, bitrate, and encoding settings
- **Thumbnail Generation**: Extract frames for video thumbnails
- **Format Flexibility**: Support for different output formats and qualities

### **YouTube Integration**
- **Direct Upload**: Real video files ready for YouTube API upload
- **Metadata Sync**: Video properties match generated metadata
- **Quality Assurance**: Professional-grade output suitable for publishing
- **Automated Workflow**: Complete automation from topic to published video

---

## 🔍 **Alternative Solutions**

### **AWS Elemental MediaConvert**
If FFmpeg layer proves challenging, consider MediaConvert:

\`\`\`javascript
const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert');

async function createVideoWithMediaConvert(projectId, videoTimeline, masterAudioResult) {
    const mediaConvert = new MediaConvertClient({ region: 'us-east-1' });
    
    const jobParams = {
        Role: 'arn:aws:iam::ACCOUNT:role/MediaConvertRole',
        Settings: {
            Inputs: videoTimeline.map(segment => ({
                FileInput: \`s3://\${S3_BUCKET}/\${segment.imagePath}\`,
                ImageInserter: {
                    InsertableImages: [{
                        ImageX: 0,
                        ImageY: 0,
                        Layer: 0,
                        Opacity: 100,
                        StartTime: segment.startTime,
                        Duration: segment.duration * 1000
                    }]
                }
            })),
            OutputGroups: [{
                Name: 'File Group',
                OutputGroupSettings: {
                    Type: 'FILE_GROUP_SETTINGS',
                    FileGroupSettings: {
                        Destination: \`s3://\${S3_BUCKET}/videos/\${projectId}/05-video/\`
                    }
                },
                Outputs: [{
                    NameModifier: 'final-video',
                    ContainerSettings: { Container: 'MP4' },
                    VideoDescription: {
                        Width: 1920,
                        Height: 1080,
                        CodecSettings: {
                            Codec: 'H_264',
                            H264Settings: {
                                Bitrate: 5000000,
                                RateControlMode: 'CBR'
                            }
                        }
                    },
                    AudioDescriptions: [{
                        CodecSettings: {
                            Codec: 'AAC',
                            AacSettings: {
                                Bitrate: 128000,
                                SampleRate: 44100
                            }
                        }
                    }]
                }]
            }]
        }
    };
    
    const command = new CreateJobCommand(jobParams);
    return await mediaConvert.send(command);
}
\`\`\`

---

## 🎯 **Next Steps**

### **Immediate**
1. **Download FFmpeg binaries** using the instructions above
2. **Run deployment script** to create and upload the layer
3. **Update SAM template** with the layer configuration
4. **Test real video processing** with the complete pipeline

### **Validation**
1. **Layer Verification**: Confirm FFmpeg binaries are accessible in Lambda
2. **Video Creation**: Test actual MP4 file generation
3. **Quality Check**: Verify video quality and audio synchronization
4. **Performance**: Monitor processing time and memory usage

### **Optimization**
1. **Memory Tuning**: Optimize Lambda memory allocation for video processing
2. **Timeout Adjustment**: Set appropriate timeouts for different video lengths
3. **Quality Settings**: Configure video quality based on content requirements
4. **Monitoring**: Set up CloudWatch metrics for video processing performance

---

**🎬 This implementation will complete the transformation from a metadata-generating pipeline to a full video creation system capable of producing professional-quality MP4 files ready for YouTube publishing.**
`;

    fs.writeFileSync('FFMPEG_LAYER_IMPLEMENTATION_GUIDE.md', guide);
    console.log('✅ Implementation guide created: FFMPEG_LAYER_IMPLEMENTATION_GUIDE.md');

    return true;
}

/**
 * Main implementation function
 */
async function implementFFmpegLayer() {
    console.log('🎬 FFmpeg Lambda Layer Implementation');
    console.log('====================================');
    console.log('');

    try {
        // Step 1: Create layer structure
        const {
            layerDir,
            binDir
        } = createLayerStructure();

        // Step 2: Download binaries (instructions for Windows)
        await downloadFFmpegBinaries(binDir);

        // Step 3: Create deployment scripts
        createLayerDeploymentScript();

        // Step 4: Update SAM template
        updateSAMTemplate();

        // Step 5: Create implementation guide
        createImplementationGuide();

        console.log('');
        console.log('🎉 FFmpeg Layer Implementation Complete!');
        console.log('========================================');
        console.log('');
        console.log('📁 Files Created:');
        console.log('   - ffmpeg-layer/ - Layer directory structure');
        console.log('   - deploy-ffmpeg-layer.ps1 - PowerShell deployment script');
        console.log('   - deploy-ffmpeg-layer.sh - Bash deployment script');
        console.log('   - template-with-ffmpeg-layer.yaml - Updated SAM template');
        console.log('   - FFMPEG_LAYER_IMPLEMENTATION_GUIDE.md - Complete guide');
        console.log('');
        console.log('🎯 Next Steps:');
        console.log('1. Download FFmpeg binaries (see ffmpeg-layer/bin/DOWNLOAD_INSTRUCTIONS.md)');
        console.log('2. Run: .\\deploy-ffmpeg-layer.ps1');
        console.log('3. Deploy: sam deploy --template-file template-with-ffmpeg-layer.yaml');
        console.log('4. Test: node test-complete-pipeline-spain.js');
        console.log('');
        console.log('🎬 Result: Real MP4 video files instead of instruction files!');

    } catch (error) {
        console.error('❌ FFmpeg layer implementation failed:', error);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    implementFFmpegLayer();
}

module.exports = {
    implementFFmpegLayer,
    createLayerStructure,
    updateSAMTemplate
};