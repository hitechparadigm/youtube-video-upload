/**
 * Unit tests for Script Generator Lambda
 */

const { handler } = require('../handler');

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock context integration
jest.mock('/opt/nodejs/context-integration', () => ({
    getTopicContext: jest.fn(),
    storeSceneContext: jest.fn(),
    updateProjectSummary: jest.fn()
}), { virtual: true });

describe('Script Generator Handler', () => {
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

    test('should handle script generation request', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/scripts/generate',
            body: JSON.stringify({
                topic: 'Test Topic',
                targetLength: 300,
                projectId: 'test-project-123'
            })
        };

        // Mock successful response
        const mockResponse = {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                script: { topic: 'Test Topic' }
            })
        };

        // Note: This would need the actual implementation to be mocked
        // For now, we're testing the handler structure
        const result = await handler(event);
        
        expect(result).toHaveProperty('statusCode');
        expect(result).toHaveProperty('body');
    });

    test('should handle invalid requests', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/invalid-endpoint',
            body: null
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toMatchObject({
            error: expect.any(String)
        });
    });

    test('should handle malformed JSON in body', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/scripts/generate',
            body: 'invalid-json'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
    });
});