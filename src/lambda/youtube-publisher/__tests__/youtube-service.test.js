/**
 * YouTube Service Tests
 * Tests for video upload, authentication integration, and service functionality
 */

const {
    YouTubeService
} = require('../youtube-service');

// Mock dependencies
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../oauth-manager');

describe('YouTubeService', () => {
    let youtubeService;
    let mockOAuthManager;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock OAuth Manager
        const {
            YouTubeOAuthManager
        } = require('../oauth-manager');
        mockOAuthManager = {
            getAuthenticatedClient: jest.fn(),
            getAuthStatus: jest.fn()
        };
        YouTubeOAuthManager.mockImplementation(() => mockOAuthManager);

        youtubeService = new YouTubeService();
    });

    describe('initialization', () => {
        test('should initialize with default configuration', () => {
            expect(youtubeService.config.bucket).toBe('automated-video-pipeline-786673323159-us-east-1');
            expect(youtubeService.config.secretName).toBe('youtube-automation/credentials');
        });

        test('should initialize OAuth manager', () => {
            expect(youtubeService.oauthManager).toBeDefined();
        });
    });

    describe('authentication status', () => {
        test('should check authentication status successfully', async () => {
            const mockAuthStatus = {
                authenticated: true,
                channelInfo: {
                    channelId: 'test-channel-id',
                    channelTitle: 'Test Channel'
                }
            };

            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            const result = await youtubeService.checkAuthenticationStatus();

            expect(result).toEqual(mockAuthStatus);
            expect(mockOAuthManager.getAuthStatus).toHaveBeenCalledTimes(1);
        });

        test('should handle authentication check failures', async () => {
            mockOAuthManager.getAuthStatus.mockRejectedValue(new Error('Auth check failed'));

            const result = await youtubeService.checkAuthenticationStatus();

            expect(result.authenticated).toBe(false);
            expect(result.error).toBe('Auth check failed');
            expect(result.needsReauth).toBe(true);
        });
    });

    describe('publish video with mode', () => {
        test('should use upload mode when authenticated', async () => {
            const mockAuthStatus = {
                authenticated: true
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            // Mock the publishVideo method
            youtubeService.publishVideo = jest.fn().mockResolvedValue({
                success: true,
                youtubeVideoId: 'test-video-id',
                youtubeUrl: 'https://youtube.com/watch?v=test-video-id'
            });

            const publishRequest = {
                videoId: 'test-video',
                title: 'Test Video',
                mode: 'auto'
            };

            const result = await youtubeService.publishVideoWithMode(publishRequest);

            expect(result.success).toBe(true);
            expect(youtubeService.publishVideo).toHaveBeenCalledWith(publishRequest);
        });

        test('should use metadata-only mode when not authenticated', async () => {
            const mockAuthStatus = {
                authenticated: false
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            // Mock the storeUploadRecord method
            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();

            const publishRequest = {
                videoId: 'test-video',
                title: 'Test Video',
                mode: 'auto'
            };

            const result = await youtubeService.publishVideoWithMode(publishRequest);

            expect(result.success).toBe(true);
            expect(result.mode).toBe('metadata-only');
            expect(result.metadata).toBeDefined();
            expect(result.metadata.uploadInstructions).toBeDefined();
        });

        test('should force upload mode when explicitly requested', async () => {
            const mockAuthStatus = {
                authenticated: true
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            youtubeService.publishVideo = jest.fn().mockResolvedValue({
                success: true,
                youtubeVideoId: 'test-video-id'
            });

            const publishRequest = {
                videoId: 'test-video',
                mode: 'upload'
            };

            await youtubeService.publishVideoWithMode(publishRequest);

            expect(youtubeService.publishVideo).toHaveBeenCalled();
        });

        test('should force metadata-only mode when explicitly requested', async () => {
            const mockAuthStatus = {
                authenticated: true
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();

            const publishRequest = {
                videoId: 'test-video',
                mode: 'metadata'
            };

            const result = await youtubeService.publishVideoWithMode(publishRequest);

            expect(result.mode).toBe('metadata-only');
            expect(youtubeService.storeUploadRecord).toHaveBeenCalled();
        });
    });

    describe('metadata-only mode', () => {
        test('should create comprehensive metadata for manual upload', async () => {
            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();

            const publishRequest = {
                videoId: 'test-video',
                title: 'Test Video Title',
                description: 'Test Description',
                tags: ['test', 'video'],
                privacy: 'unlisted',
                videoFilePath: 's3://bucket/video.mp4',
                thumbnail: 's3://bucket/thumb.jpg'
            };

            const authStatus = {
                authenticated: false,
                error: 'No credentials'
            };

            const result = await youtubeService.createMetadataOnly(publishRequest, authStatus);

            expect(result.success).toBe(true);
            expect(result.mode).toBe('metadata-only');
            expect(result.metadata.youtubeMetadata.title).toBe('Test Video Title');
            expect(result.metadata.youtubeMetadata.description).toBe('Test Description');
            expect(result.metadata.youtubeMetadata.tags).toEqual(['test', 'video']);
            expect(result.metadata.youtubeMetadata.privacy).toBe('unlisted');
            expect(result.metadata.uploadInstructions.steps).toHaveLength(7);
            expect(result.metadata.uploadInstructions.videoLocation).toBe('s3://bucket/video.mp4');
            expect(result.metadata.authenticationStatus).toEqual(authStatus);
        });

        test('should use default values for missing metadata', async () => {
            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();

            const publishRequest = {
                videoId: 'test-video'
            };

            const result = await youtubeService.createMetadataOnly(publishRequest, {});

            expect(result.metadata.youtubeMetadata.title).toBe('AI Generated Video - test-video');
            expect(result.metadata.youtubeMetadata.description).toBe('AI-generated video content ready for upload.');
            expect(result.metadata.youtubeMetadata.tags).toEqual(['ai-generated', 'automated-content']);
            expect(result.metadata.youtubeMetadata.privacy).toBe('unlisted');
        });
    });

    describe('error handling', () => {
        test('should fallback to metadata-only on upload failure', async () => {
            const mockAuthStatus = {
                authenticated: true
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            // Mock publishVideo to fail
            youtubeService.publishVideo = jest.fn().mockRejectedValue(new Error('Upload failed'));
            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();

            const publishRequest = {
                videoId: 'test-video',
                mode: 'auto'
            };

            const result = await youtubeService.publishVideoWithMode(publishRequest);

            expect(result.success).toBe(true);
            expect(result.mode).toBe('metadata-only');
            expect(result.message).toContain('Manual upload required due to authentication issues');
        });

        test('should throw error if both upload and metadata-only fail', async () => {
            const mockAuthStatus = {
                authenticated: true
            };
            mockOAuthManager.getAuthStatus.mockResolvedValue(mockAuthStatus);

            youtubeService.publishVideo = jest.fn().mockRejectedValue(new Error('Upload failed'));
            youtubeService.storeUploadRecord = jest.fn().mockRejectedValue(new Error('Storage failed'));

            const publishRequest = {
                videoId: 'test-video',
                mode: 'auto'
            };

            await expect(youtubeService.publishVideoWithMode(publishRequest)).rejects.toThrow('Complete publishing failure');
        });
    });
});