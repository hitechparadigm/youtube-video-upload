#!/usr/bin/env node

/**
 * Context Manager Example - Real-World Video Pipeline Scenario
 * Shows how AI agents use context management to coordinate video creation
 */

import { gzipSync, gunzipSync } from 'zlib';

// Simulate the context management system (in production, this would be AWS DynamoDB + S3)
let contextStorage = new Map();
let s3Storage = new Map();

console.log('🎬 Context Manager Example: Creating "Investing for Beginners" Video\n');
console.log('=' .repeat(80));

// ============================================================================
// STEP 1: Topic Management AI generates comprehensive context
// ============================================================================

async function step1_TopicManagementAI() {
    console.log('\n🎯 STEP 1: Topic Management AI');
    console.log('Input: "Investing for beginners in the USA"');
    
    // This is what the Topic Management AI generates
    const topicContext = {
        mainTopic: "Investing for beginners in the USA",
        expandedTopics: [
            {
                subtopic: "Best investment apps for beginners in 2025",
                priority: "high",
                estimatedDuration: 90,
                visualNeeds: "app screenshots, phone mockups",
                trendScore: 95,
                reasoning: "High search volume, trending mobile investing"
            },
            {
                subtopic: "How to start investing with $100",
                priority: "high", 
                estimatedDuration: 75,
                visualNeeds: "money visuals, calculator screens",
                trendScore: 88,
                reasoning: "Popular beginner query, low competition"
            },
            {
                subtopic: "What is an ETF and why invest in ETFs",
                priority: "medium",
                estimatedDuration: 120,
                visualNeeds: "charts, graphs, explanatory graphics",
                trendScore: 82,
                reasoning: "Educational content, evergreen topic"
            },
            {
                subtopic: "Common investing mistakes to avoid",
                priority: "high",
                estimatedDuration: 85,
                visualNeeds: "warning graphics, loss charts",
                trendScore: 90,
                reasoning: "High engagement, emotional hook"
            },
            {
                subtopic: "Dollar cost averaging explained simply",
                priority: "medium",
                estimatedDuration: 70,
                visualNeeds: "timeline graphics, growth charts",
                trendScore: 78,
                reasoning: "Important concept, visual explanation needed"
            }
        ],
        videoStructure: {
            recommendedScenes: 6,
            hookDuration: 15,
            mainContentDuration: 420, // 7 minutes
            conclusionDuration: 45,
            optimalSceneLengths: [15, 60, 90, 120, 90, 45],
            totalDuration: 480 // 8 minutes
        },
        contentGuidance: {
            complexConcepts: ["ETF structure", "expense ratios", "compound interest"],
            quickWins: ["app downloads", "account setup", "first $10 investment"],
            visualOpportunities: ["portfolio growth animations", "app interfaces", "before/after comparisons"],
            emotionalBeats: ["success stories", "fear of missing out", "empowerment"]
        },
        sceneContexts: [
            {
                sceneNumber: 1,
                purpose: "hook",
                duration: 15,
                content: "attention-grabbing opener about investment success",
                visualStyle: "dynamic, eye-catching",
                mediaNeeds: ["portfolio growth animation", "success imagery"],
                tone: "exciting, curious"
            },
            {
                sceneNumber: 2,
                purpose: "problem_setup",
                duration: 60,
                content: "common investing fears and misconceptions",
                visualStyle: "relatable, problem-focused",
                mediaNeeds: ["confused person", "complex charts", "worried expressions"],
                tone: "empathetic, understanding"
            }
        ],
        seoContext: {
            primaryKeywords: ["investing for beginners", "best investment apps", "how to start investing"],
            longTailKeywords: ["best investment apps for beginners 2025", "how to invest $100", "investing mistakes to avoid"],
            trendingTerms: ["passive investing", "index funds", "robo advisors"],
            competitorTopics: ["Robinhood vs Acorns", "Vanguard ETFs", "S&P 500 investing"]
        }
    };
    
    console.log('✅ Generated comprehensive topic context:');
    console.log(`   - Main topic: ${topicContext.mainTopic}`);
    console.log(`   - Expanded topics: ${topicContext.expandedTopics.length}`);
    console.log(`   - Recommended scenes: ${topicContext.videoStructure.recommendedScenes}`);
    console.log(`   - SEO keywords: ${topicContext.seoContext.primaryKeywords.length}`);
    
    // Store context for next agent
    const projectId = "video-project-investing-beginners-001";
    await storeContext(`${projectId}-topic`, 'topic', topicContext);
    
    console.log(`📦 Stored topic context for project: ${projectId}`);
    console.log(`   Context ID: ${projectId}-topic`);
    console.log(`   Size: ${JSON.stringify(topicContext).length} bytes`);
    
    return { projectId, topicContext };
}

