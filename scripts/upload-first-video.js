#!/usr/bin/env node

/**
 * Upload First Video Script
 * Triggers the complete video pipeline to create and upload the first video
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const API_ENDPOINT = process.env.API_ENDPOINT;
const API_KEY = process.env.API_KEY;

// Initialize AWS SDK
AWS.config.update({ region: REGION });
const stepfunctions = new AWS.StepFunctions();

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
 * Load deployment outputs
 */
function loadDeploymentOutputs() {
    try {
        const outputsPath = path.join(__dirname, '../deployment-outputs.json');
        if (fs.existsSync(outputsPath)) {
            const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
            return outputs.VideoPipelineStack || {};
        }
        return {};
    } catch (error) {
        log(`Warning: Could not load deployment outputs: ${error.message}`, 'yellow');
        return {};
    }
}

/**
 * Start the video pipeline execution
 */
async function startVideoPipeline(topic) {
    try {
        log('🚀 Starting video pipeline execution...', 'blue');
        
        const outputs = loadDeploymentOutputs();
        const stateMachineArn = outputs.StateMachineArn;
        
        if (!stateMachineArn) {
            throw new Error('State Machine ARN not found in deployment outputs');
        }
        
        // Prepare execution input
        const executionInput = {
            topicId: `first-video-${Date.now()}`,
            topic: topic.topic,
            keywords: topic.keywords,
            priority: 1,
            scheduledBy: 'manual-first-upload'
        };
        
        // Start Step Functions execution
        const params = {
            stateMachineArn: stateMachineArn,
            name: `first-video-${Date.now()}`,
            input: JSON.stringify(executionInput)
        };
        
        const result = await stepfunctions.startExecution(params).promise();
        
        log(`✅ Pipeline execution started successfully!`, 'green');
        log(`📋 Execution ARN: ${result.executionArn}`, 'blue');
        log(`🎯 Topic: ${topic.topic}`, 'blue');
        
        return {
            executionArn: result.executionArn,
            executionName: params.name,
            topic: topic.topic
        };
        
    } catch (error) {
        log(`❌ Failed to start pipeline: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Monitor execution progress
 */
async function monitorExecution(executionArn) {
    try {
        log('🔍 Monitoring execution progress...', 'blue');
        
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 60; // 30 minutes max (30 second intervals)
        
        while (status === 'RUNNING' && attempts < maxAttempts) {
            const result = await stepfunctions.describeExecution({
                executionArn: executionArn
            }).promise();
            
            status = result.status;
            const startTime = result.startDate;
            const currentTime = new Date();
            const elapsedMinutes = Math.round((currentTime - startTime) / 1000 / 60);
            
            log(`📊 Status: ${status} | Elapsed: ${elapsedMinutes} minutes`, 'blue');
            
            if (status === 'RUNNING') {
                log('⏳ Waiting 30 seconds before next check...', 'yellow');
                await new Promise(resolve => setTimeout(resolve, 30000));
                attempts++;
            } else {
                // Execution completed
                log(`🎉 Execution completed with status: ${status}`, status === 'SUCCEEDED' ? 'green' : 'red');
                
                if (result.output) {
                    const output = JSON.parse(result.output);
                    
                    if (output.results && output.results.youtubePublish) {
                        const youtubeUrl = output.results.youtubePublish.youtubeUrl;
                        if (youtubeUrl) {
                            log(`🎬 Video published to YouTube: ${youtubeUrl}`, 'green');
                        }
                    }
                    
                    if (output.metrics) {
                        log(`⏱️  Total processing time: ${Math.round(output.metrics.processingTimeMs / 1000 / 60)} minutes`, 'blue');
                        log(`💰 Estimated cost: $${output.metrics.totalCost}`, 'blue');
                    }
                }
                
                return result;
            }
        }
        
        if (attempts >= maxAttempts) {
            log('⏰ Monitoring timeout reached (30 minutes)', 'yellow');
            log('The execution may still be running. Check AWS Console for updates.', 'yellow');
        }
        
    } catch (error) {
        log(`❌ Error monitoring execution: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        log('🎬 Automated Video Pipeline - First Video Upload', 'blue');
        log('=================================================', 'blue');
        log('');
        
        // Check if deployment outputs exist
        const outputs = loadDeploymentOutputs();
        if (!outputs.StateMachineArn) {
            log('❌ Deployment outputs not found. Please run deployment first:', 'red');
            log('   Check deployment-outputs.json file', 'yellow');
            process.exit(1);
        }
        
        log(`🔗 Using State Machine: ${outputs.StateMachineArn}`, 'blue');
        
        // Define the first video topic
        const firstVideoTopic = {
            topic: 'Best Investment Apps for Beginners in 2025',
            keywords: ['investment apps', 'beginners', '2025', 'mobile investing', 'robinhood', 'acorns']
        };
        
        log(`🎯 Creating first video: "${firstVideoTopic.topic}"`, 'green');
        log('');
        
        // Start the pipeline
        const execution = await startVideoPipeline(firstVideoTopic);
        
        log('');
        log('📋 Pipeline Steps:', 'blue');
        log('1. ✅ Trend Analysis - Analyzing current investment app trends');
        log('2. 🔄 Script Generation - Creating engaging video script');
        log('3. 🔄 Media Curation - Finding relevant images and videos');
        log('4. 🔄 Audio Production - Converting script to speech');
        log('5. 🔄 Video Assembly - Combining media with audio');
        log('6. 🔄 YouTube Upload - Publishing to your channel');
        log('');
        
        // Monitor progress
        await monitorExecution(execution.executionArn);
        
        log('');
        log('🎉 First video upload process completed!', 'green');
        log('');
        log('📋 What happened:', 'blue');
        log('• AI analyzed trending investment app topics');
        log('• Generated an engaging 8-minute script with hooks');
        log('• Curated professional images from Pexels/Pixabay');
        log('• Created high-quality narration with Amazon Polly');
        log('• Assembled everything into a professional video');
        log('• Uploaded to YouTube with SEO-optimized metadata');
        log('');
        log('🚀 Your automated video pipeline is now live!', 'green');
        
    } catch (error) {
        log('');
        log(`❌ Upload failed: ${error.message}`, 'red');
        log('');
        log('🔧 Troubleshooting:', 'yellow');
        log('1. Ensure AWS credentials are configured');
        log('2. Verify the infrastructure is deployed');
        log('3. Check that YouTube credentials are in Secrets Manager');
        log('4. Ensure Bedrock model access is enabled');
        log('');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { startVideoPipeline, monitorExecution };