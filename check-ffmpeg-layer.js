#!/usr/bin/env node

/**
 * 🔍 Check FFmpeg Layer Status
 *
 * Checks if the FFmpeg layer was built and deployed correctly
 */

const {
    execSync
} = require('child_process');

async function checkFFmpegLayer() {
    console.log('🔍 Checking FFmpeg Layer Status');
    console.log('='.repeat(40));

    try {
        // Check if FFmpeg layer exists in S3
        console.log('☁️ Checking S3 for FFmpeg layer...');
        const s3CheckCmd = `aws s3 ls s3://automated-video-pipeline-deployments-prod/layers/ffmpeg-layer.zip --profile hitechparadigm`;

        try {
            const s3Result = execSync(s3CheckCmd, {
                encoding: 'utf8'
            });
            console.log('✅ FFmpeg layer found in S3:');
            console.log(s3Result.trim());
        } catch (error) {
            console.log('❌ FFmpeg layer NOT found in S3');
            console.log('💡 This means the CI/CD pipeline failed to build/upload the layer');
        }

        // Check CloudFormation stack resources
        console.log('\n🏗️ Checking CloudFormation stack resources...');
        const stackResourcesCmd = `aws cloudformation describe-stack-resources --stack-name automated-video-pipeline-prod --profile hitechparadigm`;

        try {
            const stackResult = execSync(stackResourcesCmd, {
                encoding: 'utf8'
            });
            const resources = JSON.parse(stackResult);

            // Look for FFmpeg layer
            const ffmpegLayer = resources.StackResources.find(r => r.LogicalResourceId === 'FFmpegLayer');
            if (ffmpegLayer) {
                console.log('✅ FFmpeg layer found in CloudFormation:');
                console.log(`   Resource Type: ${ffmpegLayer.ResourceType}`);
                console.log(`   Physical ID: ${ffmpegLayer.PhysicalResourceId}`);
                console.log(`   Status: ${ffmpegLayer.ResourceStatus}`);
            } else {
                console.log('❌ FFmpeg layer NOT found in CloudFormation stack');
                console.log('💡 The layer resource was not created');
            }

            // Look for Video Assembler function
            const videoAssembler = resources.StackResources.find(r => r.LogicalResourceId === 'VideoAssemblerFunction');
            if (videoAssembler) {
                console.log('\n✅ Video Assembler function found:');
                console.log(`   Physical ID: ${videoAssembler.PhysicalResourceId}`);
                console.log(`   Status: ${videoAssembler.ResourceStatus}`);

                // Get function configuration to see layers
                console.log('\n🔍 Checking Lambda function layers...');
                const functionConfigCmd = `aws lambda get-function --function-name ${videoAssembler.PhysicalResourceId} --profile hitechparadigm`;

                try {
                    const functionResult = execSync(functionConfigCmd, {
                        encoding: 'utf8'
                    });
                    const functionConfig = JSON.parse(functionResult);

                    if (functionConfig.Configuration.Layers && functionConfig.Configuration.Layers.length > 0) {
                        console.log('✅ Lambda function has layers:');
                        functionConfig.Configuration.Layers.forEach((layer, index) => {
                            console.log(`   Layer ${index + 1}: ${layer.Arn}`);
                        });
                    } else {
                        console.log('❌ Lambda function has NO layers attached');
                        console.log('💡 This explains why FFmpeg is not available');
                    }
                } catch (error) {
                    console.log('❌ Could not get Lambda function configuration');
                }
            }

        } catch (error) {
            console.log('❌ Could not get CloudFormation stack resources');
            console.log('Error:', error.message);
        }

        // Check if deployment bucket exists
        console.log('\n📦 Checking deployment bucket...');
        const bucketCheckCmd = `aws s3 ls s3://automated-video-pipeline-deployments-prod/ --profile hitechparadigm`;

        try {
            const bucketResult = execSync(bucketCheckCmd, {
                encoding: 'utf8'
            });
            console.log('✅ Deployment bucket exists');

            if (bucketResult.includes('layers/')) {
                console.log('✅ Layers folder exists in bucket');
            } else {
                console.log('❌ No layers folder in deployment bucket');
                console.log('💡 CI/CD pipeline may not have uploaded the layer');
            }
        } catch (error) {
            console.log('❌ Deployment bucket does not exist or is not accessible');
            console.log('💡 This could be why the layer deployment failed');
        }

        console.log('\n🎯 DIAGNOSIS:');
        console.log('Based on the checks above, the issue is likely:');
        console.log('1. FFmpeg layer was not built/uploaded by CI/CD pipeline');
        console.log('2. S3 bucket permissions or access issues');
        console.log('3. CloudFormation template issues with layer reference');

        console.log('\n💡 NEXT STEPS:');
        console.log('1. Check GitHub Actions logs for FFmpeg layer build failures');
        console.log('2. Manually trigger CI/CD with "Force rebuild FFmpeg layer" option');
        console.log('3. Verify S3 bucket exists and has proper permissions');

    } catch (error) {
        console.error('❌ Error during FFmpeg layer check:', error.message);
    }
}

checkFFmpegLayer().catch(console.error);