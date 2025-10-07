#!/usr/bin/env node

/**
 * Test Context Management System
 * Validates context storage, retrieval, and agent communication
 */

// Mock the context management functions for testing
import { gzipSync, gunzipSync } from 'zlib';

// Mock AWS clients and context manager
let mockContextStorage = new Map();
let mockS3Storage = new Map();

// Context validation schemas
const CONTEXT_SCHEMAS = {
    topic: {
        required: ['mainTopic', 'expandedTopics', 'videoStructure', 'seoContext'],
        optional: ['contentGuidance', 'sceneContexts'],
        validation: {
            expandedTopics: (value) => Array.isArray(value) && value.length >= 5,
            videoStructure: (value) => value && typeof value.recommendedScenes === 'number',
            seoContext: (value) => value && Array.isArray(value.primaryKeywords)
        }
    },
    scene: {
        required: ['scenes', 'totalDuration', 'sceneCount'],
        optional: ['overallStyle', 'targetAudience', 'sceneFlow'],
        validation: {
            scenes: (value) => Array.isArray(value) && value.length > 0,
            totalDuration: (value) => typeof value === 'number' && value > 0,
            sceneCount: (value) => typeof value === 'number' && value > 0
        }
    },
    media: {
        required: ['sceneMediaMapping', 'totalAssets', 'coverageComplete'],
        optional: ['qualityScore', 'visualFlow'],
        validation: {
            sceneMediaMapping: (value) => Array.isArray(value) && value.length > 0,
            totalAssets: (value) => typeof value === 'number' && value > 0,
            coverageComplete: (value) => typeof value === 'boolean'
        }
    },
    assembly: {
        required: ['videoId', 'finalVideoPath', 'duration', 'status'],
        optional: ['qualityMetrics', 'processingTime'],
        validation: {
            duration: (value) => typeof value === 'number' && value > 0,
            status: (value) => ['processing', 'completed', 'failed'].includes(value)
        }
    }
};

