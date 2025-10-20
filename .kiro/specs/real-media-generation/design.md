# Real Media Generation Design Document

## Overview

This design implements real media generation for the Automated Video Pipeline by replacing placeholder content with actual images from external APIs (Pexels/Pixabay) and ensuring the Video Assembler creates real MP4 files using the FFmpeg layer. The system will maintain the existing 7-component architecture while enhancing the Media Curator and Video Assembler to generate real content.

## Architecture

### Current State Analysis
- **Media Curator**: Enhanced with triple-API integration (Google Places + Pexels + Pixabay)
- **Google Places Integration**: Complete Places API v1 implementation with location intelligence
- **Video Assembler**: Has FFmpeg layer integration with real content validation
- **API Keys**: Google Places, Pexels, and Pixabay keys stored in AWS Secrets Manager
- **AWS Profile**: Uses `hitechparadigm` profile for AWS services

### Enhanced Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL MEDIA GENERATION FLOW                  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│  Media Curator (Enhanced with Triple-API Integration)          │
│  ├── API Key Retrieval (Secrets Manager)                      │
│  ├── Google Places API v1 Integration (Location Photos)       │
│  ├── Pexels API Integration (High-Quality Stock Content)      │
│  ├── Pixabay API Integration (Diverse Content Library)        │
│  ├── Intelligent Priority Scoring & Selection                 │
│  ├── Location Intelligence & Context Extraction               │
│  ├── Image/Video Validation & Processing                      │
│  └── S3 Storage with Enhanced Metadata                        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│  Video Assembler (Enhanced)                                    │
│  ├── FFmpeg Layer Integration                                  │
│  ├── Real Image Processing                                     │
│  ├── Audio Synchronization                                     │
│  └── MP4 Generation & Validation                              │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Media Curator

#### New Functions
```javascript
// Core image download functionality
async function downloadRealImages(searchQuery, count)
async function downloadFromPexels(query, count)
async function downloadFromPixabay(query, count)
async function getApiKeys()

// Image processing and validation
async function validateImageContent(buffer)
async function processImageForVideo(buffer, targetSize)
async function generateImageMetadata(imageData, source)
```

#### API Integration Pattern
```javascript
class ExternalAPIManager {
    constructor() {
        this.secretsClient = new SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.apiKeys = null;
        this.rateLimits = new Map();
    }

    async getApiKeys() {
        if (!this.apiKeys) {
            const response = await this.secretsClient.send(new GetSecretValueCommand({
                SecretId: process.env.API_KEYS_SECRET_NAME || 'automated-video-pipeline/api-keys'
            }));
            this.apiKeys = JSON.parse(response.SecretString);
        }
        return this.apiKeys;
    }

    async downloadFromPexels(query, count) {
        const keys = await this.getApiKeys();
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`, {
            headers: {
                'Authorization': keys['pexels-api-key'] || keys.pexels
            }
        });
        // Process response and return image buffers
    }
}
```

### 2. Enhanced Video Assembler

#### FFmpeg Integration Enhancement
```javascript
class VideoProcessor {
    constructor() {
        this.ffmpegPath = this.findWorkingFFmpegPath();
        this.tempDir = '/tmp/video-processing';
    }

    async createRealVideo(manifest) {
        // 1. Download real images from S3
        const images = await this.downloadImagesFromS3(manifest.scenes);
        
        // 2. Validate images are real (not text placeholders)
        const validatedImages = await this.validateRealImages(images);
        
        // 3. Create video using FFmpeg
        const videoPath = await this.assembleVideoWithFFmpeg(validatedImages, manifest.audio);
        
        // 4. Upload real MP4 to S3
        return await this.uploadVideoToS3(videoPath, manifest.projectId);
    }

    async validateRealImages(images) {
        return images.filter(img => {
            // Check if file is actually an image (not text)
            return img.buffer.length > 1000 && // Minimum size check
                   img.buffer.slice(0, 4).toString('hex') === 'ffd8ffe0' || // JPEG header
                   img.buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a'; // PNG header
        });
    }
}
```

## Data Models

### Enhanced Image Metadata
```javascript
{
    imageNumber: 1,
    s3Key: "videos/project-id/03-media/scene-1/images/1-travel-scene-1.jpg",
    keywords: ["travel", "costa rica"],
    size: 245760, // Actual file size in bytes
    source: "pexels", // or "pixabay"
    photographer: "John Doe",
    originalUrl: "https://www.pexels.com/photo/123456/",
    downloadedAt: "2025-10-19T21:31:35.000Z",
    isReal: true, // Flag to indicate real vs placeholder
    contentType: "image/jpeg",
    dimensions: { width: 1920, height: 1080 }
}
```

### Video Processing Manifest
```javascript
{
    projectId: "2025-10-19T21-31-28_travel-to-costa-rica",
    processingMode: "real", // "real" vs "fallback"
    ffmpegAvailable: true,
    images: [
        {
            sceneNumber: 1,
            imagePath: "videos/.../03-media/scene-1/images/1-travel-scene-1.jpg",
            isValidImage: true,
            fileSize: 245760
        }
    ],
    audio: {
        path: "videos/.../04-audio/narration.mp3",
        duration: 300,
        isValidAudio: true
    },
    output: {
        expectedSize: "> 1MB", // Minimum size for real video
        format: "mp4",
        resolution: "1920x1080"
    }
}
```

## Error Handling

### API Rate Limiting Strategy
```javascript
class RateLimitManager {
    constructor() {
        this.limits = {
            pexels: { requests: 200, window: 3600000, current: 0, resetTime: 0 },
            pixabay: { requests: 100, window: 3600000, current: 0, resetTime: 0 }
        };
    }

