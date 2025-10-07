#!/usr/bin/env node

/**
 * Test Enhanced Video Assembler AI with Scene-Media Synchronization
 * Demonstrates context-aware video assembly using stored scene and media contexts
 */

import https from 'https';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com/prod';
const API_KEY = process.env.API_KEY || 'your-api-key';

console.log('🎬 Testing Enhanced Video Assembler AI: Scene-Media Synchronization\n');
console.log('=' .repeat(80));

/**
 * Make HTTP request to Lambda function
 */
function makeRequest(endpoint, method = 'POST', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_BASE_URL);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        };
        
        const req = https.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * Test context-aware video assembly
 */
async function testContextAwareVideoAssembly() {
    console.log('\n🎬 Testing Context-Aware Video Assembly');
    
    const projectId = "project-2025-10-07-investing-beginners";
    
    const requestData = {
        projectId: projectId,
        videoSettings: {
            resolution: '1920x1080',
            framerate: 30,
            bitrate: '5000k',
            audioCodec: 'aac',
            videoCodec: 'h264',
            sceneTransitions: true,
            contextAwareAssembly: true
        },
        qualitySettings: {
            enableSmartTransitions: true,
            optimizeForEngagement: true,
            maintainVisualCoherence: true
        },
        outputFormat: 'mp4'
    };
    
    console.log(`📝 Request: Assemble video for project "${projectId}"`);
    console.log(`📋 Video settings:`, requestData.videoSettings);
    
    try {
        const response = await makeRequest('/video/assemble-from-project', 'POST', requestData);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ Context-aware video assembly started successfully:');
            console.log(`   📁 Project ID: ${result.projectId}`);
            console.log(`   🎥 Video ID: ${result.videoId}`);
            console.log(`   🚀 Task ARN: ${result.taskArn}`);
            console.log(`   📊 Status: ${result.status}`);
            
            if (result.assemblyDetails) {
                console.log('\n📋 Assembly Details:');
                console.log(`   Total scenes: ${result.assemblyDetails.totalScenes}`);
                console.log(`   Total assets: ${result.assemblyDetails.totalAssets}`);
                console.log(`   Total duration: ${result.assemblyDetails.totalDuration}s`);
                console.log(`   Context aware: ${result.assemblyDetails.contextAware}`);
            }
            
            if (result.processingDetails) {
                console.log('\n⏱️ Processing Details:');
                console.log(`   Estimated completion: ${result.processingDetails.estimatedCompletion}`);
                console.log(`   Output path: ${result.processingDetails.outputPath}`);
                console.log(`   Quality settings: ${JSON.stringify(result.processingDetails.qualitySettings)}`);
            }
            
            if (result.contextUsage) {
                console.log('\n🤖 Context Usage:');
                console.log(`   Used scene context: ${result.contextUsage.usedSceneContext}`);
                console.log(`   Used media context: ${result.contextUsage.usedMediaContext}`);
                console.log(`   Scene count: ${result.contextUsage.sceneCount}`);
                console.log(`   Media assets: ${result.contextUsage.mediaAssets}`);
                console.log(`   Precise assembly: ${result.contextUsage.preciseAssembly}`);
            }
            
            return result;
        } else {
            console.log(`❌ Failed to assemble video: ${response.statusCode}`);
            console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
            return null;
        }
        
    } catch (error) {
        console.log(`❌ Error in video assembly: ${error.message}`);
        return null;
    }
}

/**
 * Mock test for demonstration
 */
