/**
 * Unit Tests for FFmpeg Binary Manager
 * 
 * Tests the FFmpeg binary download, validation, and layer preparation system.
 * Covers all aspects of binary management including error scenarios.
 */

const fs = require('fs');
const path = require('path');
const {
    FFmpegBinaryManager,
    checkFFmpegAvailability
} = require('../ffmpeg-binary-manager');

// Mock dependencies
jest.mock('fs');
jest.mock('https');
jest.mock('child_process');

describe('FFmpegBinaryManager', () => {
    let manager;
    let mockLogger;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock logger
        mockLogger = {
            log: jest.fn(),
            error: jest.fn()
        };

        // Create manager instance
        manager = new FFmpegBinaryManager({
            logger: mockLogger
        });

        // Mock file system operations
        fs.existsSync = jest.fn();
        fs.mkdirSync = jest.fn();
        fs.rmSync = jest.fn();
        fs.readFileSync = jest.fn();
        fs.writeFileSync = jest.fn();
        fs.copyFileSync = jest.fn();
        fs.chmodSync = jest.fn();
        fs.statSync = jest.fn();
        fs.readdirSync = jest.fn();
        fs.createWriteStream = jest.fn();
    });

    describe('setupDirectories', () => {
        test('should create required directories', async () => {
            fs.existsSync.mockReturnValue(false);

            await manager.setupDirectories();

            expect(fs.mkdirSync).toHaveBeenCalledWith('ffmpeg-layer', {
                recursive: true
            });
            expect(fs.mkdirSync).toHaveBeenCalledWith('ffmpeg-layer/bin', {
                recursive: true
            });
            expect(fs.mkdirSync).toHaveBeenCalledWith('ffmpeg-temp', {
                recursive: true
            });
            expect(mockLogger.log).toHaveBeenCalledWith('📁 Setting up directory structure...');
            expect(mockLogger.log).toHaveBeenCalledWith('✅ Directory structure created');
        });

        test('should remove existing directories before creating new ones', async () => {
            fs.existsSync.mockReturnValue(true);

            await manager.setupDirectories();

            expect(fs.rmSync).toHaveBeenCalledWith('ffmpeg-layer', {
                recursive: true,
                force: true
            });
            expect(fs.rmSync).toHaveBeenCalledWith('ffmpeg-layer/bin', {
                recursive: true,
                force: true
            });
            expect(fs.rmSync).toHaveBeenCalledWith('ffmpeg-temp', {
                recursive: true,
                force: true
            });
        });
    });

    describe('verifyDownloadIntegrity', () => {
        test('should verify file size is within acceptable range', async () => {
            const mockStats = {
                size: 50 * 1024 * 1024
            }; // 50MB
            fs.statSync.mockReturnValue(mockStats);
            fs.readFileSync.mockReturnValue(Buffer.from('mock file content'));

            await expect(manager.verifyDownloadIntegrity('/mock/path')).resolves.toBeUndefined();

            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('✅ Download integrity verified - Size: 50.0MB')
            );
        });

        test('should reject files that are too small', async () => {
            const mockStats = {
                size: 5 * 1024 * 1024
            }; // 5MB
            fs.statSync.mockReturnValue(mockStats);
            fs.readFileSync.mockReturnValue(Buffer.from('small file'));

            await expect(manager.verifyDownloadIntegrity('/mock/path'))
                .rejects.toThrow('Downloaded file too small: 5.0MB');
        });

        test('should reject files that are too large', async () => {
            const mockStats = {
                size: 250 * 1024 * 1024
            }; // 250MB
            fs.statSync.mockReturnValue(mockStats);
            fs.readFileSync.mockReturnValue(Buffer.from('large file'));

            await expect(manager.verifyDownloadIntegrity('/mock/path'))
                .rejects.toThrow('Downloaded file too large: 250.0MB');
        });
    });

    describe('copyBinariesToLayer', () => {
        test('should copy binaries and make them executable', async () => {
            const extractedPath = '/mock/extracted';
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockReturnValue({
                size: 1024 * 1024
            }); // 1MB

            const result = await manager.copyBinariesToLayer(extractedPath);

            expect(fs.copyFileSync).toHaveBeenCalledWith(
                path.join(extractedPath, 'ffmpeg'),
                path.join('ffmpeg-layer/bin', 'ffmpeg')
            );
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                path.join(extractedPath, 'ffprobe'),
                path.join('ffmpeg-layer/bin', 'ffprobe')
            );

            expect(fs.chmodSync).toHaveBeenCalledWith(
                path.join('ffmpeg-layer/bin', 'ffmpeg'),
                0o755
            );
            expect(fs.chmodSync).toHaveBeenCalledWith(
                path.join('ffmpeg-layer/bin', 'ffprobe'),
                0o755
            );

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('ffmpeg');
            expect(result[1].name).toBe('ffprobe');
        });

        test('should throw error if binary not found', async () => {
            const extractedPath = '/mock/extracted';
            fs.existsSync.mockReturnValue(false);

            await expect(manager.copyBinariesToLayer(extractedPath))
                .rejects.toThrow('Binary not found');
        });
    });

    describe('validateSingleBinary', () => {
        const {
            spawn
        } = require('child_process');

        beforeEach(() => {
            // Mock spawn to return a mock process
            spawn.mockImplementation(() => {
                const mockProcess = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: jest.fn()
                };

                // Simulate successful execution
                setTimeout(() => {
                    // Simulate stdout data
                    const stdoutCall = mockProcess.stdout.on.mock.calls
                        .find(call => call[0] === 'data');
                    const stdoutCallback = stdoutCall ? stdoutCall[1] : null;
                    if (stdoutCallback) {
                        stdoutCallback('ffmpeg version 4.4.2 Copyright (c) 2000-2021 the FFmpeg developers\n');
                        stdoutCallback('configuration: --enable-gpl --enable-version3\n');
                        stdoutCallback('libavutil      56. 70.100 / 56. 70.100\n');
                        stdoutCallback('libavcodec     58.134.100 / 58.134.100\n');
                    }

                    // Simulate process close
                    const closeCall = mockProcess.on.mock.calls
                        .find(call => call[0] === 'close');
                    const closeCallback = closeCall ? closeCall[1] : null;
                    if (closeCallback) {
                        closeCallback(0); // Exit code 0 = success
                    }
                }, 10);

                return mockProcess;
            });
        });

        test('should validate binary with correct output patterns', async () => {
            const config = {
                expectedOutputPatterns: [
                    /ffmpeg version/i,
                    /configuration:/i,
                    /libavutil/i,
                    /libavcodec/i
                ]
            };

            const result = await manager.validateSingleBinary('/mock/ffmpeg', config);

            expect(result.version).toBe('4.4.2');
            expect(result.capabilities).toHaveLength(4);
            expect(spawn).toHaveBeenCalledWith('/mock/ffmpeg', ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
        });

        test('should reject binary with non-zero exit code', async () => {
            spawn.mockImplementation(() => {
                const mockProcess = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: jest.fn()
                };

                setTimeout(() => {
                    const closeCall = mockProcess.on.mock.calls
                        .find(call => call[0] === 'close');
                    const closeCallback = closeCall ? closeCall[1] : null;
                    if (closeCallback) {
                        closeCallback(1); // Exit code 1 = error
                    }
                }, 10);

                return mockProcess;
            });

            const config = {
                expectedOutputPatterns: [/ffmpeg version/i]
            };

            await expect(manager.validateSingleBinary('/mock/ffmpeg', config))
                .rejects.toThrow('Binary execution failed with code 1');
        });
    });

    describe('generateLayerMetadata', () => {
        test('should generate complete metadata for valid binaries', async () => {
            const validationResults = {
                ffmpeg: {
                    valid: true,
                    version: '4.4.2',
                    size: 45000000,
                    capabilities: ['version', 'configuration', 'libavutil', 'libavcodec']
                },
                ffprobe: {
                    valid: true,
                    version: '4.4.2',
                    size: 42000000,
                    capabilities: ['version', 'configuration', 'libavutil', 'libavformat']
                }
            };

            const metadata = await manager.generateLayerMetadata(validationResults);

            expect(metadata.layerVersion).toBe('1.0.0');
            expect(metadata.ffmpegVersion).toBe('4.4.2');
            expect(metadata.architecture).toBe('x86_64');
            expect(metadata.runtime).toBe('amazon-linux-2');
            expect(metadata.binaries.ffmpeg.path).toBe('/opt/bin/ffmpeg');
            expect(metadata.binaries.ffprobe.path).toBe('/opt/bin/ffprobe');

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringMatching(/ffmpeg-layer[\/\\]layer-metadata\.json$/),
                expect.stringContaining('"layerVersion": "1.0.0"')
            );
        });

        test('should exclude invalid binaries from metadata', async () => {
            const validationResults = {
                ffmpeg: {
                    valid: true,
                    version: '4.4.2',
                    size: 45000000,
                    capabilities: ['version']
                },
                ffprobe: {
                    valid: false,
                    error: 'Binary not found'
                }
            };

            const metadata = await manager.generateLayerMetadata(validationResults);

            expect(metadata.binaries.ffmpeg).toBeDefined();
            expect(metadata.binaries.ffprobe).toBeUndefined();
        });
    });

    describe('cleanup', () => {
        test('should remove temporary directory if it exists', async () => {
            fs.existsSync.mockReturnValue(true);

            await manager.cleanup();

            expect(fs.rmSync).toHaveBeenCalledWith('ffmpeg-temp', {
                recursive: true,
                force: true
            });
            expect(mockLogger.log).toHaveBeenCalledWith('🧹 Temporary files cleaned up');
        });

        test('should not fail if temporary directory does not exist', async () => {
            fs.existsSync.mockReturnValue(false);

            await expect(manager.cleanup()).resolves.toBeUndefined();
            expect(fs.rmSync).not.toHaveBeenCalled();
        });
    });

    describe('formatBytes', () => {
        test('should format bytes correctly', () => {
            expect(manager.formatBytes(0)).toBe('0 Bytes');
            expect(manager.formatBytes(1024)).toBe('1 KB');
            expect(manager.formatBytes(1024 * 1024)).toBe('1 MB');
            expect(manager.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
            expect(manager.formatBytes(1536)).toBe('1.5 KB');
        });
    });
});

