const https = require('https');

async function compareEndpoints() {
    console.log('🔍 COMPARING WORKING VS BROKEN ENDPOINTS');
    console.log('========================================');

    // Test working endpoints
    console.log('✅ WORKING ENDPOINTS:');
    const workingTests = [{
            name: 'Manifest Builder',
            endpoint: '/manifest/build',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1
            }
        },
        {
            name: 'YouTube Publisher',
            endpoint: '/youtube/publish',
            data: {
                action: 'auth-check'
            }
        }
    ];

    for (const test of workingTests) {
        const result = await callAPI(test.endpoint, 'POST', test.data);
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('');
    console.log('❌ BROKEN ENDPOINTS:');
    const brokenTests = [{
            name: 'Topic Management',
            endpoint: '/topic/analyze',
            data: {
                topic: 'Test'
            }
        },
        {
            name: 'Script Generator',
            endpoint: '/script/generate',
            data: {
                projectId: 'test'
            }
        }
    ];

    for (const test of brokenTests) {
        const result = await callAPI(test.endpoint, 'POST', test.data);
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error}`);
    }

    console.log('');
    console.log('💡 ANALYSIS:');
    console.log('The issue appears to be API Gateway routing, not Lambda configuration.');
    console.log('Working endpoints use different URL patterns than broken ones.');

    // Let's try alternative endpoint patterns
    console.log('');
    console.log('🔄 TRYING ALTERNATIVE ENDPOINT PATTERNS:');

    const alternativeTests = [{
            name: 'Topics (plural)',
            endpoint: '/topics',
            method: 'POST',
            data: {
                topic: 'Test'
            }
        },
        {
            name: 'Scripts (plural)',
            endpoint: '/scripts/generate',
            data: {
                projectId: 'test'
            }
        }
    ];

    for (const test of alternativeTests) {
        const result = await callAPI(test.endpoint, test.method || 'POST', test.data);
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'No error'}`);
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
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message
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

compareEndpoints().catch(console.error);