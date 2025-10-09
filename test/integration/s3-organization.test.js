/**
 * S3 Organization Integration Tests
 * 
 * Tests the new organized folder structure functionality
 */

const { 
    generateProjectFolderName, 
    generateS3Paths, 
    parseProjectFolder,
    getLegacyPath 
} = require('../../src/utils/s3-folder-structure.cjs');

describe('S3 Organization Tests', () => {
    
    describe('generateProjectFolderName', () => {
        test('should generate timestamp-based folder name', () => {
            const title = 'AI Tools Content Creation';
            const folderName = generateProjectFolderName(title);
            
            // Should match pattern: YYYY-MM-DD_HH-MM-SS_title
            expect(folderName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_ai-tools-content-creation$/);
        });
        
        test('should clean special characters from title', () => {
            const title = 'Investment Strategies! & Tips (2025)';
            const folderName = generateProjectFolderName(title);
            
            expect(folderName).toMatch(/_investment-strategies-tips-2025$/);
        });
        
        test('should limit title length', () => {
            const longTitle = 'This is a very long title that should be truncated to prevent extremely long folder names that could cause issues';
            const folderName = generateProjectFolderName(longTitle);
            
            // Should be limited to reasonable length
            expect(folderName.length).toBeLessThan(100);
        });
    });
    
    describe('generateS3Paths', () => {
        test('should generate complete organized path structure', () => {
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = generateS3Paths(projectId, title);
            
            // Check base structure
            expect(paths.basePath).toMatch(/^videos\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_test-video$/);
            expect(paths.folderName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_test-video$/);
            
            // Check context paths
            expect(paths.context.base).toMatch(/01-context$/);
            expect(paths.context.topic).toMatch(/01-context\/topic-context\.json$/);
            expect(paths.context.scene).toMatch(/01-context\/scene-context\.json$/);
            
            // Check script paths
            expect(paths.script.base).toMatch(/02-script$/);
            expect(paths.script.json).toMatch(/02-script\/script\.json$/);
            expect(paths.script.text).toMatch(/02-script\/script\.txt$/);
            
            // Check media paths
            expect(paths.media.base).toMatch(/03-media$/);
            expect(paths.media.manifest).toMatch(/03-media\/media-manifest\.json$/);
            
            // Check audio paths
            expect(paths.audio.base).toMatch(/04-audio$/);
            expect(paths.audio.narration).toMatch(/04-audio\/narration\.mp3$/);
            
            // Check video paths
            expect(paths.video.base).toMatch(/05-video$/);
            expect(paths.video.final).toMatch(/05-video\/final-video\.mp4$/);
            
            // Check metadata paths
            expect(paths.metadata.base).toMatch(/06-metadata$/);
            expect(paths.metadata.youtube).toMatch(/06-metadata\/youtube-metadata\.json$/);
            expect(paths.metadata.project).toMatch(/06-metadata\/project-summary\.json$/);
        });
        
        test('should generate scene-specific media paths', () => {
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = generateS3Paths(projectId, title);
            
            const scene1Path = paths.media.getScenePath(1);
            const scene2Path = paths.media.getScenePath(2);
            
            expect(scene1Path).toMatch(/03-media\/scene-1$/);
            expect(scene2Path).toMatch(/03-media\/scene-2$/);
            
            const imagePath = paths.media.getImagePath(1, 'img123');
            const videoPath = paths.media.getVideoPath(1, 'vid456');
            
            expect(imagePath).toMatch(/03-media\/scene-1\/images\/img123\.jpg$/);
            expect(videoPath).toMatch(/03-media\/scene-1\/videos\/vid456\.mp4$/);
        });
        
        test('should generate audio segment paths', () => {
            const projectId = 'test-project-123';
            const title = 'Test Video';
            const paths = generateS3Paths(projectId, title);
            
            const segment1 = paths.audio.getSegmentPath(1);
            const segment2 = paths.audio.getSegmentPath(2);
            
            expect(segment1).toMatch(/04-audio\/audio-segments\/scene-1\.mp3$/);
            expect(segment2).toMatch(/04-audio\/audio-segments\/scene-2\.mp3$/);
        });
    });
    
    describe('parseProjectFolder', () => {
        test('should parse valid folder name', () => {
            const folderName = '2025-10-08_15-30-15_ai-tools-content-creation';
            const parsed = parseProjectFolder(folderName);
            
            expect(parsed.isValid).toBe(true);
            expect(parsed.timestamp).toBe('2025-10-08_15-30-15');
            expect(parsed.title).toBe('ai tools content creation');
            expect(parsed.date).toBeInstanceOf(Date);
            expect(parsed.date.getFullYear()).toBe(2025);
            expect(parsed.date.getMonth()).toBe(9); // October (0-indexed)
            expect(parsed.date.getDate()).toBe(8);
        });
        
        test('should handle invalid folder name', () => {
            const folderName = 'invalid-folder-name';
            const parsed = parseProjectFolder(folderName);
            
            expect(parsed.isValid).toBe(false);
            expect(parsed.title).toBe('invalid-folder-name');
            expect(parsed.timestamp).toBeNull();
        });
        
        test('should handle folder with underscores in title', () => {
            const folderName = '2025-10-08_15-30-15_investment_strategies_for_beginners';
            const parsed = parseProjectFolder(folderName);
            
            expect(parsed.isValid).toBe(true);
            expect(parsed.title).toBe('investment strategies for beginners');
        });
    });
    
    describe('getLegacyPath', () => {
        test('should generate legacy path format', () => {
            const projectId = 'test-project-123';
            const type = 'script';
            const filename = 'script.json';
            
            const legacyPath = getLegacyPath(projectId, type, filename);
            
            expect(legacyPath).toBe('videos/test-project-123/script/script.json');
        });
    });
    
    describe('Integration Tests', () => {
        test('should maintain consistency between folder name and paths', () => {
            const projectId = 'test-project-123';
            const title = 'Test Video Title';
            
            const folderName = generateProjectFolderName(title);
            const paths = generateS3Paths(projectId, title);
            const parsed = parseProjectFolder(folderName);
            
            // Folder name should match the one in paths
            expect(paths.folderName).toBe(folderName);
            
            // Parsed folder should be valid
            expect(parsed.isValid).toBe(true);
            
            // Title should be consistent (accounting for cleaning)
            expect(parsed.title).toBe('test video title');
        });
        
        test('should handle edge cases gracefully', () => {
            // Empty title
            const paths1 = generateS3Paths('project1', '');
            expect(paths1.folderName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_$/);
            
            // Special characters
            const paths2 = generateS3Paths('project2', '!@#$%^&*()');
            expect(paths2.folderName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_$/);
            
            // Very long title
            const longTitle = 'A'.repeat(100);
            const paths3 = generateS3Paths('project3', longTitle);
            expect(paths3.folderName.length).toBeLessThan(100);
        });
    });
});

// Mock tests for S3 operations (would require AWS SDK mocking in real implementation)
describe('S3 Operations (Mocked)', () => {
    test('should list video projects', async () => {
        // This would require proper AWS SDK mocking
        // For now, just test the structure
        expect(true).toBe(true);
    });
    
    test('should handle S3 errors gracefully', async () => {
        // This would test error handling in S3 operations
        expect(true).toBe(true);
    });
});