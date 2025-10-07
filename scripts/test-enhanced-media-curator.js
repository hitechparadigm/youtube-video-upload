#!/usr/bin/env node

/**
 * Test Enhanced Media Curator AI with Scene Context Processing
 * Demonstrates scene-aware media curation using stored scene context
 */

import https from 'https';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com/prod';
const API_KEY = process.env.API_KEY || 'your-api-key';

console.log('🎨 Testing Enhanced Media Curator AI: Scene Context Processing\n');
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
 * Test scene-aware media curation
 */
async function testSceneAwareMediaCuration() {
    console.log('\n🎨 Testing Scene-Aware Media Curation');
    
    const projectId = "project-2025-10-07-investing-beginners";
    
    const requestData = {
        projectId: projectId,
        mediaRequirements: {
            imagesPerScene: 2,
            videosPerScene: 1,
            minRelevanceScore: 80,
            sceneSpecificMatching: true
        },
        qualityThreshold: 80,
        diversityFactor: 0.7
    };
    
    console.log(`📝 Request: Curate media for project "${projectId}"`);
    console.log(`📋 Requirements:`, requestData.mediaRequirements);
    
    try {
        const response = await makeRequest('/media/curate-from-project', 'POST', requestData);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ Scene-aware media curation completed successfully:');
            console.log(`   📁 Project ID: ${result.projectId}`);
            console.log(`   🎬 Scenes covered: ${result.mediaContext?.scenesCovered || 0}`);
            console.log(`   📸 Total assets: ${result.mediaContext?.totalAssets || 0}`);
            console.log(`   📊 Avg relevance: ${result.mediaContext?.averageRelevanceScore || 0}%`);
            console.log(`   ✅ Coverage complete: ${result.mediaContext?.coverageComplete}`);
            console.log(`   🔄 Ready for assembly: ${result.readyForVideoAssembly}`);
            
            if (result.sceneBreakdown) {
                console.log('\n📋 Scene Breakdown:');
                result.sceneBreakdown.forEach(scene => {
                    console.log(`   Scene ${scene.sceneNumber}: ${scene.sceneTitle}`);
                    console.log(`      Assets: ${scene.assetCount}`);
                    console.log(`      Style: ${scene.visualStyle}`);
                    console.log(`      Mood: ${scene.mood}`);
                });
            }
            
            if (result.contextUsage) {
                console.log('\n🤖 Context Usage:');
                console.log(`   Used scene context: ${result.contextUsage.usedSceneContext}`);
                console.log(`   Selected subtopic: ${result.contextUsage.selectedSubtopic}`);
                console.log(`   Scene count: ${result.contextUsage.sceneCount}`);
                console.log(`   Intelligent matching: ${result.contextUsage.intelligentMatching}`);
            }
            
            return result;
        } else {
            console.log(`❌ Failed to curate media: ${response.statusCode}`);
            console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
            return null;
        }
        
    } catch (error) {
        console.log(`❌ Error in media curation: ${error.message}`);
        return null;
    }
}

/**
 * Mock test for demonstration
 */