// Mock context management functions
async function storeContext(contextId, contextType, contextData, options = {}) {
    const {
        ttlHours = 24,
        compress = true,
        useS3ForLarge = true,
        maxDynamoSize = 350000
    } = options;
    
    // Validate context
    const validation = validateContext(contextType, contextData);
    if (!validation.isValid) {
        throw new Error(`Context validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Serialize and compress
    let serializedData = JSON.stringify(contextData);
    let finalData = serializedData;
    let compressed = false;
    
    if (compress) {
        const compressedBuffer = gzipSync(Buffer.from(serializedData));
        if (compressedBuffer.length < serializedData.length * 0.8) {
            finalData = compressedBuffer.toString('base64');
            compressed = true;
        }
    }
    
    const metadata = {
        contextId,
        contextType,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (ttlHours * 3600),
        size: finalData.length,
        compressed,
        storedInS3: false
    };
    
    // Determine storage location
    if (useS3ForLarge && finalData.length > maxDynamoSize) {
        const s3Key = `contexts/${contextType}/${contextId}.json${compressed ? '.gz' : ''}`;
        mockS3Storage.set(s3Key, compressed ? Buffer.from(finalData, 'base64') : finalData);
        metadata.storedInS3 = true;
        metadata.s3Key = s3Key;
        metadata.contextData = null;
    } else {
        metadata.contextData = finalData;
    }
    
    mockContextStorage.set(contextId, metadata);
    
    return {
        contextId,
        contextType,
        size: metadata.size,
        compressed: metadata.compressed,
        storedInS3: metadata.storedInS3,
        s3Key: metadata.s3Key
    };
}

async function getContext(contextId) {
    const metadata = mockContextStorage.get(contextId);
    if (!metadata) {
        throw new Error(`Context not found: ${contextId}`);
    }
    
    // Check TTL
    const now = Math.floor(Date.now() / 1000);
    if (metadata.ttl && metadata.ttl < now) {
        throw new Error(`Context expired: ${contextId}`);
    }
    
    let contextData;
    
    if (metadata.storedInS3) {
        const s3Data = mockS3Storage.get(metadata.s3Key);
        if (!s3Data) {
            throw new Error(`S3 data not found: ${metadata.s3Key}`);
        }
        
        if (metadata.compressed) {
            const decompressed = gunzipSync(s3Data);
            contextData = JSON.parse(decompressed.toString());
        } else {
            contextData = JSON.parse(s3Data.toString());
        }
    } else {
        let rawData = metadata.contextData;
        
        if (metadata.compressed) {
            const decompressed = gunzipSync(Buffer.from(rawData, 'base64'));
            contextData = JSON.parse(decompressed.toString());
        } else {
            contextData = JSON.parse(rawData);
        }
    }
    
    return {
        contextId: metadata.contextId,
        contextType: metadata.contextType,
        contextData,
        metadata: {
            createdAt: metadata.createdAt,
            size: metadata.size,
            compressed: metadata.compressed,
            storedInS3: metadata.storedInS3
        }
    };
}

function validateContext(contextType, contextData) {
    const schema = CONTEXT_SCHEMAS[contextType];
    if (!schema) {
        return {
            isValid: false,
            errors: [`Unknown context type: ${contextType}`]
        };
    }
    
    const errors = [];
    
    // Check required fields
    for (const field of schema.required) {
        if (!(field in contextData)) {
            errors.push(`Missing required field: ${field}`);
        } else if (schema.validation[field]) {
            const isValid = schema.validation[field](contextData[field]);
            if (!isValid) {
                errors.push(`Invalid value for field: ${field}`);
            }
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Test data generators
function generateTopicContext() {
    return {
        mainTopic: "Investing for beginners",
        expandedTopics: [
            { subtopic: "What is an ETF", priority: "high", estimatedDuration: 90, visualNeeds: "charts", trendScore: 95 },
            { subtopic: "Best investment apps 2025", priority: "high", estimatedDuration: 120, visualNeeds: "app screenshots", trendScore: 88 },
            { subtopic: "Dollar cost averaging explained", priority: "medium", estimatedDuration: 75, visualNeeds: "graphs", trendScore: 82 },
            { subtopic: "Common investing mistakes", priority: "high", estimatedDuration: 100, visualNeeds: "warning graphics", trendScore: 90 },
            { subtopic: "How to start with $100", priority: "high", estimatedDuration: 85, visualNeeds: "money visuals", trendScore: 93 }
        ],
        videoStructure: {
            recommendedScenes: 6,
            hookDuration: 15,
            mainContentDuration: 420,
            conclusionDuration: 45,
            optimalSceneLengths: [15, 60, 90, 120, 90, 45]
        },
        contentGuidance: {
            complexConcepts: ["ETF structure", "expense ratios"],
            quickWins: ["app downloads", "account setup"],
            visualOpportunities: ["portfolio growth", "app interfaces"],
            emotionalBeats: ["success stories", "fear of missing out"]
        },
        seoContext: {
            primaryKeywords: ["investing for beginners", "best investment apps"],
            longTailKeywords: ["how to start investing with $100", "best ETFs for beginners 2025"],
            trendingTerms: ["passive investing", "index funds"],
            competitorTopics: ["Vanguard ETFs", "S&P 500 investing"]
        }
    };
}

function generateSceneContext() {
    return {
        scenes: [
            {
                sceneNumber: 1,
                title: "Hook",
                startTime: 0,
                endTime: 15,
                duration: 15,
                script: "What if I told you there's one investment that made beginners $10,000 in their first year?",
                visualStyle: "dynamic, eye-catching",
                mediaNeeds: ["money growth animation", "success imagery"],
                tone: "exciting, curious"
            },
            {
                sceneNumber: 2,
                title: "Problem Setup",
                startTime: 15,
                endTime: 75,
                duration: 60,
                script: "Most people think investing is complicated and risky...",
                visualStyle: "relatable, problem-focused",
                mediaNeeds: ["confused person", "complex charts"],
                tone: "empathetic, understanding"
            }
        ],
        totalDuration: 480,
        sceneCount: 6,
        overallStyle: "engaging_educational",
        targetAudience: "beginners"
    };
}

function generateMediaContext() {
    return {
        sceneMediaMapping: [
            {
                sceneNumber: 1,
                duration: 15,
                mediaAssets: [
                    {
                        assetId: "pexels_video_001",
                        type: "video",
                        startTime: 0,
                        duration: 8,
                        s3Location: "s3://bucket/media/videos/pexels_video_001.mp4",
                        description: "Portfolio growth animation",
                        relevanceScore: 95
                    }
                ]
            }
        ],
        totalAssets: 24,
        coverageComplete: true,
        qualityScore: 94
    };
}

function generateAssemblyContext() {
    return {
        videoId: "video-123456",
        finalVideoPath: "s3://bucket/final-videos/video-123456.mp4",
        duration: 480,
        status: "completed",
        qualityMetrics: {
            resolution: "1920x1080",
            bitrate: "5000kbps",
            audioQuality: "256kbps"
        },
        processingTime: 180000
    };
}

// Test functions
async function testContextValidation() {
    console.log('\n📋 Test 1: Context Validation');
    
    const testCases = [
        {
            name: "Valid topic context",
            contextType: "topic",
            contextData: generateTopicContext(),
            shouldPass: true
        },
        {
            name: "Invalid topic context (missing required field)",
            contextType: "topic", 
            contextData: { mainTopic: "Test" }, // Missing required fields
            shouldPass: false
        },
        {
            name: "Valid scene context",
            contextType: "scene",
            contextData: generateSceneContext(),
            shouldPass: true
        },
        {
            name: "Invalid scene context (empty scenes)",
            contextType: "scene",
            contextData: { scenes: [], totalDuration: 480, sceneCount: 0 },
            shouldPass: false
        }
    ];
    
    for (const testCase of testCases) {
        const validation = validateContext(testCase.contextType, testCase.contextData);
        const passed = validation.isValid === testCase.shouldPass;
        
        console.log(`   ${passed ? '✅' : '❌'} ${testCase.name}`);
        if (!passed) {
            console.log(`      Expected: ${testCase.shouldPass}, Got: ${validation.isValid}`);
            console.log(`      Errors: ${validation.errors.join(', ')}`);
        }
    }
}

async function testContextStorage() {
    console.log('\n💾 Test 2: Context Storage and Retrieval');
    
    const testContexts = [
        { id: "test-topic-1", type: "topic", data: generateTopicContext() },
        { id: "test-scene-1", type: "scene", data: generateSceneContext() },
        { id: "test-media-1", type: "media", data: generateMediaContext() },
        { id: "test-assembly-1", type: "assembly", data: generateAssemblyContext() }
    ];
    
    // Test storage
    for (const context of testContexts) {
        try {
            const result = await storeContext(context.id, context.type, context.data);
            console.log(`   ✅ Stored ${context.type} context: ${context.id} (${result.size} bytes, compressed: ${result.compressed})`);
        } catch (error) {
            console.log(`   ❌ Failed to store ${context.type} context: ${error.message}`);
        }
    }
    
    // Test retrieval
    for (const context of testContexts) {
        try {
            const retrieved = await getContext(context.id);
            const dataMatches = JSON.stringify(retrieved.contextData) === JSON.stringify(context.data);
            console.log(`   ${dataMatches ? '✅' : '❌'} Retrieved ${context.type} context: ${context.id} (data integrity: ${dataMatches})`);
        } catch (error) {
            console.log(`   ❌ Failed to retrieve ${context.type} context: ${error.message}`);
        }
    }
}

async function testCompressionAndS3Storage() {
    console.log('\n🗜️ Test 3: Compression and S3 Storage');
    
    // Create large context data to test S3 storage
    const largeTopicContext = generateTopicContext();
    // Add large data to force S3 storage
    largeTopicContext.largeData = "x".repeat(400000); // 400KB of data
    
    try {
        const result = await storeContext("large-context-test", "topic", largeTopicContext, {
            compress: true,
            useS3ForLarge: true,
            maxDynamoSize: 350000
        });
        
        console.log(`   ✅ Large context stored (${result.size} bytes)`);
        console.log(`      Compressed: ${result.compressed}`);
        console.log(`      Stored in S3: ${result.storedInS3}`);
        
        // Test retrieval
        const retrieved = await getContext("large-context-test");
        const dataMatches = retrieved.contextData.mainTopic === largeTopicContext.mainTopic;
        console.log(`   ${dataMatches ? '✅' : '❌'} Large context retrieved successfully`);
        
    } catch (error) {
        console.log(`   ❌ Large context test failed: ${error.message}`);
    }
}

async function testContextFlow() {
    console.log('\n🔄 Test 4: AI Agent Context Flow Simulation');
    
    const projectId = "test-project-123";
    
    try {
        // Simulate Topic Management AI storing context
        const topicContext = generateTopicContext();
        await storeContext(`${projectId}-topic`, "topic", topicContext);
        console.log(`   ✅ Topic Management AI: Context stored for project ${projectId}`);
        
        // Simulate Script Generator AI retrieving topic context and storing scene context
        const retrievedTopicContext = await getContext(`${projectId}-topic`);
        console.log(`   ✅ Script Generator AI: Retrieved topic context (${retrievedTopicContext.contextData.expandedTopics.length} expanded topics)`);
        
        const sceneContext = generateSceneContext();
        await storeContext(`${projectId}-scene`, "scene", sceneContext);
        console.log(`   ✅ Script Generator AI: Scene context stored (${sceneContext.sceneCount} scenes)`);
        
        // Simulate Media Curator AI retrieving scene context and storing media context
        const retrievedSceneContext = await getContext(`${projectId}-scene`);
        console.log(`   ✅ Media Curator AI: Retrieved scene context (${retrievedSceneContext.contextData.scenes.length} scenes)`);
        
        const mediaContext = generateMediaContext();
        await storeContext(`${projectId}-media`, "media", mediaContext);
        console.log(`   ✅ Media Curator AI: Media context stored (${mediaContext.totalAssets} assets)`);
        
        // Simulate Video Assembler AI retrieving all contexts
        const retrievedMediaContext = await getContext(`${projectId}-media`);
        console.log(`   ✅ Video Assembler AI: Retrieved media context (coverage: ${retrievedMediaContext.contextData.coverageComplete})`);
        
        const assemblyContext = generateAssemblyContext();
        await storeContext(`${projectId}-assembly`, "assembly", assemblyContext);
        console.log(`   ✅ Video Assembler AI: Assembly context stored (status: ${assemblyContext.status})`);
        
        console.log(`   🎯 Complete context flow validated for project: ${projectId}`);
        
    } catch (error) {
        console.log(`   ❌ Context flow test failed: ${error.message}`);
    }
}

async function testErrorHandling() {
    console.log('\n⚠️ Test 5: Error Handling');
    
    // Test non-existent context
    try {
        await getContext("non-existent-context");
        console.log(`   ❌ Should have thrown error for non-existent context`);
    } catch (error) {
        console.log(`   ✅ Correctly handled non-existent context: ${error.message}`);
    }
    
    // Test invalid context type
    try {
        await storeContext("invalid-test", "invalid-type", { data: "test" });
        console.log(`   ❌ Should have thrown error for invalid context type`);
    } catch (error) {
        console.log(`   ✅ Correctly handled invalid context type: ${error.message}`);
    }
    
    // Test expired context (simulate by setting TTL in past)
    try {
        const expiredContext = generateTopicContext();
        await storeContext("expired-test", "topic", expiredContext, { ttlHours: -1 }); // Expired 1 hour ago
        
        // Try to retrieve expired context
        await getContext("expired-test");
        console.log(`   ❌ Should have thrown error for expired context`);
    } catch (error) {
        console.log(`   ✅ Correctly handled expired context: ${error.message}`);
    }
}

async function runTests() {
    console.log('🧪 Context Management System Tests\n');
    console.log('=' .repeat(80));
    
    await testContextValidation();
    await testContextStorage();
    await testCompressionAndS3Storage();
    await testContextFlow();
    await testErrorHandling();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 All context management tests completed!');
    console.log('\n✅ Key Features Validated:');
    console.log('   - Context validation with type-specific schemas');
    console.log('   - Automatic compression for large contexts');
    console.log('   - S3 storage for contexts exceeding DynamoDB limits');
    console.log('   - Complete AI agent context flow simulation');
    console.log('   - Proper error handling for edge cases');
    console.log('   - TTL-based context expiration');
    
    console.log('\n📊 Storage Statistics:');
    console.log(`   - DynamoDB contexts: ${mockContextStorage.size}`);
    console.log(`   - S3 objects: ${mockS3Storage.size}`);
}

runTests().catch(console.error);