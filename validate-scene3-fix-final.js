#!/usr/bin/env node

/**
 * 🎯 FINAL VALIDATION: SCENE 3 FIX
 *
 * Definitive test to confirm Scene 3+ get real media
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function validateScene3Fix() {
    console.log('🎯 FINAL VALIDATION: Scene 3 Rate Limiting Fix\n');

    // Test multiple projects to ensure consistency
    const testCases = [{
        topic: 'Travel to Japan',
        scenes: 4
    },
    {
        topic: 'Travel to Italy',
        scenes: 5
    },
    {
        topic: 'Travel to Germany',
        scenes: 3
    }
    ];

    let totalTests = 0;
    let successfulTests = 0;
    let scene3Successes = 0;

    for (const testCase of testCases) {
        totalTests++;
        console.log(`📋 Test ${totalTests}: ${testCase.topic} (${testCase.scenes} scenes)`);

        try {
            // Create topic
            const topicResult = await callAPI('/topics', 'POST', {
                topic: testCase.topic,
                category: 'travel'
            });

            if (!topicResult.success) {
                console.log(`❌ Topic creation failed`);
                continue;
            }

            const projectId = topicResult.data.projectId;
            console.log(`   Project: ${projectId}`);

            // Wait and generate script
            await new Promise(resolve => setTimeout(resolve, 8000));
            const scriptResult = await callAPI('/scripts/generate', 'POST', {
                projectId: projectId,
                topic: testCase.topic,
                duration: 240
            });

            if (!scriptResult.success) {
                console.log(`❌ Script generation failed`);
                continue;
            }

            // Wait and test media curation
            await new Promise(resolve => setTimeout(resolve, 12000));
            const mediaResult = await callAPI('/media/curate', 'POST', {
                projectId: projectId,
                baseTopic: testCase.topic,
                sceneCount: testCase.scenes
            });

            if (!mediaResult.success) {
                console.log(`❌ Media curation failed`);
                continue;
            }

            // Analyze results
            let scene3HasReal = false;
            let totalReal = 0;
            let totalPlaceholder = 0;

            if (mediaResult.data && mediaResult.data.sceneMediaMapping) {
                mediaResult.data.sceneMediaMapping.forEach(scene => {
                    let sceneReal = 0;
                    let scenePlaceholder = 0;

                    scene.images.forEach(image => {
                        if (image.size > 100 && image.source !== 'fallback') {
                            sceneReal++;
                            totalReal++;
                        } else {
                            scenePlaceholder++;
                            totalPlaceholder++;
                        }
                    });

                    console.log(`   Scene ${scene.sceneNumber}: ${sceneReal} real, ${scenePlaceholder} placeholder`);

                    if (scene.sceneNumber === 3 && sceneReal > 0) {
                        scene3HasReal = true;
                    }
                });
            }

            const testSuccess = totalReal > totalPlaceholder;
            if (testSuccess) {
                successfulTests++;
                console.log(`   ✅ SUCCESS: ${totalReal} real, ${totalPlaceholder} placeholder`);
            } else {
                console.log(`   ❌ FAILED: ${totalReal} real, ${totalPlaceholder} placeholder`);
            }

            if (scene3HasReal) {
                scene3Successes++;
                console.log(`   🎯 Scene 3: ✅ HAS REAL MEDIA`);
            } else {
                console.log(`   🎯 Scene 3: ❌ NO REAL MEDIA`);
            }

        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
        }

        console.log(''); // Empty line between tests

        // Small delay between tests
        if (totalTests < testCases.length) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    // Final results
    console.log('🎯 FINAL VALIDATION RESULTS:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful Tests: ${successfulTests}`);
    console.log(`   Scene 3 Successes: ${scene3Successes}`);
    console.log(`   Overall Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Scene 3 Success Rate: ${((scene3Successes / totalTests) * 100).toFixed(1)}%`);

    const overallSuccess = successfulTests >= (totalTests * 0.8); // 80% success rate
    const scene3Success = scene3Successes >= (totalTests * 0.8); // 80% Scene 3 success

    if (overallSuccess && scene3Success) {
        console.log('\n🎉 SCENE 3 RATE LIMITING FIX: VALIDATED!');
        console.log('✅ MultiSceneProcessor is working correctly');
        console.log('✅ Scene 3+ consistently receive real media');
        console.log('✅ Rate limiting issue is resolved');
    } else if (overallSuccess) {
        console.log('\n⚠️ PARTIAL SUCCESS: Overall pipeline working but Scene 3 needs attention');
    } else {
        console.log('\n❌ VALIDATION FAILED: Pipeline needs debugging');
    }

    return overallSuccess && scene3Success;
}

async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
        const fullUrl = baseUrl + (endpoint.startsWith('/') ? endpoint.substring(1) : endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        data: {
                            raw: responseData
                        },
                        error: 'JSON parse error'
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                statusCode: 0,
                error: error.message
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

validateScene3Fix();