// ============================================================================
// STEP 2: Script Generator AI uses topic context to create scene-aware script
// ============================================================================

async function step2_ScriptGeneratorAI(projectId) {
    console.log('\n📝 STEP 2: Script Generator AI');
    console.log(`Input: Project ID "${projectId}" + user request for script`);
    
    // Retrieve the topic context from previous agent
    console.log('🔍 Retrieving topic context from Context Manager...');
    const topicContextData = await getContext(`${projectId}-topic`);
    const topicContext = topicContextData.contextData;
    
    console.log('✅ Retrieved topic context:');
    console.log(`   - Expanded topics available: ${topicContext.expandedTopics.length}`);
    console.log(`   - Video structure: ${topicContext.videoStructure.recommendedScenes} scenes`);
    console.log(`   - Content guidance: ${topicContext.contentGuidance.quickWins.length} quick wins identified`);
    
    // Use topic context to generate intelligent script
    console.log('\n🤖 Generating scene-aware script using topic context...');
    
    const sceneContext = {
        projectId: projectId,
        baseTopic: topicContext.mainTopic,
        selectedSubtopic: topicContext.expandedTopics[0].subtopic, // "Best investment apps for beginners in 2025"
        scenes: [
            {
                sceneNumber: 1,
                title: "Hook - Investment Success Story",
                purpose: "grab_attention",
                startTime: 0,
                endTime: 15,
                duration: 15,
                script: "What if I told you there's an app that turned my friend Sarah's spare change into $2,847 in just 8 months? By the end of this video, you'll know the exact apps beginners are using to build wealth in 2025.",
                visualRequirements: {
                    primary: "portfolio growth animation showing $0 to $2,847",
                    secondary: ["happy person with phone", "money growing visualization"],
                    style: "dynamic and engaging",
                    mood: "exciting and optimistic"
                },
                mediaNeeds: {
                    imageCount: 2,
                    videoCount: 1,
                    keywords: ["investment success", "money growth", "portfolio app", "celebration"],
                    duration: 15,
                    transitions: "fast-paced cuts"
                },
                engagementElements: ["specific dollar amount", "time frame", "friend story", "promise of value"],
                derivedFrom: topicContext.sceneContexts[0] // Used topic context guidance
            },
            {
                sceneNumber: 2,
                title: "Problem - Investment Confusion",
                purpose: "establish_problem",
                startTime: 15,
                endTime: 75,
                duration: 60,
                script: "Look, I get it. When I first wanted to start investing, I was completely overwhelmed. Robinhood, Acorns, Fidelity - which one should I choose? What's the difference between an ETF and a stock? And honestly, I was terrified of losing my money.",
                visualRequirements: {
                    primary: "confused person looking at multiple app screens",
                    secondary: ["complex financial charts", "worried facial expressions", "multiple app logos"],
                    style: "relatable and empathetic",
                    mood: "understanding and supportive"
                },
                mediaNeeds: {
                    imageCount: 3,
                    videoCount: 1,
                    keywords: ["confused investor", "multiple apps", "overwhelming charts", "worried person"],
                    duration: 60,
                    transitions: "smooth, empathetic pacing"
                },
                engagementElements: ["personal story", "viewer identification", "common fears"],
                derivedFrom: topicContext.contentGuidance.emotionalBeats // Used emotional guidance
            },
            {
                sceneNumber: 3,
                title: "Solution - Top 3 Beginner Apps",
                purpose: "provide_solution",
                startTime: 75,
                endTime: 195,
                duration: 120,
                script: "After testing 12 different apps and talking to financial advisors, I found the top 3 that are perfect for beginners. Number 3 is Acorns - it literally invests your spare change automatically. Number 2 is Robinhood - zero fees and super simple interface. But number 1 will surprise you...",
                visualRequirements: {
                    primary: "app interface demonstrations",
                    secondary: ["feature comparisons", "user testimonials", "fee structures"],
                    style: "informative and clear",
                    mood: "confident and helpful"
                },
                mediaNeeds: {
                    imageCount: 4,
                    videoCount: 2,
                    keywords: ["app interfaces", "feature comparison", "user reviews", "investment apps"],
                    duration: 120,
                    transitions: "clear, educational pacing"
                },
                engagementElements: ["numbered list", "surprise element", "authority building"],
                derivedFrom: topicContext.expandedTopics[0] // Used specific subtopic
            }
        ],
        totalDuration: 480,
        sceneCount: 6, // Would have 6 total scenes
        overallStyle: "engaging_educational",
        targetAudience: "investment beginners",
        sceneFlow: {
            narrativeArc: "Problem → Solution → Action",
            engagementStrategy: "Personal stories + practical value",
            visualProgression: "Emotional → Educational → Actionable"
        },
        contextUsage: {
            usedExpandedTopics: true,
            usedVideoStructure: true,
            usedContentGuidance: true,
            usedSeoKeywords: true,
            intelligentSceneBreakdown: true
        }
    };
    
    console.log('✅ Generated scene-aware script:');
    console.log(`   - Total scenes: ${sceneContext.sceneCount}`);
    console.log(`   - Total duration: ${sceneContext.totalDuration} seconds`);
    console.log(`   - Selected subtopic: ${sceneContext.selectedSubtopic}`);
    console.log(`   - Context usage: All topic guidance applied`);
    
    // Store scene context for next agent
    await storeContext(`${projectId}-scene`, 'scene', sceneContext);
    
    console.log(`📦 Stored scene context for project: ${projectId}`);
    console.log(`   Context ID: ${projectId}-scene`);
    console.log(`   Scene details available for Media Curator AI`);
    
    return sceneContext;
}

