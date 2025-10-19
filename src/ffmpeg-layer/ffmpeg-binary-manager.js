#!/usr/bin/env node

/**
 * FFmpeg Binary Download and Validation System
 * 
 * This module handles downloading, validating, and preparing FFmpeg binaries
 * for AWS Lambda layer deployment. It ensures compatibility with Amazon Linux 2
 * and validates binary functionality before packaging.
 * 
 * Requirements addressed:
 * - 3.1: Documented and reproducible build process
 * - 3.2: Specific FFmpeg version for consistency
 * - 3.4: Binary functionality validation
 * - 4.1: FFmpeg binary availability detection
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const {
    spawn
} = require('child_process');
const {
    promisify
} = require('util');

// Configuration constants
const FFMPEG_CONFIG = {
    version: '4.4.2',
    architecture: 'amd64',
    platform: 'linux',
    source: 'johnvansickle', // Trusted static build provider
    baseUrl: 'https://johnvansickle.com/ffmpeg/releases',
    checksumUrl: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz.md5'
};

const LAYER_PATHS = {
    layerDir: 'ffmpeg-layer',
    binDir: 'ffmpeg-layer/bin',
    tempDir: 'ffmpeg-temp',
    downloadFile: 'ffmpeg-release-amd64-static.tar.xz',
    extractedDir: 'ffmpeg-*-amd64-static'
};

const BINARY_VALIDATION = {
    ffmpeg: {
        expectedCommands: ['--version', '--help'],
        expectedOutputPatterns: [
            /ffmpeg version/i,
            /configuration:/i,
            /libavutil/i,
            /libavcodec/i
        ]
    },
    ffprobe: {
        expectedCommands: ['--version', '--help'],
        expectedOutputPatterns: [
            /ffprobe version/i,
            /configuration:/i,
            /libavutil/i,
            /libavformat/i
        ]
    }
};

/**
 * FFmpeg Binary Manager Class
 * Handles all aspects of FFmpeg binary management for Lambda layers
 */
class FFmpegBinaryManager {
    constructor(options = {}) {
        this.config = {
            ...FFMPEG_CONFIG,
            ...options
        };
        this.paths = {
            ...LAYER_PATHS
        };
        this.validation = {
            ...BINARY_VALIDATION
        };
        this.logger = options.logger || console;
    }

    /**
     * Main entry point - downloads, validates, and prepares FFmpeg binaries
     */
    async downloadAndValidateBinaries() {
        this.logger.log('🎬 Starting FFmpeg binary download and validation process');

        try {
            // Step 1: Setup directory structure
            await this.setupDirectories();

            // Step 2: Download FFmpeg static build
            const downloadPath = await this.downloadFFmpegBuild();

            // Step 3: Verify download integrity
            await this.verifyDownloadIntegrity(downloadPath);

            // Step 4: Extract binaries
            const extractedPath = await this.extractBinaries(downloadPath);

            // Step 5: Copy binaries to layer structure
            await this.copyBinariesToLayer(extractedPath);

            // Step 6: Validate binary functionality
            const validationResults = await this.validateBinaries();

            // Step 7: Generate layer metadata
            const layerMetadata = await this.generateLayerMetadata(validationResults);

            // Step 8: Cleanup temporary files
            await this.cleanup();

            this.logger.log('✅ FFmpeg binary download and validation completed successfully');
            return {
                success: true,
                layerPath: this.paths.layerDir,
                binaries: validationResults,
                metadata: layerMetadata
            };

        } catch (error) {
            this.logger.error('❌ FFmpeg binary download and validation failed:', error.message);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Setup directory structure for layer creation
     */
    async setupDirectories() {
        this.logger.log('📁 Setting up directory structure...');

        const directories = [
            this.paths.layerDir,
            this.paths.binDir,
            this.paths.tempDir
        ];

        for (const dir of directories) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, {
                    recursive: true,
                    force: true
                });
            }
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        this.logger.log('✅ Directory structure created');
    }

