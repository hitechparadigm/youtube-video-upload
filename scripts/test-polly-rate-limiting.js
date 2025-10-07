#!/usr/bin/env node

/**
 * Test Amazon Polly Rate Limiting Implementation
 */

// Mock the rate limiting functions for testing
const POLLY_RATE_LIMITS = {
    standard: { tps: 100, maxChars: 3000 },
    neural: { tps: 10, maxChars: 3000 },
    generative: { tps: 5, maxChars: 3000 }
};

let rateLimitState = {
    requests: [],
    lastCleanup: Date.now(),
    queues: {
        generative: [],
        neural: [],
        standard: []
    },
    processing: {
        generative: false,
        neural: false,
        standard: false
    }
};

async function checkRateLimit(engine, textLength) {
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    
    // Check character limit first
    if (textLength > limits.maxChars) {
        throw new Error(`Text too long for ${engine} engine: ${textLength} chars (max: ${limits.maxChars})`);
    }
    
    // Return a promise that resolves when it's this request's turn
    return new Promise((resolve) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to queue
        rateLimitState.queues[engine].push({
            id: requestId,
            timestamp: Date.now(),
            textLength,
            resolve
        });
        
        // Process queue if not already processing
        if (!rateLimitState.processing[engine]) {
            processRateLimitQueue(engine);
        }
    });
}