// ============================================================================
// STEP 3: Media Curator AI uses scene context for intelligent media matching
// ============================================================================

async function step3_MediaCuratorAI(projectId) {
    console.log('\n🎨 STEP 3: Media Curator AI');
    console.log(`Input: Project ID "${projectId}" + media curation request`);
    
    // Retrieve scene context from previous agent
    console.log('🔍 Retrieving scene context from Context Manager...');
    const sceneContextData = await getContext(`${projectId}-scene`);
    const sceneContext = sceneContextData.contextData;
    
    console.log('✅ Retrieved scene context:');
    console.log(`   - Available scenes: ${sceneContext.scenes.length}`);
    console.log(`   - Total duration: ${sceneContext.totalDuration} seconds`);
    console.log(`   - Target audience: ${sceneContext.targetAudience}`);
    
    // Use scene context for intelligent media matching
    console.log('\n🔍 Analyzing scene requirements for media matching...');
    
    const mediaContext = {
        projectId: projectId,
        sceneMediaMapping: [],
        totalAssets: 0,
        coverageComplete: true,
        qualityScore: 0,
        processingDetails: {
            scenesProcessed: sceneContext.scenes.length,
            mediaSourcesUsed: ["pexels", "pixabay", "unsplash"],
            aiSimilarityScoring: true,
            contextAwareMatching: true
        }
    };
    
    // Process each scene with context-aware media matching
    for (const scene of sceneContext.scenes) {
        console.log(`\n   📋 Processing Scene ${scene.sceneNumber}: ${scene.title}`);
        console.log(`      Duration: ${scene.duration}s`);
        console.log(`      Visual needs: ${scene.visualRequirements.primary}`);
        console.log(`      Keywords: ${scene.mediaNeeds.keywords.join(', ')}`);
        
        // Simulate AI-powered media matching based on scene context
        const sceneMediaAssets = [];
        
        // For each keyword, find relevant media
        for (let i = 0; i < scene.mediaNeeds.imageCount; i++) {
            const keyword = scene.mediaNeeds.keywords[i] || scene.mediaNeeds.keywords[0];
            sceneMediaAssets.push({
                assetId: `asset_${scene.sceneNumber}_${i + 1}`,
                type: "image",
                startTime: (scene.duration / scene.mediaNeeds.imageCount) * i,
                duration: scene.duration / scene.mediaNeeds.imageCount,
                s3Location: `s3://pipeline-bucket/media/images/scene${scene.sceneNumber}_${i + 1}.jpg`,
                description: `${keyword} visual for ${scene.title}`,
                relevanceScore: 85 + Math.random() * 10, // Simulate AI scoring
                sourceKeyword: keyword,
                matchingReason: `AI matched "${keyword}" with scene context: ${scene.visualRequirements.mood}`,
                sceneAlignment: {
                    visualStyle: scene.visualRequirements.style,
                    mood: scene.visualRequirements.mood,
                    purpose: scene.purpose
                }
            });
        }
        
        // Add video assets if needed
        for (let i = 0; i < scene.mediaNeeds.videoCount; i++) {
            sceneMediaAssets.push({
                assetId: `video_${scene.sceneNumber}_${i + 1}`,
                type: "video",
                startTime: 0,
                duration: scene.duration,
                s3Location: `s3://pipeline-bucket/media/videos/scene${scene.sceneNumber}_${i + 1}.mp4`,
                description: `Background video for ${scene.title}`,
                relevanceScore: 90 + Math.random() * 5,
                sourceKeyword: scene.mediaNeeds.keywords[0],
                matchingReason: `Primary video asset matching scene tone: ${scene.tone}`,
                sceneAlignment: {
                    visualStyle: scene.visualRequirements.style,
                    mood: scene.visualRequirements.mood,
                    purpose: scene.purpose
                }
            });
        }
        
        const sceneMapping = {
            sceneNumber: scene.sceneNumber,
            sceneTitle: scene.title,
            duration: scene.duration,
            mediaAssets: sceneMediaAssets,
            transitionStyle: scene.mediaNeeds.transitions,
            visualFlow: `${scene.visualRequirements.style} → ${scene.visualRequirements.mood}`,
            contextUsage: {
                usedSceneRequirements: true,
                usedVisualGuidance: true,
                usedKeywordMatching: true,
                aiSimilarityScoring: true
            }
        };
        
        mediaContext.sceneMediaMapping.push(sceneMapping);
        mediaContext.totalAssets += sceneMediaAssets.length;
        
        console.log(`      ✅ Found ${sceneMediaAssets.length} assets`);
        console.log(`      📊 Avg relevance score: ${Math.round(sceneMediaAssets.reduce((sum, asset) => sum + asset.relevanceScore, 0) / sceneMediaAssets.length)}%`);
    }
    
    // Calculate overall quality score
    const allAssets = mediaContext.sceneMediaMapping.flatMap(mapping => mapping.mediaAssets);
    mediaContext.qualityScore = Math.round(
        allAssets.reduce((sum, asset) => sum + asset.relevanceScore, 0) / allAssets.length
    );
    
    console.log('\n✅ Media curation completed:');
    console.log(`   - Total assets curated: ${mediaContext.totalAssets}`);
    console.log(`   - Overall quality score: ${mediaContext.qualityScore}%`);
    console.log(`   - Scene coverage: ${mediaContext.coverageComplete ? 'Complete' : 'Partial'}`);
    console.log(`   - Context-aware matching: ${mediaContext.processingDetails.contextAwareMatching}`);
    
    // Store media context for Video Assembler
    await storeContext(`${projectId}-media`, 'media', mediaContext);
    
    console.log(`📦 Stored media context for project: ${projectId}`);
    console.log(`   Context ID: ${projectId}-media`);
    console.log(`   Precise scene-media mapping ready for Video Assembler`);
    
    return mediaContext;
}

