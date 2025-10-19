# Design Document

## Overview

This design document outlines the implementation of an FFmpeg Lambda layer to enable real video processing capabilities in the automated video pipeline. The current Video Assembler uses a fallback system that creates comprehensive instruction files instead of actual MP4 videos due to missing FFmpeg binaries in the Lambda runtime environment. This implementation will provide the necessary FFmpeg and ffprobe binaries through an AWS Lambda layer, transforming the pipeline from instruction-based to actual video production.

The solution builds upon the existing fallback system architecture, maintaining backward compatibility while adding real video processing capabilities when FFmpeg is available.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FFmpeg Lambda Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   /opt/bin/     │  │   Dependencies  │  │   Libraries     │ │
│  │   ├── ffmpeg    │  │   ├── libx264   │  │   ├── glibc    │ │
│  │   └── ffprobe   │  │   ├── libx265   │  │   ├── libssl   │ │
│  └─────────────────┘  │   └── libfdk    │  │   └── libz     │ │
│                       └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Video Assembler Lambda Function                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              FFmpeg Availability Detection                  │ │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐ │ │
│  │  │ checkFFmpeg()   │───▶│ Real Video Processing Mode      │ │ │
│  │  │ - /opt/bin/     │    │ - createRealVideoWithFFmpeg()  │ │ │
│  │  │ - Binary tests  │    │ - MP4 output generation        │ │ │
│  │  └─────────────────┘    │ - Professional quality         │ │ │
│  │           │              └─────────────────────────────────┘ │ │
│  │           ▼                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │              Fallback Mode (Existing)                  │ │ │
│  │  │ - createFallbackVideoData()                            │ │ │
│  │  │ - Instruction files with image data                    │ │ │
│  │  │ - Maintains pipeline compatibility                     │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        S3 Storage                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Real MP4 Files  │  │ Fallback Files  │  │   Metadata      │ │
│  │ - final-video   │  │ - Instructions  │  │ - Context       │ │
│  │ - H.264/AAC     │  │ - Image data    │  │ - Processing    │ │
│  │ - 1920x1080     │  │ - FFmpeg cmds   │  │ - Logs          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Architecture

The FFmpeg Lambda layer follows AWS best practices for binary distribution:

- **Layer Path**: `/opt/bin/` - Standard location for executable binaries
- **Binary Compatibility**: Amazon Linux 2 compatible static builds
- **Size Optimization**: Stripped binaries with essential codecs only
- **Version Control**: Semantic versioning for layer updates

### Integration Points

1. **SAM Template Integration**: Layer resource definition and function association
2. **Environment Variables**: Path configuration for binary location
3. **Function Configuration**: Enhanced memory and timeout for video processing
4. **Fallback Compatibility**: Seamless operation when layer is unavailable

## Components and Interfaces

### FFmpeg Layer Component

**Purpose**: Provide FFmpeg and ffprobe binaries to Lambda functions

**Structure**:
```
ffmpeg-layer/
├── bin/
│   ├── ffmpeg          # Main video processing binary
│   └── ffprobe         # Media analysis and metadata extraction
└── lib/                # Shared libraries (if needed)
    ├── libx264.so
    ├── libx265.so
    └── libfdk-aac.so
```

**Interface**:
- **Binary Paths**: `/opt/bin/ffmpeg`, `/opt/bin/ffprobe`
- **Environment Variables**: `FFMPEG_PATH`, `FFPROBE_PATH`
- **Compatibility**: nodejs22.x runtime
- **Size Limit**: <250MB (AWS Lambda layer limit)

### Video Assembler Enhancement

**Current Interface** (maintained for compatibility):
```javascript
// POST /video/assemble
{
  "projectId": "string",
  "scenes": "array",
  "useManifest": "boolean",
  "manifestPath": "string"
}
```

**Enhanced Processing Flow**:
```javascript
async function createFinalVideo(projectId, contentAnalysis, masterAudioResult) {
  // 1. FFmpeg availability detection
  const ffmpegAvailable = checkFFmpegAvailability();
  
  // 2. Processing mode selection
  if (ffmpegAvailable) {
    return await createRealVideoWithFFmpeg(videoTimeline, masterAudioResult, scriptData);
  } else {
    return await createFallbackVideoData(videoTimeline, masterAudioResult, scriptData);
  }
}
```

