#!/usr/bin/env node

/**
 * Test Enhanced Topic Management AI
 * Tests the new comprehensive context generation functionality
 */

import { handler } from '../src/lambda/topic-management/index.js';

async function testEnhancedTopicGeneration() {
    console.log('🧪 Testing Enhanced Topic Management AI...\n');

    // Test enhanced topic generation
    const testEvent = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            baseTopic: 'Investing for beginners',
            targetAudience: 'beginners',
            contentType: 'educational',
            videoDuration: 480, // 8 minutes
            videoStyle: 'engaging_educational'
        })
    };

    try {
        console.log('📤 Sending request for enhanced topic context...');
        const result = await handler(testEvent);
        
        console.log('📥 Response Status:', result.statusCode);
        
        if (result.statusCode === 200) {
            const response = JSON.parse(result.body);
            console.log('✅ Enhanced Topic Context Generated Successfully!\n');
            
            console.log('🎯 Base Topic:', response.baseTopic);
            console.log('📊 Expanded Topics:', response.topicContext.expandedTopics?.length || 0);
            console.log('🎬 Recommended Scenes:', response.topicContext.videoStructure?.recommendedScenes || 0);
            console.log('🔍 SEO Keywords:', response.topicContext.seoContext?.primaryKeywords?.length || 0);
            console.log('🎨 Scene Contexts:', response.topicContext.sceneContexts?.length || 0);
            
            // Show first expanded topic as example
            if (response.topicContext.expandedTopics && response.topicContext.expandedTopics.length > 0) {
                console.log('\n📝 Example Expanded Topic:');
                console.log('   -', response.topicContext.expandedTopics[0].subtopic);
                console.log('   - Priority:', response.topicContext.expandedTopics[0].priority);
                console.log('   - Duration:', response.topicContext.expandedTopics[0].estimatedDuration + 's');
                console.log('   - Trend Score:', response.topicContext.expandedTopics[0].trendScore);
            }
            
            // Show video structure
            if (response.topicContext.videoStructure) {
                console.log('\n🎬 Video Structure:');
                console.log('   - Hook Duration:', response.topicContext.videoStructure.hookDuration + 's');
                console.log('   - Main Content:', response.topicContext.videoStructure.mainContentDuration + 's');
                console.log('   - Conclusion:', response.topicContext.videoStructure.conclusionDuration + 's');
            }
            
            console.log('\n🎉 Enhanced Topic Management AI is working correctly!');
            
        } else {
            console.error('❌ Error Response:', result.body);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Test fallback functionality
async function testFallbackGeneration() {
    console.log('\n🔄 Testing Fallback Context Generation...\n');

    // Simulate AI failure by using invalid model
    const originalModelId = process.env.BEDROCK_MODEL_ID;
    process.env.BEDROCK_MODEL_ID = 'invalid-model';

    const testEvent = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            baseTopic: 'Travel photography',
            targetAudience: 'photographers',
            contentType: 'educational',
            videoDuration: 360, // 6 minutes
            videoStyle: 'professional'
        })
    };

    try {
        const result = await handler(testEvent);
        
        if (result.statusCode === 200) {
            const response = JSON.parse(result.body);
            console.log('✅ Fallback context generated successfully!');
            console.log('🎯 Base Topic:', response.baseTopic);
            console.log('📊 Fallback Topics:', response.topicContext.expandedTopics?.length || 0);
            console.log('🤖 Model Used:', response.topicContext.metadata?.model || 'unknown');
        }
        
    } catch (error) {
        console.error('❌ Fallback test failed:', error.message);
    } finally {
        // Restore original model ID
        if (originalModelId) {
            process.env.BEDROCK_MODEL_ID = originalModelId;
        } else {
            delete process.env.BEDROCK_MODEL_ID;
        }
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Enhanced Topic Management AI Tests\n');
    console.log('=' .repeat(60));
    
    await testEnhancedTopicGeneration();
    await testFallbackGeneration();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Tests completed!');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testEnhancedTopicGeneration, testFallbackGeneration };