// ============================================================================
// STEP 4: Video Assembler AI uses all contexts for precise synchronization
// ============================================================================

async function step4_VideoAssemblerAI(projectId) {
    console.log('\n🎬 STEP 4: Video Assembler AI');
    console.log(`Input: Project ID "${projectId}" + video assembly request`);
    
    // Retrieve all contexts from previous agents
    console.log('🔍 Retrieving all contexts from Context Manager...');
    
    const topicContextData = await getContext(`${projectId}-topic`);
    const sceneContextData = await getContext(`${projectId}-scene`);
    const mediaContextData = await getContext(`${projectId}-media`);
    
    const topicContext = topicContextData.contextData;
    const sceneContext = sceneContextData.contextData;
    const mediaContext = mediaContextData.contextData;
    
    console.log('✅ Retrieved all contexts:');
    console.log(`   - Topic context: ${topicContext.expandedTopics.length} topics, ${topicContext.seoContext.primaryKeywords.length} keywords`);
    console.log(`   - Scene context: ${sceneContext.scenes.length} scenes, ${sceneContext.totalDuration}s total`);
    console.log(`   - Media context: ${mediaContext.totalAssets} assets, ${mediaContext.qualityScore}% quality`);
    
    // Use all contexts for precise video assembly
    console.log('\n🔧 Assembling video with precise scene-media synchronization...');
    
    const assemblyContext = {
        projectId: projectId,
        videoId: `video_${projectId}_${Date.now()}`,
        finalVideoPath: `s3://pipeline-bucket/final-videos/${projectId}.mp4`,
        duration: sceneContext.totalDuration,
        status: "completed",
        assemblyDetails: {
            scenesAssembled: sceneContext.scenes.length,
            assetsUsed: mediaContext.totalAssets,
            contextIntegration: {
                topicSeoOptimized: true,
                sceneTimingPrecise: true,
                mediaContextAligned: true
            }
        },
        qualityMetrics: {
            resolution: "1920x1080",
            bitrate: "5000kbps",
            audioQuality: "256kbps",
            sceneTransitions: "smooth",
            mediaAlignment: mediaContext.qualityScore
        },
        processingTime: 180000, // 3 minutes
        contextUsage: {
            usedTopicKeywords: topicContext.seoContext.primaryKeywords,
            implementedSceneStructure: sceneContext.sceneFlow,
            appliedMediaMapping: mediaContext.sceneMediaMapping.length,
            finalOptimization: "SEO + Engagement + Quality"
        },
        youtubeMetadata: {
            title: `${topicContext.expandedTopics[0].subtopic} | ${new Date().getFullYear()} Guide`,
            description: `Learn ${topicContext.mainTopic.toLowerCase()} with this comprehensive guide. Keywords: ${topicContext.seoContext.primaryKeywords.join(', ')}`,
            tags: topicContext.seoContext.primaryKeywords.concat(topicContext.seoContext.trendingTerms),
            thumbnail: "s3://pipeline-bucket/thumbnails/investing-beginners-thumb.jpg"
        }
    };
    
    // Simulate precise assembly process
    console.log('\n   🎯 Assembly Process:');
    for (const sceneMapping of mediaContext.sceneMediaMapping) {
        const scene = sceneContext.scenes.find(s => s.sceneNumber === sceneMapping.sceneNumber);
        console.log(`      Scene ${scene.sceneNumber} (${scene.startTime}s-${scene.endTime}s):`);
        console.log(`         📝 Script: "${scene.script.substring(0, 50)}..."`);
        console.log(`         🎨 Media: ${sceneMapping.mediaAssets.length} assets synchronized`);
        console.log(`         ⏱️  Timing: Precise ${scene.duration}s duration maintained`);
        console.log(`         🎵 Audio: Aligned with visual transitions`);
    }
    
    console.log('\n✅ Video assembly completed:');
    console.log(`   - Final video: ${assemblyContext.finalVideoPath}`);
    console.log(`   - Duration: ${assemblyContext.duration} seconds`);
    console.log(`   - Quality: ${assemblyContext.qualityMetrics.resolution} @ ${assemblyContext.qualityMetrics.bitrate}`);
    console.log(`   - Processing time: ${assemblyContext.processingTime / 1000} seconds`);
    console.log(`   - YouTube ready: Title, description, tags optimized`);
    
    // Store final assembly context
    await storeContext(`${projectId}-assembly`, 'assembly', assemblyContext);
    
    console.log(`📦 Stored assembly context for project: ${projectId}`);
    console.log(`   Context ID: ${projectId}-assembly`);
    console.log(`   Complete video production metadata available`);
    
    return assemblyContext;
}