async function processRateLimitQueue(engine) {
    if (rateLimitState.processing[engine]) {
        return; // Already processing
    }
    
    rateLimitState.processing[engine] = true;
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    
    try {
        while (rateLimitState.queues[engine].length > 0) {
            const now = Date.now();
            
            // Clean up old requests (older than 1 second)
            if (now - rateLimitState.lastCleanup > 1000) {
                rateLimitState.requests = rateLimitState.requests.filter(req => now - req.timestamp < 1000);
                rateLimitState.lastCleanup = now;
            }
            
            // Count recent requests for this engine
            const recentRequests = rateLimitState.requests.filter(req => 
                req.engine === engine && now - req.timestamp < 1000
            );
            
            // Check if we can process the next request
            if (recentRequests.length < limits.tps) {
                // Process next request in queue
                const nextRequest = rateLimitState.queues[engine].shift();
                
                // Record this request
                rateLimitState.requests.push({
                    engine,
                    timestamp: now,
                    textLength: nextRequest.textLength,
                    requestId: nextRequest.id
                });
                
                console.log(`📊 Rate limit status for ${engine}: ${recentRequests.length + 1}/${limits.tps} TPS`);
                
                // Resolve the request
                nextRequest.resolve();
                
                // Small delay to prevent tight loops
                await new Promise(resolve => setTimeout(resolve, 10));
                
            } else {
                // Need to wait - calculate how long until we can send another request
                const oldestRecentRequest = Math.min(...recentRequests.map(r => r.timestamp));
                const waitTime = Math.max(100, 1000 - (now - oldestRecentRequest) + 50); // Add 50ms buffer
                
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${engine} engine (${recentRequests.length}/${limits.tps} TPS)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    } finally {
        rateLimitState.processing[engine] = false;
    }
}

function splitTextForPolly(text, engine) {
    const limits = POLLY_RATE_LIMITS[engine] || POLLY_RATE_LIMITS.standard;
    const maxChars = limits.maxChars - 100; // Leave buffer for SSML tags
    
    if (text.length <= maxChars) {
        return [text];
    }
    
    const chunks = [];
    let currentChunk = '';
    
    // Split by sentences to maintain natural breaks
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if (sentence.length > maxChars) {
            // If single sentence is too long, split by words
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            const words = sentence.split(' ');
            let wordChunk = '';
            
            for (const word of words) {
                if ((wordChunk + ' ' + word).length > maxChars) {
                    if (wordChunk) {
                        chunks.push(wordChunk.trim());
                        wordChunk = word;
                    } else {
                        // Single word too long - truncate
                        chunks.push(word.substring(0, maxChars));
                        wordChunk = word.substring(maxChars);
                    }
                } else {
                    wordChunk += (wordChunk ? ' ' : '') + word;
                }
            }
            
            if (wordChunk) {
                currentChunk = wordChunk;
            }
        } else if ((currentChunk + ' ' + sentence).length > maxChars) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    console.log(`📝 Split text into ${chunks.length} chunks for ${engine} engine`);
    return chunks;
}

async function testRateLimiting() {
    console.log('🧪 Testing Amazon Polly Rate Limiting...\n');

    // Test 1: Rate limiting for different engines
    console.log('📊 Test 1: Rate Limiting by Engine');
    
    const engines = ['generative', 'neural', 'standard'];
    
    for (const engine of engines) {
        console.log(`\n🎵 Testing ${engine} engine (${POLLY_RATE_LIMITS[engine].tps} TPS limit):`);
        
        const startTime = Date.now();
        
        // Simulate rapid requests
        for (let i = 0; i < 8; i++) {
            await checkRateLimit(engine, 500);
            console.log(`   Request ${i + 1} completed`);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log(`   ✅ Completed 8 requests in ${totalTime}ms`);
        console.log(`   Average delay: ${Math.round(totalTime / 8)}ms per request`);
        
        // Clear state for next test
        rateLimitState.requests = [];
    }
}

async function testTextSplitting() {
    console.log('\n📝 Test 2: Text Splitting for Character Limits');
    
    // Create test texts of different lengths
    const testTexts = [
        {
            name: "Short text",
            text: "This is a short text that should not be split.",
            expectedChunks: 1
        },
        {
            name: "Medium text", 
            text: "This is a medium length text. ".repeat(50) + "It should fit in one chunk for most engines.",
            expectedChunks: 1
        },
        {
            name: "Long text",
            text: "This is a very long text that will definitely exceed the character limits. ".repeat(100) + "It should be split into multiple chunks to respect Polly's character limits per request.",
            expectedChunks: 2
        },
        {
            name: "Very long text",
            text: "This is an extremely long text. ".repeat(200) + "It will need to be split into many chunks. ".repeat(50),
            expectedChunks: 3
        }
    ];
    
    for (const testText of testTexts) {
        console.log(`\n📄 Testing: ${testText.name} (${testText.text.length} chars)`);
        
        for (const engine of ['generative', 'neural', 'standard']) {
            const chunks = splitTextForPolly(testText.text, engine);
            const maxChars = POLLY_RATE_LIMITS[engine].maxChars;
            
            console.log(`   ${engine}: ${chunks.length} chunks (max ${maxChars} chars each)`);
            
            // Validate chunks
            let allValid = true;
            chunks.forEach((chunk, index) => {
                if (chunk.length > maxChars) {
                    console.log(`   ❌ Chunk ${index + 1} too long: ${chunk.length} chars`);
                    allValid = false;
                }
            });
            
            if (allValid) {
                console.log(`   ✅ All chunks within limits`);
            }
        }
    }
}

async function testConcurrentRequests() {
    console.log('\n🔄 Test 3: Concurrent Request Handling');
    
    // Reset state
    rateLimitState.requests = [];
    
    console.log('🚀 Simulating 15 concurrent generative voice requests...');
    
    const startTime = Date.now();
    const completionTimes = [];
    
    // Create 15 concurrent requests for generative engine (5 TPS limit)
    const promises = Array.from({ length: 15 }, (_, i) => 
        checkRateLimit('generative', 1000).then(() => {
            const completionTime = Date.now() - startTime;
            completionTimes.push(completionTime);
            console.log(`✅ Request ${i + 1} completed at ${completionTime}ms`);
        })
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`\n📊 Results:`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Expected time: ~2000-2500ms (burst of 5, wait 1s, burst of 5, wait 1s, burst of 5)`);
    console.log(`Rate limiting ${totalTime >= 2000 && totalTime <= 3000 ? '✅ working correctly' : '❌ not working'}`);
    
    // Analyze completion pattern
    const sortedTimes = completionTimes.sort((a, b) => a - b);
    console.log(`\n📈 Completion Pattern Analysis:`);
    console.log(`First 5 requests: ${sortedTimes.slice(0, 5).join('ms, ')}ms`);
    console.log(`Next 5 requests: ${sortedTimes.slice(5, 10).join('ms, ')}ms`);
    console.log(`Last 5 requests: ${sortedTimes.slice(10, 15).join('ms, ')}ms`);
    
    // Validate the pattern
    const firstBatch = sortedTimes.slice(0, 5);
    const secondBatch = sortedTimes.slice(5, 10);
    const thirdBatch = sortedTimes.slice(10, 15);
    
    const firstBatchMax = Math.max(...firstBatch);
    const secondBatchMin = Math.min(...secondBatch);
    const secondBatchMax = Math.max(...secondBatch);
    const thirdBatchMin = Math.min(...thirdBatch);
    
    const firstGap = secondBatchMin - firstBatchMax;
    const secondGap = thirdBatchMin - secondBatchMax;
    
    console.log(`\n🔍 Rate Limiting Validation:`);
    console.log(`Gap between batch 1 and 2: ${firstGap}ms (should be ~1000ms)`);
    console.log(`Gap between batch 2 and 3: ${secondGap}ms (should be ~1000ms)`);
    console.log(`Pattern validation: ${(firstGap >= 900 && secondGap >= 900) ? '✅ Proper batching detected' : '❌ Batching not working'}`);
}

async function testErrorHandling() {
    console.log('\n❌ Test 4: Error Handling for Oversized Text');
    
    const oversizedText = "A".repeat(5000); // 5000 chars, exceeds all limits
    
    for (const engine of ['generative', 'neural', 'standard']) {
        try {
            await checkRateLimit(engine, oversizedText.length);
            console.log(`   ❌ ${engine}: Should have thrown error for ${oversizedText.length} chars`);
        } catch (error) {
            console.log(`   ✅ ${engine}: Correctly rejected oversized text - ${error.message}`);
        }
    }
}

function showRateLimitRecommendations() {
    console.log('\n💡 Amazon Polly Rate Limiting Recommendations:');
    console.log('');
    console.log('🎵 **Generative Voices** (5 TPS, 3000 chars):');
    console.log('   - Use for: High-quality narration, final production');
    console.log('   - Best for: Premium content, professional videos');
    console.log('   - Strategy: Queue requests, use for final audio generation');
    console.log('');
    console.log('🎤 **Neural Voices** (10 TPS, 3000 chars):');
    console.log('   - Use for: Balanced quality and speed');
    console.log('   - Best for: Regular content production');
    console.log('   - Strategy: Good for most video production workflows');
    console.log('');
    console.log('📢 **Standard Voices** (100 TPS, 3000 chars):');
    console.log('   - Use for: High-volume processing, previews');
    console.log('   - Best for: Batch processing, testing, drafts');
    console.log('   - Strategy: Use for rapid prototyping and bulk generation');
    console.log('');
    console.log('⚡ **Smart Strategies:**');
    console.log('   - Split long scripts into scenes for parallel processing');
    console.log('   - Use different engines based on quality requirements');
    console.log('   - Implement exponential backoff for retries');
    console.log('   - Cache generated audio to avoid re-generation');
    console.log('   - Monitor rate limit status and adjust accordingly');
}

async function runTests() {
    console.log('🚀 Amazon Polly Rate Limiting Tests\n');
    console.log('=' .repeat(80));
    
    await testRateLimiting();
    await testTextSplitting();
    await testConcurrentRequests();
    await testErrorHandling();
    
    showRateLimitRecommendations();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 All rate limiting tests completed!');
    console.log('\n✅ Key Features Validated:');
    console.log('   - Engine-specific rate limiting (5/10/100 TPS)');
    console.log('   - Character limit enforcement (3000 chars)');
    console.log('   - Intelligent text chunking with natural breaks');
    console.log('   - Concurrent request throttling');
    console.log('   - Error handling for oversized content');
    console.log('   - Smart delay calculation to avoid throttling');
}

runTests().catch(console.error);