describe('checkFFmpegAvailability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync = jest.fn();
        fs.statSync = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    test('should return available true when both binaries exist', () => {
        fs.existsSync.mockReturnValue(true);
        fs.statSync.mockReturnValue({
            size: 1024 * 1024
        });

        const result = checkFFmpegAvailability('/opt/bin/ffmpeg', '/opt/bin/ffprobe');

        expect(result.available).toBe(true);
        expect(result.ffmpeg.exists).toBe(true);
        expect(result.ffprobe.exists).toBe(true);
        expect(result.ffmpeg.size).toBe(1024 * 1024);
        expect(result.ffprobe.size).toBe(1024 * 1024);
    });

    test('should return available false when ffmpeg missing', () => {
        fs.existsSync.mockImplementation((path) => !path.includes('ffmpeg'));
        fs.statSync.mockReturnValue({
            size: 1024 * 1024
        });

        const result = checkFFmpegAvailability('/opt/bin/ffmpeg', '/opt/bin/ffprobe');

        expect(result.available).toBe(false);
        expect(result.ffmpeg.exists).toBe(false);
        expect(result.ffprobe.exists).toBe(true);
    });

    test('should return available false when ffprobe missing', () => {
        fs.existsSync.mockImplementation((path) => !path.includes('ffprobe'));
        fs.statSync.mockReturnValue({
            size: 1024 * 1024
        });

        const result = checkFFmpegAvailability('/opt/bin/ffmpeg', '/opt/bin/ffprobe');

        expect(result.available).toBe(false);
        expect(result.ffmpeg.exists).toBe(true);
        expect(result.ffprobe.exists).toBe(false);
    });

    test('should handle file system errors gracefully', () => {
        fs.existsSync.mockImplementation(() => {
            throw new Error('File system error');
        });

        const result = checkFFmpegAvailability('/opt/bin/ffmpeg', '/opt/bin/ffprobe');

        expect(result.available).toBe(false);
        expect(result.error).toBe('File system error');
        expect(console.error).toHaveBeenCalledWith(
            'Error checking FFmpeg availability:',
            'File system error'
        );
    });

    test('should use default paths when not specified', () => {
        fs.existsSync.mockReturnValue(true);
        fs.statSync.mockReturnValue({
            size: 1024 * 1024
        });

        const result = checkFFmpegAvailability();

        expect(result.available).toBe(true);
        expect(fs.existsSync).toHaveBeenCalledWith('/opt/bin/ffmpeg');
        expect(fs.existsSync).toHaveBeenCalledWith('/opt/bin/ffprobe');
    });

    test('should log availability status', () => {
        fs.existsSync.mockReturnValue(true);
        fs.statSync.mockReturnValue({
            size: 1024 * 1024
        });

        checkFFmpegAvailability('/opt/bin/ffmpeg', '/opt/bin/ffprobe');

        expect(console.log).toHaveBeenCalledWith('FFmpeg availability: ✅ /opt/bin/ffmpeg');
        expect(console.log).toHaveBeenCalledWith('FFprobe availability: ✅ /opt/bin/ffprobe');
    });
});