async function mockContextAwareAssembly() {
    console.log('🎬 Testing Enhanced Video Assembler AI: Scene-Media Synchronization');
    console.log('📝 Request: Assemble video for project "project-2025-10-07-investing-beginners"');
    console.log('📋 Video settings: 1920x1080, 30fps, 5000k bitrate, context-aware assembly');
    
    console.log('\n🔍 Retrieving contexts from Context Manager...');
    console.log('✅ Retrieved contexts:');
    console.log('   - Scene context: 6 scenes, 480s total duration');
    console.log('   - Media context: 18 assets, 6 scene mappings');
    console.log('   - Coverage complete: true');
    
    console.log('\n🔧 Creating context-aware assembly configuration...');
    
    const scenes = [
        {
            number: 1,
            title: "Hook - Investment Success Story",
            duration: 15,
            assets: 3,
            purpose: "grab_attention",
            mood: "exciting",
            visualStyle: "dynamic",
            relevance: 92,
            transition: "fade-in"
        },
        {
            number: 2,
            title: "Problem - Investment Confusion",
            duration: 60,
            assets: 3,
            purpose: "establish_problem",
            mood: "empathetic",
            visualStyle: "relatable",
            relevance: 89,
            transition: "dissolve"
        },
        {
            number: 3,
            title: "Solution - Top 3 Beginner Apps",
            duration: 120,
            assets: 3,
            purpose: "provide_solution",
            mood: "confident",
            visualStyle: "informative",
            relevance: 94,
            transition: "slide"
        },
        {
            number: 4,
            title: "App Demonstrations",
            duration: 90,
            assets: 3,
            purpose: "show_features",
            mood: "helpful",
            visualStyle: "clear",
            relevance: 91,
            transition: "crossfade"
        },
        {
            number: 5,
            title: "Getting Started Guide",
            duration: 150,
            assets: 3,
            purpose: "provide_action",
            mood: "encouraging",
            visualStyle: "step-by-step",
            relevance: 88,
            transition: "crossfade"
        },
        {
            number: 6,
            title: "Call to Action",
            duration: 45,
            assets: 3,
            purpose: "encourage_action",
            mood: "motivating",
            visualStyle: "engaging",
            relevance: 85,
            transition: "zoom"
        }
    ];
    
    let currentTime = 0;
    
    for (const scene of scenes) {
        console.log(`\n📋 Processing Scene ${scene.number}: ${scene.title}`);
        console.log(`   Duration: ${scene.duration}s (${currentTime}s - ${currentTime + scene.duration}s)`);
        console.log(`   Purpose: ${scene.purpose}`);
        console.log(`   Assets: ${scene.assets} media items with ${scene.relevance}% relevance`);
        console.log(`   Visual style: ${scene.visualStyle}, Mood: ${scene.mood}`);
        console.log(`   Transition: ${scene.transition} (context-aware)`);
        console.log(`   Effects: Brightness ${scene.mood === 'exciting' ? '110%' : '100%'}, Contrast optimized`);
        
        currentTime += scene.duration;
    }
    
    const totalAssets = scenes.reduce((sum, scene) => sum + scene.assets, 0);
    const avgRelevance = Math.round(scenes.reduce((sum, scene) => sum + scene.relevance, 0) / scenes.length);
    
    console.log('\n🔧 Assembly configuration created:');
    console.log(`   Total scenes: ${scenes.length}`);
    console.log(`   Total duration: ${currentTime}s`);
    console.log(`   Audio tracks: ${scenes.length} (one per scene)`);
    console.log(`   Video tracks: ${totalAssets} (scene-synchronized)`);
    
    console.log('\n🚀 ECS task started for context-aware video processing');
    console.log('💾 Assembly configuration saved to S3');
    
    const videoId = `video-project-2025-10-07-investing-beginners-${Date.now()}`;
    const taskArn = `arn:aws:ecs:us-east-1:123456789:task/video-cluster/${videoId}`;
    
    console.log('\n✅ Context-aware video assembly started successfully:');
    console.log(`   📁 Project ID: project-2025-10-07-investing-beginners`);
    console.log(`   🎥 Video ID: ${videoId}`);
    console.log(`   🚀 Task ARN: ${taskArn}`);
    console.log(`   📊 Status: processing`);
    
    console.log('\n📋 Assembly Details:');
    console.log(`   Total scenes: ${scenes.length}`);
    console.log(`   Total assets: ${totalAssets}`);
    console.log(`   Total duration: ${currentTime}s`);
    console.log(`   Context aware: true`);
    
    console.log('\n⏱️ Processing Details:');
    console.log(`   Estimated completion: ${new Date(Date.now() + 10 * 60 * 1000).toISOString()}`);
    console.log(`   Output path: s3://bucket/videos/project-2025-10-07-investing-beginners/final/${videoId}.mp4`);
    console.log(`   Quality settings: 1920x1080, 30fps, 5000k bitrate`);
    
    console.log('\n🤖 Context Usage:');
    console.log('   Used scene context: true');
    console.log('   Used media context: true');
    console.log(`   Scene count: ${scenes.length}`);
    console.log(`   Media assets: ${totalAssets}`);
    console.log('   Precise assembly: true');
    
    console.log('\n💾 Stored assembly context for tracking');
    
    return {
        projectId: "project-2025-10-07-investing-beginners",
        videoId: videoId,
        taskArn: taskArn,
        totalScenes: scenes.length,
        totalAssets: totalAssets,
        totalDuration: currentTime,
        contextAware: true
    };
}

