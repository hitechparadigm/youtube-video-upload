/**
 * Test with existing Travel to Spain project
 */

const https = require('https');

async function testExistingProject() {
    console.log('🎬 Testing with existing Travel to Spain project');

    // Use the existing project we know works
    const projectId = '2025-10-15_01-58-13_travel-to-spain';

    console.log('📺 Testing YouTube Publisher with existing project...');

    const postData = JSON.stringify({
        projectId: projectId,
        mode: 'auto',
        enableUpload: true,
        privacy: 'unlisted',
        metadata: {
            title: 'Travel to Spain - AI Generated Video Test',
            category: 'Travel & Events'
        }
    });

    const options = {
        hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
        port: 443,
        path: '/prod/youtube/publish',
        method: 'POST',
        headers: {
            'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            try {
                const response = JSON.parse(data);
                console.log('YouTube Result:', JSON.stringify(response, null, 2));

                if (response.youtubeUrl) {
                    console.log('\n🎉 SUCCESS! Video ready:');
                    console.log(`🔗 YouTube URL: ${response.youtubeUrl}`);
                } else if (response.mode === 'metadata-only') {
                    console.log('\n📝 Metadata-only mode - manual upload required');
                }
            } catch (e) {
                console.log('Raw response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error);
    });

    req.write(postData);
    req.end();
}

testExistingProject();