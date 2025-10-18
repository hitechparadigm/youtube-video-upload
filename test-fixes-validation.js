const https = require('https');

async function testFixes() {
    console.log('🧪 TESTING APPLIED FIXES...');
    console.log('===========================');

    const tests = [{
            name: 'Topic Management',
            endpoint: '/topic/analyze',
            data: {
                topic: 'Travel to Argentina',
                targetAudience: 'travel enthusiasts',
                videoDuration: 180
            }
        },
        {
            name: 'Script Generator',
            endpoint: '/script/generate',
            data: {
                projectId: 'test-post-fix-' + Date.now(),
                targetDuration: 180
            }
        },
        {
            name: 'Audio Generator',
            endpoint: '/audio/generate',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        }
    ];

    let fixedCount = 0;

    for (const test of tests) {
        console.log(`Testing ${test.name}...`);
        const result = await callAPI(test.endpoint, 'POST', test.data);
        const status = result.success ? '✅ FIXED' : '❌ Still broken';
        console.log(`  ${status}`);

        if (result.success) {
            fixedCount++;
            if (test.name === 'Topic Management' && result.response && result.response.projectId) {
                console.log(`    Project ID: ${result.response.projectId}`);
            }
            if (test.name === 'Script Generator' && result.response && result.response.scenes) {
                console.log(`    Scenes: ${result.response.scenes.length || result.response.totalScenes}`);
            }
        } else if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
        console.log('');
    }

    console.log('📊 RESULTS SUMMARY');
    console.log('==================');
    if (fixedCount === 3) {
        console.log('🎉 ALL CRITICAL FIXES SUCCESSFUL!');
        console.log('🚀 Ready to create Argentina video!');
        console.log('');
        console.log('Next step: node create-argentina-video-fixed.js');
    } else if (fixedCount > 0) {
        console.log(`⚠️ Partial success: ${fixedCount}/3 components fixed`);
        console.log('💡 Some components may need more time to propagate');
    } else {
        console.log('❌ Fixes may need more time or additional debugging');
    }
}

async function callAPI(endpoint, method, data) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: `/prod${endpoint}`,
            method: method,
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error'
                    });
                }
            });
        });

        req.on('error', (error) => resolve({
            success: false,
            error: error.message
        }));
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'timeout'
            });
        });
        req.write(postData);
        req.end();
    });
}

testFixes().catch(console.error);