// ============================================================================
// STEP 5: Show complete context flow and project summary
// ============================================================================

async function step5_ShowContextFlow(projectId) {
    console.log('\n📊 STEP 5: Complete Context Flow Summary');
    console.log(`Project: ${projectId}`);
    
    console.log('\n🔄 Context Flow Validation:');
    
    // Show all stored contexts
    const contexts = ['topic', 'scene', 'media', 'assembly'];
    
    for (const contextType of contexts) {
        try {
            const contextData = await getContext(`${projectId}-${contextType}`);
            const sizeKB = Math.round(JSON.stringify(contextData.contextData).length / 1024);
            
            console.log(`   ✅ ${contextType.toUpperCase()} Context:`);
            console.log(`      - Size: ${sizeKB} KB`);
            console.log(`      - Created: ${contextData.metadata.createdAt}`);
            console.log(`      - Compressed: ${contextData.metadata.compressed}`);
            console.log(`      - Storage: ${contextData.metadata.storedInS3 ? 'S3' : 'DynamoDB'}`);
            
        } catch (error) {
            console.log(`   ❌ ${contextType.toUpperCase()} Context: ${error.message}`);
        }
    }
    
    console.log('\n🎯 AI Agent Coordination Results:');
    console.log('   1. Topic Management AI → Generated 5 expanded topics + SEO strategy');
    console.log('   2. Script Generator AI → Created 6 scenes using topic context');
    console.log('   3. Media Curator AI → Matched media to scenes using scene context');
    console.log('   4. Video Assembler AI → Synchronized everything using all contexts');
    
    console.log('\n💡 Context Management Benefits Demonstrated:');
    console.log('   ✅ No data loss between agents');
    console.log('   ✅ Intelligent context-aware decisions');
    console.log('   ✅ Precise scene-media synchronization');
    console.log('   ✅ SEO optimization carried through entire pipeline');
    console.log('   ✅ Automatic compression and storage optimization');
    console.log('   ✅ Complete audit trail of AI decisions');
}

