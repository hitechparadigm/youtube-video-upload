#!/usr/bin/env node

/**
 * Comprehensive API Test
 * Tests all available API Gateway endpoints to get accurate success rate
 */

const API_ENDPOINT = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

async function testAllEndpoints() {
  console.log('🧪 Comprehensive API Endpoint Test\n');
    
  const testProjectId = `comprehensive-test-${Date.now()}`;
  const results = {};
    
  // Test 1: Topic Management - GET
  console.log('📋 Testing Topic Management (GET)...');
  try {
    const response = await fetch(`${API_ENDPOINT}/topics`, {
      method: 'GET',
      headers: { 'x-api-key': API_KEY }
    });
        
    if (response.ok) {
      results.topicManagementGet = true;
      console.log('   ✅ Topic Management GET: SUCCESS');
    } else {
      results.topicManagementGet = false;
      console.log('   ❌ Topic Management GET: FAILED');
    }
  } catch (error) {
    results.topicManagementGet = false;
    console.log('   ❌ Topic Management GET: ERROR');
  }
    
  // Test 2: Topic Management - POST
  console.log('\n📋 Testing Topic Management (POST)...');
  try {
    const response = await fetch(`${API_ENDPOINT}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        baseTopic: 'AI Tools for Content Creation',
        dailyFrequency: 1,
        priority: 1,
        status: 'active',
        targetAudience: 'content creators'
      })
    });
        
    if (response.ok) {
      results.topicManagementPost = true;
      console.log('   ✅ Topic Management POST: SUCCESS');
    } else {
      results.topicManagementPost = false;
      console.log('   ❌ Topic Management POST: FAILED');
    }
  } catch (error) {
    results.topicManagementPost = false;
    console.log('   ❌ Topic Management POST: ERROR');
  }
    
  // Test 3: Workflow Start
  console.log('\n🎯 Testing Workflow Start...');
  try {
    const response = await fetch(`${API_ENDPOINT}/workflow/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        projectId: testProjectId,
        baseTopic: 'AI Tools for Content Creation',
        targetAudience: 'content creators'
      })
    });
        
    if (response.ok) {
      results.workflowStart = true;
      console.log('   ✅ Workflow Start: SUCCESS');
    } else {
      results.workflowStart = false;
      console.log('   ❌ Workflow Start: FAILED');
    }
  } catch (error) {
    results.workflowStart = false;
    console.log('   ❌ Workflow Start: ERROR');
  }
    
  // Test 4: Workflow Status
  console.log('\n📊 Testing Workflow Status...');
  try {
    const response = await fetch(`${API_ENDPOINT}/workflow/status?workflowId=test-123`, {
      method: 'GET',
      headers: { 'x-api-key': API_KEY }
    });
        
    if (response.ok) {
      results.workflowStatus = true;
      console.log('   ✅ Workflow Status: SUCCESS');
    } else {
      results.workflowStatus = false;
      console.log('   ❌ Workflow Status: FAILED');
    }
  } catch (error) {
    results.workflowStatus = false;
    console.log('   ❌ Workflow Status: ERROR');
  }
    
  // Test 5: Workflow List
  console.log('\n📋 Testing Workflow List...');
  try {
    const response = await fetch(`${API_ENDPOINT}/workflow/list`, {
      method: 'GET',
      headers: { 'x-api-key': API_KEY }
    });
        
    if (response.ok) {
      results.workflowList = true;
      console.log('   ✅ Workflow List: SUCCESS');
    } else {
      results.workflowList = false;
      console.log('   ❌ Workflow List: FAILED');
    }
  } catch (error) {
    results.workflowList = false;
    console.log('   ❌ Workflow List: ERROR');
  }
    
  // Test 6: Media Search
  console.log('\n🔍 Testing Media Search...');
  try {
    const response = await fetch(`${API_ENDPOINT}/media/search`, {
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
        
    if (response.ok) {
      results.mediaSearch = true;
      console.log('   ✅ Media Search: SUCCESS');
    } else {
      results.mediaSearch = false;
      console.log('   ❌ Media Search: FAILED');
    }
  } catch (error) {
    results.mediaSearch = false;
    console.log('   ❌ Media Search: ERROR');
  }
    
  // Test 7: Media Curate
  console.log('\n🎨 Testing Media Curate...');
  try {
    const response = await fetch(`${API_ENDPOINT}/media/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        projectId: testProjectId,
        topic: 'AI Tools for Content Creation',
        mediaCount: 5
      })
    });
        
    if (response.ok) {
      results.mediaCurate = true;
      console.log('   ✅ Media Curate: SUCCESS');
    } else {
      results.mediaCurate = false;
      console.log('   ❌ Media Curate: FAILED');
    }
  } catch (error) {
    results.mediaCurate = false;
    console.log('   ❌ Media Curate: ERROR');
  }
    
  // Test 8: Video Assemble
  console.log('\n🎬 Testing Video Assemble...');
  try {
    const response = await fetch(`${API_ENDPOINT}/video/assemble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        projectId: testProjectId,
        scenes: [{
          sceneNumber: 1,
          title: 'Test Scene',
          content: 'This is a test script for video assembly.',
          duration: 10,
          mediaAssets: [{
            type: 'image',
            url: 'https://example.com/test-image.jpg',
            duration: 5
          }]
        }]
      })
    });
        
    if (response.ok) {
      results.videoAssemble = true;
      console.log('   ✅ Video Assemble: SUCCESS');
    } else {
      results.videoAssemble = false;
      console.log('   ❌ Video Assemble: FAILED');
    }
  } catch (error) {
    results.videoAssemble = false;
    console.log('   ❌ Video Assemble: ERROR');
  }
    
  // Test 9: Video Publish (YouTube)
  console.log('\n📺 Testing Video Publish...');
  try {
    const response = await fetch(`${API_ENDPOINT}/video/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        action: 'health'
      })
    });
        
    if (response.ok) {
      results.videoPublish = true;
      console.log('   ✅ Video Publish: SUCCESS');
    } else {
      results.videoPublish = false;
      console.log('   ❌ Video Publish: FAILED');
    }
  } catch (error) {
    results.videoPublish = false;
    console.log('   ❌ Video Publish: ERROR');
  }
    
  // Summary
  console.log('\n📊 COMPREHENSIVE API TEST RESULTS:');
  console.log('=====================================');
    
  const categories = {
    'Topic Management': ['topicManagementGet', 'topicManagementPost'],
    'Workflow': ['workflowStart', 'workflowStatus', 'workflowList'],
    'Media': ['mediaSearch', 'mediaCurate'],
    'Video': ['videoAssemble', 'videoPublish']
  };
    
  for (const [category, endpoints] of Object.entries(categories)) {
    console.log(`\n${category}:`);
    for (const endpoint of endpoints) {
      const status = results[endpoint] ? '✅' : '❌';
      const name = endpoint.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${status} ${name}`);
    }
  }
    
  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  const successRate = Math.round((successCount / totalCount) * 100);
    
  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`   Success Rate: ${successRate}% (${successCount}/${totalCount})`);
  console.log(`   Test Project ID: ${testProjectId}`);
    
  if (successRate >= 80) {
    console.log('\n🎉 API Gateway is working excellently!');
  } else if (successRate >= 60) {
    console.log('\n✅ API Gateway is working well with minor issues');
  } else if (successRate >= 40) {
    console.log('\n⚠️ API Gateway has some issues but core functionality works');
  } else {
    console.log('\n❌ API Gateway has significant issues that need fixing');
  }
}

// Run the test
testAllEndpoints().catch(console.error);