    async checkRateLimit(service) {
        const limit = this.limits[service];
        const now = Date.now();
        
        if (now > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = now + limit.window;
        }
        
        if (limit.current >= limit.requests) {
            throw new Error(`Rate limit exceeded for ${service}. Reset at ${new Date(limit.resetTime)}`);
        }
        
        limit.current++;
    }
}
```

### Fallback Strategy
1. **Primary**: Download from Pexels API
2. **Secondary**: Download from Pixabay API  
3. **Tertiary**: Use high-quality placeholder images (not text)
4. **Final**: Generate text placeholders with clear error logging

### Error Classification
- **API_KEY_MISSING**: Clear error message, fall back to placeholders
- **RATE_LIMIT_EXCEEDED**: Switch to alternative API or implement backoff
- **NETWORK_TIMEOUT**: Retry with exponential backoff (3 attempts)
- **INVALID_RESPONSE**: Log API response, try alternative search terms
- **FFMPEG_UNAVAILABLE**: Create instruction file with clear indication

## Testing Strategy

### Unit Tests
```javascript
describe('Real Media Generation', () => {
    test('downloadRealImages should return actual image buffers', async () => {
        const images = await downloadRealImages('costa rica travel', 3);
        expect(images).toHaveLength(3);
        expect(images[0].buffer.length).toBeGreaterThan(10000);
        expect(images[0].isReal).toBe(true);
    });

    test('validateImageContent should detect text placeholders', async () => {
        const textBuffer = Buffer.from('Placeholder Image: test');
        const isValid = await validateImageContent(textBuffer);
        expect(isValid).toBe(false);
    });

    test('FFmpeg should create real MP4 files', async () => {
        const videoPath = await createRealVideo(mockManifest);
        const stats = fs.statSync(videoPath);
        expect(stats.size).toBeGreaterThan(100000); // > 100KB
    });
});
```

### Integration Tests
```javascript
describe('End-to-End Real Content', () => {
    test('complete pipeline should generate real content', async () => {
        const result = await runCompletePipeline('travel to costa rica');
        
        // Verify real images were downloaded
        expect(result.mediaStats.realImages).toBeGreaterThan(0);
        expect(result.mediaStats.placeholderImages).toBe(0);
        
        // Verify real video was created
        expect(result.videoStats.fileSize).toBeGreaterThan(1000000); // > 1MB
        expect(result.videoStats.isRealMP4).toBe(true);
    });
});
```

### Performance Tests
- **API Response Time**: < 5 seconds per image download
- **FFmpeg Processing**: < 60 seconds for 5-minute video
- **Memory Usage**: < 1GB during concurrent image processing
- **Success Rate**: > 95% real content generation

## Implementation Phases

### Phase 1: Media Curator Enhancement
1. Implement `downloadRealImages()` function
2. Add API key retrieval from Secrets Manager
3. Implement Pexels and Pixabay API integration
4. Add image validation and processing
5. Update error handling and fallback logic

### Phase 2: Video Assembler Enhancement  
1. Enhance FFmpeg integration for real video creation
2. Add image validation (detect text placeholders)
3. Implement proper MP4 generation and validation
4. Add comprehensive error logging
5. Ensure minimum file size validation

### Phase 3: Testing and Validation
1. Unit tests for all new functions
2. Integration tests for complete pipeline
3. Performance testing with real API calls
4. Error scenario testing (rate limits, API failures)
5. End-to-end validation with real YouTube upload

### Phase 4: Monitoring and Optimization
1. CloudWatch metrics for success rates
2. API usage monitoring and alerting
3. Performance optimization based on real usage
4. Cost optimization for external API calls
5. Documentation updates and runbooks

## Security Considerations

### API Key Management
- Use AWS Secrets Manager for all external API keys
- Implement proper IAM roles for Secrets Manager access
- Rotate API keys regularly
- Log API usage without exposing keys

### Content Validation
- Validate downloaded images are appropriate content
- Implement content filtering for brand safety
- Check image dimensions and quality
- Verify file types and headers

### Resource Management
- Implement proper cleanup of temporary files
- Monitor Lambda memory usage during processing
- Set appropriate timeouts for external API calls
- Implement circuit breakers for failing APIs

This design ensures the transformation from placeholder content to real media generation while maintaining the robust architecture and error handling of the existing system.