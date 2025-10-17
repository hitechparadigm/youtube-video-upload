/**
 * Integration Tests for YouTube Publisher
 * Tests the complete flow from request to response
 */

const {
    handler
} = require('../index');

// Mock all dependencies
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../oauth-manager');
jest.mock('../youtube-service');

describe('YouTube Publisher Integration', () => {
    let mockYouTubeService;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock YouTube Service
        const {
            YouTubeService
        } = require('../youtube-service');
        mockYouTubeService = {
            checkAuthenticationStatus: jest.fn(),
            publishVideoWithMode: jest.fn()
        };
        YouTubeService.mockImplementation(() => mockYouTubeService);
    });

    describe('health check endpoint', () => {
        test('should return healthy status', async () => {
            const event = {
                httpMethod: 'GET',
                path: '/youtube/health'
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.service).toBe('youtube-publisher-complete-metadata');
            expect(body.status).toBe('healthy');
            expect(body.capabilities).toContain('youtube-upload');
            expect(body.uploadModeAvailable).toBe(true);
        });
    });

    describe('authentication check endpoint', () => {
        test('should return authentication status', async () => {
            const mockAuthStatus = {
                authenticated: true,
                channelInfo: {
                    channelId: 'test-channel',
                    channelTitle: 'Test Channel'
                }
            };

            mockYouTubeService.checkAuthenticationStatus.mockResolvedValue(mockAuthStatus);

            const event = {
                httpMethod: 'POST',
                path: '/youtube/auth-check'
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.authStatus).toEqual(mockAuthStatus);
        });

        test('should handle authentication check failures', async () => {
            mockYouTubeService.checkAuthenticationStatus.mockRejectedValue(new Error('Auth failed'));

            const event = {
                httpMethod: 'POST',
                path: '/youtube/auth-check'
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(false);
            expect(body.error).toBe('Authentication check failed');
        });
    });

    describe('publish endpoint with action-based requests', () => {
        test('should handle auth-check action', async () => {
            const mockAuthStatus = {
                authenticated: false,
                error: 'No credentials'
            };

            mockYouTubeService.checkAuthenticationStatus.mockResolvedValue(mockAuthStatus);

            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    action: 'auth-check'
                })
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.action).toBe('auth-check');
            expect(body.authStatus).toEqual(mockAuthStatus);
        });

        test('should handle auth-check action failures', async () => {
            mockYouTubeService.checkAuthenticationStatus.mockRejectedValue(new Error('Service unavailable'));

            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    action: 'auth-check'
                })
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(false);
            expect(body.action).toBe('auth-check');
            expect(body.details).toBe('Service unavailable');
        });
    });

    describe('upload mode integration', () => {
        test('should handle upload mode request successfully', async () => {
            // Mock successful upload
            const mockUploadResult = {
                success: true,
                mode: 'upload',
                videoId: 'test-project',
                youtubeUrl: 'https://youtube.com/watch?v=abc123',
                youtubeVideoId: 'abc123',
                uploadTime: 30000
            };

            mockYouTubeService.publishVideoWithMode.mockResolvedValue(mockUploadResult);

            // Mock analyzeCompleteProject function
            global.analyzeCompleteProject = jest.fn().mockResolvedValue({
                contentByType: {
                    video: [{
                        Key: 'videos/test-project/05-video/final-video.mp4'
                    }],
                    media: [{
                        Key: 'videos/test-project/03-media/scene-1/images/image1.jpg'
                    }]
                }
            });

            // Mock createYouTubeMetadata function
            global.createYouTubeMetadata = jest.fn().mockResolvedValue({
                videoDetails: {
                    title: 'Test Video',
                    description: 'Test Description',
                    tags: ['test'],
                    privacy: 'unlisted',
                    category: '22'
                }
            });

            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    projectId: 'test-project',
                    mode: 'upload',
                    enableUpload: true,
                    privacy: 'unlisted'
                })
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.mode).toBe('upload');
            expect(body.youtubeUrl).toBe('https://youtube.com/watch?v=abc123');
        });

        test('should handle upload mode failures gracefully', async () => {
            // Mock upload failure
            mockYouTubeService.publishVideoWithMode.mockRejectedValue(new Error('Upload failed'));

            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    projectId: 'test-project',
                    mode: 'upload',
                    enableUpload: true
                })
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(false);
            expect(body.mode).toBe('upload-failed');
            expect(body.fallbackAvailable).toBe(true);
        });
    });

    describe('metadata-only mode integration', () => {
        test('should handle metadata-only mode when upload disabled', async () => {
            // Mock analyzeCompleteProject and other functions for metadata-only mode
            global.analyzeCompleteProject = jest.fn().mockResolvedValue({
                totalFiles: 10,
                contentByType: {
                    context: [],
                    script: [],
                    media: [],
                    audio: [],
                    video: []
                }
            });

            global.createYouTubeMetadata = jest.fn().mockResolvedValue({});
            global.createProjectSummary = jest.fn().mockResolvedValue({});
            global.createCostTracking = jest.fn().mockResolvedValue({});
            global.createAnalytics = jest.fn().mockResolvedValue({});
            global.uploadAllMetadataFiles = jest.fn().mockResolvedValue([]);

            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    projectId: 'test-project',
                    mode: 'metadata',
                    enableUpload: false
                })
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.mode).toBe('complete-metadata-creation');
            expect(body.status).toBe('ready-for-upload');
        });
    });

    describe('error handling', () => {
        test('should handle malformed requests', async () => {
            const event = {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: 'invalid json'
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(false);
        });

        test('should handle unsupported endpoints', async () => {
            const event = {
                httpMethod: 'GET',
                path: '/youtube/unsupported'
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(404);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(false);
            expect(body.error).toBe('Endpoint not found');
        });
    });
});