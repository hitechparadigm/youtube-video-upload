#!/usr/bin/env node

/**
 * FFmpeg Layer Build Script
 * 
 * This script orchestrates the complete FFmpeg layer creation process:
 * 1. Downloads and validates FFmpeg binaries
 * 2. Creates layer package structure
 * 3. Uploads to S3 for deployment
 * 4. Provides deployment instructions
 * 
 * Usage:
 *   node build-ffmpeg-layer.js [options]
 * 
 * Options:
 *   --environment, -e    Environment (dev, staging, prod) [default: dev]
 *   --upload, -u         Upload layer to S3 after building
 *   --deploy, -d         Deploy SAM template with layer
 *   --clean, -c          Clean existing layer files before building
 *   --help, -h           Show help
 */

const fs = require('fs');
const path = require('path');
const {
    spawn
} = require('child_process');
const {
    FFmpegBinaryManager
} = require('./src/ffmpeg-layer/ffmpeg-binary-manager');

// Configuration
const CONFIG = {
    environments: ['dev', 'staging', 'prod'],
    s3BucketPrefix: 'automated-video-pipeline-deployments',
    layerKeyPrefix: 'layers',
    samTemplate: 'template-simplified.yaml',
    outputTemplate: 'template-with-ffmpeg-layer.yaml'
};

/**
 * Command line argument parser
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        environment: 'dev',
        upload: false,
        deploy: false,
        clean: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--environment':
            case '-e':
                options.environment = args[++i];
                break;
            case '--upload':
            case '-u':
                options.upload = true;
                break;
            case '--deploy':
            case '-d':
                options.deploy = true;
                break;
            case '--clean':
            case '-c':
                options.clean = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            default:
                console.warn(`Unknown option: ${arg}`);
        }
    }

    return options;
}

/**
 * Display help information
 */
function showHelp() {
    console.log(`
🎬 FFmpeg Lambda Layer Build Script

Usage: node build-ffmpeg-layer.js [options]

Options:
  --environment, -e    Environment (dev, staging, prod) [default: dev]
  --upload, -u         Upload layer to S3 after building
  --deploy, -d         Deploy SAM template with layer
  --clean, -c          Clean existing layer files before building
  --help, -h           Show this help message

Examples:
  node build-ffmpeg-layer.js                    # Build layer for dev environment
  node build-ffmpeg-layer.js -e prod -u         # Build and upload for production
  node build-ffmpeg-layer.js -e prod -u -d      # Build, upload, and deploy
  node build-ffmpeg-layer.js -c                 # Clean and rebuild

Environment Configuration:
  dev      - Development environment with basic validation
  staging  - Staging environment with comprehensive testing
  prod     - Production environment with full validation and monitoring
`);
}

/**
 * Validate command line options
 */
function validateOptions(options) {
    if (!CONFIG.environments.includes(options.environment)) {
        throw new Error(`Invalid environment: ${options.environment}. Must be one of: ${CONFIG.environments.join(', ')}`);
    }

    if (options.deploy && !options.upload) {
        console.warn('⚠️  Deploy option requires upload. Enabling upload automatically.');
        options.upload = true;
    }

    return options;
}

/**
 * Clean existing layer files
 */
async function cleanExistingFiles() {
    console.log('🧹 Cleaning existing layer files...');

    const filesToClean = [
        'ffmpeg-layer',
        'ffmpeg-temp',
        'ffmpeg-layer.zip',
        CONFIG.outputTemplate
    ];

    for (const file of filesToClean) {
        if (fs.existsSync(file)) {
            if (fs.statSync(file).isDirectory()) {
                fs.rmSync(file, {
                    recursive: true,
                    force: true
                });
            } else {
                fs.unlinkSync(file);
            }
            console.log(`  ✅ Removed: ${file}`);
        }
    }

    console.log('✅ Cleanup completed');
}

/**
 * Build FFmpeg layer using the binary manager
 */
