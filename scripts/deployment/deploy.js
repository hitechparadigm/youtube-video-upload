#!/usr/bin/env node

/**
 * Unified Deployment Script
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class Deployer {
    constructor() {
        this.infraPath = path.resolve('infrastructure');
    }

    async deployInfrastructure() {
        console.log('🚀 Deploying Infrastructure');
        console.log('='.repeat(50));

        try {
            console.log('📦 Installing dependencies...');
            execSync('npm install', { cwd: this.infraPath, stdio: 'inherit' });

            console.log('🏗️  Deploying CDK stack...');
            execSync('npx cdk deploy --require-approval never', {
                cwd: this.infraPath,
                stdio: 'inherit'
            });

            console.log('✅ Infrastructure deployment completed');
            return { success: true };

        } catch (error) {
            console.log(`💥 Deployment failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up resources');
        console.log('='.repeat(50));

        try {
            console.log('🗑️  Destroying CDK stack...');
            execSync('npx cdk destroy --force', {
                cwd: this.infraPath,
                stdio: 'inherit'
            });

            console.log('✅ Cleanup completed');
            return { success: true };

        } catch (error) {
            console.log(`💥 Cleanup failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    getDeploymentOutputs() {
        const outputsPath = path.resolve('deployment-outputs.json');

        if (fs.existsSync(outputsPath)) {
            const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
            console.log('📊 Deployment Outputs:');
            console.log(JSON.stringify(outputs, null, 2));
            return outputs;
        } else {
            console.log('⚠️  No deployment outputs found');
            return null;
        }
    }
}

export default Deployer;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const deployer = new Deployer();
    const command = process.argv[2] || 'deploy';

    switch (command) {
        case 'deploy':
            deployer.deployInfrastructure();
            break;
        case 'cleanup':
            deployer.cleanup();
            break;
        case 'outputs':
            deployer.getDeploymentOutputs();
            break;
        default:
            console.log('Usage: node deploy.js [deploy|cleanup|outputs]');
    }
}