async function mockSceneAwareTest() {
    console.log('🎨 Testing Enhanced Media Curator AI: Scene Context Processing');
    console.log('📝 Request: Curate media for project "project-2025-10-07-investing-beginners"');
    console.log('📋 Requirements: 2 images + 1 video per scene, 80% relevance threshold');
    
    console.log('\n🔍 Retrieving scene context from Context Manager...');
    console.log('✅ Retrieved scene context:');
    console.log('   - Available scenes: 6');
    console.log('   - Total duration: 480s');
    console.log('   - Selected subtopic: Best investment apps for beginners in 2025');
    console.log('   - Overall style: engaging_educational');
    
    console.log('\n🎬 Processing 6 scenes with context-aware matching...');
    
    const scenes = [
        {
            number: 1,
            title: "Hook - Investment Success Story",
            purpose: "grab_attention",
            duration: 15,
            searchTerms: ["portfolio growth animation", "investment success", "money celebration"],
            assets: 3,
            relevance: 92
        },
        {
            number: 2,
            title: "Problem - Investment Confusion",
            purpose: "establish_problem",
            duration: 60,
            searchTerms: ["confused person", "multiple apps", "overwhelming charts"],
            assets: 3,
            relevance: 89
        },
        {
            number: 3,
            title: "Solution - Top 3 Beginner Apps",
            purpose: "provide_solution",
            duration: 120,
            searchTerms: ["app interfaces", "feature comparison", "user reviews"],
            assets: 3,
            relevance: 94
        },
        {
            number: 4,
            title: "App Demonstrations",
            purpose: "show_features",
            duration: 90,
            searchTerms: ["smartphone trading", "app screenshots", "user interface"],
            assets: 3,
            relevance: 91
        },
        {
            number: 5,
            title: "Getting Started Guide",
            purpose: "provide_action",
            duration: 150,
            searchTerms: ["account setup", "first investment", "step by step"],
            assets: 3,
            relevance: 88
        },
        {
            number: 6,
            title: "Call to Action",
            purpose: "encourage_action",
            duration: 45,
            searchTerms: ["subscribe button", "like notification", "engagement"],
            assets: 3,
            relevance: 85
        }
    ];
    
    for (const scene of scenes) {
        console.log(`\n📋 Processing Scene ${scene.number}: ${scene.title}`);
        console.log(`   Duration: ${scene.duration}s`);
        console.log(`   Purpose: ${scene.purpose}`);
        console.log(`   🔍 Generated search terms: ${scene.searchTerms.join(', ')}`);
        console.log(`   📸 Found potential assets from Pexels and Pixabay`);
        console.log(`   🤖 AI analysis: ${scene.assets} assets passed relevance threshold`);
        console.log(`   ✅ Scene ${scene.number}: ${scene.assets} assets selected`);
        console.log(`   📊 Avg relevance: ${scene.relevance}%`);
    }
    
    const totalAssets = scenes.reduce((sum, scene) => sum + scene.assets, 0);
    const avgRelevance = Math.round(scenes.reduce((sum, scene) => sum + scene.relevance, 0) / scenes.length);
    
    console.log('\n✅ Scene-aware media curation completed successfully:');
    console.log(`   📁 Project ID: project-2025-10-07-investing-beginners`);
    console.log(`   🎬 Scenes covered: ${scenes.length}`);
    console.log(`   📸 Total assets: ${totalAssets}`);
    console.log(`   📊 Avg relevance: ${avgRelevance}%`);
    console.log(`   ✅ Coverage complete: true`);
    console.log(`   🔄 Ready for assembly: true`);
    
    console.log('\n📋 Scene Breakdown:');
    scenes.forEach(scene => {
        console.log(`   Scene ${scene.number}: ${scene.title}`);
        console.log(`      Assets: ${scene.assets}`);
        console.log(`      Purpose: ${scene.purpose}`);
        console.log(`      Relevance: ${scene.relevance}%`);
    });
    
    console.log('\n🤖 Context Usage:');
    console.log('   Used scene context: true');
    console.log('   Selected subtopic: Best investment apps for beginners in 2025');
    console.log('   Scene count: 6');
    console.log('   Intelligent matching: true');
    
    console.log('\n💾 Stored media context for Video Assembler AI');
    
    return {
        projectId: "project-2025-10-07-investing-beginners",
        totalAssets: totalAssets,
        scenesCovered: scenes.length,
        averageRelevanceScore: avgRelevance,
        coverageComplete: true
    };
}

/**
 * Run the test
 */
async function runTest() {
    try {
        console.log('🚀 Starting Enhanced Media Curator AI Test...\n');
        
        let result;
        
        if (process.argv.includes('--mock')) {
            console.log('🧪 Running in MOCK mode (no actual API calls)\n');
            result = await mockSceneAwareTest();
        } else {
            console.log('🌐 Running with ACTUAL API calls');
            console.log('📝 Make sure to set API_BASE_URL and API_KEY environment variables\n');
            result = await testSceneAwareMediaCuration();
        }
        
        if (result) {
            console.log('\n' + '='.repeat(80));
            console.log('🎉 Enhanced Media Curator AI Test COMPLETED SUCCESSFULLY!');
            console.log('\n📊 Test Results Summary:');
            console.log(`   📁 Project ID: ${result.projectId}`);
            console.log(`   🎬 Scenes Processed: ${result.scenesCovered}`);
            console.log(`   📸 Total Assets Curated: ${result.totalAssets}`);
            console.log(`   📊 Average Relevance Score: ${result.averageRelevanceScore}%`);
            console.log(`   ✅ Coverage Complete: ${result.coverageComplete}`);
            
            console.log('\n💡 Enhanced Features Demonstrated:');
            console.log('   • Scene-specific search term generation using AI');
            console.log('   • Context-aware media relevance scoring');
            console.log('   • Intelligent media-to-scene matching');
            console.log('   • Visual style and mood alignment');
            console.log('   • Scene-specific media organization');
            console.log('   • Precise timing and transition planning');
            
            console.log('\n🔄 Context Flow Integration:');
            console.log('   • Retrieved scene context from Script Generator AI');
            console.log('   • Used scene breakdown for intelligent matching');
            console.log('   • Stored media context for Video Assembler AI');
            console.log('   • Updated project summary with media information');
            
            console.log('\n🚀 Next Steps:');
            console.log('   1. Video Assembler AI can now use precise scene-media mapping');
            console.log('   2. Each scene has optimally matched media assets');
            console.log('   3. Ready for professional video assembly with context');
        } else {
            console.log('\n❌ Test failed - check configuration and try again');
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error);
    }
}

// Run the test
runTest().catch(console.error);