**New Real Video Processing Interface**:
```javascript
async function createRealVideoWithFFmpeg(videoTimeline, masterAudioResult, scriptData) {
  // FFmpeg command construction
  const ffmpegCommand = [
    '-y',                                    // Overwrite output
    '-f', 'concat',                         // Input format
    '-safe', '0',                           // Allow absolute paths
    '-i', imageListFile,                    // Image sequence
    '-i', masterAudioResult.key,            // Audio input
    '-c:v', 'libx264',                      // Video codec
    '-c:a', 'aac',                          // Audio codec
    '-pix_fmt', 'yuv420p',                  // Pixel format
    '-r', '30',                             // Frame rate
    '-s', '1920x1080',                      // Resolution
    '-movflags', '+faststart',              // Web optimization
    outputPath                              // Output file
  ];
  
  return await executeFFmpegCommand(ffmpegCommand);
}
```

### SAM Template Integration

**Layer Resource Definition**:
```yaml
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
    LicenseInfo: 'GPL-2.0-or-later'
```

**Function Configuration Enhancement**:
```yaml
VideoAssemblerFunction:
  Type: AWS::Serverless::Function
  Properties:
    Layers:
      - !Ref FFmpegLayer
    Environment:
      Variables:
        FFMPEG_PATH: /opt/bin/ffmpeg
        FFPROBE_PATH: /opt/bin/ffprobe
    Timeout: 900        # 15 minutes for video processing
    MemorySize: 3008    # Maximum memory allocation
```

## Data Models

### FFmpeg Layer Metadata

```javascript
{
  "layerVersion": "1.0.0",
  "ffmpegVersion": "4.4.2",
  "buildDate": "2025-10-19T00:00:00Z",
  "architecture": "x86_64",
  "runtime": "amazon-linux-2",
  "binaries": {
    "ffmpeg": {
      "path": "/opt/bin/ffmpeg",
      "size": 45000000,
      "codecs": ["libx264", "libx265", "libfdk-aac", "aac"]
    },
    "ffprobe": {
      "path": "/opt/bin/ffprobe", 
      "size": 42000000,
      "capabilities": ["metadata", "streams", "format"]
    }
  }
}
```

### Video Processing Context

```javascript
{
  "processingMode": "ffmpeg" | "fallback",
  "ffmpegAvailable": boolean,
  "layerVersion": "string",
  "videoSpecs": {
    "resolution": "1920x1080",
    "frameRate": 30,
    "videoCodec": "libx264",
    "audioCodec": "aac",
    "format": "mp4"
  },
  "processingTime": number,
  "outputSize": number,
  "quality": "high" | "medium" | "low"
}
```

### Enhanced Video Output

```javascript
{
  "videoId": "string",
  "projectId": "string", 
  "status": "completed" | "processing" | "failed",
  "processingMode": "ffmpeg" | "fallback",
  "files": {
    "finalVideo": {
      "key": "videos/{projectId}/05-video/final-video.mp4",
      "size": number,
      "duration": number,
      "format": "mp4",
      "codec": "h264",
      "resolution": "1920x1080"
    },
    "masterAudio": {
      "key": "videos/{projectId}/04-audio/narration.mp3",
      "size": number,
      "duration": number,
      "format": "mp3"
    }
  },
  "metadata": {
    "scenes": number,
    "imagesUsed": number,
    "processingTime": number,
    "ffmpegCommand": "string[]",
    "qualityMetrics": {
      "bitrate": number,
      "fileSize": number,
      "compressionRatio": number
    }
  }
}
```

## Error Handling

### FFmpeg Layer Error Scenarios

1. **Layer Not Available**
   - **Detection**: Binary existence check fails
   - **Response**: Graceful fallback to instruction mode
   - **Logging**: Clear indication of fallback reason

2. **Binary Execution Failure**
   - **Detection**: FFmpeg command returns non-zero exit code
   - **Response**: Retry with simplified parameters, then fallback
   - **Logging**: FFmpeg stderr output for debugging

3. **Memory/Timeout Limits**
   - **Detection**: Lambda timeout or memory exhaustion
   - **Response**: Reduce video quality or split processing
   - **Logging**: Resource usage metrics

4. **Invalid Input Data**
   - **Detection**: Missing images or audio files
   - **Response**: Generate placeholder content or fail gracefully
   - **Logging**: Detailed validation error messages

### Error Response Structure

```javascript
{
  "success": false,
  "error": {
    "type": "FFMPEG_ERROR" | "LAYER_ERROR" | "RESOURCE_ERROR" | "INPUT_ERROR",
    "message": "string",
    "details": {
      "ffmpegOutput": "string",
      "command": "string[]",
      "exitCode": number,
      "processingMode": "ffmpeg" | "fallback"
    }
  },
  "fallbackUsed": boolean,
  "partialResults": {
    "audioProcessed": boolean,
    "imagesProcessed": number,
    "fallbackFile": "string"
  }
}
```

### Recovery Strategies

1. **Automatic Fallback**: Always maintain instruction-based processing as backup
2. **Parameter Adjustment**: Reduce quality settings for resource-constrained scenarios
3. **Chunked Processing**: Split large videos into smaller segments
4. **Retry Logic**: Attempt processing with different parameters before failing

