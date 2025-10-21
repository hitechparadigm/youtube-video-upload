#!/usr/bin/env node

/**
 * 🔍 Debug FFmpeg Layer Contents
 *
 * Tests the Video Assembler to see what's happening with FFmpeg detection
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function debugFFmpegLayer() {
    console.log('🔍 Debug FFmpeg Layer Contents');
    console.log('='.repeat(40));

    try {
        // Create a test project to trigger Video Assembler with detailed logging
        console.log('🎬 Testing Video Assembler with debug info...');

        const debugResult = await callAPI('/video/assemble', 'POST', {
            projectId: 'debug-ffmpeg-' + Date.now(),
            scenes: [{
                sceneNumber: 1,
                title: "Debug Test",
                duration: 30,
                startTime: 0
            }],
            debug: true // Request debug information
        }, 60000);

        if (debugResult.success) {
            console.log('✅ Video Assembler responded');

            const result = debugResult.data;

            console.log('\n🔍 FFmpeg Detection Details:');
            if (result.ffmpegStatus) {
                console.log(`   Available: ${result.ffmpegStatus.available}`);
                console.log(`   Processing Mode: ${result.ffmpegStatus.processingMode}`);
                console.log(`   Detection Time: ${result.ffmpegStatus.detectionTime}ms`);

                if (result.ffmpegStatus.ffmpeg) {
                    console.log(`   FFmpeg Path: ${result.ffmpegStatus.ffmpeg.path}`);
                    console.log(`   FFmpeg Exists: ${result.ffmpegStatus.ffmpeg.exists || 'unknown'}`);
                    console.log(`   FFmpeg Size: ${result.ffmpegStatus.ffmpeg.size || 0} bytes`);
                    console.log(`   FFmpeg Executable: ${result.ffmpegStatus.ffmpeg.executable || 'unknown'}`);
                } else {
                    console.log('   FFmpeg Info: null');
                }

                if (result.ffmpegStatus.ffprobe) {
                    console.log(`   FFprobe Path: ${result.ffmpegStatus.ffprobe.path}`);
                    console.log(`   FFprobe Exists: ${result.ffmpegStatus.ffprobe.exists || 'unknown'}`);
                    console.log(`   FFprobe Size: ${result.ffmpegStatus.ffprobe.size || 0} bytes`);
                    console.log(`   FFprobe Executable: ${result.ffmpegStatus.ffprobe.executable || 'unknown'}`);
                } else {
                    console.log('   FFprobe Info: null');
                }

                if (result.ffmpegStatus.environment) {
                    console.log('\n🌍 Lambda Environment:');
                    console.log(`   Runtime: ${result.ffmpegStatus.environment.runtime}`);
                    console.log(`   Region: ${result.ffmpegStatus.environment.region}`);
                    console.log(`   Function Name: ${result.ffmpegStatus.environment.functionName}`);
                }
            }

            console.log('\n💡 ANALYSIS:');
            if (result.ffmpegStatus && !result.ffmpegStatus.available) {
                console.log('❌ FFmpeg is not available in the Lambda environment');
                console.log('🔍 Possible causes:');
                console.log('   1. FFmpeg binaries are not executable (permissions issue)');
                console.log('   2. FFmpeg binaries are corrupted or incomplete');
                console.log('   3. Wrong architecture (x86_64 vs arm64)');
                console.log('   4. Missing dependencies in the Lambda runtime');
                console.log('   5. Path configuration issue (/opt/bin/ffmpeg not found)');

                if (result.ffmpegStatus.ffmpeg && result.ffmpegStatus.ffmpeg.path) {
                    console.log(`\n🔧 FFmpeg path being checked: ${result.ffmpegStatus.ffmpeg.path}`);
                    if (!result.ffmpegStatus.ffmpeg.exists) {
                        console.log('❌ File does not exist at this path');
                        console.log('💡 Layer may not be properly structured');
                    } else if (result.ffmpegStatus.ffmpeg.size === 0) {
                        console.log('❌ File exists but has 0 bytes (corrupted)');
                    } else if (!result.ffmpegStatus.ffmpeg.executable) {
                        console.log('❌ File exists but is not executable');
                        console.log('💡 Permissions issue in layer packaging');
                    }
                }
            }

        } else {
            console.log(`❌ Video Assembler error: ${debugResult.error}`);
        }

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

async function callAPI(endpoint, method = 'GET', data = null, timeout = 30000) {
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
            },
            timeout: timeout
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

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                statusCode: 0,
                error: 'Request timeout'
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

debugFFmpegLayer().catch(console.error);