// ============================================================================
// Mock Context Management Functions (simulate AWS DynamoDB + S3)
// ============================================================================

async function storeContext(contextId, contextType, contextData, options = {}) {
    const serialized = JSON.stringify(contextData);
    const compressed = gzipSync(Buffer.from(serialized));
    const useCompression = compressed.length < serialized.length * 0.8;
    
    const metadata = {
        contextId,
        contextType,
        createdAt: new Date().toISOString(),
        size: useCompression ? compressed.length : serialized.length,
        compressed: useCompression,
        storedInS3: serialized.length > 350000
    };
    
    if (metadata.storedInS3) {
        s3Storage.set(contextId, useCompression ? compressed : serialized);
    } else {
        contextStorage.set(contextId, {
            ...metadata,
            data: useCompression ? compressed.toString('base64') : serialized
        });
    }
    
    return metadata;
}

async function getContext(contextId) {
    const stored = contextStorage.get(contextId);
    if (!stored) {
        throw new Error(`Context not found: ${contextId}`);
    }
    
    let contextData;
    if (stored.storedInS3) {
        const s3Data = s3Storage.get(contextId);
        contextData = stored.compressed ? 
            JSON.parse(gunzipSync(s3Data).toString()) :
            JSON.parse(s3Data.toString());
    } else {
        const rawData = stored.compressed ? 
            gunzipSync(Buffer.from(stored.data, 'base64')).toString() :
            stored.data;
        contextData = JSON.parse(rawData);
    }
    
    return {
        contextId: stored.contextId,
        contextType: stored.contextType,
        contextData,
        metadata: {
            createdAt: stored.createdAt,
            size: stored.size,
            compressed: stored.compressed,
            storedInS3: stored.storedInS3
        }
    };
}

// ============================================================================
// Run the complete example
// ============================================================================

async function runExample() {
    try {
        // Step 1: Topic Management AI
        const { projectId } = await step1_TopicManagementAI();
        
        // Step 2: Script Generator AI
        await step2_ScriptGeneratorAI(projectId);
        
        // Step 3: Media Curator AI
        await step3_MediaCuratorAI(projectId);
        
        // Step 4: Video Assembler AI
        await step4_VideoAssemblerAI(projectId);
        
        // Step 5: Show complete flow
        await step5_ShowContextFlow(projectId);
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 Context Manager Example Complete!');
        console.log('\nThis demonstrates how the Context Management System enables:');
        console.log('• Intelligent AI agent coordination');
        console.log('• Context-aware decision making');
        console.log('• Precise scene-media synchronization');
        console.log('• Complete audit trail and data integrity');
        console.log('• Automatic optimization and compression');
        
    } catch (error) {
        console.error('❌ Example failed:', error);
    }
}

runExample().catch(console.error);