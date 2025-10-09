#!/usr/bin/env node

/**
 * Modern End-to-End Pipeline Test
 * Tests the complete video pipeline using the API Gateway endpoints
 */

const API_ENDPOINT = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

async function testModernPipeline() {
    console.log('🚀 Modern End-to-End Pipeline Test\n');
    
    const testProjectId = `modern-test-${Date.now()}`;
    let results = {
        topicManagement: false,
        scriptGenerator: false,
        mediaCurator: false,
        audioGenerator: false,
        videoAssembler: false,
        youtubePublisher: false
    };
    
    try {
        // Step 1: Test Topic Management via API Gateway
        console.log('📋 Step 1: Topic Management API...');
        
        const topicResponse = await fetch(`${API_ENDPOINT}/topics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                topic: 'AI Tools for Content Creation',
                dailyFrequency: 1,
                priority: 1,
                status: 'active',
                targetAudience: 'content creators'
            })
        });
        
        if (topicResponse.ok) {
            const topicData = await topicResponse.json();
            results.topicManagement = true;
            console.log('   ✅ Topic Management: SUCCESS');
            console.log('   📊 Generated topics:', topicData.expandedTopics?.length || 0);
        } else {
            const error = await topicResponse.text();
            console.log('   ❌ Topic Management: FAILED');
            console.log('   Error:', error);
        }
        
        // Step 2: Test Workflow Start
        console.log('\n🎯 Step 2: Workflow Orchestrator API...');
        
        const workflowResponse = await fetch(`${API_ENDPOINT}/workflow/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                projectId: testProjectId,
                topic: 'AI Tools for Content Creation',
                targetAudience: 'content creators'
            })
        });
        
        if (workflowResponse.ok) {
            const workflowData = await workflowResponse.json();
            results.scriptGenerator = true;
            console.log('   ✅ Workflow Orchestrator: SUCCESS');
            console.log('   🎯 Workflow started:', workflowData.workflowId || 'N/A');
        } else {
            const error = await workflowResponse.text();
            console.log('   ❌ Workflow Orchestrator: FAILED');
            console.log('   Error:', error);
        }
        
        // Step 3: Test Media Curator
        console.log('\n🎨 Step 3: Media Curator API...');
        
        const mediaResponse = await fetch(`${API_ENDPOINT}/media/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                query: 'AI tools productivity',
                count: 5,
                type: 'both'
            })
        });
        
        if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            results.mediaCurator = true;
            console.log('   ✅ Media Curator: SUCCESS');
            console.log('   🎨 Curated assets:', mediaData.totalAssets || 0);
        } else {
            const error = await mediaResponse.text();
            console.log('   ❌ Media Curator: FAILED');
            console.log('   Error:', error);
        }
        
        // Summary
        console.log('\n📊 MODERN PIPELINE TEST RESULTS:');
        console.log(`   📋 Topic Management: ${results.topicManagement ? '✅' : '❌'}`);
        console.log(`   🎯 Workflow Orchestrator: ${results.scriptGenerator ? '✅' : '❌'}`);
        console.log(`   🎨 Media Curator: ${results.mediaCurator ? '✅' : '❌'}`);
        
        const successCount = Object.values(results).filter(Boolean).length;
        const totalCount = Object.keys(results).length;
        const successRate = Math.round((successCount / totalCount) * 100);
        
        console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate}% (${successCount}/${totalCount})`);
        console.log(`📋 Test Project ID: ${testProjectId}`);
        
        if (successRate >= 80) {
            console.log('\n🎉 Pipeline is working well!');
        } else if (successRate >= 50) {
            console.log('\n⚠️ Pipeline has some issues but core functionality works');
        } else {
            console.log('\n❌ Pipeline has significant issues that need fixing');
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
    }
}

// Run the test
testModernPipeline().catch(console.error);