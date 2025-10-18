const https = require('https');

async function testAsyncMediaCurator() {
    console.log('🧪 Testing Async Media Curator endpoint...');

    const testData = {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        operation: 'media-curation',
        async: true
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/async/media/curate',
            method: 'POST',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        };

        console.log('📤 Testing async media curation endpoint...');

        const req = https.request(options, (res) => {
            let responseData = '';
            console.log('📋 Response Status:', res.statusCode);

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Async Media Curator Response:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (e) {
                    console.log('❌ Failed to parse response:', responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error('❌ Request timeout');
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

// Also test the general async processor endpoint
async function testAsyncProcessor() {
    console.log('\n🧪 Testing general async processor endpoint...');

    const testData = {
        operation: 'media-curation',
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        parameters: {
            searchKeywords: ['Peru', 'travel', 'Machu Picchu']
        }
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/async/process',
            method: 'POST',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            console.log('📋 Response Status:', res.statusCode);

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Async Processor Response:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (e) {
                    console.log('❌ Failed to parse response:', responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    await testAsyncMediaCurator();
    await testAsyncProcessor();
}

runTests();