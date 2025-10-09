/**
 * Simple tests for YouTube Service
 */

// Mock all AWS SDK modules before importing
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(),
    GetObjectCommand: jest.fn()
}));
jest.mock('@aws-sdk/client-secrets-manager', () => ({
    SecretsManagerClient: jest.fn(),
    GetSecretValueCommand: jest.fn()
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn()
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn()
    },
    PutCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    GetCommand: jest.fn()
}));
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn()
        },
        youtube: jest.fn()
    }
}));
jest.mock('fs', () => ({
    createReadStream: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn()
}));

const { YouTubeService } = require('../youtube-service');

describe('YouTubeService', () => {
    let youtubeService;

    beforeEach(() => {
        // Set up environment variables
        process.env.AWS_REGION = 'us-east-1';
        process.env.S3_BUCKET_NAME = 'test-bucket';
        process.env.YOUTUBE_SECRET_NAME = 'test-secret';
        process.env.VIDEOS_TABLE_NAME = 'test-table';

        youtubeService = new YouTubeService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateOptimizedMetadata', () => {
        test('should generate optimized metadata from script data', () => {
            const scriptData = {
                clickWorthyMetadata: {
                    title: 'This App Turned $50 Into $127 in 3 Weeks (Beginners Only)',
                    description: 'Sarah started with $50 and made $127 in just 3 weeks...',
                    tags: ['investment apps', 'beginners', 'money']
                },
                scenes: [
                    { duration: 15, type: 'hook' },
                    { duration: 45, type: 'story' },
                    { duration: 90, type: 'value' }
                ]
            };

            const trendData = {
                hotKeywords: ['2025 investing', 'AI stocks', 'mobile apps']
            };

            const result = youtubeService.generateOptimizedMetadata(scriptData, trendData);

            expect(result.title).toContain('This App Turned $50 Into $127');
            expect(result.description).toContain('TIMESTAMPS:');
            expect(result.description).toContain('0:00 - hook');
            expect(result.description).toContain('SUBSCRIBE');
            expect(result.tags).toContain('investment apps');
            expect(result.tags).toContain('2025 investing');
        });

        test('should handle missing script data gracefully', () => {
            const result = youtubeService.generateOptimizedMetadata({}, {});

            expect(result.title).toBe('Automated Video Content');
            expect(result.description).toContain('Automated video content');
            expect(result.tags).toContain('automated content');
        });
    });

    describe('optimizeTitle', () => {
        test('should optimize title within YouTube limits', () => {
            const longTitle = 'A'.repeat(120); // Exceeds 100 character limit
            const result = youtubeService.optimizeTitle(longTitle, {});

            expect(result.length).toBeLessThanOrEqual(100);
        });

        test('should add trending keywords when space allows', () => {
            const shortTitle = 'Investment Tips';
            const trendData = { hotKeywords: ['2025 trends'] };

            const result = youtubeService.optimizeTitle(shortTitle, trendData);

            expect(result).toContain('Investment Tips');
            expect(result).toContain('2025 trends');
        });
    });

    describe('generateStrategicTags', () => {
        test('should combine original tags with trending keywords', () => {
            const originalTags = ['investing', 'money'];
            const trendData = { hotKeywords: ['2025', 'apps', 'beginners'] };

            const result = youtubeService.generateStrategicTags(originalTags, trendData);

            expect(result).toContain('investing');
            expect(result).toContain('money');
            expect(result).toContain('2025');
            expect(result).toContain('apps');
            expect(result).toContain('automated content');
            expect(result.length).toBeLessThanOrEqual(15);
        });

        test('should remove duplicates', () => {
            const originalTags = ['investing', 'money', 'investing']; // Duplicate
            const result = youtubeService.generateStrategicTags(originalTags, {});

            const uniqueTags = [...new Set(result)];
            expect(result.length).toBe(uniqueTags.length);
        });
    });

    describe('createEngagingDescription', () => {
        test('should create description with timestamps', () => {
            const originalDescription = 'Test video description';
            const scriptData = {
                scenes: [
                    { duration: 30, type: 'intro' },
                    { duration: 60, type: 'main content' },
                    { duration: 15, type: 'outro' }
                ]
            };

            const result = youtubeService.createEngagingDescription(originalDescription, scriptData);

            expect(result).toContain('Test video description');
            expect(result).toContain('TIMESTAMPS:');
            expect(result).toContain('0:00 - intro');
            expect(result).toContain('0:30 - main content');
            expect(result).toContain('1:30 - outro');
            expect(result).toContain('SUBSCRIBE');
        });

        test('should handle missing description', () => {
            const result = youtubeService.createEngagingDescription(null, {});

            expect(result).toContain('Automated video content');
            expect(result).toContain('SUBSCRIBE');
        });
    });

    describe('publishVideo', () => {
        test('should handle missing YouTube client gracefully', async () => {
            const publishRequest = {
                videoId: 'test-video',
                videoFilePath: 's3://bucket/video.mp4',
                title: 'Test Video',
                description: 'Test description',
                tags: ['test']
            };

            // Mock the initialization to fail
            youtubeService.initializeYouTubeClient = jest.fn().mockRejectedValue(new Error('No credentials'));
            youtubeService.storeUploadRecord = jest.fn().mockResolvedValue();
            youtubeService.updateUploadRecord = jest.fn().mockResolvedValue();

            await expect(youtubeService.publishVideo(publishRequest)).rejects.toThrow('No credentials');
        });

        test('should validate required parameters', async () => {
            const invalidRequest = {
                videoId: 'test-video'
                // Missing videoFilePath
            };

            await expect(youtubeService.publishVideo(invalidRequest)).rejects.toThrow('Missing required parameters');
        });
    });

    describe('getYouTubeCredentials', () => {
        test('should validate required credential fields', async () => {
            // Mock Secrets Manager to return incomplete credentials
            youtubeService.secretsClient = {
                send: jest.fn().mockResolvedValue({
                    SecretString: JSON.stringify({
                        client_id: 'test-id'
                        // Missing client_secret and refresh_token
                    })
                })
            };

            await expect(youtubeService.getYouTubeCredentials()).rejects.toThrow('Missing required credential: client_secret');
        });

        test('should return valid credentials', async () => {
            const mockCredentials = {
                client_id: 'test-id',
                client_secret: 'test-secret',
                refresh_token: 'test-token',
                redirect_uri: 'http://localhost'
            };

            youtubeService.secretsClient = {
                send: jest.fn().mockResolvedValue({
                    SecretString: JSON.stringify(mockCredentials)
                })
            };

            const result = await youtubeService.getYouTubeCredentials();

            expect(result).toEqual(mockCredentials);
        });
    });
});
