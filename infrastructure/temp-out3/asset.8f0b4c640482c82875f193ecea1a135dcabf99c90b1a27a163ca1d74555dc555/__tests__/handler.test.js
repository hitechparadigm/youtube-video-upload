/**
 * Unit tests for Video Assembler Lambda
 */

const { handler, healthCheck } = require('../handler');

// Mock AWS SDK
jest.mock('@aws-sdk/client-ecs');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');

// Mock VideoProcessor
jest.mock('../video-processor', () => ({
    VideoProcessor: jest.fn().mockImplementation(() => ({
        assembleVideo: jest.fn().mockResolvedValue({
            success: true,
            videoId: 'test-video-123',
            outputLocation: 's3://test-bucket/videos/test-video-123/final.mp4'
        })
    }))
}));

describe('Video Assembler Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set environment variables
        process.env.S3_BUCKET_NAME = 'test-bucket';
        process.env.ECS_CLUSTER_NAME = 'test-cluster';
        process.env.VIDEOS_TABLE_NAME = 'test-videos-table';
    });

    test('should handle health check', async () => {
        const result = await healthCheck();

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toMatchObject({
            service: 'video-assembler',
            status: 'healthy',
            version: '1.0.0'
        });
    });

    test('should handle video assembly request', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/video/assemble',
            body: JSON.stringify({
                videoId: 'test-video-123',
                scriptData: { scenes: [] },
                mediaAssets: [],
                audioFile: 's3://test-bucket/audio/test.mp3'
            })
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toMatchObject({
            success: true,
            message: expect.any(String),
            result: expect.any(Object)
        });
    });

    test('should handle missing videoId', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/video/assemble',
            body: JSON.stringify({
                // Missing videoId
                scriptData: { scenes: [] }
            })
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toMatchObject({
            success: false,
            error: expect.any(String)
        });
    });

    test('should handle direct invocation', async () => {
        const event = {
            videoId: 'test-video-123',
            scriptData: { scenes: [] },
            mediaAssets: [],
            audioFile: 's3://test-bucket/audio/test.mp3'
        };

        const result = await handler(event);

        expect(result).toMatchObject({
            success: true,
            videoId: 'test-video-123'
        });
    });

    test('should handle S3 trigger events', async () => {
        const event = {
            Records: [{
                eventSource: 'aws:s3',
                s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'videos/test-video-123/script.json' }
                }
            }]
        };

        const result = await handler(event);

        expect(result).toMatchObject({
            success: true,
            videoId: 'test-video-123'
        });
    });
});