#!/usr/bin/env node

/**
 * Secure Production Deployment Script
 * Handles deployment without exposing sensitive information
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
    const required = ['AWS_REGION', 'ENVIRONMENT'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
        log(`❌ Missing required environment variables: ${missing.join(', ')}`, 'red');
        process.exit(1);
    }
    
    log('✅ Environment variables validated', 'green');
}

/**
 * Install dependencies
 */
function installDependencies() {
    log('📦 Installing dependencies...', 'blue');
    
    try {
        // Install root dependencies
        execSync('npm ci', { stdio: 'inherit' });
        
        // Install infrastructure dependencies
        execSync('npm ci', { cwd: 'infrastructure', stdio: 'inherit' });
        
        // Install Lambda dependencies
        const lambdaFunctions = [
            'topic-management',
            'script-generator', 
            'media-curator',
            'audio-generator',
            'video-assembler',
            'youtube-publisher',
            'workflow-orchestrator'
        ];
        
        for (const func of lambdaFunctions) {
            const funcPath = path.join('src', 'lambda', func);
            if (fs.existsSync(path.join(funcPath, 'package.json'))) {
                log(`  Installing ${func} dependencies...`, 'blue');
                execSync('npm ci', { cwd: funcPath, stdio: 'inherit' });
            }
        }
        
        log('✅ Dependencies installed', 'green');
    } catch (error) {
        log(`❌ Failed to install dependencies: ${error.message}`, 'red');
        process.exit(1);
    }
}

/**
 * Deploy infrastructure
 */
function deployInfrastructure() {
    const environment = process.env.ENVIRONMENT || 'staging';
    const stackName = `VideoPipelineStack-${environment.charAt(0).toUpperCase() + environment.slice(1)}`;
    
    log(`🚀 Deploying to ${environment} environment...`, 'blue');
    
    try {
        process.chdir('infrastructure');
        
        // Bootstrap CDK if needed
        log('🏗️ Bootstrapping CDK...', 'yellow');
        execSync('cdk bootstrap', { stdio: 'inherit' });
        
        // Deploy the stack
        log(`📦 Deploying ${stackName}...`, 'yellow');
        execSync(`cdk deploy ${stackName} --require-approval never --outputs-file ../deployment-outputs-${environment}.json --context environment=${environment}`, { 
            stdio: 'inherit',
            env: { ...process.env, ENVIRONMENT: environment }
        });
        
        process.chdir('..');
        
        log(`✅ Deployment to ${environment} completed successfully!`, 'green');
        
    } catch (error) {
        log(`❌ Deployment failed: ${error.message}`, 'red');
        process.chdir('..');
        process.exit(1);
    }
}

/**
 * Display secure deployment results
 */
function displayResults() {
    const environment = process.env.ENVIRONMENT || 'staging';
    const outputsFile = `deployment-outputs-${environment}.json`;
    
    log('📋 Deployment Results:', 'blue');
    log('=====================', 'blue');
    
    try {
        if (fs.existsSync(outputsFile)) {
            const outputs = JSON.parse(fs.readFileSync(outputsFile, 'utf8'));
            const stackOutputs = outputs[`VideoPipelineStack-${environment.charAt(0).toUpperCase() + environment.slice(1)}`] || {};
            
            log(`🌐 API Endpoint: ${stackOutputs.APIEndpoint || 'Check AWS Console'}`, 'green');
            log(`📦 S3 Bucket: ${stackOutputs.PrimaryBucketName || 'Check AWS Console'}`, 'green');
            log(`⚙️ State Machine: ${stackOutputs.StateMachineArn || 'Check AWS Console'}`, 'green');
            
            // SECURITY: Do NOT display API key in logs
            if (stackOutputs.APIKeyId) {
                log(`🔑 API Key ID: ${stackOutputs.APIKeyId}`, 'green');
                log(`🔒 API Key Value: Use 'aws apigateway get-api-key --api-key ${stackOutputs.APIKeyId} --include-value' to retrieve securely`, 'yellow');
            }
        }
    } catch (error) {
        log('Could not read deployment outputs', 'yellow');
    }
    
    log('', 'reset');
    log('🔒 Security Notes:', 'blue');
    log('• API keys are stored securely in AWS', 'yellow');
    log('• Use AWS CLI to retrieve sensitive values when needed', 'yellow');
    log('• Never commit API keys or secrets to version control', 'yellow');
    log('', 'reset');
    log('🎯 Next Steps:', 'blue');
    log('1. Configure secrets in AWS Secrets Manager', 'yellow');
    log('2. Test the deployment with integration tests', 'yellow');
    log('3. Monitor CloudWatch logs for any issues', 'yellow');
}

/**
 * Main function
 */
async function main() {
    try {
        const environment = process.env.ENVIRONMENT || 'staging';
        
        log('🚀 Secure Production Deployment', 'blue');
        log('===============================', 'blue');
        log(`Environment: ${environment}`, 'blue');
        log('', 'reset');
        
        // Validate environment
        validateEnvironment();
        
        // Install dependencies
        installDependencies();
        
        // Deploy infrastructure
        deployInfrastructure();
        
        // Display results securely
        displayResults();
        
        log('🎉 Deployment completed successfully!', 'green');
        
    } catch (error) {
        log(`❌ Deployment failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, validateEnvironment, installDependencies, deployInfrastructure };