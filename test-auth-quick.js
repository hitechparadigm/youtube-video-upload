/**
 * YouTube Authentication Test
 * Tests OAuth 2.0 authentication with YouTube API
 */

const https = require('https');

async function testYouTubeAuthentication() {
    console.log('🔐 TESTING YOUTUBE AUTHENTICATION');
    console.log('=================================');

    const postData = JSON.stringify({
        action: 'auth-check'
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

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);

                    console.log('📊 Authentication Results:');
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${response.success}`);

                    if (response.authStatus) {
                        const auth = response.authStatus;
                        console.log(`   Authenticated: ${auth.authenticated ? '✅ YES' : '❌ NO'}`);

                        if (auth.authenticated && auth.channelInfo) {
                            console.log(`   Channel: ${auth.channelInfo.channelTitle}`);
                            console.log(`   Channel ID: ${auth.channelInfo.channelId}`);
                        }

                        if (auth.credentials) {
                            console.log(`   Has Client ID: ${auth.credentials.hasClientId ? '✅' : '❌'}`);
                            console.log(`   Has Client Secret: ${auth.credentials.hasClientSecret ? '✅' : '❌'}`);
                            console.log(`   Has Refresh Token: ${auth.credentials.hasRefreshToken ? '✅' : '❌'}`);
                            console.log(`   Has Access Token: ${auth.credentials.hasAccessToken ? '✅' : '❌'}`);
                        }

                        if (!auth.authenticated && auth.error) {
                            console.log(`   Error: ${auth.error}`);
                        }
                    }

                    resolve({
                        success: response.success,
                        authenticated: response.authStatus ? .authenticated || false,
                        channelTitle: response.authStatus ? .channelInfo ? .channelTitle,
                        error: response.authStatus ? .error
                    });

                } catch (e) {
                    console.log('❌ Failed to parse response:', data);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Run test if called directly
if (require.main === module) {
    testYouTubeAuthentication()
        .then(result => {
            console.log('\n✅ YouTube authentication test completed');
            if (result.authenticated) {
                console.log(`🎬 Ready for YouTube uploads to: ${result.channelTitle}`);
            } else {
                console.log('⚠️ YouTube authentication not working - will use metadata-only mode');
            }
        })
        .catch(error => {
            console.error('\n❌ YouTube authentication test failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    testYouTubeAuthentication
};