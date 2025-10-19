/**
 * Unit Tests for Layer Deployment System
 */

const {
    LayerDeploymentManager
} = require('../layer-deployment');
const {
    spawn
} = require('child_process');

jest.mock('child_process');

describe('LayerDeploymentManager', () => {
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new LayerDeploymentManager({
            environment: 'test',
            logger: {
                log: jest.fn(),
                error: jest.fn()
            }
        });
    });

    describe('parseS3Location', () => {
        test('should parse S3 URL correctly', () => {
            const result = manager.parseS3Location('s3://my-bucket/path/to/file.zip');
            expect(result).toEqual({
                bucket: 'my-bucket',
                key: 'path/to/file.zip'
            });
        });

        test('should handle object input', () => {
            const input = {
                bucket: 'test-bucket',
                key: 'test-key'
            };
            const result = manager.parseS3Location(input);
            expect(result).toEqual(input);
        });

        test('should throw error for invalid format', () => {
            expect(() => {
                manager.parseS3Location('invalid-url');
            }).toThrow('Invalid S3 location format');
        });
    });

    describe('extractLayerVersion', () => {
        test('should extract version from ARN', () => {
            const arn = 'arn:aws:lambda:us-east-1:123456789:layer:test-layer:5';
            const version = manager.extractLayerVersion(arn);
            expect(version).toBe('5');
        });

        test('should throw error for invalid ARN', () => {
            expect(() => {
                manager.extractLayerVersion('invalid-arn');
            }).toThrow('Cannot extract version from layer ARN');
        });
    });

    describe('validateS3Location', () => {
        test('should validate existing S3 object', async () => {
            const mockProcess = {
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn()
            };

            spawn.mockReturnValue(mockProcess);

            setTimeout(() => {
                const closeCallback = mockProcess.on.mock.calls
                    .find(call => call[0] === 'close')[1];
                closeCallback(0); // Success
            }, 10);

            await expect(manager.validateS3Location('s3://test-bucket/test-key'))
                .resolves.toBeUndefined();
        });

        test('should reject for missing S3 object', async () => {
            const mockProcess = {
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn()
            };

            spawn.mockReturnValue(mockProcess);

            setTimeout(() => {
                const stderrCallback = mockProcess.stderr.on.mock.calls
                    .find(call => call[0] === 'data')[1];
                stderrCallback('NoSuchKey');

                const closeCallback = mockProcess.on.mock.calls
                    .find(call => call[0] === 'close')[1];
                closeCallback(1); // Error
            }, 10);

            await expect(manager.validateS3Location('s3://test-bucket/missing-key'))
                .rejects.toThrow('S3 object not found');
        });
    });
});