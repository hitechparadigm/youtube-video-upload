/**
 * Unit Tests for Build FFmpeg Layer Script
 */

const {
    parseArguments,
    validateOptions,
    formatBytes
} = require('../build-ffmpeg-layer');

describe('Build FFmpeg Layer', () => {
    describe('parseArguments', () => {
        test('should parse environment option', () => {
            process.argv = ['node', 'script.js', '--environment', 'prod'];
            const options = parseArguments();
            expect(options.environment).toBe('prod');
        });

        test('should parse short options', () => {
            process.argv = ['node', 'script.js', '-e', 'staging', '-u', '-d'];
            const options = parseArguments();
            expect(options.environment).toBe('staging');
            expect(options.upload).toBe(true);
            expect(options.deploy).toBe(true);
        });

        test('should use default values', () => {
            process.argv = ['node', 'script.js'];
            const options = parseArguments();
            expect(options.environment).toBe('dev');
            expect(options.upload).toBe(false);
            expect(options.deploy).toBe(false);
        });
    });

    describe('validateOptions', () => {
        test('should validate correct environment', () => {
            const options = {
                environment: 'prod',
                upload: false,
                deploy: false
            };
            expect(() => validateOptions(options)).not.toThrow();
        });

        test('should reject invalid environment', () => {
            const options = {
                environment: 'invalid',
                upload: false,
                deploy: false
            };
            expect(() => validateOptions(options)).toThrow('Invalid environment');
        });

        test('should enable upload when deploy is true', () => {
            const options = {
                environment: 'prod',
                upload: false,
                deploy: true
            };
            const result = validateOptions(options);
            expect(result.upload).toBe(true);
        });
    });

    describe('formatBytes', () => {
        test('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1073741824)).toBe('1 GB');
        });
    });
});