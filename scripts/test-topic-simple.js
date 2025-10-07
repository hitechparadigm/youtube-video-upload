#!/usr/bin/env node

/**
 * Simple test for Enhanced Topic Management AI
 */

// Set up environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

import { handler } from '../src/lambda/topic-management/index.js';

async function testBasicFunctionality() {
    console.log('🧪 Testing Enhanced Topic Management AI...\n');

    // Test enhanced topic generation
    const testEvent = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
            baseTopic: 'Investing for beginners',
            targetAudience: 'beginners',
            contentType: 'educational',
            videoDuration: 480,
            videoStyle: 'engaging_educational'
        })
    };

    try {
        console.log('📤 Testing enhanced topic context generation...');
        const result = await handler(testEvent);
        
        console.log('📥 Response Status:', result.statusCode);
        
        if (result.statusCode === 200) {
            const response = JSON.parse(result.body);
            console.log('✅ Success! Enhanced context generated');
            console.log('🎯 Base Topic:', response.baseTopic);
            console.log('📊 Context Generated:', !!response.topicContext);
            console.log('🤖 Model Used:', response.topicContext?.metadata?.model || 'unknown');
            
            if (response.topicContext?.expandedTopics) {
                console.log('📝 Expanded Topics Count:', response.topicContext.expandedTopics.length);
                console.log('   Example:', response.topicContext.expandedTopics[0]?.subtopic);
            }
            
        } else {
            console.error('❌ Error Response:', result.body);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.message.includes('Bedrock') || error.message.includes('credentials')) {
            console.log('ℹ️  This is expected if AWS credentials are not configured');
            console.log('ℹ️  The fallback system should still work');
        }
    }
}

testBasicFunctionality();