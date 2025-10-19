/**
 * SAM Template Validation Tests
 */

const fs = require('fs');

describe('SAM Template Validation', () => {
    let templateContent;

    beforeAll(() => {
        templateContent = fs.readFileSync('template-simplified.yaml', 'utf8');
    });

    test('should have FFmpeg layer resource', () => {
        expect(templateContent).toContain('FFmpegLayer:');
        expect(templateContent).toContain('Type: AWS::Lambda::LayerVersion');
    });

    test('FFmpeg layer should have correct properties', () => {
        expect(templateContent).toContain('LayerName: !Sub \'ffmpeg-layer-${Environment}\'');
        expect(templateContent).toContain('- nodejs22.x');
        expect(templateContent).toContain('S3Key: layers/ffmpeg-layer.zip');
    });

    test('VideoAssemblerFunction should reference FFmpeg layer', () => {
        expect(templateContent).toContain('Layers:');
        expect(templateContent).toContain('- !Ref FFmpegLayer');
    });

    test('VideoAssemblerFunction should have FFmpeg environment variables', () => {
        expect(templateContent).toContain('FFMPEG_PATH: /opt/bin/ffmpeg');
        expect(templateContent).toContain('FFPROBE_PATH: /opt/bin/ffprobe');
    });

    test('VideoAssemblerFunction should have appropriate resources', () => {
        expect(templateContent).toContain('Timeout: 900');
        expect(templateContent).toContain('MemorySize: 3008');
    });
});