describe('FFmpegBinaryManager Integration', () => {
    let manager;

    beforeEach(() => {
        manager = new FFmpegBinaryManager({
            logger: {
                log: jest.fn(),
                error: jest.fn()
            }
        });
    });

    test('should handle complete download and validation process', async () => {
        // Mock all required methods
        manager.setupDirectories = jest.fn().mockResolvedValue();
        manager.downloadFFmpegBuild = jest.fn().mockResolvedValue('/mock/download.tar.xz');
        manager.verifyDownloadIntegrity = jest.fn().mockResolvedValue();
        manager.extractBinaries = jest.fn().mockResolvedValue('/mock/extracted');
        manager.copyBinariesToLayer = jest.fn().mockResolvedValue([{
                name: 'ffmpeg',
                size: 45000000
            },
            {
                name: 'ffprobe',
                size: 42000000
            }
        ]);
        manager.validateBinaries = jest.fn().mockResolvedValue({
            ffmpeg: {
                valid: true,
                version: '4.4.2',
                size: 45000000
            },
            ffprobe: {
                valid: true,
                version: '4.4.2',
                size: 42000000
            }
        });
        manager.generateLayerMetadata = jest.fn().mockResolvedValue({
            layerVersion: '1.0.0',
            ffmpegVersion: '4.4.2'
        });
        manager.cleanup = jest.fn().mockResolvedValue();

        const result = await manager.downloadAndValidateBinaries();

        expect(result.success).toBe(true);
        expect(result.layerPath).toBe('ffmpeg-layer');
        expect(manager.setupDirectories).toHaveBeenCalled();
        expect(manager.downloadFFmpegBuild).toHaveBeenCalled();
        expect(manager.verifyDownloadIntegrity).toHaveBeenCalled();
        expect(manager.extractBinaries).toHaveBeenCalled();
        expect(manager.copyBinariesToLayer).toHaveBeenCalled();
        expect(manager.validateBinaries).toHaveBeenCalled();
        expect(manager.generateLayerMetadata).toHaveBeenCalled();
        expect(manager.cleanup).toHaveBeenCalled();
    });

    test('should cleanup on error and re-throw', async () => {
        manager.setupDirectories = jest.fn().mockResolvedValue();
        manager.downloadFFmpegBuild = jest.fn().mockRejectedValue(new Error('Download failed'));
        manager.cleanup = jest.fn().mockResolvedValue();

        await expect(manager.downloadAndValidateBinaries()).rejects.toThrow('Download failed');
        expect(manager.cleanup).toHaveBeenCalled();
    });
});