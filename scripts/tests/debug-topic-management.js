#!/usr/bin/env node

/**
 * Debug Topic Management AI
 * Get detailed response to understand what's happening
 */

import LambdaInvoker from '../utils/lambda-invoker.js';

const invoker = new LambdaInvoker();

async function debugTopicManagement() {
    console.log('🔍 Debugging Topic Management AI\n');
    
    const testProjectId = `debug-${Date.now()}`;
    
    try {
        console.log('📋 Testing Topic Management with detailed logging...');
        
        const result = await invoker.invokeWithHTTP(
            'automated-video-pipeline-topic-management-v2',
            'POST',
            '/topics/enhanced',
            {
                projectId: testProjectId,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators',
                contentType: 'educational',
                videoDuration: 480
            }
        );
        
        console.log('📊 Full Response Details:');
        console.log(`   Success: ${result.success}`);
        console.log(`   Status Code: ${result.statusCode}`);
        console.log(`   Function Error: ${result.functionError}`);
        console.log(`   Error: ${result.error}`);
        
        console.log('\n📋 Raw Data:');
        console.log(JSON.stringify(result.data, null, 2));
        
        if (result.data?.body) {
            console.log('\n📝 Parsed Body:');
            try {
                const body = typeof result.data.body === 'string' 
                    ? JSON.parse(result.data.body) 
                    : result.data.body;
                console.log(JSON.stringify(body, null, 2));
            } catch (parseError) {
                console.log(`   Parse Error: ${parseError.message}`);
                console.log(`   Raw Body: ${result.data.body}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugTopicManagement().catch(console.error);