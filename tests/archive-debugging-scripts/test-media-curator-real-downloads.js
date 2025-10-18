#!/usr/bin/env node

/**
 * 🎨 TEST MEDIA CURATOR REAL DOWNLOADS
 * 
 * This script tests the Media Curator AI to ensure it downloads real images
 * from Pexels and Pixabay APIs using the stored API keys.
 */

const https = require('https');

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
                'User-Agent': 'Media-Curator-Test/1.0'
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

async function testMediaCuratorRealDownloads() {
    console.log('🎨 TESTING MEDIA CURATOR REAL DOWNLOADS');
    console.log('=======================================');
    console.log('Testing real image downloads from Pexels and Pixabay APIs\n');

    try {
        // Test with our existing Travel to Spain project
        const testProjectId = '2025-10-15_01-58-13_travel-to-spain';

        console.log(`🔍 Testing Media Curator with project: ${testProjectId}`);

        const mediaPayload = {
            projectId: testProjectId
        };

        console.log('📡 Calling Media Curator API...');
        const startTime = Date.now();

        const mediaResponse = await makeAPICall('/media/curate', 'POST', mediaPayload);

        const executionTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏱️  Execution time: ${executionTime}s`);

        if (mediaResponse.statusCode === 200 && mediaResponse.body.success) {
            console.log('✅ Media Curator API call successful');

            const mediaContext = mediaResponse.body.mediaContext;
            console.log(`📊 Total assets: ${mediaContext.totalAssets}`);
            console.log(`📊 Scenes covered: ${mediaContext.scenesCovered}`);
            console.log(`📊 Industry compliance: ${mediaResponse.body.industryCompliance}`);

            // Analyze real vs placeholder content
            let realDownloads = 0;
            let placeholderFiles = 0;
            let totalAssets = 0;

            if (mediaContext.sceneMediaMapping) {
                mediaContext.sceneMediaMapping.forEach(scene => {
                    console.log(`\n🎬 Scene ${scene.sceneNumber} Analysis:`);

                    if (scene.mediaSequence) {
                        scene.mediaSequence.forEach((asset, index) => {
                            totalAssets++;
                            console.log(`   📸 Asset ${index + 1}:`);
                            console.log(`      Source: ${asset.source || 'Unknown'}`);
                            console.log(`      Real Content: ${asset.realContent ? 'Yes' : 'No'}`);
                            console.log(`      Downloaded Size: ${asset.downloadedSize || 'Unknown'} bytes`);
                            console.log(`      S3 Key: ${asset.s3Key || 'Not set'}`);

                            if (asset.realContent && asset.downloadedSize && asset.downloadedSize > 10000) {
                                realDownloads++;
                                console.log(`      ✅ REAL DOWNLOAD (${asset.downloadedSize} bytes)`);
                            } else {
                                placeholderFiles++;
                                console.log(`      ❌ PLACEHOLDER (${asset.downloadedSize || 0} bytes)`);
                            }
                        });
                    }
                });
            }

            console.log('\n📊 DOWNLOAD ANALYSIS SUMMARY:');
            console.log('============================');
            console.log(`Total Assets: ${totalAssets}`);
            console.log(`Real Downloads: ${realDownloads}`);
            console.log(`Placeholder Files: ${placeholderFiles}`);
            console.log(`Success Rate: ${Math.round((realDownloads / totalAssets) * 100)}%`);

            if (realDownloads > 0) {
                console.log('\n🎉 SUCCESS: Media Curator is downloading real images!');
                console.log('✅ API keys from Secrets Manager are working');
                console.log('✅ Pexels/Pixabay integration is functional');
            } else {
                console.log('\n⚠️  ISSUE: No real downloads detected');
                console.log('🔧 Possible causes:');
                console.log('   - API key retrieval from Secrets Manager failing');
                console.log('   - Pexels/Pixabay API connectivity issues');
                console.log('   - Image download function not working');
                console.log('   - S3 upload failures');
            }

            // Check for error details
            if (mediaContext.qualityMetrics) {
                console.log('\n📈 Quality Metrics:');
                console.log(`Average Relevance Score: ${mediaContext.qualityMetrics.averageRelevanceScore || 'N/A'}`);
                console.log(`Average Quality Score: ${mediaContext.qualityMetrics.averageQualityScore || 'N/A'}`);
            }

            return {
                success: true,
                totalAssets,
                realDownloads,
                placeholderFiles,
                successRate: Math.round((realDownloads / totalAssets) * 100),
                executionTime
            };

        } else {
            console.log(`❌ Media Curator API call failed: ${mediaResponse.statusCode}`);
            console.log(`Error: ${JSON.stringify(mediaResponse.body)}`);

            return {
                success: false,
                error: mediaResponse.body,
                statusCode: mediaResponse.statusCode
            };
        }

    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test if called directly
if (require.main === module) {
    testMediaCuratorRealDownloads()
        .then(results => {
            console.log('\n📋 TEST RESULTS:');
            console.log('================');

            if (results.success && results.realDownloads > 0) {
                console.log('🎉 MEDIA CURATOR IS WORKING: Real images are being downloaded!');
                console.log(`📊 Success Rate: ${results.successRate}%`);
                console.log(`⏱️  Execution Time: ${results.executionTime}s`);
            } else if (results.success && results.realDownloads === 0) {
                console.log('⚠️  MEDIA CURATOR NEEDS FIXING: Only placeholder images created');
                console.log('🔧 Next steps: Debug API key retrieval and image download functions');
            } else {
                console.log('❌ MEDIA CURATOR API FAILED: Cannot test image downloads');
                console.log(`Error: ${results.error}`);
            }

            process.exit(results.success && results.realDownloads > 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    testMediaCuratorRealDownloads
};