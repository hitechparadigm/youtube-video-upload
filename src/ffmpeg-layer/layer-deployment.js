#!/usr/bin/env node

/**
 * FFmpeg Layer Deployment System
 * 
 * Handles the complete deployment lifecycle of FFmpeg Lambda layers:
 * 1. Creates and publishes Lambda layers
 * 2. Manages layer versions and rollbacks
 * 3. Validates layer deployment
 * 4. Provides deployment status and monitoring
 */

const {
    spawn
} = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Layer Deployment Manager Class
 */
class LayerDeploymentManager {
    constructor(options = {}) {
        this.environment = options.environment || 'dev';
        this.region = options.region || 'us-east-1';
        this.layerName = `ffmpeg-layer-${this.environment}`;
        this.s3Bucket = `automated-video-pipeline-deployments-${this.environment}`;
        this.s3Key = 'layers/ffmpeg-layer.zip';
        this.logger = options.logger || console;
    }

    /**
     * Deploy layer to AWS Lambda
     */
    async deployLayer(s3Location) {
        this.logger.log(`🚀 Deploying FFmpeg layer: ${this.layerName}`);

        try {
            // Step 1: Validate S3 location
            await this.validateS3Location(s3Location);

            // Step 2: Create/update Lambda layer
            const layerArn = await this.createLambdaLayer(s3Location);

            // Step 3: Validate layer deployment
            await this.validateLayerDeployment(layerArn);

            // Step 4: Update layer permissions if needed
            await this.updateLayerPermissions(layerArn);

            this.logger.log(`✅ Layer deployment completed successfully`);
            return {
                layerArn: layerArn,
                layerName: this.layerName,
                environment: this.environment,
                s3Location: s3Location
            };

        } catch (error) {
            this.logger.error(`❌ Layer deployment failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate S3 location exists and is accessible
     */
    async validateS3Location(s3Location) {
        this.logger.log('🔍 Validating S3 location...');

        const {
            bucket,
            key
        } = this.parseS3Location(s3Location);

        return new Promise((resolve, reject) => {
            const headProcess = spawn('aws', [
                's3api', 'head-object',
                '--bucket', bucket,
                '--key', key,
                '--region', this.region
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stderr = '';

            headProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            headProcess.on('close', (code) => {
                if (code !== 0) {
                    if (stderr.includes('NoSuchKey')) {
                        reject(new Error(`S3 object not found: ${s3Location}`));
                    } else if (stderr.includes('NoSuchBucket')) {
                        reject(new Error(`S3 bucket not found: ${bucket}`));
                    } else {
                        reject(new Error(`S3 validation failed: ${stderr}`));
                    }
                    return;
                }

                this.logger.log('  ✅ S3 location validated');
                resolve();
            });

            headProcess.on('error', (error) => {
                reject(new Error(`S3 validation process failed: ${error.message}`));
            });
        });
    }

    /**
     * Create or update Lambda layer
     */
    async createLambdaLayer(s3Location) {
        this.logger.log('📦 Creating Lambda layer...');

        const {
            bucket,
            key
        } = this.parseS3Location(s3Location);

        return new Promise((resolve, reject) => {
            const publishProcess = spawn('aws', [
                'lambda', 'publish-layer-version',
                '--layer-name', this.layerName,
                '--description', `FFmpeg binaries for video processing (${this.environment})`,
                '--content', `S3Bucket=${bucket},S3Key=${key}`,
                '--compatible-runtimes', 'nodejs22.x',
                '--license-info', 'GPL-2.0-or-later',
                '--region', this.region,
                '--query', 'LayerVersionArn',
                '--output', 'text'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            publishProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            publishProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            publishProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Layer creation failed: ${stderr}`));
                    return;
                }

                const layerArn = stdout.trim();
                if (!layerArn || !layerArn.startsWith('arn:aws:lambda:')) {
                    reject(new Error(`Invalid layer ARN returned: ${layerArn}`));
                    return;
                }

