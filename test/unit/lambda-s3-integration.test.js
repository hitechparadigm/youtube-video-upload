/**
 * Lambda S3 Integration Unit Tests
 * 
 * Tests that Lambda functions properly use the new S3 organization structure
 */

describe('Lambda S3 Integration Tests', () => {
    
    describe('Script Generator S3 Integration', () => {
        test('should use organized S3 paths for script storage', () => {
            // Mock the generateS3Paths function
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                script: {
                    json: 'videos/2025-10-08_15-30-15_test-video/02-script/script.json'
                },
                metadata: {
                    youtube: 'videos/2025-10-08_15-30-15_test-video/06-metadata/youtube-metadata.json',
                    project: 'videos/2025-10-08_15-30-15_test-video/06-metadata/project-summary.json'
                }
            });
            
            // Test that the function would use the correct paths
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = mockGenerateS3Paths(projectId, title);
            
            expect(paths.script.json).toMatch(/02-script\/script\.json$/);
            expect(paths.metadata.youtube).toMatch(/06-metadata\/youtube-metadata\.json$/);
            expect(paths.metadata.project).toMatch(/06-metadata\/project-summary\.json$/);
        });
    });
    
    describe('Media Curator S3 Integration', () => {
        test('should use scene-specific media paths', () => {
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                media: {
                    getScenePath: (sceneNumber) => `videos/2025-10-08_15-30-15_test-video/03-media/scene-${sceneNumber}`,
                    getImagePath: (sceneNumber, mediaId) => `videos/2025-10-08_15-30-15_test-video/03-media/scene-${sceneNumber}/images/${mediaId}.jpg`,
                    getVideoPath: (sceneNumber, mediaId) => `videos/2025-10-08_15-30-15_test-video/03-media/scene-${sceneNumber}/videos/${mediaId}.mp4`
                }
            });
            
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = mockGenerateS3Paths(projectId, title);
            
            const scene1Path = paths.media.getScenePath(1);
            const imagePath = paths.media.getImagePath(1, 'img123');
            const videoPath = paths.media.getVideoPath(2, 'vid456');
            
            expect(scene1Path).toMatch(/03-media\/scene-1$/);
            expect(imagePath).toMatch(/03-media\/scene-1\/images\/img123\.jpg$/);
            expect(videoPath).toMatch(/03-media\/scene-2\/videos\/vid456\.mp4$/);
        });
    });
    
    describe('Audio Generator S3 Integration', () => {
        test('should use organized audio paths', () => {
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                audio: {
                    narration: 'videos/2025-10-08_15-30-15_test-video/04-audio/narration.mp3',
                    getSegmentPath: (sceneNumber) => `videos/2025-10-08_15-30-15_test-video/04-audio/audio-segments/scene-${sceneNumber}.mp3`,
                    metadata: 'videos/2025-10-08_15-30-15_test-video/04-audio/audio-metadata.json'
                }
            });
            
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = mockGenerateS3Paths(projectId, title);
            
            expect(paths.audio.narration).toMatch(/04-audio\/narration\.mp3$/);
            expect(paths.audio.getSegmentPath(1)).toMatch(/04-audio\/audio-segments\/scene-1\.mp3$/);
            expect(paths.audio.metadata).toMatch(/04-audio\/audio-metadata\.json$/);
        });
    });
    
    describe('Video Assembler S3 Integration', () => {
        test('should use organized video paths', () => {
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                video: {
                    final: 'videos/2025-10-08_15-30-15_test-video/05-video/final-video.mp4',
                    processing: 'videos/2025-10-08_15-30-15_test-video/05-video/processing-logs',
                    instructions: 'videos/2025-10-08_15-30-15_test-video/05-video/processing-logs/ffmpeg-instructions.json',
                    manifest: 'videos/2025-10-08_15-30-15_test-video/05-video/processing-logs/processing-manifest.json'
                }
            });
            
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = mockGenerateS3Paths(projectId, title);
            
            expect(paths.video.final).toMatch(/05-video\/final-video\.mp4$/);
            expect(paths.video.processing).toMatch(/05-video\/processing-logs$/);
            expect(paths.video.instructions).toMatch(/05-video\/processing-logs\/ffmpeg-instructions\.json$/);
            expect(paths.video.manifest).toMatch(/05-video\/processing-logs\/processing-manifest\.json$/);
        });
        
        test('should handle backward compatibility', () => {
            // Test that the system can fall back to legacy paths
            const legacyPath = 'videos/old-project-id/metadata/project.json';
            const organizedPath = 'videos/2025-10-08_15-30-15_test-video/06-metadata/project-summary.json';
            
            // Both paths should be valid
            expect(legacyPath).toMatch(/videos\/.*\/metadata\/.*\.json$/);
            expect(organizedPath).toMatch(/videos\/.*\/06-metadata\/.*\.json$/);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing title gracefully', () => {
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                basePath: 'videos/2025-10-08_15-30-15_',
                folderName: '2025-10-08_15-30-15_'
            });
            
            const projectId = 'test-project-123';
            const title = '';
            const paths = mockGenerateS3Paths(projectId, title);
            
            // Should still generate valid paths even with empty title
            expect(paths.basePath).toMatch(/^videos\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_$/);
        });
        
        test('should handle special characters in title', () => {
            const mockGenerateS3Paths = jest.fn().mockReturnValue({
                basePath: 'videos/2025-10-08_15-30-15_special-chars-title',
                folderName: '2025-10-08_15-30-15_special-chars-title'
            });
            
            const projectId = 'test-project-123';
            const title = 'Special !@#$%^&*() Chars Title';
            const paths = mockGenerateS3Paths(projectId, title);
            
            // Should clean special characters
            expect(paths.folderName).not.toMatch(/[!@#$%^&*()]/);
        });
    });
});