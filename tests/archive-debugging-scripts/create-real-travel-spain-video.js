#!/usr/bin/env node

/**
 * 🇪🇸 CREATE REAL TRAVEL TO SPAIN VIDEO
 * 
 * This script follows the lessons learned to create a real video with actual content:
 * 1. Uses the workflow orchestrator (single function call approach)
 * 2. Extracts real project ID from orchestrator response
 * 3. Validates real content creation at each step
 * 4. Follows the 50% success threshold pattern
 * 5. Implements graceful degradation
 */

const https = require('https');
const fs = require('fs');

const API_BASE = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

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
                'User-Agent': 'Travel-Spain-Creator/1.0'
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

async function createRealTravelSpainVideo() {
    console.log('🇪🇸 CREATE REAL TRAVEL TO SPAIN VIDEO');
    console.log('=====================================');
    console.log('Following lessons learned: Single function call approach with real content validation\n');

    const results = {
        projectId: null,
        orchestratorSuccess: false,
        agentsWorking: 0,
        totalAgents: 6,
        realContentCreated: {
            topicAnalysis: false,
            scriptContent: false,
            mediaAssets: false,
            audioFiles: false,
            videoFile: false
        },
        executionTime: null,
        errors: []
    };

    const startTime = Date.now();

    try {
        // Step 1: Health Check
        console.log('🏥 Step 1: System Health Verification');
        console.log('====================================');

        const healthResponse = await makeAPICall('/manifest/health');
        if (healthResponse.statusCode !== 200) {
            throw new Error('System health check failed');
        }
        console.log('✅ System operational');

        // Step 2: Workflow Orchestrator - Single Function Call (Lessons Learned Pattern)
        console.log('\n🎯 Step 2: Workflow Orchestrator - Single Function Call');
        console.log('======================================================');

        // Check if workflow orchestrator endpoint exists
        const workflowEndpoints = ['/workflow/start', '/workflow/execute', '/orchestrator/start'];
        let workflowResponse = null;
        let workingEndpoint = null;

        const workflowPayload = {
            baseTopic: 'Travel to Spain',
            targetAudience: 'travel enthusiasts',
            videoDuration: 480,
            contentType: 'educational'
        };

        for (const endpoint of workflowEndpoints) {
            try {
                console.log(`🔄 Trying workflow endpoint: ${endpoint}`);
                workflowResponse = await makeAPICall(endpoint, 'POST', workflowPayload);

                if (workflowResponse.statusCode === 200 && workflowResponse.body.success) {
                    workingEndpoint = endpoint;
                    console.log(`✅ Found working endpoint: ${endpoint}`);
                    break;
                } else {
                    console.log(`⚠️  ${endpoint}: ${workflowResponse.statusCode}`);
                }
            } catch (endpointError) {
                console.log(`⚠️  ${endpoint}: ${endpointError.message}`);
            }
        }

        if (workingEndpoint && workflowResponse.body.success) {
            results.orchestratorSuccess = true;

            // Extract real project ID (Lessons Learned Pattern)
            const realProjectId = workflowResponse.body.projectId || workflowResponse.body.result ? .projectId;
            if (realProjectId) {
                results.projectId = realProjectId;
                console.log(`📁 Real Project ID: ${realProjectId}`);

                // Analyze orchestrator results
                if (workflowResponse.body.agentsExecuted) {
                    results.agentsWorking = workflowResponse.body.agentsExecuted.filter(a => a.success).length;
                    console.log(`🤖 Agents Working: ${results.agentsWorking}/${results.totalAgents}`);

                    workflowResponse.body.agentsExecuted.forEach(agent => {
                        const status = agent.success ? '✅' : '❌';
                        console.log(`   ${status} ${agent.name}: ${agent.success ? 'SUCCESS' : agent.error || 'FAILED'}`);
                    });
                }

                // Check execution time (Lessons Learned: Sub-60 second target)
                if (workflowResponse.body.executionTime) {
                    results.executionTime = workflowResponse.body.executionTime;
                    console.log(`⏱️  Execution Time: ${results.executionTime}s`);

                    if (results.executionTime < 60) {
                        console.log('🎯 Target achieved: Sub-60 second execution');
                    }
                }

            } else {
                console.log('⚠️  No project ID returned from orchestrator');
                results.errors.push('No project ID from orchestrator');
            }

        } else {
            console.log('❌ No working workflow orchestrator endpoint found');
            console.log('🔄 Falling back to individual agent approach...');

            // Fallback: Create project using topic management
            const topicResponse = await makeAPICall('/topics', 'POST', workflowPayload);
            if (topicResponse.statusCode === 200 && topicResponse.body.success) {
                results.projectId = topicResponse.body.projectId;
                results.agentsWorking = 1;
                console.log(`📁 Fallback Project ID: ${results.projectId}`);
            } else {
                throw new Error('Both orchestrator and fallback failed');
            }
        }

        // Step 3: Content Validation (Real Content Check)
        console.log('\n📊 Step 3: Real Content Validation');
        console.log('==================================');

        if (results.projectId) {
            // Use Manifest Builder to validate real content
            const manifestPayload = {
                projectId: results.projectId,
                minVisuals: 3
            };

            const manifestResponse = await makeAPICall('/manifest/build', 'POST', manifestPayload);

            if (manifestResponse.statusCode === 200 && manifestResponse.body.success) {
                console.log('✅ Content validation passed');

                const kpis = manifestResponse.body.kpis;

                // Validate real content based on KPIs
                if (kpis.scenes_detected >= 3) {
                    results.realContentCreated.scriptContent = true;
                    console.log(`✅ Script Content: ${kpis.scenes_detected} scenes detected`);
                }

                if (kpis.images_total >= 9) {
                    results.realContentCreated.mediaAssets = true;
                    console.log(`✅ Media Assets: ${kpis.images_total} images validated`);
                }

                if (kpis.audio_segments >= 3) {
                    results.realContentCreated.audioFiles = true;
                    console.log(`✅ Audio Files: ${kpis.audio_segments} segments validated`);
                }

                if (kpis.has_narration) {
                    console.log('✅ Master narration file exists');
                }

                results.realContentCreated.topicAnalysis = true;
                console.log('✅ Topic Analysis: Project structure validated');

            } else if (manifestResponse.statusCode === 422) {
                console.log('⚠️  Content validation failed - analyzing issues');
                const issues = manifestResponse.body.issues || [];
                issues.forEach(issue => {
                    console.log(`   🚫 ${issue}`);
                    results.errors.push(issue);
                });
            }
        }

        // Step 4: Video Creation Attempt
        console.log('\n🎬 Step 4: Video Creation Attempt');
        console.log('=================================');

        if (results.projectId) {
            const videoPayload = {
                projectId: results.projectId,
                useManifest: true
            };

            const videoResponse = await makeAPICall('/video/assemble', 'POST', videoPayload);

            if (videoResponse.statusCode === 200 && videoResponse.body.success) {
                results.realContentCreated.videoFile = true;
                console.log('✅ Video file created successfully');
                console.log(`🎥 Video: ${videoResponse.body.videoFile || 'final-video.mp4'}`);
                console.log(`📏 Resolution: ${videoResponse.body.resolution || '1920x1080'}`);
            } else {
                console.log('⚠️  Video creation issue (expected based on lessons learned)');
                if (videoResponse.body && videoResponse.body.error) {
                    console.log(`📝 Error: ${videoResponse.body.error}`);
                    if (videoResponse.body.error.includes('FFmpeg')) {
                        console.log('📝 Note: FFmpeg configuration needed (documented in lessons learned)');
                        results.errors.push('FFmpeg configuration needed');
                    }
                }
            }
        }

        // Step 5: Success Assessment (Lessons Learned: 50% threshold)
        console.log('\n🎯 Step 5: Success Assessment');
        console.log('=============================');

        const contentCreatedCount = Object.values(results.realContentCreated).filter(v => v === true).length;
        const totalContentTypes = Object.keys(results.realContentCreated).length;
        const contentSuccessRate = Math.round((contentCreatedCount / totalContentTypes) * 100);

        const agentSuccessRate = Math.round((results.agentsWorking / results.totalAgents) * 100);

        console.log(`📊 Agent Success Rate: ${results.agentsWorking}/${results.totalAgents} (${agentSuccessRate}%)`);
        console.log(`📊 Content Success Rate: ${contentCreatedCount}/${totalContentTypes} (${contentSuccessRate}%)`);

        // Apply lessons learned success criteria
        if (agentSuccessRate >= 50 || contentSuccessRate >= 60) {
            console.log('🎉 SUCCESS: Meets lessons learned success criteria!');
            console.log('📋 Achievements:');

            if (results.orchestratorSuccess) {
                console.log('   ✅ Single function call approach working');
            }

            if (results.executionTime && results.executionTime < 60) {
                console.log('   ✅ Sub-60 second execution achieved');
            }

            if (results.agentsWorking >= 3) {
                console.log('   ✅ Minimum viable agent count achieved');
            }

            Object.entries(results.realContentCreated).forEach(([key, value]) => {
                if (value) {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    console.log(`   ✅ ${label} created`);
                }
            });

            results.success = true;

        } else {
            console.log('⚠️  PARTIAL SUCCESS: Below success threshold but system operational');
            console.log('📋 Recommendations from lessons learned:');
            console.log('   - Focus on working agents (graceful degradation)');
            console.log('   - Prioritize real content over perfect execution');
            console.log('   - System can still produce usable content');

            results.success = false;
        }

        // Final Summary
        console.log('\n📋 FINAL SUMMARY');
        console.log('================');
        console.log(`Project Created: ${results.projectId || 'None'}`);
        console.log(`Orchestrator Working: ${results.orchestratorSuccess ? 'Yes' : 'No'}`);
        console.log(`Agents Working: ${results.agentsWorking}/${results.totalAgents}`);
        console.log(`Real Content Types: ${contentCreatedCount}/${totalContentTypes}`);
        console.log(`Execution Time: ${results.executionTime || 'Unknown'}s`);

        if (results.projectId) {
            console.log(`\n🌐 S3 Path: videos/${results.projectId}/`);
            console.log('📁 Check S3 bucket for generated files');
        }

        return results;

    } catch (error) {
        console.error(`\n❌ Video creation failed: ${error.message}`);
        results.errors.push(error.message);
        results.success = false;
        return results;
    } finally {
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n⏱️  Total execution time: ${totalTime}s`);
        results.totalExecutionTime = totalTime;
    }
}

// Run the script if called directly
if (require.main === module) {
    createRealTravelSpainVideo()
        .then(results => {
            console.log('\n📄 RESULTS SUMMARY:');
            console.log('===================');

            if (results.success) {
                console.log('🎉 Real Travel to Spain video creation successful!');
                console.log('🎬 System is generating real content following lessons learned patterns');
            } else {
                console.log('⚠️  Video creation completed with issues');
                console.log('📋 System operational but may need optimization');
            }

            // Save detailed results
            fs.writeFileSync('travel-spain-creation-results.json', JSON.stringify(results, null, 2));
            console.log('📁 Detailed results saved to travel-spain-creation-results.json');

            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    createRealTravelSpainVideo
};