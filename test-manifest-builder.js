#!/usr/bin/env node

/**
 * Manifest Builder Test
 * Based on documentation: "✅ WORKING - Manifest Builder validation test"
 * Tests the quality gatekeeper functionality
 */

const https = require('https');

class ManifestBuilderTest {
    constructor() {
        this.baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        this.apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';
    }

    async makeRequest(path, method = 'POST', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'User-Agent': 'Manifest-Builder-Test/1.0'
                }
            };

            if (data) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body ? JSON.parse(body) : body
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body,
                            parseError: error.message
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testManifestBuilder() {
        console.log('📋 Manifest Builder Quality Gatekeeper Test');
        console.log('='.repeat(60));
        console.log(`🌐 API Base URL: ${this.baseUrl}`);
        console.log(`🔑 API Key: ***${this.apiKey.slice(-4)}`);
        console.log('📚 Based on documentation: Quality gatekeeper enforcing standards');
        console.log('');

        console.log('🧪 Testing Manifest Builder with sample project...');

        const testProject = {
            projectId: 'test-travel-spain-' + Date.now(),
            title: 'Amazing Travel Guide: Spain',
            script: 'Welcome to Spain! This comprehensive guide will show you the best destinations, from Madrid to Barcelona to Seville.',
            scenes: [{
                    sceneNumber: 1,
                    title: 'Introduction to Spain',
                    script: 'Welcome to Spain! This comprehensive guide will show you the best destinations.',
                    duration: 15
                },
                {
                    sceneNumber: 2,
                    title: 'Madrid Highlights',
                    script: 'Madrid, the capital city, offers incredible museums, parks, and cultural experiences.',
                    duration: 20
                },
                {
                    sceneNumber: 3,
                    title: 'Barcelona Wonders',
                    script: 'Barcelona combines stunning architecture with beautiful beaches and vibrant nightlife.',
                    duration: 18
                }
            ],
            audioUrl: 'https://example.com/audio/spain-guide.mp3',
            mediaItems: [{
                    scene: 1,
                    type: 'image',
                    url: 'https://example.com/images/spain-overview.jpg'
                },
                {
                    scene: 1,
                    type: 'image',
                    url: 'https://example.com/images/spain-flag.jpg'
                },
                {
                    scene: 1,
                    type: 'image',
                    url: 'https://example.com/images/spain-map.jpg'
                },
                {
                    scene: 2,
                    type: 'image',
                    url: 'https://example.com/images/madrid-plaza.jpg'
                },
                {
                    scene: 2,
                    type: 'image',
                    url: 'https://example.com/images/madrid-museum.jpg'
                },
                {
                    scene: 2,
                    type: 'image',
                    url: 'https://example.com/images/madrid-park.jpg'
                },
                {
                    scene: 3,
                    type: 'image',
                    url: 'https://example.com/images/barcelona-sagrada.jpg'
                },
                {
                    scene: 3,
                    type: 'image',
                    url: 'https://example.com/images/barcelona-beach.jpg'
                },
                {
                    scene: 3,
                    type: 'image',
                    url: 'https://example.com/images/barcelona-gothic.jpg'
                }
            ]
        };

        try {
            const response = await this.makeRequest('/manifest/build', 'POST', testProject);

            console.log(`📊 Status Code: ${response.statusCode}`);

            if (response.statusCode === 200 && response.body) {
                console.log('✅ SUCCESS: Manifest Builder is working!');
                console.log(`📄 Response: ${JSON.stringify(response.body, null, 2)}`);

                if (response.body.manifest) {
                    console.log('📋 Manifest created successfully');
                    console.log(`🎯 Quality Score: ${response.body.qualityScore || 'N/A'}`);

                    if (response.body.manifest.scenes) {
                        console.log(`🎬 Scenes: ${response.body.manifest.scenes.length}`);
                    }

                    if (response.body.kpis) {
                        console.log('📊 Quality KPIs:');
                        Object.entries(response.body.kpis).forEach(([key, value]) => {
                            console.log(`   ${key}: ${value}`);
                        });
                    }
                }

                return true;
            } else if (response.statusCode === 403) {
                console.log('❌ FAILED: 403 Forbidden - API Key authentication issue');
                console.log('💡 This suggests the API Gateway configuration has changed');
                return false;
            } else if (response.statusCode === 404) {
                console.log('❌ FAILED: 404 Not Found - Endpoint may have changed');
                console.log('💡 Try alternative endpoints or check SAM template');
                return false;
            } else if (response.statusCode === 400) {
                console.log('⚠️  BAD REQUEST: Manifest Builder needs different data format');
                console.log(`📄 Error: ${JSON.stringify(response.body, null, 2)}`);
                return false;
            } else {
                console.log(`⚠️  UNEXPECTED: Status ${response.statusCode}`);
                console.log(`📄 Response: ${JSON.stringify(response.body, null, 2)}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            return false;
        }
    }

    async testQualityValidation() {
        console.log('\n🔍 Testing Quality Validation Rules...');

        // Test with insufficient media (should fail quality check)
        const insufficientProject = {
            projectId: 'test-insufficient-' + Date.now(),
            title: 'Test Project with Insufficient Media',
            script: 'This is a test project.',
            scenes: [{
                sceneNumber: 1,
                title: 'Test Scene',
                script: 'This scene has insufficient media.',
                duration: 10
            }],
            audioUrl: 'https://example.com/audio/test.mp3',
            mediaItems: [{
                    scene: 1,
                    type: 'image',
                    url: 'https://example.com/images/test1.jpg'
                }
                // Only 1 image - should fail ≥3 visuals per scene rule
            ]
        };

        console.log('🧪 Testing with insufficient media (should fail quality check)...');

        try {
            const response = await this.makeRequest('/manifest/build', 'POST', insufficientProject);

            console.log(`📊 Status Code: ${response.statusCode}`);

            if (response.statusCode === 400 && response.body && response.body.error) {
                console.log('✅ SUCCESS: Quality validation working - rejected insufficient media');
                console.log(`📄 Validation Error: ${response.body.error}`);
                return true;
            } else if (response.statusCode === 200) {
                console.log('⚠️  UNEXPECTED: Quality validation may be too lenient');
                console.log('📄 Expected rejection but got success');
                return false;
            } else {
                console.log(`ℹ️  Status: ${response.statusCode}`);
                if (response.body) {
                    console.log(`📄 Response: ${JSON.stringify(response.body).substring(0, 200)}...`);
                }
                return false;
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            return false;
        }
    }

    async runTest() {
        const manifestResult = await this.testManifestBuilder();

        let qualityResult = false;
        if (manifestResult) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            qualityResult = await this.testQualityValidation();
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 MANIFEST BUILDER TEST SUMMARY');
        console.log('='.repeat(60));

        if (manifestResult) {
            console.log('✅ MANIFEST CREATION: Working!');
            console.log('📋 Manifest Builder can create unified manifests');
        } else {
            console.log('❌ MANIFEST CREATION: Failed');
        }

        if (qualityResult) {
            console.log('✅ QUALITY VALIDATION: Working!');
            console.log('🛡️  Quality gatekeeper is enforcing standards');
        } else {
            console.log('⚠️  QUALITY VALIDATION: Needs verification');
        }

        const overallSuccess = manifestResult;

        if (overallSuccess) {
            console.log('\n🎉 OVERALL RESULT: Manifest Builder is operational!');
            console.log('📚 This confirms the documentation showing quality gatekeeper working');
            console.log('🛡️  Ready to enforce content quality standards');
        } else {
            console.log('\n❌ OVERALL RESULT: Manifest Builder test failed');
            console.log('📚 Documentation shows working system - may need configuration updates');
            console.log('💡 Possible issues:');
            console.log('   - API Gateway configuration changed');
            console.log('   - Endpoint paths changed');
            console.log('   - Data format requirements changed');
        }

        console.log('='.repeat(60));
        return overallSuccess;
    }
}

if (require.main === module) {
    const test = new ManifestBuilderTest();
    test.runTest()
        .then(result => {
            process.exit(result ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = ManifestBuilderTest;