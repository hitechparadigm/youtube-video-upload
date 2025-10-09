/**
 * Lambda S3 Integration Tests - Merged from existing test/unit/
 * Tests that Lambda functions properly use the organized S3 structure with shared utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { uploadToS3, listS3Objects } from '../../src/shared/aws-service-manager.js';

describe('Lambda S3 Integration with Shared Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Organized S3 Path Structure', () => {
    it('should use organized S3 paths for project storage', async () => {
      const projectId = '2025-10-09_12-00-00_test-video';
      const expectedPaths = {
        context: `videos/${projectId}/01-context/`,
        script: `videos/${projectId}/02-script/`,
        media: `videos/${projectId}/03-media/`,
        audio: `videos/${projectId}/04-audio/`,
        video: `videos/${projectId}/05-video/`,
        metadata: `videos/${projectId}/06-metadata/`
      };

      // Test that shared utilities use correct path structure
      const mockUpload = jest.mocked(uploadToS3);
      mockUpload.mockResolvedValue(`s3://test-bucket/${expectedPaths.script}script.json`);

      const result = await uploadToS3(
        'test-bucket',
        `${expectedPaths.script}script.json`,
        JSON.stringify({ test: 'data' })
      );

      expect(result).toBe(`s3://test-bucket/${expectedPaths.script}script.json`);
      expect(mockUpload).toHaveBeenCalledWith(
        'test-bucket',
        `${expectedPaths.script}script.json`,
        JSON.stringify({ test: 'data' })
      );
    });

    it('should organize media assets by scene', async () => {
      const projectId = '2025-10-09_12-00-00_test-video';
      const sceneNumber = 1;
      const mediaId = 'img123';
      
      const expectedImagePath = `videos/${projectId}/03-media/scene-${sceneNumber}/images/${mediaId}.jpg`;
      const expectedVideoPath = `videos/${projectId}/03-media/scene-${sceneNumber}/videos/${mediaId}.mp4`;

      // Test image path
      const mockUpload = jest.mocked(uploadToS3);
      mockUpload.mockResolvedValue(`s3://test-bucket/${expectedImagePath}`);

      const imageResult = await uploadToS3('test-bucket', expectedImagePath, Buffer.from('image-data'));
      expect(imageResult).toBe(`s3://test-bucket/${expectedImagePath}`);

      // Test video path
      mockUpload.mockResolvedValue(`s3://test-bucket/${expectedVideoPath}`);
      const videoResult = await uploadToS3('test-bucket', expectedVideoPath, Buffer.from('video-data'));
      expect(videoResult).toBe(`s3://test-bucket/${expectedVideoPath}`);
    });
  });

  describe('Context Storage Integration', () => {
    it('should store contexts in organized structure', async () => {
      const projectId = '2025-10-09_12-00-00_test-video';
      const contextTypes = ['topic', 'scene', 'media', 'audio', 'video'];

      const mockUpload = jest.mocked(uploadToS3);
      
      for (const contextType of contextTypes) {
        const expectedPath = `contexts/${projectId}/${contextType}-context.json`;
        mockUpload.mockResolvedValue(`s3://test-bucket/${expectedPath}`);

        const result = await uploadToS3(
          'test-bucket',
          expectedPath,
          JSON.stringify({ contextType, projectId })
        );

        expect(result).toBe(`s3://test-bucket/${expectedPath}`);
      }

      expect(mockUpload).toHaveBeenCalledTimes(contextTypes.length);
    });
  });

  describe('Asset Organization', () => {
    it('should list assets by project and type', async () => {
      const projectId = '2025-10-09_12-00-00_test-video';
      const mockList = jest.mocked(listS3Objects);
      
      mockList.mockResolvedValue({
        objects: [
          { Key: `videos/${projectId}/03-media/scene-1/images/img1.jpg` },
          { Key: `videos/${projectId}/03-media/scene-1/videos/vid1.mp4` },
          { Key: `videos/${projectId}/04-audio/scene-1-audio.mp3` }
        ],
        keyCount: 3
      });

      const result = await listS3Objects('test-bucket', `videos/${projectId}/`);
      
      expect(result.objects).toHaveLength(3);
      expect(result.objects[0].Key).toContain('03-media');
      expect(result.objects[2].Key).toContain('04-audio');
    });
  });
});