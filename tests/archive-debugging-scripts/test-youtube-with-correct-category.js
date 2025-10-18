/**
 * Test YouTube Publisher with correct category
 */

const https = require('https');

async function testYouTubeWithCorrectCategory() {
    console.log('🎬 Testing YouTube Publisher with correct category');

    const projectId = '2025-10-15_01-58-13_travel-to-spain';

    const postData = JSON.stringify({
        projectId: projectId,
        mode: 'auto',
        enableUpload: true,
        privacy: 'unlisted',
        metadata: {
            title: 'Travel to Spain - AI Generated Video Test',
            category: '19' // Travel & Events category
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
                console.log('Mode:', response.mode);
                console.log('Success:', response.success);

                if (response.youtubeUrl && !response.youtubeUrl.includes('placeholder')) {
                    console.log('\n🎉 REAL YOUTUBE VIDEO CREATED!');
                    console.log(`🔗 YouTube URL: ${response.youtubeUrl}`);
                    console.log(`🆔 Video ID: ${response.youtubeVideoId}`);
                } else if (response.mode === 'metadata-only') {
                    console.log('\n📝 Metadata-only mode');
                    console.log('Auth Status:', response.metadata && response.metadata.authenticationStatus && response.metadata.authenticationStatus.authenticated);
                    console.log('Error:', response.metadata && response.metadata.authenticationStatus && response.metadata.authenticationStatus.error);
                } else {
                    console.log('\nResponse:', JSON.stringify(response, null, 2));
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

testYouTubeWithCorrectCategory();