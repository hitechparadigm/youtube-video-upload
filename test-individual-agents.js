#!/usr/bin/env node

/**
 * 🧪 TEST INDIVIDUAL AGENTS FOR REAL OUTPUT GENERATION
 * 
 * This script tests each agent individually to ensure they produce real,
 * functional outputs rather than placeholder content.
 */

const https = require('https');
const fs = require('fs');

const API_BASE = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

// Test project ID (use existing one)
const TEST_PROJECT_ID = '2025-10-15_01-58-13_travel-to-spain';

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
                'User-Agent': 'Agent-Tester/1.0'
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
        req.setTimeout(60000, () => reject(new Error('Request timeout')));

        if (body && method !== 'GET') {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testTopicManagementAgent() {
    console.log('📋 Testing Topic Management Agent');
    console.log('=================================');

    const payload = {
        baseTopic: 'Travel to Japan',
        targetAudience: 'travel enthusiasts',
        contentType: 'educational',
        videoDuration: 300
    };

    try {
        const response = await makeAPICall('/topics', 'POST', payload);

        if (response.statusCode === 200 && response.body.success) {
            console.log('✅ Topic Management Agent: SUCCESS');
            console.log(`📁 Project ID: ${response.body.projectId}`);

            const context = response.body.topicContext;
            if (context && context.expandedTopics && context.expandedTopics.length > 0) {
                console.log(`🎯 Generated ${context.expandedTopics.length} expanded topics`);
                console.log(`📝 Sample topic: "${context.expandedTopics[0].subtopic}"`);

                if (context.seoContext && context.seoContext.primaryKeywords) {
                    console.log(`🔑 SEO keywords: ${context.seoContext.primaryKeywords.length}`);
                }

                return {
                    success: true,
                    projectId: response.body.projectId,
                    realContent: true,
                    details: `${context.expandedTopics.length} topics, ${context.seoContext && context.seoContext.primaryKeywords ? context.seoContext.primaryKeywords.length : 0} keywords`
                };
            } else {
                console.log('⚠️  Topic context missing or empty');
                return {
                    success: false,
                    error: 'Empty topic context'
                };
            }
        } else {
            console.log(`❌ Topic Management Agent failed: ${response.statusCode}`);
            console.log(`Error: ${JSON.stringify(response.body)}`);
            return {
                success: false,
                error: response.body
            };
        }
    } catch (error) {
        console.log(`❌ Topic Management Agent error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testScriptGeneratorAgent(projectId) {
    console.log('\n📝 Testing Script Generator Agent');
    console.log('=================================');

    const payload = {
        projectId: projectId,
        scriptOptions: {
            style: 'engaging_educational',
            targetAudience: 'travel enthusiasts'
        }
    };

    try {
        const response = await makeAPICall('/scripts/generate', 'POST', payload);

        if (response.statusCode === 200 && response.body.success) {
            console.log('✅ Script Generator Agent: SUCCESS');

            const sceneContext = response.body.sceneContext;
            if (sceneContext && sceneContext.scenes && sceneContext.scenes.length > 0) {
                console.log(`🎬 Generated ${sceneContext.scenes.length} scenes`);
                console.log(`⏱️  Total duration: ${sceneContext.totalDuration}s`);

                // Check for real script content
                let totalScriptLength = 0;
                let scenesWithContent = 0;

                sceneContext.scenes.forEach((scene, index) => {
                    if (scene.content && scene.content.script) {
                        totalScriptLength += scene.content.script.length;
                        if (scene.content.script.length > 50) {
                            scenesWithContent++;
                        }

                        if (index === 0) {
                            console.log(`📖 Sample script (Scene 1): "${scene.content.script.substring(0, 100)}..."`);
                        }
                    }
                });

                console.log(`📝 Total script content: ${totalScriptLength} characters`);
                console.log(`✅ Scenes with substantial content: ${scenesWithContent}/${sceneContext.scenes.length}`);

                return {
                    success: true,
                    realContent: scenesWithContent > 0,
                    details: `${sceneContext.scenes.length} scenes, ${totalScriptLength} chars, ${scenesWithContent} with content`
                };
            } else {
                console.log('⚠️  Scene context missing or empty');
                return {
                    success: false,
                    error: 'Empty scene context'
                };
            }
        } else {
            console.log(`❌ Script Generator Agent failed: ${response.statusCode}`);
            console.log(`Error: ${JSON.stringify(response.body)}`);
            return {
                success: false,
                error: response.body
            };
        }
    } catch (error) {
        console.log(`❌ Script Generator Agent error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testMediaCuratorAgent(projectId) {
    console.log('\n🎨 Testing Media Curator Agent');
    console.log('==============================');

    const payload = {
        projectId: projectId
    };

    try {
        const response = await makeAPICall('/media/curate', 'POST', payload);

        if (response.statusCode === 200 && response.body.success) {
            console.log('✅ Media Curator Agent: SUCCESS');

            const mediaContext = response.body.mediaContext;
            if (mediaContext && mediaContext.sceneMediaMapping) {
                console.log(`🖼️  Total assets: ${mediaContext.totalAssets}`);
                console.log(`📊 Industry compliance: ${response.body.industryCompliance}`);

                // Check for real media downloads
                let realMediaCount = 0;
                let totalMediaCount = 0;

                mediaContext.sceneMediaMapping.forEach(scene => {
                    if (scene.mediaSequence) {
                        scene.mediaSequence.forEach(asset => {
                            totalMediaCount++;
                            if (asset.realContent && asset.downloadedSize && asset.downloadedSize > 10000) {
                                realMediaCount++;
                            }
                        });
                    }
                });

                console.log(`📥 Real media downloads: ${realMediaCount}/${totalMediaCount}`);
                console.log(`🎯 Download success rate: ${Math.round((realMediaCount/totalMediaCount) * 100)}%`);

                return {
                    success: true,
                    realContent: realMediaCount > 0,
                    details: `${totalMediaCount} assets, ${realMediaCount} real downloads`
                };
            } else {
                console.log('⚠️  Media context missing or empty');
                return {
                    success: false,
                    error: 'Empty media context'
                };
            }
        } else {
            console.log(`❌ Media Curator Agent failed: ${response.statusCode}`);
            console.log(`Error: ${JSON.stringify(response.body)}`);
            return {
                success: false,
                error: response.body
            };
        }
    } catch (error) {
        console.log(`❌ Media Curator Agent error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testAudioGeneratorAgent(projectId) {
    console.log('\n🎵 Testing Audio Generator Agent');
    console.log('================================');

    const payload = {
        projectId: projectId
    };

    try {
        // Try different possible endpoints for audio generation
        const endpoints = ['/audio/generate', '/audio/create', '/narration/generate'];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying endpoint: ${endpoint}`);
                const response = await makeAPICall(endpoint, 'POST', payload);

                if (response.statusCode === 200 && response.body.success) {
                    console.log('✅ Audio Generator Agent: SUCCESS');

                    const audioContext = response.body.audioContext;
                    if (audioContext) {
                        console.log(`🎙️  Master audio: ${audioContext.masterAudio && audioContext.masterAudio.filename ? audioContext.masterAudio.filename : 'Unknown'}`);
                        console.log(`🔊 Audio segments: ${audioContext.audioSegments ? audioContext.audioSegments.length : 0}`);

                        return {
                            success: true,
                            realContent: true,
                            details: `Master audio + ${audioContext.audioSegments ? audioContext.audioSegments.length : 0} segments`
                        };
                    }
                } else if (response.statusCode !== 404) {
                    console.log(`⚠️  ${endpoint}: ${response.statusCode} - ${JSON.stringify(response.body)}`);
                }
            } catch (endpointError) {
                console.log(`⚠️  ${endpoint}: ${endpointError.message}`);
            }
        }

        console.log('❌ Audio Generator Agent: No working endpoint found');
        console.log('🔄 Audio generation may be orchestrator-managed or require different approach');

        return {
            success: false,
            error: 'No working audio endpoint found',
            note: 'May be orchestrator-managed'
        };

    } catch (error) {
        console.log(`❌ Audio Generator Agent error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testManifestBuilder(projectId) {
    console.log('\n📋 Testing Manifest Builder');
    console.log('===========================');

    const payload = {
        projectId: projectId,
        minVisuals: 3
    };

    try {
        const response = await makeAPICall('/manifest/build', 'POST', payload);

        if (response.statusCode === 200 && response.body.success) {
            console.log('✅ Manifest Builder: SUCCESS');
            console.log(`📊 Scenes detected: ${response.body.kpis.scenes_detected}`);
            console.log(`🖼️  Images total: ${response.body.kpis.images_total}`);
            console.log(`🎵 Audio segments: ${response.body.kpis.audio_segments}`);
            console.log(`🎯 Ready for rendering: ${response.body.readyForRendering}`);

            return {
                success: true,
                realContent: response.body.readyForRendering,
                details: `${response.body.kpis.scenes_detected} scenes, ${response.body.kpis.images_total} images`
            };
        } else if (response.statusCode === 422) {
            console.log('⚠️  Manifest Builder: Quality validation failed');
            console.log(`🚫 Issues: ${JSON.stringify(response.body.issues)}`);

            return {
                success: false,
                error: 'Quality validation failed',
                issues: response.body.issues
            };
        } else {
            console.log(`❌ Manifest Builder failed: ${response.statusCode}`);
            return {
                success: false,
                error: response.body
            };
        }
    } catch (error) {
        console.log(`❌ Manifest Builder error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testVideoAssembler(projectId) {
    console.log('\n🎬 Testing Video Assembler');
    console.log('==========================');

    const payload = {
        projectId: projectId,
        useManifest: true
    };

    try {
        const response = await makeAPICall('/video/assemble', 'POST', payload);

        if (response.statusCode === 200 && response.body.success) {
            console.log('✅ Video Assembler: SUCCESS');
            console.log(`🎥 Video file: ${response.body.videoFile}`);
            console.log(`📏 Resolution: ${response.body.resolution}`);
            console.log(`⏱️  Duration: ${response.body.duration}s`);
            console.log(`📊 File size: ${response.body.fileSize || 'Unknown'}`);

            return {
                success: true,
                realContent: true,
                details: `${response.body.videoFile}, ${response.body.resolution}, ${response.body.duration}s`
            };
        } else {
            console.log(`❌ Video Assembler failed: ${response.statusCode}`);
            console.log(`Error: ${response.body && response.body.error ? response.body.error : 'Unknown error'}`);

            return {
                success: false,
                error: response.body && response.body.error ? response.body.error : 'Unknown error'
            };
        }
    } catch (error) {
        console.log(`❌ Video Assembler error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function runIndividualAgentTests() {
    console.log('🧪 INDIVIDUAL AGENT TESTING');
    console.log('============================');
    console.log('Testing each agent individually for real output generation\n');

    const results = {
        agents: [],
        summary: {
            total: 0,
            successful: 0,
            withRealContent: 0
        }
    };

    let testProjectId = TEST_PROJECT_ID;

    // Test 1: Topic Management Agent
    const topicResult = await testTopicManagementAgent();
    results.agents.push({
        name: 'Topic Management',
        ...topicResult
    });
    results.summary.total++;
    if (topicResult.success) {
        results.summary.successful++;
        if (topicResult.projectId) {
            testProjectId = topicResult.projectId; // Use new project for subsequent tests
        }
    }
    if (topicResult.realContent) results.summary.withRealContent++;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Script Generator Agent
    const scriptResult = await testScriptGeneratorAgent(testProjectId);
    results.agents.push({
        name: 'Script Generator',
        ...scriptResult
    });
    results.summary.total++;
    if (scriptResult.success) results.summary.successful++;
    if (scriptResult.realContent) results.summary.withRealContent++;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Media Curator Agent
    const mediaResult = await testMediaCuratorAgent(testProjectId);
    results.agents.push({
        name: 'Media Curator',
        ...mediaResult
    });
    results.summary.total++;
    if (mediaResult.success) results.summary.successful++;
    if (mediaResult.realContent) results.summary.withRealContent++;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Audio Generator Agent
    const audioResult = await testAudioGeneratorAgent(testProjectId);
    results.agents.push({
        name: 'Audio Generator',
        ...audioResult
    });
    results.summary.total++;
    if (audioResult.success) results.summary.successful++;
    if (audioResult.realContent) results.summary.withRealContent++;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Manifest Builder
    const manifestResult = await testManifestBuilder(testProjectId);
    results.agents.push({
        name: 'Manifest Builder',
        ...manifestResult
    });
    results.summary.total++;
    if (manifestResult.success) results.summary.successful++;
    if (manifestResult.realContent) results.summary.withRealContent++;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Video Assembler
    const videoResult = await testVideoAssembler(testProjectId);
    results.agents.push({
        name: 'Video Assembler',
        ...videoResult
    });
    results.summary.total++;
    if (videoResult.success) results.summary.successful++;
    if (videoResult.realContent) results.summary.withRealContent++;

    // Final Summary
    console.log('\n📊 INDIVIDUAL AGENT TEST RESULTS');
    console.log('=================================');

    results.agents.forEach(agent => {
        const status = agent.success ? '✅' : '❌';
        const content = agent.realContent ? '🎯' : '⚠️';
        console.log(`${status} ${content} ${agent.name}: ${agent.success ? 'SUCCESS' : 'FAILED'}`);
        if (agent.details) {
            console.log(`   📋 Details: ${agent.details}`);
        }
        if (agent.error) {
            console.log(`   ❌ Error: ${agent.error}`);
        }
        if (agent.note) {
            console.log(`   📝 Note: ${agent.note}`);
        }
    });

    console.log('\n📈 SUMMARY STATISTICS:');
    console.log(`Total Agents Tested: ${results.summary.total}`);
    console.log(`Successful Responses: ${results.summary.successful}/${results.summary.total} (${Math.round((results.summary.successful/results.summary.total)*100)}%)`);
    console.log(`Agents with Real Content: ${results.summary.withRealContent}/${results.summary.total} (${Math.round((results.summary.withRealContent/results.summary.total)*100)}%)`);

    if (testProjectId !== TEST_PROJECT_ID) {
        console.log(`\n📁 New Project Created: ${testProjectId}`);
        console.log(`🌐 S3 Path: videos/${testProjectId}/`);
    }

    // Save results
    fs.writeFileSync('individual-agent-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Detailed results saved to individual-agent-test-results.json');

    return results;
}

// Run tests if called directly
if (require.main === module) {
    runIndividualAgentTests()
        .then(results => {
            const successRate = Math.round((results.summary.successful / results.summary.total) * 100);
            const realContentRate = Math.round((results.summary.withRealContent / results.summary.total) * 100);

            console.log(`\n🎯 FINAL ASSESSMENT:`);
            console.log(`Agent Success Rate: ${successRate}%`);
            console.log(`Real Content Rate: ${realContentRate}%`);

            if (successRate >= 80 && realContentRate >= 60) {
                console.log('🎉 EXCELLENT: Most agents are producing real content!');
                process.exit(0);
            } else if (successRate >= 60) {
                console.log('⚠️  GOOD: Agents are working but may need real content improvements');
                process.exit(0);
            } else {
                console.log('❌ NEEDS WORK: Multiple agents need attention');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    runIndividualAgentTests
};