                this.logger.log(`  ✅ Layer created: ${layerArn}`);
                resolve(layerArn);
            });

            publishProcess.on('error', (error) => {
                reject(new Error(`Layer creation process failed: ${error.message}`));
            });
        });
    }

    /**
     * Validate layer deployment by checking layer info
     */
    async validateLayerDeployment(layerArn) {
        this.logger.log('🧪 Validating layer deployment...');

        const layerVersion = this.extractLayerVersion(layerArn);

        return new Promise((resolve, reject) => {
            const getProcess = spawn('aws', [
                'lambda', 'get-layer-version',
                '--layer-name', this.layerName,
                '--version-number', layerVersion,
                '--region', this.region
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            getProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            getProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            getProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Layer validation failed: ${stderr}`));
                    return;
                }

                try {
                    const layerInfo = JSON.parse(stdout);

                    // Validate layer properties
                    if (!layerInfo.Content || !layerInfo.Content.CodeSize) {
                        reject(new Error('Layer content validation failed'));
                        return;
                    }

                    const sizeMB = layerInfo.Content.CodeSize / (1024 * 1024);
                    if (sizeMB < 10 || sizeMB > 200) {
                        reject(new Error(`Layer size invalid: ${sizeMB.toFixed(1)}MB`));
                        return;
                    }

                    if (!layerInfo.CompatibleRuntimes || !layerInfo.CompatibleRuntimes.includes('nodejs22.x')) {
                        reject(new Error('Layer runtime compatibility validation failed'));
                        return;
                    }

                    this.logger.log(`  ✅ Layer validation passed`);
                    this.logger.log(`    📊 Size: ${sizeMB.toFixed(1)}MB`);
                    this.logger.log(`    🏷️  Version: ${layerVersion}`);
                    this.logger.log(`    🔧 Runtime: ${layerInfo.CompatibleRuntimes.join(', ')}`);

                    resolve(layerInfo);

                } catch (parseError) {
                    reject(new Error(`Layer info parsing failed: ${parseError.message}`));
                }
            });

            getProcess.on('error', (error) => {
                reject(new Error(`Layer validation process failed: ${error.message}`));
            });
        });
    }

    /**
     * Update layer permissions for cross-account access if needed
     */
    async updateLayerPermissions(layerArn) {
        // For now, we'll skip this as it's typically not needed for same-account usage
        // This can be extended later for cross-account scenarios
        this.logger.log('  ℹ️  Layer permissions: Using default (same account access)');
        return Promise.resolve();
    }

    /**
     * List all versions of the layer
     */
    async listLayerVersions() {
        this.logger.log(`📋 Listing versions for layer: ${this.layerName}`);

        return new Promise((resolve, reject) => {
            const listProcess = spawn('aws', [
                'lambda', 'list-layer-versions',
                '--layer-name', this.layerName,
                '--region', this.region
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            listProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            listProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            listProcess.on('close', (code) => {
                if (code !== 0) {
                    if (stderr.includes('ResourceNotFoundException')) {
                        this.logger.log('  ℹ️  No existing layer versions found');
                        resolve([]);
                    } else {
                        reject(new Error(`Layer version listing failed: ${stderr}`));
                    }
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    const versions = result.LayerVersions || [];

                    this.logger.log(`  📊 Found ${versions.length} layer versions`);
                    versions.forEach((version, index) => {
                        const sizeMB = (version.CodeSize / (1024 * 1024)).toFixed(1);
                        this.logger.log(`    ${index + 1}. Version ${version.Version} - ${sizeMB}MB (${version.CreatedDate})`);
                    });

                    resolve(versions);

                } catch (parseError) {
                    reject(new Error(`Layer versions parsing failed: ${parseError.message}`));
                }
            });

            listProcess.on('error', (error) => {
                reject(new Error(`Layer versions listing process failed: ${error.message}`));
            });
        });
    }

    /**
     * Delete a specific layer version
     */
    async deleteLayerVersion(version) {
        this.logger.log(`🗑️  Deleting layer version: ${version}`);

        return new Promise((resolve, reject) => {
            const deleteProcess = spawn('aws', [
                'lambda', 'delete-layer-version',
                '--layer-name', this.layerName,
                '--version-number', version,
                '--region', this.region
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stderr = '';

            deleteProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            deleteProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Layer version deletion failed: ${stderr}`));
                    return;
                }

                this.logger.log(`  ✅ Layer version ${version} deleted`);
                resolve();
            });

            deleteProcess.on('error', (error) => {
                reject(new Error(`Layer deletion process failed: ${error.message}`));
            });
        });
    }

    /**
     * Parse S3 location into bucket and key
     */
    parseS3Location(s3Location) {
        if (typeof s3Location === 'object' && s3Location.bucket && s3Location.key) {
            return s3Location;
        }

        const match = s3Location.match(/^s3:\/\/([^\/]+)\/(.+)$/);
        if (!match) {
            throw new Error(`Invalid S3 location format: ${s3Location}`);
        }

        return {
            bucket: match[1],
            key: match[2]
        };
    }

    /**
     * Extract layer version from ARN
     */
    extractLayerVersion(layerArn) {
        const match = layerArn.match(/:(\d+)$/);
        if (!match) {
            throw new Error(`Cannot extract version from layer ARN: ${layerArn}`);
        }
        return match[1];
    }
}

/**
 * CLI interface for layer deployment
 */
async function main() {
    if (require.main === module) {
        const args = process.argv.slice(2);
        const command = args[0] || 'deploy';
        const environment = args[1] || 'dev';

        const manager = new LayerDeploymentManager({
            environment
        });

        try {
            switch (command) {
                case 'deploy':
                    const s3Location = args[2] || `s3://automated-video-pipeline-deployments-${environment}/layers/ffmpeg-layer.zip`;
                    const result = await manager.deployLayer(s3Location);
                    console.log('\n🎉 Deployment Summary:');
                    console.log(`  Layer ARN: ${result.layerArn}`);
                    console.log(`  Environment: ${result.environment}`);
                    break;

                case 'list':
                    await manager.listLayerVersions();
                    break;

                case 'delete':
                    const version = args[2];
                    if (!version) {
                        throw new Error('Version number required for delete command');
                    }
                    await manager.deleteLayerVersion(version);
                    break;

                default:
                    console.log('Usage: node layer-deployment.js [deploy|list|delete] [environment] [s3-location|version]');
                    console.log('Examples:');
                    console.log('  node layer-deployment.js deploy prod');
                    console.log('  node layer-deployment.js list dev');
                    console.log('  node layer-deployment.js delete dev 5');
            }

        } catch (error) {
            console.error(`❌ Command failed: ${error.message}`);
            process.exit(1);
        }
    }
}

// Export for use as module
module.exports = {
    LayerDeploymentManager
};

// Run CLI if called directly
main().catch(console.error);