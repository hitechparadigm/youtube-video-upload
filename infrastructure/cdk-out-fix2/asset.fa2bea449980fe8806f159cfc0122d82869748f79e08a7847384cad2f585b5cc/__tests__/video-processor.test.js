/**
 * Simple tests for Video Processor
 */

const { VideoProcessor } = require('../video-processor');

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ecs');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('VideoProcessor', () => {
    let processor;

    beforeEach(() => {
        // Set up environment variables
        process.env.AWS_REGION = 'us-east-1';
        process.env.S3_BUCKET_NAME = 'test-bucket';
        process.env.ECS_CLUSTER_NAME = 'test-cluster';
        process.env.VIDEOS_TABLE_NAME = 'test-table';

        processor = new VideoProcessor();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('prepareMediaAssets', () => {
        test('should prepare valid media assets', async () => {
            // Mock S3 validation to return true
            processor.validateS3Asset = jest.fn().mockResolvedValue(true);

            const mediaAssets = [
                {
                    type: 'image',
                    s3Location: 's3://test-bucket/image1.jpg',
                    duration: 5,
                    sceneId: 1
                },
                {
                    type: 'image',
                    s3Location: 's3://test-bucket/image2.jpg',
                    duration: 3,
                    sceneId: 2
                }
            ];

            const result = await processor.prepareMediaAssets('test-video', mediaAssets);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'asset_1',
                type: 'image',
                s3Location: 's3://test-bucket/image1.jpg',
                duration: 5,
                sceneId: 1,
                validated: true
            });
        });

        test('should skip invalid assets', async () => {
            // Mock S3 validation to return false for second asset
            processor.validateS3Asset = jest.fn()
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const mediaAssets = [
                { s3Location: 's3://test-bucket/valid.jpg' },
                { s3Location: 's3://test-bucket/invalid.jpg' }
            ];

            const result = await processor.prepareMediaAssets('test-video', mediaAssets);

            expect(result).toHaveLength(1);
            expect(result[0].s3Location).toBe('s3://test-bucket/valid.jpg');
        });
    });

    describe('synchronizeWithAudio', () => {
        test('should synchronize assets with script timing', async () => {
            const mediaAssets = [
                { id: 'asset_1', duration: 5 },
                { id: 'asset_2', duration: 3 }
            ];

            const scriptData = {
                totalDuration: 480,
                scenes: [
                    { duration: 15, narration: 'Scene 1' },
                    { duration: 10, narration: 'Scene 2' }
                ]
            };

            const result = await processor.synchronizeWithAudio(
                'test-video',
                mediaAssets,
                'audio.mp3',
                scriptData
            );

            expect(result.assets).toHaveLength(2);
            expect(result.assets[0]).toMatchObject({
                startTime: 0,
                duration: 15,
                endTime: 15,
                sceneNarration: 'Scene 1',
                audioSync: true
            });
            expect(result.assets[1]).toMatchObject({
                startTime: 15,
                duration: 10,
                endTime: 25,
                sceneNarration: 'Scene 2',
                audioSync: true
            });
        });
    });

    describe('generateFFmpegInstructions', () => {
        test('should generate valid FFmpeg command', async () => {
            // Mock S3 put operation
            processor.s3Client = {
                send: jest.fn().mockResolvedValue({})
            };

            const synchronizedAssets = {
                assets: [
                    { s3Location: 'image1.jpg', duration: 5 },
                    { s3Location: 'image2.jpg', duration: 3 }
                ]
            };

            const result = await processor.generateFFmpegInstructions(
                'test-video',
                synchronizedAssets,
                'audio.mp3',
                { resolution: '1920x1080', fps: 30 }
            );

            expect(result.command).toContain('ffmpeg -y');
            expect(result.command).toContain('-loop 1 -t 5 -i "image1.jpg"');
            expect(result.command).toContain('-loop 1 -t 3 -i "image2.jpg"');
            expect(result.command).toContain('-i "audio.mp3"');
            expect(result.command).toContain('libx264');
            expect(result.command).toContain('test-video-final.mp4');
        });
    });

    describe('assembleVideo', () => {
        test('should complete full video assembly process', async () => {
            // Mock all dependencies
            processor.storeVideoJob = jest.fn().mockResolvedValue();
            processor.updateVideoJob = jest.fn().mockResolvedValue();
            processor.prepareMediaAssets = jest.fn().mockResolvedValue([
                { id: 'asset_1', s3Location: 'image1.jpg', duration: 5 }
            ]);
            processor.synchronizeWithAudio = jest.fn().mockResolvedValue({
                assets: [{ id: 'asset_1', duration: 5 }],
                totalDuration: 5
            });
            processor.generateFFmpegInstructions = jest.fn().mockResolvedValue({
                command: 'ffmpeg test command'
            });
            processor.executeVideoProcessing = jest.fn().mockResolvedValue({
                success: true,
                outputLocation: 's3://bucket/output.mp4'
            });

            const assemblyRequest = {
                videoId: 'test-video',
                scriptData: { totalDuration: 480, scenes: [] },
                mediaAssets: [{ s3Location: 'image1.jpg' }],
                audioFile: 'audio.mp3'
            };

            const result = await processor.assembleVideo(assemblyRequest);

            expect(result.success).toBe(true);
            expect(result.videoId).toBe('test-video');
            expect(result.outputLocation).toBe('s3://bucket/output.mp4');
            expect(processor.storeVideoJob).toHaveBeenCalled();
            expect(processor.updateVideoJob).toHaveBeenCalled();
        });

        test('should handle assembly errors gracefully', async () => {
            processor.storeVideoJob = jest.fn().mockResolvedValue();
            processor.updateVideoJob = jest.fn().mockResolvedValue();
            processor.prepareMediaAssets = jest.fn().mockRejectedValue(new Error('Asset preparation failed'));

            const assemblyRequest = {
                videoId: 'test-video',
                scriptData: { scenes: [] },
                mediaAssets: [],
                audioFile: 'audio.mp3'
            };

            await expect(processor.assembleVideo(assemblyRequest)).rejects.toThrow('Asset preparation failed');
            expect(processor.updateVideoJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    videoId: 'test-video',
                    status: 'failed',
                    error: 'Asset preparation failed'
                })
            );
        });
    });
});
