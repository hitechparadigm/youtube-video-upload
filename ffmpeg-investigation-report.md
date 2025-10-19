# 🎥 FFmpeg Investigation Report - Video Assembler Issue

**Date**: October 19, 2025  
**Issue**: Video Assembler failing with `spawn ffprobe ENOENT`  
**Root Cause**: FFmpeg binaries not available in Lambda runtime

---

## 🔍 **Problem Analysis**

### **Error Details**
```
❌ Video Assembler failed: Final video creation failed: FFmpeg video creation failed: spawn ffprobe ENOENT
```

### **Root Cause**
The Video Assembler Lambda function is trying to use FFmpeg/ffprobe binaries that are not installed in the AWS Lambda runtime environment.

**Code Location**: `src/lambda/video-assembler/index.js`
- Lines 30-50: FFmpeg path detection logic
- Lines 1050-1100: `runFFmpegCommand()` function
- Lines 1100-1130: `getAudioDuration()` using ffprobe
- Lines 1130-1200: `createRealVideoWithFFmpeg()` function

### **Current Implementation**
The function attempts to find FFmpeg in these locations:
```javascript
const POSSIBLE_FFMPEG_PATHS = [
    process.env.FFMPEG_PATH,
    '/opt/bin/ffmpeg',
    '/opt/ffmpeg/ffmpeg', 
    '/usr/bin/ffmpeg',
    'ffmpeg'  // System PATH
];
```

**Problem**: None of these paths exist in the standard AWS Lambda runtime.

---

## 🛠️ **Solution Options**

### **Option 1: FFmpeg Lambda Layer (Recommended)**
**Pros**: 
- Real video processing capabilities
- Full FFmpeg functionality
- Maintains current architecture

**Cons**: 
- Adds complexity
- Increases deployment size
- Layer management required

**Implementation**:
```yaml
# In template-simplified.yaml
FFmpegLayer:
  Type: AWS::Lambda::LayerVersion
  Properties:
    LayerName: ffmpeg-layer
    Content:
      S3Bucket: !Sub 'automated-video-pipeline-deployments-${Environment}'
      S3Key: layers/ffmpeg-layer.zip
    CompatibleRuntimes:
      - nodejs22.x

VideoAssemblerFunction:
  Properties:
    Layers:
      - !Ref FFmpegLayer
    Environment:
      Variables:
        FFMPEG_PATH: /opt/bin/ffmpeg
        FFPROBE_PATH: /opt/bin/ffprobe
```

### **Option 2: AWS Elemental MediaConvert**
**Pros**:
- AWS managed service
- No binary dependencies
- Scalable and reliable
- Professional video processing

**Cons**:
- More complex API
- Additional AWS service costs
- Async processing model

**Implementation**:
```javascript
const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert');

async function createVideoWithMediaConvert(videoTimeline, masterAudioResult) {
    const mediaConvert = new MediaConvertClient({ region: 'us-east-1' });
    
    const jobParams = {
        Role: 'arn:aws:iam::ACCOUNT:role/MediaConvertRole',
        Settings: {
            Inputs: [
                {
                    FileInput: `s3://${S3_BUCKET}/${masterAudioResult.key}`,
                    AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } }
                }
            ],
            OutputGroups: [{
                Name: 'File Group',
                OutputGroupSettings: {
                    Type: 'FILE_GROUP_SETTINGS',
                    FileGroupSettings: {
                        Destination: `s3://${S3_BUCKET}/videos/${projectId}/05-video/`
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
                    }
                }]
            }]
        }
    };
    
    const command = new CreateJobCommand(jobParams);
    return await mediaConvert.send(command);
}
```

### **Option 3: Simplified Video Assembly (Quick Fix)**
**Pros**:
- No external dependencies
- Works immediately
- Maintains pipeline flow

**Cons**:
- Not real video files
- Limited functionality
- Placeholder solution

**Implementation**: Create structured video metadata files instead of actual MP4s.

### **Option 4: External Video Processing Service**
**Pros**:
- Specialized video processing
- No Lambda limitations
- Advanced features

**Cons**:
- External dependency
- Additional costs
- Network latency

---

## 🎯 **Recommended Solution: FFmpeg Lambda Layer**

### **Step 1: Create FFmpeg Layer**
```bash
# Download pre-built FFmpeg for Lambda
mkdir -p ffmpeg-layer/bin
cd ffmpeg-layer

