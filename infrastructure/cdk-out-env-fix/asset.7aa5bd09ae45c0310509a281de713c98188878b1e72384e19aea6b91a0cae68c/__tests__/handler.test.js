/**
 * Unit tests for Audio Generator Lambda
 */

const { handler } = require('../handler');

// Mock AWS SDK
jest.mock('@aws-sdk/client-polly');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');

describe('Audio Generator Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set environment variables
        process.env.S3_BUCKET_NAME = 'test-bucket';
        process.env.CONTEXT_TABLE_NAME = 'test-context-table';
    });

    test('should handle health check request', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/health',
            body: null
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toMatchObject({
            service: expect.any(String),
            status: 'healthy'
        });
    });

    test('should handle audio generation request', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/audio/generate',
            body: JSON.stringify({
                text: 'Test audio content',
                voiceId: 'Joanna',
                projectId: 'test-project-123'
            })
        };

        const result = await handler(event);
        
        expect(result).toHaveProperty('statusCode');
        expect(result).toHaveProperty('body');
    });

    test('should validate required fields', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/audio/generate',
            body: JSON.stringify({
                // Missing required text field
                voiceId: 'Joanna'
            })
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toMatchObject({
            error: expect.any(String)
        });
    });

    test('should handle invalid endpoints', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/invalid-endpoint',
            body: null
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
    });
});