async function buildFFmpegLayer() {
    console.log('🏗️  Building FFmpeg layer...');

    const manager = new FFmpegBinaryManager({
        logger: {
            log: (msg) => console.log(`  ${msg}`),
            error: (msg) => console.error(`  ${msg}`)
        }
    });

    try {
        const result = await manager.downloadAndValidateBinaries();

        console.log('✅ FFmpeg layer built successfully');
        console.log(`  📁 Layer directory: ${result.layerPath}`);
        console.log(`  🔧 Binaries: ${Object.keys(result.binaries).join(', ')}`);

        // Calculate total size
        const totalSize = Object.values(result.binaries)
            .reduce((total, binary) => total + (binary.size || 0), 0);
        console.log(`  📊 Total size: ${formatBytes(totalSize)}`);

        return result;

    } catch (error) {
        console.error('❌ FFmpeg layer build failed:', error.message);
        throw error;
    }
}

/**
 * Package layer into zip file
 */
async function packageLayer() {
    console.log('📦 Packaging layer...');

    // Validate layer structure before packaging
    await validateLayerStructure();

    const zipFileName = 'ffmpeg-layer.zip';

    // Remove existing zip if present
    if (fs.existsSync(zipFileName)) {
        fs.unlinkSync(zipFileName);
        console.log('  🗑️  Removed existing zip file');
    }

    return new Promise((resolve, reject) => {
        // Use PowerShell Compress-Archive on Windows, zip on Unix
        const isWindows = process.platform === 'win32';

        let zipProcess;
        if (isWindows) {
            // PowerShell command for Windows
            zipProcess = spawn('powershell', [
                '-Command',
                `Compress-Archive -Path ffmpeg-layer/* -DestinationPath ${zipFileName} -Force`
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } else {
            // Standard zip command for Unix-like systems
            zipProcess = spawn('zip', ['-r', zipFileName, 'ffmpeg-layer/'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
        }

        let stdout = '';
        let stderr = '';

        zipProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        zipProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        zipProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Zip packaging failed (${isWindows ? 'PowerShell' : 'zip'}): ${stderr}`));
                return;
            }

            // Validate the created zip file
            if (!fs.existsSync(zipFileName)) {
                reject(new Error('Zip file was not created successfully'));
                return;
            }

            const stats = fs.statSync(zipFileName);
            const sizeMB = stats.size / (1024 * 1024);

            // Validate zip file size (should be reasonable for FFmpeg binaries)
            if (sizeMB < 10) {
                reject(new Error(`Zip file too small (${sizeMB.toFixed(1)}MB) - packaging may have failed`));
                return;
            }

            if (sizeMB > 200) {
                reject(new Error(`Zip file too large (${sizeMB.toFixed(1)}MB) - exceeds Lambda layer limits`));
                return;
            }

            console.log(`✅ Layer packaged: ${zipFileName} (${formatBytes(stats.size)})`);
            console.log(`  📊 Compression ratio: ${((1 - stats.size / getTotalLayerSize()) * 100).toFixed(1)}%`);

            resolve(zipFileName);
        });

        zipProcess.on('error', (error) => {
            reject(new Error(`Zip process failed: ${error.message}`));
        });
    });
}

/**
 * Validate layer directory structure before packaging
 */
async function validateLayerStructure() {
    console.log('🔍 Validating layer structure...');

    const requiredPaths = [
        'ffmpeg-layer',
        'ffmpeg-layer/bin',
        'ffmpeg-layer/bin/ffmpeg',
        'ffmpeg-layer/bin/ffprobe',
        'ffmpeg-layer/layer-metadata.json'
    ];

    const missingPaths = [];

    for (const requiredPath of requiredPaths) {
        if (!fs.existsSync(requiredPath)) {
            missingPaths.push(requiredPath);
        }
    }

    if (missingPaths.length > 0) {
        throw new Error(`Layer structure validation failed. Missing paths: ${missingPaths.join(', ')}`);
    }

    // Validate binary executability
    const binaries = ['ffmpeg-layer/bin/ffmpeg', 'ffmpeg-layer/bin/ffprobe'];
    for (const binary of binaries) {
        const stats = fs.statSync(binary);
        if (!(stats.mode & 0o111)) {
            throw new Error(`Binary not executable: ${binary}`);
        }

        if (stats.size < 1024 * 1024) { // Less than 1MB
            throw new Error(`Binary too small: ${binary} (${formatBytes(stats.size)})`);
        }
    }

    console.log('  ✅ Layer structure validation passed');
}

/**
 * Calculate total size of layer directory
 */
function getTotalLayerSize() {
    let totalSize = 0;

    function calculateDirSize(dirPath) {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                calculateDirSize(itemPath);
            } else {
                totalSize += stats.size;
            }
        }
    }

    if (fs.existsSync('ffmpeg-layer')) {
        calculateDirSize('ffmpeg-layer');
    }

    return totalSize;
}

/**
 * Upload layer to S3
 */
async function uploadLayerToS3(environment) {
    console.log(`☁️  Uploading layer to S3 (${environment})...`);

    const bucketName = `${CONFIG.s3BucketPrefix}-${environment}`;
    const s3Key = `${CONFIG.layerKeyPrefix}/ffmpeg-layer.zip`;
    const zipFile = 'ffmpeg-layer.zip';

    // Validate zip file exists before upload
    if (!fs.existsSync(zipFile)) {
        throw new Error(`Zip file not found: ${zipFile}. Run packaging first.`);
    }

    const zipStats = fs.statSync(zipFile);
    console.log(`  📦 Uploading ${formatBytes(zipStats.size)} to s3://${bucketName}/${s3Key}`);

    // Check AWS CLI availability
    await validateAWSCLI();

    return new Promise((resolve, reject) => {
        const uploadProcess = spawn('aws', [
            's3', 'cp',
            zipFile,
            `s3://${bucketName}/${s3Key}`,
            '--region', 'us-east-1',
            '--storage-class', 'STANDARD',
            '--metadata', `layer-version=1.0.0,ffmpeg-version=4.4.2,build-date=${new Date().toISOString()}`
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let uploadProgress = 0;

        uploadProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;

            // Parse upload progress if available
            const progressMatch = output.match(/(\d+)%/);
            if (progressMatch) {
                const newProgress = parseInt(progressMatch[1]);
                if (newProgress > uploadProgress) {
                    uploadProgress = newProgress;
                    process.stdout.write(`\r  📤 Upload progress: ${uploadProgress}%`);
                }
            }
        });

        uploadProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        uploadProcess.on('close', (code) => {
            if (uploadProgress > 0) {
                console.log(''); // New line after progress
            }

            if (code !== 0) {
                // Provide more specific error messages
                if (stderr.includes('NoSuchBucket')) {
                    reject(new Error(`S3 bucket does not exist: ${bucketName}. Create bucket first.`));
                } else if (stderr.includes('AccessDenied')) {
                    reject(new Error(`Access denied to S3 bucket: ${bucketName}. Check AWS credentials and permissions.`));
                } else if (stderr.includes('InvalidAccessKeyId')) {
                    reject(new Error('Invalid AWS credentials. Configure AWS CLI with valid credentials.'));
                } else {
                    reject(new Error(`S3 upload failed: ${stderr}`));
                }
                return;
            }

            console.log(`✅ Layer uploaded successfully`);
            console.log(`  📍 Location: s3://${bucketName}/${s3Key}`);
            console.log(`  📊 Size: ${formatBytes(zipStats.size)}`);

            resolve({
                bucket: bucketName,
                key: s3Key,
                url: `s3://${bucketName}/${s3Key}`,
                size: zipStats.size
            });
        });

        uploadProcess.on('error', (error) => {
            reject(new Error(`AWS CLI process failed: ${error.message}. Ensure AWS CLI is installed and configured.`));
        });
    });
}

/**
 * Validate AWS CLI availability and configuration
 */
async function validateAWSCLI() {
    return new Promise((resolve, reject) => {
        const testProcess = spawn('aws', ['sts', 'get-caller-identity'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderr = '';

        testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        testProcess.on('close', (code) => {
            if (code !== 0) {
                if (stderr.includes('command not found') || stderr.includes('is not recognized')) {
                    reject(new Error('AWS CLI not found. Install AWS CLI first: https://aws.amazon.com/cli/'));
                } else if (stderr.includes('Unable to locate credentials')) {
                    reject(new Error('AWS credentials not configured. Run: aws configure'));
                } else {
                    reject(new Error(`AWS CLI validation failed: ${stderr}`));
                }
                return;
            }

            console.log('  ✅ AWS CLI configured and accessible');
            resolve();
        });

        testProcess.on('error', (error) => {
            reject(new Error(`AWS CLI not available: ${error.message}`));
        });
    });
}

/**
 * Update SAM template with FFmpeg layer configuration
 */
async function updateSAMTemplate(environment) {
    console.log('📝 Updating SAM template with FFmpeg layer...');

    if (!fs.existsSync(CONFIG.samTemplate)) {
        throw new Error(`SAM template not found: ${CONFIG.samTemplate}`);
    }

    let template = fs.readFileSync(CONFIG.samTemplate, 'utf8');

    // Add FFmpeg layer resource
    const ffmpegLayerResource = `
  # FFmpeg Layer for video processing
  FFmpegLayer:
    Type: AWS::Lambda::LayerVersion
    Properties:
      LayerName: !Sub 'ffmpeg-layer-\${Environment}'
      Description: FFmpeg binaries for video processing
      Content:
        S3Bucket: !Sub '${CONFIG.s3BucketPrefix}-\${Environment}'
        S3Key: ${CONFIG.layerKeyPrefix}/ffmpeg-layer.zip
      CompatibleRuntimes:
        - nodejs22.x
      LicenseInfo: 'GPL-2.0-or-later'
`;

    // Update VideoAssemblerFunction to use the layer
    const videoAssemblerUpdate = `  VideoAssemblerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'video-pipeline-video-assembler-\${Environment}'
      CodeUri: src/lambda/video-assembler/
      Handler: index.handler
      Layers:
        - !Ref FFmpegLayer
      Environment:
        Variables:
          FFMPEG_PATH: /opt/bin/ffmpeg
          FFPROBE_PATH: /opt/bin/ffprobe
      Timeout: 900        # 15 minutes for video processing
      MemorySize: 3008    # Maximum memory for video processing
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref VideoApi
            Path: /video/assemble
            Method: POST
      Policies:
        - S3FullAccessPolicy:
            BucketName: !Ref VideoBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref ContextTable`;

    // Find and replace the VideoAssemblerFunction
    const videoAssemblerRegex = /  VideoAssemblerFunction:[\s\S]*?(?=\n  \w+Function:|\n  \w+:|$)/;

    if (template.match(videoAssemblerRegex)) {
        template = template.replace(videoAssemblerRegex, videoAssemblerUpdate);
        console.log('  ✅ VideoAssemblerFunction updated with FFmpeg layer');
    } else {
        console.warn('  ⚠️  Could not find VideoAssemblerFunction in template');
    }

    // Add FFmpeg layer resource before the first function
    const resourcesIndex = template.indexOf('Resources:');
    const firstFunctionIndex = template.indexOf('Function:', resourcesIndex);

    if (resourcesIndex !== -1 && firstFunctionIndex !== -1) {
        const insertPosition = template.lastIndexOf('\n', firstFunctionIndex) + 1;
        template = template.slice(0, insertPosition) + ffmpegLayerResource + '\n' + template.slice(insertPosition);
        console.log('  ✅ FFmpeg layer resource added to template');
    } else {
        console.warn('  ⚠️  Could not find insertion point for FFmpeg layer');
    }

    // Write updated template
    fs.writeFileSync(CONFIG.outputTemplate, template);
    console.log(`✅ Updated SAM template created: ${CONFIG.outputTemplate}`);

    return CONFIG.outputTemplate;
}

/**
 * Deploy SAM template
 */
async function deploySAMTemplate(environment) {
    console.log(`🚀 Deploying SAM template (${environment})...`);

    const stackName = `automated-video-pipeline-${environment}`;

    return new Promise((resolve, reject) => {
        const deployProcess = spawn('sam', [
            'deploy',
            '--template-file', CONFIG.outputTemplate,
            '--stack-name', stackName,
            '--capabilities', 'CAPABILITY_IAM',
            '--parameter-overrides', `Environment=${environment}`,
            '--region', 'us-east-1'
        ], {
            stdio: ['pipe', 'inherit', 'pipe']
        });

        let stderr = '';

        deployProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        deployProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`SAM deployment failed: ${stderr}`));
                return;
            }

            console.log(`✅ SAM template deployed successfully: ${stackName}`);
            resolve(stackName);
        });

        deployProcess.on('error', (error) => {
            reject(new Error(`SAM CLI process failed: ${error.message}`));
        });
    });
}

/**
 * Display completion summary
 */
function displaySummary(options, results) {
    console.log('\n🎉 FFmpeg Layer Build Complete!');
    console.log('================================');
    console.log(`📁 Environment: ${options.environment}`);
    console.log(`📦 Layer Package: ${results.packagePath || 'ffmpeg-layer.zip'}`);

    if (results.s3Path) {
        console.log(`☁️  S3 Location: ${results.s3Path}`);
    }

    if (results.stackName) {
        console.log(`🚀 Deployed Stack: ${results.stackName}`);
    }

    console.log('\n🎯 Next Steps:');

    if (!options.upload) {
        console.log('1. Upload layer: node build-ffmpeg-layer.js -e prod -u');
    }

    if (!options.deploy) {
        console.log('2. Deploy template: node build-ffmpeg-layer.js -e prod -d');
    }

    console.log('3. Test video processing: node test-complete-pipeline-spain.js');
    console.log('4. Verify real MP4 creation in S3 bucket');

    console.log('\n🎬 Result: Video Assembler will now create real MP4 files!');
}

/**
 * Utility function to format bytes
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main execution function
 */
async function main() {
    console.log('🎬 FFmpeg Lambda Layer Build Script');
    console.log('===================================\n');

    try {
        // Parse and validate arguments
        const options = parseArguments();

        if (options.help) {
            showHelp();
            return;
        }

        validateOptions(options);

        console.log(`🎯 Building FFmpeg layer for ${options.environment} environment`);
        console.log(`📋 Options: ${JSON.stringify(options, null, 2)}\n`);

        const results = {};

        // Step 1: Clean existing files if requested
        if (options.clean) {
            await cleanExistingFiles();
        }

        // Step 2: Build FFmpeg layer
        const layerResult = await buildFFmpegLayer();

        // Step 3: Package layer
        results.packagePath = await packageLayer();

        // Step 4: Upload to S3 if requested
        if (options.upload) {
            results.s3Path = await uploadLayerToS3(options.environment);

            // Step 5: Update SAM template
            await updateSAMTemplate(options.environment);
        }

        // Step 6: Deploy SAM template if requested
        if (options.deploy) {
            results.stackName = await deploySAMTemplate(options.environment);
        }

        // Step 7: Display summary
        displaySummary(options, results);

    } catch (error) {
        console.error('\n❌ FFmpeg Layer Build Failed!');
        console.error('==============================');
        console.error(`Error: ${error.message}`);

        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }

        process.exit(1);
    }
}

// Export for testing
module.exports = {
    parseArguments,
    validateOptions,
    buildFFmpegLayer,
    packageLayer,
    uploadLayerToS3,
    updateSAMTemplate,
    deploySAMTemplate,
    formatBytes
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}