# Download FFmpeg static build for Amazon Linux 2
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-amd64-static/ffmpeg bin/
cp ffmpeg-*-amd64-static/ffprobe bin/

# Create layer zip
zip -r ../ffmpeg-layer.zip .
```

### **Step 2: Update SAM Template**
```yaml
Resources:
  FFmpegLayer:
    Type: AWS::Lambda::LayerVersion
    Properties:
      LayerName: !Sub 'ffmpeg-layer-${Environment}'
      Description: FFmpeg binaries for video processing
      Content:
        S3Bucket: !Sub 'automated-video-pipeline-deployments-${Environment}'
        S3Key: layers/ffmpeg-layer.zip
      CompatibleRuntimes:
        - nodejs22.x

  VideoAssemblerFunction:
    Type: AWS::Serverless::Function
    Properties:
      # ... existing properties ...
      Layers:
        - !Ref FFmpegLayer
      Environment:
        Variables:
          # ... existing variables ...
          FFMPEG_PATH: /opt/bin/ffmpeg
          FFPROBE_PATH: /opt/bin/ffprobe
      Timeout: 900  # 15 minutes for video processing
      MemorySize: 3008  # Maximum memory for video processing
```

### **Step 3: Update Function Code**
```javascript
// Update path detection to use layer
const FFMPEG_PATH = process.env.FFMPEG_PATH || '/opt/bin/ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || '/opt/bin/ffprobe';

// Add binary existence check
function checkFFmpegAvailability() {
    const ffmpegExists = fs.existsSync(FFMPEG_PATH);
    const ffprobeExists = fs.existsSync(FFPROBE_PATH);
    
    console.log(`FFmpeg availability: ${ffmpegExists ? '✅' : '❌'} ${FFMPEG_PATH}`);
    console.log(`FFprobe availability: ${ffprobeExists ? '✅' : '❌'} ${FFPROBE_PATH}`);
    
    return ffmpegExists && ffprobeExists;
}
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Quick Fix (Immediate)**
1. **Modify error handling** to gracefully handle missing FFmpeg
2. **Create placeholder video files** with proper metadata
3. **Maintain pipeline flow** for other components

### **Phase 2: FFmpeg Layer (Complete Solution)**
1. **Create FFmpeg Lambda layer** with static binaries
2. **Update SAM template** to include layer
3. **Test video processing** with real FFmpeg
4. **Optimize memory/timeout** for video processing

### **Phase 3: Advanced Features (Future)**
1. **Consider MediaConvert** for production workloads
2. **Add video quality options** (resolution, bitrate)
3. **Implement video thumbnails** generation
4. **Add progress tracking** for long videos

---

## 📊 **Current Status Impact**

### **Pipeline Status**: 5/7 Components Working (71%)
- ✅ Topic Management
- ✅ Script Generator  
- ✅ Media Curator
- ✅ Audio Generator
- ✅ Manifest Builder
- ❌ **Video Assembler** (FFmpeg issue)
- ⏭️ YouTube Publisher (depends on Video Assembler)

### **Business Impact**
- **Core AI pipeline working**: Content generation successful
- **Video creation blocked**: Cannot create final MP4 files
- **YouTube publishing blocked**: No video files to upload

---

## 🎯 **Next Steps**

### **Immediate (Today)**
1. **Implement graceful fallback** in Video Assembler
2. **Create structured video metadata** instead of MP4
3. **Allow pipeline to complete** for testing other components

### **Short Term (This Week)**
1. **Create FFmpeg Lambda layer**
2. **Update SAM template** with layer configuration
3. **Test real video creation** with FFmpeg
4. **Optimize Lambda resources** for video processing

### **Long Term (Future)**
1. **Evaluate MediaConvert** for production
2. **Add video quality controls**
3. **Implement thumbnail generation**
4. **Add progress monitoring**

---

**🎯 The FFmpeg issue is a known infrastructure challenge that can be resolved with a Lambda layer. The core AI pipeline is working excellently, and this is the final piece needed for complete end-to-end functionality.**