## Testing Strategy

### Unit Testing

**FFmpeg Binary Detection**:
```javascript
describe('FFmpeg Availability Detection', () => {
  test('should detect FFmpeg binaries when layer is present', () => {
    // Mock layer environment
    process.env.FFMPEG_PATH = '/opt/bin/ffmpeg';
    process.env.FFPROBE_PATH = '/opt/bin/ffprobe';
    
    // Mock file system
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    
    const result = checkFFmpegAvailability();
    expect(result).toBe(true);
  });
  
  test('should gracefully handle missing binaries', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    
    const result = checkFFmpegAvailability();
    expect(result).toBe(false);
  });
});
```

**Video Processing Logic**:
```javascript
describe('Video Processing Mode Selection', () => {
  test('should use FFmpeg when available', async () => {
    jest.spyOn(videoAssembler, 'checkFFmpegAvailability').mockReturnValue(true);
    
    const result = await createFinalVideo(projectId, contentAnalysis, masterAudioResult);
    
    expect(result.processingMode).toBe('ffmpeg');
    expect(result.files.finalVideo.format).toBe('mp4');
  });
  
  test('should fallback when FFmpeg unavailable', async () => {
    jest.spyOn(videoAssembler, 'checkFFmpegAvailability').mockReturnValue(false);
    
    const result = await createFinalVideo(projectId, contentAnalysis, masterAudioResult);
    
    expect(result.processingMode).toBe('fallback');
    expect(result.files.finalVideo.format).toBe('json');
  });
});
```

### Integration Testing

**Layer Deployment Validation**:
```javascript
describe('FFmpeg Layer Integration', () => {
  test('should successfully deploy layer with binaries', async () => {
    const layerArn = await deployFFmpegLayer();
    expect(layerArn).toMatch(/arn:aws:lambda:.*:layer:ffmpeg-layer.*/);
    
    // Verify layer contents
    const layerInfo = await getLambdaLayerInfo(layerArn);
    expect(layerInfo.binaries).toContain('ffmpeg');
    expect(layerInfo.binaries).toContain('ffprobe');
  });
  
  test('should attach layer to Video Assembler function', async () => {
    const functionConfig = await getLambdaFunctionConfig('video-assembler');
    expect(functionConfig.Layers).toContainEqual(expect.stringMatching(/ffmpeg-layer/));
  });
});
```

**End-to-End Video Processing**:
```javascript
describe('Complete Video Processing Pipeline', () => {
  test('should create real MP4 video with FFmpeg layer', async () => {
    const testProject = await createTestProject();
    
    const response = await invokeVideoAssembler({
      projectId: testProject.id,
      scenes: testProject.scenes
    });
    
    expect(response.success).toBe(true);
    expect(response.processingMode).toBe('ffmpeg');
    
    // Verify actual MP4 file
    const videoFile = await downloadS3File(response.files.finalVideo.key);
    expect(videoFile.size).toBeGreaterThan(1000000); // > 1MB
    expect(await getVideoMetadata(videoFile)).toMatchObject({
      format: 'mp4',
      codec: 'h264',
      resolution: '1920x1080'
    });
  });
});
```

### Performance Testing

**Resource Usage Validation**:
```javascript
describe('Video Processing Performance', () => {
  test('should complete within timeout limits', async () => {
    const startTime = Date.now();
    
    const result = await processVideo(largeTestProject);
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(900000); // 15 minutes
    expect(result.success).toBe(true);
  });
  
  test('should handle memory constraints', async () => {
    const memoryUsage = await monitorMemoryUsage(() => 
      processVideo(highResolutionProject)
    );
    
    expect(memoryUsage.peak).toBeLessThan(3008 * 1024 * 1024); // 3008MB
  });
});
```

### Quality Assurance Testing

**Video Output Validation**:
```javascript
describe('Video Quality Assurance', () => {
  test('should produce valid MP4 files', async () => {
    const videoFile = await processTestVideo();
    
    const metadata = await analyzeVideoFile(videoFile);
    expect(metadata).toMatchObject({
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      duration: expect.any(Number)
    });
  });
  
  test('should maintain audio-video synchronization', async () => {
    const videoFile = await processTestVideo();
    
    const syncAnalysis = await analyzeAudioVideoSync(videoFile);
    expect(syncAnalysis.maxOffset).toBeLessThan(100); // < 100ms offset
    expect(syncAnalysis.avgOffset).toBeLessThan(50);  // < 50ms average
  });
});
```

This comprehensive testing strategy ensures the FFmpeg layer implementation is robust, performant, and maintains the high quality standards established by the existing pipeline architecture.