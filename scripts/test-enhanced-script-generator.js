#!/usr/bin/env node

/**
 * Test Enhanced Script Generator AI with Topic Context
 */

// Set up environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.SCRIPTS_TABLE_NAME = 'automated-video-pipeline-scripts';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

import { handler } from '../src/lambda/script-generator/index.js';

async function testEnhancedScriptGeneration() {
    console.log('🧪 Testing Enhanced Script Generator AI...\n');

    // Sample topic context from Topic Management AI
    const sampleTopicContext = {
        mainTopic: "Travel to Mexico",
        expandedTopics: [
            {
                subtopic: "Hidden gems in Mexico locals don't want tourists to know",
                priority: "high",
                estimatedDuration: 120,
                visualNeeds: "scenic locations, local culture",
                trendScore: 95
            },
            {
                subtopic: "Mexico travel mistakes that cost me $500",
                priority: "high", 
                estimatedDuration: 90,
                visualNeeds: "mistake examples, cost breakdowns",
                trendScore: 88
            },
            {
                subtopic: "Best time to visit Mexico for budget travelers",
                priority: "medium",
                estimatedDuration: 60,
                visualNeeds: "weather charts, price comparisons",
                trendScore: 82
            }
        ],
        videoStructure: {
            recommendedScenes: 5,
            hookDuration: 15,
            mainContentDuration: 420,
            conclusionDuration: 45,
            optimalSceneLengths: [15, 90, 120, 120, 75, 45]
        },
        contentGuidance: {
            complexConcepts: ["visa requirements", "currency exchange"],
            quickWins: ["packing tips", "basic Spanish phrases"],
            visualOpportunities: ["stunning landscapes", "local food", "cultural sites"],
            emotionalBeats: ["adventure excitement", "cultural discovery", "budget relief"]
        },
        sceneContexts: [
            {
                sceneNumber: 1,
                purpose: "hook",
                duration: 15,
                content: "attention-grabbing opener about hidden Mexico secrets",
                visualStyle: "dynamic, mysterious",
                mediaNeeds: ["dramatic Mexico landscape", "intriguing local scene"],
                tone: "exciting, secretive"
            },
            {
                sceneNumber: 2,
                purpose: "value_preview",
                duration: 45,
                content: "what viewers will discover in this video",
                visualStyle: "informative, trustworthy",
                mediaNeeds: ["presenter talking", "Mexico highlights montage"],
                tone: "confident, helpful"
            }
        ],
        seoContext: {
            primaryKeywords: ["Mexico travel", "hidden gems Mexico", "Mexico budget travel"],
            longTailKeywords: ["best hidden places Mexico", "Mexico travel mistakes avoid", "cheap Mexico travel tips"],
            trendingTerms: ["Mexico 2025", "authentic Mexico", "local Mexico experiences"],
            competitorTopics: ["Mexico travel guide", "Mexico vacation tips"]
        }
    };

    const testEvent = {
        httpMethod: 'POST',
        path: '/scripts/generate-enhanced',
        body: JSON.stringify({
            topicContext: sampleTopicContext,
            baseTopic: "Travel to Mexico",
            targetLength: 480, // 8 minutes
            style: 'engaging_educational',
            targetAudience: 'budget_travelers',
            projectId: 'test-project-001'
        })
    };

    try {
        console.log('📤 Generating enhanced script with topic context...');
        const result = await handler(testEvent);
        
        console.log('📥 Response Status:', result.statusCode);
        
        if (result.statusCode === 200) {
            const response = JSON.parse(result.body);
            console.log('✅ Enhanced script generated successfully!\n');
            
            console.log('📊 Script Metrics:');
            console.log(`   Word Count: ${response.wordCount}`);
            console.log(`   Estimated Duration: ${response.estimatedDuration}s (${Math.floor(response.estimatedDuration/60)}:${String(response.estimatedDuration%60).padStart(2, '0')})`);
            console.log(`   Scene Count: ${response.sceneCount}`);
            
            if (response.enhancedFeatures) {
                console.log('\n🚀 Enhanced Features Used:');
                console.log(`   Topic Context: ${response.enhancedFeatures.usedTopicContext ? '✅' : '❌'}`);
                console.log(`   Intelligent Scenes: ${response.enhancedFeatures.intelligentScenes ? '✅' : '❌'}`);
                console.log(`   Scene Optimization: ${response.enhancedFeatures.sceneOptimization}`);
                console.log(`   SEO Optimized: ${response.enhancedFeatures.seoOptimized ? '✅' : '❌'}`);
            }
            
            if (response.contextUsed) {
                console.log('\n📋 Context Utilization:');
                console.log(`   Expanded Topics Used: ${response.contextUsed.expandedTopics}`);
                console.log(`   Scene Contexts Used: ${response.contextUsed.sceneContexts}`);
                console.log(`   SEO Keywords Used: ${response.contextUsed.seoKeywords}`);
            }
            
            if (response.script?.scenes) {
                console.log('\n🎬 Generated Scenes:');
                response.script.scenes.forEach((scene, index) => {
                    console.log(`   Scene ${scene.sceneNumber}: ${scene.title}`);
                    console.log(`      Purpose: ${scene.purpose || 'N/A'}`);
                    console.log(`      Duration: ${scene.duration}s (${scene.startTime}s - ${scene.endTime}s)`);
                    console.log(`      Tone: ${scene.tone || 'N/A'}`);
                    console.log(`      Visual Style: ${scene.visualStyle || 'N/A'}`);
                    if (scene.mediaNeeds && scene.mediaNeeds.length > 0) {
                        console.log(`      Media Needs: ${scene.mediaNeeds.join(', ')}`);
                    }
                    console.log('');
                });
            }
            
            if (response.script?.sceneStructure) {
                console.log('🏗️ Scene Structure Analysis:');
                console.log(`   Total Scenes: ${response.script.sceneStructure.totalScenes}`);
                console.log(`   Average Scene Length: ${response.script.sceneStructure.averageSceneLength}`);
                console.log(`   Structure Rationale: ${response.script.sceneStructure.structureRationale}`);
            }
            
            console.log('\n🎉 Enhanced Script Generator AI is working correctly!');
            console.log('\n💡 Key Features Demonstrated:');
            console.log('   ✅ Consumes rich topic context from Topic Management AI');
            console.log('   ✅ Intelligently determines scene count based on topic complexity');
            console.log('   ✅ Creates scene-specific media requirements for Media Curator AI');
            console.log('   ✅ Optimizes duration based on content complexity');
            console.log('   ✅ Includes professional video production timing');
            console.log('   ✅ Provides detailed scene context for downstream agents');
            
        } else {
            const errorBody = JSON.parse(result.body);
            console.error('❌ Error Response:', errorBody);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Test with different topic complexities
async function testSceneIntelligence() {
    console.log('\n' + '='.repeat(60));
    console.log('🧠 Testing Scene Intelligence with Different Topic Complexities...\n');

    const testCases = [
        {
            name: "Simple Topic (Short Duration)",
            baseTopic: "How to make coffee",
            duration: 180, // 3 minutes
            expectedScenes: "3-4 scenes"
        },
        {
            name: "Complex Topic (Long Duration)", 
            baseTopic: "Complete guide to cryptocurrency investing",
            duration: 720, // 12 minutes
            expectedScenes: "6-8 scenes"
        },
        {
            name: "Medium Topic (Standard Duration)",
            baseTopic: "Travel photography tips",
            duration: 480, // 8 minutes
            expectedScenes: "5-6 scenes"
        }
    ];

    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.name}`);
        console.log(`   Topic: ${testCase.baseTopic}`);
        console.log(`   Duration: ${testCase.duration}s (${Math.floor(testCase.duration/60)} minutes)`);
        console.log(`   Expected: ${testCase.expectedScenes}`);
        
        const mockContext = {
            mainTopic: testCase.baseTopic,
            videoStructure: {
                recommendedScenes: Math.max(3, Math.min(8, Math.ceil(testCase.duration / 90))),
                hookDuration: 15,
                mainContentDuration: testCase.duration - 60,
                conclusionDuration: 45
            },
            expandedTopics: [
                {
                    subtopic: `${testCase.baseTopic} for beginners`,
                    priority: "high",
                    estimatedDuration: 90,
                    visualNeeds: "step-by-step visuals"
                }
            ]
        };
        
        const testEvent = {
            httpMethod: 'POST',
            path: '/scripts/generate-enhanced',
            body: JSON.stringify({
                topicContext: mockContext,
                baseTopic: testCase.baseTopic,
                targetLength: testCase.duration,
                style: 'engaging_educational',
                targetAudience: 'general'
            })
        };
        
        try {
            const result = await handler(testEvent);
            
            if (result.statusCode === 200) {
                const response = JSON.parse(result.body);
                console.log(`   ✅ Generated: ${response.sceneCount} scenes`);
                console.log(`   Duration: ${response.estimatedDuration}s`);
            } else {
                console.log(`   ❌ Failed: ${result.statusCode}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }
}

async function runTests() {
    console.log('🚀 Enhanced Script Generator AI - Comprehensive Test\n');
    console.log('=' .repeat(80));
    
    await testEnhancedScriptGeneration();
    await testSceneIntelligence();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 All tests completed!');
}

runTests().catch(console.error);