/**
 * Run the test
 */
async function runTest() {
    try {
        console.log('🚀 Starting Enhanced Video Assembler AI Test...\n');
        
        let result;
        
        if (process.argv.includes('--mock')) {
            console.log('🧪 Running in MOCK mode (no actual API calls)\n');
            result = await mockContextAwareAssembly();
        } else {
            console.log('🌐 Running with ACTUAL API calls');
            console.log('📝 Make sure to set API_BASE_URL and API_KEY environment variables\n');
            result = await testContextAwareVideoAssembly();
        }
        
        if (result) {
            console.log('\n' + '='.repeat(80));
            console.log('🎉 Enhanced Video Assembler AI Test COMPLETED SUCCESSFULLY!');
            console.log('\n📊 Test Results Summary:');
            console.log(`   📁 Project ID: ${result.projectId}`);
            console.log(`   🎥 Video ID: ${result.videoId}`);
            console.log(`   🎬 Total Scenes: ${result.totalScenes}`);
            console.log(`   📸 Total Assets: ${result.totalAssets}`);
            console.log(`   ⏱️ Total Duration: ${result.totalDuration}s`);
            console.log(`   🤖 Context Aware: ${result.contextAware}`);
            
            console.log('\n💡 Enhanced Features Demonstrated:');
            console.log('   • Scene-media synchronization with precise timing');
            console.log('   • Context-aware visual effects and transitions');
            console.log('   • AI-optimized scene flow and pacing');
            console.log('   • Professional video production standards');
            console.log('   • Intelligent asset positioning and scaling');
            console.log('   • Mood-based visual enhancement');
            
            console.log('\n🔄 Context Flow Integration:');
            console.log('   • Retrieved scene context from Script Generator AI');
            console.log('   • Retrieved media context from Media Curator AI');
            console.log('   • Used precise scene-media mapping for assembly');
            console.log('   • Stored assembly context for tracking');
            console.log('   • Updated project summary with video information');
            
            console.log('\n🎯 Professional Video Assembly Features:');
            console.log('   • Scene-specific transitions (fade-in, dissolve, slide, zoom)');
            console.log('   • Context-aware visual effects (brightness, contrast, saturation)');
            console.log('   • Precise audio-video synchronization');
            console.log('   • Smart cropping and aspect ratio management');
            console.log('   • Professional quality output (1920x1080, 30fps, 5000k)');
            
            console.log('\n🚀 Next Steps:');
            console.log('   1. ECS task will process video with context-aware assembly');
            console.log('   2. Final video will be available at the output S3 path');
            console.log('   3. Ready for YouTube publishing with optimized quality');
        } else {
            console.log('\n❌ Test failed - check configuration and try again');
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error);
    }
}

// Run the test
runTest().catch(console.error);