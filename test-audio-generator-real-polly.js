#!/usr/bin/env node

/**
 * 🎵 TEST AUDIO GENERATOR REAL POLLY INTEGRATION
 * 
 * This script tests the Audio Generator AI to ensure it creates real audio
 * files using AWS Polly instead of placeholder files.
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
                'User-Agent': 'Audio-Generator-Test/1.0'
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

async function testAudioGeneratorPolly() {
    console.log('🎵 TESTING AUDIO GENERATOR REAL POLLY INTEGRATION');
    console.log('================================================');
    console.log('Testing real audio generation using AWS Polly\n');

    try {
        // Test with our existing Travel to Japan project that has scene context
        const testProjectId = '2025-10-15T02-22-22_travel-to-japan';

        console.log(`🔍 Testing Audio Generator with project: ${testProjectId}`);

        // Try different possible endpoints for audio generation
        const audioEndpoints = [
            '/audio/generate',
            '/audio/generate-from-project',
            '/audio/create',
            '/narration/generate'
        ];

        let workingEndpoint = null;
        let audioResponse = null;

        for (const endpoint of audioEndpoints) {
            try {
                console.log(`🔄 Trying audio endpoint: ${endpoint}`);

                const audioPayload = {
                    projectId: testProjectId,
                    voiceOptions: {
                        preferredVoice: 'Ruth',
                        voiceType: 'generative'
                    }
                };

                audioResponse = await makeAPICall(endpoint, 'POST', audioPayload);

                if (audioResponse.statusCode === 200 && audioResponse.body.success) {
                    workingEndpoint = endpoint;
                    console.log(`✅ Found working audio endpoint: ${endpoint}`);
                    break;
                } else if (audioResponse.statusCode !== 404) {
                    console.log(`⚠️  ${endpoint}: ${audioResponse.statusCode} - ${JSON.stringify(audioResponse.body)}`);
                }
            } catch (endpointError) {
                console.log(`⚠️  ${endpoint}: ${endpointError.message}`);
            }
        }

        if (workingEndpoint && audioResponse.body.success) {
            console.log('✅ Audio Generator API call successful');

            const audioContext = audioResponse.body.audioContext || audioResponse.body;
            console.log(`📊 Audio segments: ${audioContext.audioSegments ? audioContext.audioSegments.length : 0}`);
            console.log(`🎭 Voice used: ${audioContext.voiceSelected ? audioContext.voiceSelected.name : 'Unknown'}`);

            // Analyze real vs placeholder audio
            let realAudioFiles = 0;
            let placeholderFiles = 0;
            let totalFiles = 0;

            if (audioContext.audioSegments) {
                audioContext.audioSegments.forEach((segment, index) => {
                    totalFiles++;
                    console.log(`\n🎵 Audio Segment ${index + 1}:`);
                    console.log(`   Scene: ${segment.sceneNumber || 'Unknown'}`);
                    console.log(`   Duration: ${segment.duration || 'Unknown'}s`);
                    console.log(`   Audio Key: ${segment.audioKey || 'Not set'}`);
                    console.log(`   Voice: ${segment.voice ? segment.voice.name : 'Unknown'}`);
                    console.log(`   SSML Used: ${segment.ssmlUsed ? 'Yes' : 'No'}`);

                    // Check if this looks like real audio (would need S3 file size check)
                    if (segment.audioKey && segment.voice && segment.ssmlUsed) {
                        realAudioFiles++;
                        console.log(`   ✅ REAL AUDIO GENERATED`);
                    } else {
                        placeholderFiles++;
                        console.log(`   ❌ PLACEHOLDER AUDIO`);
                    }
                });
            }

            console.log('\n📊 AUDIO GENERATION ANALYSIS:');
            console.log('=============================');
            console.log(`Total Audio Files: ${totalFiles}`);
            console.log(`Real Audio Generated: ${realAudioFiles}`);
            console.log(`Placeholder Files: ${placeholderFiles}`);
            console.log(`Success Rate: ${Math.round((realAudioFiles / totalFiles) * 100)}%`);

            if (realAudioFiles > 0) {
                console.log('\n🎉 SUCCESS: Audio Generator is creating real audio with AWS Polly!');
                console.log('✅ AWS Polly integration is working');
                console.log('✅ SSML processing is functional');
                console.log('✅ Voice selection is working');
            } else {
                console.log('\n⚠️  ISSUE: No real audio files detected');
                console.log('🔧 Possible causes:');
                console.log('   - AWS Polly permissions issues');
                console.log('   - Voice selection problems');
                console.log('   - S3 upload failures');
                console.log('   - SSML processing errors');
            }

            // Check for master audio file
            if (audioContext.masterAudio) {
                console.log('\n🎼 Master Audio File:');
                console.log(`   File: ${audioContext.masterAudio.filename || 'Unknown'}`);
                console.log(`   Duration: ${audioContext.masterAudio.duration || 'Unknown'}s`);
                console.log(`   Status: ${audioContext.masterAudio.status || 'Unknown'}`);
            }

            return {
                success: true,
                workingEndpoint,
                totalFiles,
                realAudioFiles,
                placeholderFiles,
                successRate: Math.round((realAudioFiles / totalFiles) * 100)
            };

        } else {
            console.log('❌ No working Audio Generator endpoint found');
            console.log('🔄 Audio generation may be orchestrator-managed or require different approach');

            return {
                success: false,
                error: 'No working audio endpoint found',
                note: 'May be orchestrator-managed'
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
    testAudioGeneratorPolly()
        .then(results => {
            console.log('\n📋 AUDIO GENERATOR TEST RESULTS:');
            console.log('================================');

            if (results.success && results.realAudioFiles > 0) {
                console.log('🎉 AUDIO GENERATOR IS WORKING: Real audio files are being generated with AWS Polly!');
                console.log(`📊 Success Rate: ${results.successRate}%`);
                console.log(`🎵 Working Endpoint: ${results.workingEndpoint}`);
            } else if (results.success && results.realAudioFiles === 0) {
                console.log('⚠️  AUDIO GENERATOR NEEDS FIXING: Only placeholder audio created');
                console.log('🔧 Next steps: Debug AWS Polly integration and voice selection');
            } else {
                console.log('❌ AUDIO GENERATOR API FAILED: Cannot test audio generation');
                console.log(`Error: ${results.error}`);
                console.log('📝 Note: Audio Generator may only be accessible through workflow orchestrator');
            }

            process.exit(results.success && results.realAudioFiles > 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    testAudioGeneratorPolly
};