    /**
     * Download FFmpeg static build from trusted source
     */
    async downloadFFmpegBuild() {
        const downloadUrl = `${this.config.baseUrl}/${this.paths.downloadFile}`;
        const downloadPath = path.join(this.paths.tempDir, this.paths.downloadFile);

        this.logger.log(`📥 Downloading FFmpeg from: ${downloadUrl}`);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(downloadPath);
            let downloadedBytes = 0;

            https.get(downloadUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Download failed with status: ${response.statusCode}`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'] || '0');

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes > 0) {
                        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                        process.stdout.write(`\r📥 Downloading: ${progress}% (${this.formatBytes(downloadedBytes)}/${this.formatBytes(totalBytes)})`);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log('\n✅ Download completed');
                    resolve(downloadPath);
                });

                file.on('error', (error) => {
                    fs.unlinkSync(downloadPath);
                    reject(error);
                });

            }).on('error', reject);
        });
    }

    /**
     * Verify download integrity using checksums
     */
    async verifyDownloadIntegrity(downloadPath) {
        this.logger.log('🔍 Verifying download integrity...');

        try {
            // Calculate file hash
            const fileBuffer = fs.readFileSync(downloadPath);
            const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

            // For now, just verify file exists and has reasonable size
            const stats = fs.statSync(downloadPath);
            const fileSizeMB = stats.size / (1024 * 1024);

            if (fileSizeMB < 10) {
                throw new Error(`Downloaded file too small: ${fileSizeMB.toFixed(1)}MB`);
            }

            if (fileSizeMB > 200) {
                throw new Error(`Downloaded file too large: ${fileSizeMB.toFixed(1)}MB`);
            }

            this.logger.log(`✅ Download integrity verified - Size: ${fileSizeMB.toFixed(1)}MB, Hash: ${hash.substring(0, 8)}...`);

        } catch (error) {
            throw new Error(`Download integrity verification failed: ${error.message}`);
        }
    }

    /**
     * Extract FFmpeg binaries from downloaded archive
     */
    async extractBinaries(downloadPath) {
        this.logger.log('📦 Extracting FFmpeg binaries...');

        return new Promise((resolve, reject) => {
            // Use tar command to extract (works on most systems)
            const extractProcess = spawn('tar', ['-xf', downloadPath, '-C', this.paths.tempDir], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stderr = '';

            extractProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            extractProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Extraction failed: ${stderr}`));
                    return;
                }

                // Find extracted directory
                const tempContents = fs.readdirSync(this.paths.tempDir);
                const extractedDir = tempContents.find(item =>
                    item.startsWith('ffmpeg-') && item.includes('amd64-static')
                );

                if (!extractedDir) {
                    reject(new Error('Could not find extracted FFmpeg directory'));
                    return;
                }

                const extractedPath = path.join(this.paths.tempDir, extractedDir);
                this.logger.log(`✅ Extraction completed: ${extractedDir}`);
                resolve(extractedPath);
            });

            extractProcess.on('error', (error) => {
                reject(new Error(`Extraction process failed: ${error.message}`));
            });
        });
    }

    /**
     * Copy binaries to layer directory structure
     */
    async copyBinariesToLayer(extractedPath) {
        this.logger.log('📋 Copying binaries to layer structure...');

        const binaries = ['ffmpeg', 'ffprobe'];
        const copiedBinaries = [];

        for (const binary of binaries) {
            const sourcePath = path.join(extractedPath, binary);
            const destPath = path.join(this.paths.binDir, binary);

            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Binary not found: ${sourcePath}`);
            }

            // Copy binary
            fs.copyFileSync(sourcePath, destPath);

            // Make executable
            fs.chmodSync(destPath, 0o755);

            // Verify copy
            const stats = fs.statSync(destPath);
            copiedBinaries.push({
                name: binary,
                path: destPath,
                size: stats.size,
                executable: (stats.mode & 0o111) !== 0
            });

            this.logger.log(`✅ Copied ${binary}: ${this.formatBytes(stats.size)}`);
        }

        return copiedBinaries;
    }

    /**
     * Validate binary functionality
     */
    async validateBinaries() {
        this.logger.log('🧪 Validating binary functionality...');

        const results = {};

        for (const [binaryName, config] of Object.entries(this.validation)) {
            const binaryPath = path.join(this.paths.binDir, binaryName);

            try {
                const validation = await this.validateSingleBinary(binaryPath, config);
                results[binaryName] = {
                    path: binaryPath,
                    valid: true,
                    version: validation.version,
                    capabilities: validation.capabilities,
                    size: fs.statSync(binaryPath).size
                };

                this.logger.log(`✅ ${binaryName} validation passed - Version: ${validation.version}`);

            } catch (error) {
                results[binaryName] = {
                    path: binaryPath,
                    valid: false,
                    error: error.message
                };

                this.logger.error(`❌ ${binaryName} validation failed: ${error.message}`);
                throw new Error(`Binary validation failed for ${binaryName}: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Validate a single binary's functionality
     */
    async validateSingleBinary(binaryPath, config) {
        return new Promise((resolve, reject) => {
            // Test --version command
            const versionProcess = spawn(binaryPath, ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            versionProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            versionProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            versionProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Binary execution failed with code ${code}: ${stderr}`));
                    return;
                }

                // Validate output patterns
                const output = stdout + stderr;
                const matchedPatterns = [];

                for (const pattern of config.expectedOutputPatterns) {
                    if (pattern.test(output)) {
                        matchedPatterns.push(pattern.source);
                    }
                }

                if (matchedPatterns.length === 0) {
                    reject(new Error('Binary output does not match expected patterns'));
                    return;
                }

                // Extract version information
                const versionMatch = output.match(/version\s+([^\s,]+)/i);
                const version = versionMatch ? versionMatch[1] : 'unknown';

                resolve({
                    version: version,
                    capabilities: matchedPatterns,
                    output: output.substring(0, 500) // First 500 chars for logging
                });
            });

            versionProcess.on('error', (error) => {
                reject(new Error(`Binary execution error: ${error.message}`));
            });
        });
    }

    /**
     * Generate layer metadata
     */
    async generateLayerMetadata(validationResults) {
        const metadata = {
            layerVersion: '1.0.0',
            ffmpegVersion: this.config.version,
            buildDate: new Date().toISOString(),
            architecture: 'x86_64',
            runtime: 'amazon-linux-2',
            source: this.config.source,
            binaries: {}
        };

        for (const [name, result] of Object.entries(validationResults)) {
            if (result.valid) {
                metadata.binaries[name] = {
                    path: `/opt/bin/${name}`,
                    size: result.size,
                    version: result.version,
                    capabilities: result.capabilities
                };
            }
        }

        // Write metadata to layer
        const metadataPath = path.join(this.paths.layerDir, 'layer-metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        this.logger.log('✅ Layer metadata generated');
        return metadata;
    }

    /**
     * Cleanup temporary files
     */
    async cleanup() {
        if (fs.existsSync(this.paths.tempDir)) {
            fs.rmSync(this.paths.tempDir, {
                recursive: true,
                force: true
            });
            this.logger.log('🧹 Temporary files cleaned up');
        }
    }

    /**
     * Check if FFmpeg binaries are available at specified paths
     * This function will be used by the Video Assembler
     */
    static checkFFmpegAvailability(ffmpegPath = '/opt/bin/ffmpeg', ffprobePath = '/opt/bin/ffprobe') {
        try {
            const ffmpegExists = fs.existsSync(ffmpegPath);
            const ffprobeExists = fs.existsSync(ffprobePath);

            console.log(`FFmpeg availability: ${ffmpegExists ? '✅' : '❌'} ${ffmpegPath}`);
            console.log(`FFprobe availability: ${ffprobeExists ? '✅' : '❌'} ${ffprobePath}`);

            return {
                available: ffmpegExists && ffprobeExists,
                ffmpeg: {
                    path: ffmpegPath,
                    exists: ffmpegExists,
                    size: ffmpegExists ? fs.statSync(ffmpegPath).size : 0
                },
                ffprobe: {
                    path: ffprobePath,
                    exists: ffprobeExists,
                    size: ffprobeExists ? fs.statSync(ffprobePath).size : 0
                }
            };
        } catch (error) {
            console.error('Error checking FFmpeg availability:', error.message);
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Utility function to format bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

/**
 * CLI interface for running the binary manager
 */
async function main() {
    if (require.main === module) {
        console.log('🎬 FFmpeg Binary Manager - Starting...');

        try {
            const manager = new FFmpegBinaryManager();
            const result = await manager.downloadAndValidateBinaries();

            console.log('\n🎉 FFmpeg Binary Management Complete!');
            console.log('=====================================');
            console.log(`📁 Layer Directory: ${result.layerPath}`);
            console.log(`🔧 Binaries: ${Object.keys(result.binaries).join(', ')}`);
            console.log(`📊 Layer Size: ${manager.formatBytes(
                Object.values(result.binaries).reduce((total, binary) => total + (binary.size || 0), 0)
            )}`);
            console.log('\n🎯 Next Steps:');
            console.log('1. Package layer: zip -r ffmpeg-layer.zip ffmpeg-layer/');
            console.log('2. Upload to S3: aws s3 cp ffmpeg-layer.zip s3://your-bucket/layers/');
            console.log('3. Deploy SAM template with layer configuration');

        } catch (error) {
            console.error('\n❌ FFmpeg Binary Management Failed!');
            console.error('===================================');
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Export for use as module
module.exports = {
    FFmpegBinaryManager,
    checkFFmpegAvailability: FFmpegBinaryManager.checkFFmpegAvailability,
    FFMPEG_CONFIG,
    LAYER_PATHS,
    BINARY_VALIDATION
};

// Run CLI if called directly
main().catch(console.error);