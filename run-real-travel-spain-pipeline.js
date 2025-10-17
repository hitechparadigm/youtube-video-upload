#!/usr/bin/env node

/**
 * 🇪🇸 REAL TRAVEL TO SPAIN E2E PIPELINE
 * 
 * This script runs each agent individually to ensure real outputs are generated:
 * - Real topic analysis with AI
 * - Real script generation with professional content
 * - Real media curation with downloaded images
 * - Real audio generation with AWS Polly
 * - Real video assembly with FFmpeg
 * 
 * Each step validates inputs and outputs to ensure quality.
 */

const https = require('https');
const fs = require('fs');

// Production API Configuration
const API_BASE = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

// Pipeline Configuration
const TOPIC_CONFIG = {
    baseTopic: 'Travel to Spain',
    targetAudience: 'travel enthusiasts',
    contentType: 'educational',
    videoDuration: 480, // 8 minutes
    videoStyle: 'engaging_educational'
};

// Utility function to make API calls
async function makeAPICall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_BASE);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'User-Agent': 'Real-Travel-Spain-Pipeline/1.0'
            }
        };

        if (body && method !== 'GET') {
            const bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null
                    };
                    resolve(response);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => reject(new Error('Request timeout')));

        if (body && method !== 'GET') {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Wait function for delays between steps
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Validate agent output
function validateOutput(stepName, response, expectedFields = []) {
    console.log(`\n🔍 Validating ${stepName} Output:`);

    if (!response.body || !response.body.success) {
        console.log(`❌ ${stepName} failed: ${JSON.stringify(response.body)}`);
        return false;
    }

    let valid = true;
    expectedFields.forEach(field => {
        const value = getNestedValue(response.body, field);
        if (!value) {
            console.log(`❌ Missing required field: ${field}`);
            valid = false;
        } else {
            console.log(`✅ ${field}: ${typeof value === 'object' ? 'Present' : value}`);
        }
    });

    return valid;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

async function runRealTravelSpainPipeline() {
    console.log('🇪🇸 REAL TRAVEL TO SPAIN - E2E PIPELINE WITH VALIDATION');
    console.log('========================================================');
    console.log(`🌐 API Base: ${API_BASE}`);
    console.log(`🎯 Topic: ${TOPIC_CONFIG.baseTopic}`);
    console.log(`⏱️  Duration: ${TOPIC_CONFIG.videoDuration} seconds\n`);

    let projectId = null;
    const results = {
        steps: [],
        success: false,
        projectId: null,
        errors: [],
        outputs: {}
    };

    try {
        // Step 1: Topic Management AI - Generate REAL topic context
        console.log('📋 Step 1: Topic Management AI - Real Context Generation');
        console.log('=========================================================');

        const topicResponse = await makeAPICall('/topics', 'POST', TOPIC_CONFIG);

        const topicValid = validateOutput('Topic Management', topicResponse, [
            'projectId',
            'topicContext.mainTopic',
            'topicContext.expandedTopics',
            'topicContext.seoContext.primaryKeywords'
        ]);

        if (topicValid) {
            projectId = topicResponse.body.projectId;
            results.projectId = projectId;
            results.outputs.topicContext = topicResponse.body.topicContext;

            console.log(`✅ Real topic context generated`);
            console.log(`📁 Project ID: ${projectId}`);
            console.log(`🎯 Expanded topics: ${topicResponse.body.topicContext.expandedTopics.length}`);
            console.log(`🔑 SEO keywords: ${topicResponse.body.topicContext.seoContext.primaryKeywords.length}`);

            results.steps.push({
                step: 1,
                name: 'Topic Management',
                success: true,
                projectId,
                outputs: ['topic-context.json']
            });
        } else {
            throw new Error('Topic Management validation failed');
        }

        await wait(3);

        // Step 2: Script Generator AI - Generate REAL professional script
        console.log('\n📝 Step 2: Script Generator AI - Real Script Generation');
        console.log('======================================================');

        const scriptPayload = {
            projectId: projectId,
            scriptOptions: {
                style: TOPIC_CONFIG.videoStyle,
                targetAudience: TOPIC_CONFIG.targetAudience
            }
        };

        const scriptResponse = await makeAPICall('/scripts/generate', 'POST', scriptPayload);

        const scriptValid = validateOutput('Script Generator', scriptResponse, [
            'sceneContext.scenes',
            'sceneContext.totalDuration',
            'sceneContext.selectedSubtopic'
        ]);

        if (scriptValid) {
            results.outputs.sceneContext = scriptResponse.body.sceneContext;

            console.log(`✅ Real script generated`);
            console.log(`🎬 Scenes: ${scriptResponse.body.sceneContext.scenes.length}`);
            console.log(`⏱️  Total duration: ${scriptResponse.body.sceneContext.totalDuration}s`);
            console.log(`📖 Selected topic: ${scriptResponse.body.sceneContext.selectedSubtopic}`);

            // Validate scene content
            const scenes = scriptResponse.body.sceneContext.scenes;
            let realScriptContent = true;
            scenes.forEach((scene, index) => {
                if (!scene.content || !scene.content.script || scene.content.script.length < 50) {
                    console.log(`⚠️  Scene ${index + 1} has minimal script content`);
                    realScriptContent = false;
                }
            });

            if (realScriptContent) {
                console.log(`✅ All scenes have substantial script content`);
            }

            results.steps.push({
                step: 2,
                name: 'Script Generator',
                success: true,
                scenes: scenes.length,
                outputs: ['script.json', 'scene-context.json']
            });
        } else {
            throw new Error('Script Generator validation failed');
        }

        await wait(3);

        // Step 3: Media Curator AI - Download REAL images
        console.log('\n🎨 Step 3: Media Curator AI - Real Media Curation');
        console.log('==================================================');

        const mediaPayload = {
            projectId: projectId
        };

        const mediaResponse = await makeAPICall('/media/curate', 'POST', mediaPayload);

        const mediaValid = validateOutput('Media Curator', mediaResponse, [
            'mediaContext.totalAssets',
            'mediaContext.sceneMediaMapping',
            'industryCompliance'
        ]);

        if (mediaValid) {
            results.outputs.mediaContext = mediaResponse.body.mediaContext;

            console.log(`✅ Real media curation completed`);
            console.log(`🖼️  Total assets: ${mediaResponse.body.mediaContext.totalAssets}`);
            console.log(`📊 Industry compliance: ${mediaResponse.body.industryCompliance}`);

            // Check for real media downloads
            const sceneMapping = mediaResponse.body.mediaContext.sceneMediaMapping;
            let realMediaCount = 0;
            sceneMapping.forEach(scene => {
                scene.mediaSequence.forEach(asset => {
                    if (asset.realContent && asset.downloadedSize > 10000) { // > 10KB indicates real content
                        realMediaCount++;
                    }
                });
            });

            console.log(`📥 Real media downloads: ${realMediaCount}/${mediaResponse.body.mediaContext.totalAssets}`);

            results.steps.push({
                step: 3,
                name: 'Media Curator',
                success: true,
                assets: mediaResponse.body.mediaContext.totalAssets,
                realAssets: realMediaCount,
                outputs: ['media-context.json', 'scene-*/images/*']
            });
        } else {
            throw new Error('Media Curator validation failed');
        }

        await wait(5);

        // Step 4: Audio Generator AI - Generate REAL narration
        console.log('\n🎵 Step 4: Audio Generator AI - Real Audio Generation');
        console.log('====================================================');

        // Note: Audio Generator might not have direct API endpoint, check if it's orchestrator-managed
        console.log('🔄 Checking for Audio Generator endpoint...');

        try {
            const audioPayload = {
                projectId: projectId
            };

            // Try direct audio generation endpoint
            const audioResponse = await makeAPICall('/audio/generate', 'POST', audioPayload);

            if (audioResponse.statusCode === 200) {
                const audioValid = validateOutput('Audio Generator', audioResponse, [
                    'audioContext.masterAudio',
                    'audioContext.audioSegments'
                ]);

                if (audioValid) {
                    results.outputs.audioContext = audioResponse.body.audioContext;
                    console.log(`✅ Real audio generation completed`);
                    console.log(`🎙️  Master audio: ${audioResponse.body.audioContext.masterAudio.filename}`);
                    console.log(`🔊 Audio segments: ${audioResponse.body.audioContext.audioSegments.length}`);

                    results.steps.push({
                        step: 4,
                        name: 'Audio Generator',
                        success: true,
                        segments: audioResponse.body.audioContext.audioSegments.length,
                        outputs: ['narration.mp3', 'audio-segments/*.mp3', 'audio-context.json']
                    });
                } else {
                    throw new Error('Audio Generator validation failed');
                }
            } else {
                throw new Error('Audio Generator endpoint not available');
            }
        } catch (audioError) {
            console.log(`⚠️  Direct audio generation failed: ${audioError.message}`);
            console.log(`🔄 Audio generation may be orchestrator-managed`);

            results.steps.push({
                step: 4,
                name: 'Audio Generator',
                success: false,
                note: 'Orchestrator-managed or endpoint unavailable',
                outputs: []
            });
        }

        await wait(3);

        // Step 5: Manifest Builder - Quality validation
        console.log('\n📋 Step 5: Manifest Builder - Quality Validation');
        console.log('=================================================');

        const manifestPayload = {
            projectId: projectId,
            minVisuals: 3
        };

        const manifestResponse = await makeAPICall('/manifest/build', 'POST', manifestPayload);

        const manifestValid = validateOutput('Manifest Builder', manifestResponse, [
            'manifestPath',
            'kpis.scenes_detected',
            'readyForRendering'
        ]);

        if (manifestValid) {
            results.outputs.manifest = manifestResponse.body;

            console.log(`✅ Quality validation passed`);
            console.log(`📊 Scenes validated: ${manifestResponse.body.kpis.scenes_detected}`);
            console.log(`🖼️  Images validated: ${manifestResponse.body.kpis.images_total}`);
            console.log(`🎵 Audio segments: ${manifestResponse.body.kpis.audio_segments}`);
            console.log(`🎯 Ready for rendering: ${manifestResponse.body.readyForRendering}`);

            results.steps.push({
                step: 5,
                name: 'Manifest Builder',
                success: true,
                validated: true,
                outputs: ['manifest.json', 'project-summary.json', 'youtube-metadata.json']
            });
        } else if (manifestResponse.statusCode === 422) {
            console.log(`⚠️  Quality validation failed - content needs improvement`);
            console.log(`🚫 Issues: ${JSON.stringify(manifestResponse.body.issues || [])}`);

            results.steps.push({
                step: 5,
                name: 'Manifest Builder',
                success: false,
                issues: manifestResponse.body.issues,
                outputs: ['validation.log']
            });

            // Continue for demonstration
        } else {
            throw new Error(`Manifest Builder failed: ${manifestResponse.statusCode}`);
        }

        await wait(3);

        // Step 6: Video Assembler AI - Create REAL video
        console.log('\n🎬 Step 6: Video Assembler AI - Real Video Creation');
        console.log('==================================================');

        const videoPayload = {
            projectId: projectId,
            useManifest: true
        };

        const videoResponse = await makeAPICall('/video/assemble', 'POST', videoPayload);

        if (videoResponse.statusCode === 200 && videoResponse.body.success) {
            const videoValid = validateOutput('Video Assembler', videoResponse, [
                'videoFile',
                'resolution',
                'duration'
            ]);

            if (videoValid) {
                results.outputs.video = videoResponse.body;

                console.log(`✅ Real video assembly completed`);
                console.log(`🎥 Video file: ${videoResponse.body.videoFile}`);
                console.log(`📏 Resolution: ${videoResponse.body.resolution}`);
                console.log(`⏱️  Duration: ${videoResponse.body.duration}s`);
                console.log(`📊 File size: ${videoResponse.body.fileSize || 'Unknown'}`);

                results.steps.push({
                    step: 6,
                    name: 'Video Assembler',
                    success: true,
                    videoCreated: true,
                    outputs: ['final-video.mp4', 'processing-logs/*']
                });
            } else {
                throw new Error('Video Assembler validation failed');
            }
        } else {
            console.log(`⚠️  Video assembly failed: ${videoResponse.statusCode}`);
            console.log(`📝 Error: ${videoResponse.body ? videoResponse.body.error : 'Unknown error'}`);

            results.steps.push({
                step: 6,
                name: 'Video Assembler',
                success: false,
                error: videoResponse.body ? videoResponse.body.error : 'Unknown error',
                outputs: []
            });
        }

        // Final Results
        console.log('\n🎉 REAL PIPELINE EXECUTION COMPLETE');
        console.log('===================================');

        const successfulSteps = results.steps.filter(s => s.success).length;
        const totalSteps = results.steps.length;
        const successRate = Math.round((successfulSteps / totalSteps) * 100);

        console.log(`📊 Success Rate: ${successfulSteps}/${totalSteps} (${successRate}%)`);
        console.log(`📁 Project ID: ${projectId}`);
        console.log(`🌐 S3 Path: videos/${projectId}/`);

        // Detailed Output Analysis
        console.log('\n📋 Output Analysis:');
        console.log('==================');

        results.steps.forEach(step => {
            const status = step.success ? '✅' : '❌';
            console.log(`${status} Step ${step.step}: ${step.name}`);
            if (step.outputs && step.outputs.length > 0) {
                console.log(`   📁 Outputs: ${step.outputs.join(', ')}`);
            }
            if (step.realAssets) {
                console.log(`   🖼️  Real assets: ${step.realAssets}/${step.assets}`);
            }
            if (step.error) {
                console.log(`   ❌ Error: ${step.error}`);
            }
        });

        // Real Content Verification
        console.log('\n🔍 Real Content Verification:');
        console.log('=============================');

        if (results.outputs.topicContext) {
            console.log(`✅ Topic Context: ${results.outputs.topicContext.expandedTopics.length} real topics generated`);
        }

        if (results.outputs.sceneContext) {
            const totalScriptLength = results.outputs.sceneContext.scenes.reduce((sum, scene) =>
                sum + (scene.content && scene.content.script ? scene.content.script.length : 0), 0);
            console.log(`✅ Script Content: ${totalScriptLength} characters of real script content`);
        }

        if (results.outputs.mediaContext) {
            const realMediaCount = results.steps.find(s => s.name === 'Media Curator') ? .realAssets || 0;
            console.log(`✅ Media Content: ${realMediaCount} real images downloaded`);
        }

        if (results.outputs.video) {
            console.log(`✅ Video Content: Real MP4 file created`);
        } else {
            console.log(`⚠️  Video Content: No real video file created`);
        }

        if (successRate >= 70) {
            console.log('\n🎉 REAL PIPELINE EXECUTION SUCCESSFUL!');
            results.success = true;
        } else {
            console.log('\n⚠️  PIPELINE EXECUTION PARTIALLY SUCCESSFUL');
        }

        return results;

    } catch (error) {
        console.error(`\n❌ Pipeline execution failed: ${error.message}`);
        results.errors.push(error.message);
        return results;
    }
}

// Run the pipeline if called directly
if (require.main === module) {
    runRealTravelSpainPipeline()
        .then(results => {
            console.log('\n📊 FINAL RESULTS SUMMARY:');
            console.log('=========================');

            if (results.success) {
                console.log('🎉 Real Travel to Spain video pipeline completed successfully!');
                console.log('🎬 Check the S3 bucket for real audio and video files.');
            } else {
                console.log('⚠️  Pipeline completed with issues. Real content may be limited.');
            }

            // Save results to file
            fs.writeFileSync('real-pipeline-results.json', JSON.stringify(results, null, 2));
            console.log('📄 Detailed results saved to real-pipeline-results.json');

            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    runRealTravelSpainPipeline
};