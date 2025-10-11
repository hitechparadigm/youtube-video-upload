/**
 * 🎯 SIMPLE ORCHESTRATOR TEST
 * Tests the orchestrator with proper path and examines the actual response
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testOrchestratorSimple() {
  console.log('🎯 SIMPLE ORCHESTRATOR TEST');
  console.log('='.repeat(60));
  
  try {
    console.log('🚀 Calling orchestrator with /workflow/start path...');
    
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/workflow/start',
        body: JSON.stringify({
          baseTopic: 'Travel to France - Complete Guide',
          targetAudience: 'travelers',
          videoDuration: 480,
          videoStyle: 'travel_guide'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    console.log('');
    console.log('📄 FULL RESPONSE:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.body) {
      console.log('');
      console.log('📄 RESPONSE BODY:');
      const body = JSON.parse(response.body);
      console.log(JSON.stringify(body, null, 2));
      
      if (body.result && body.result.projectId) {
        console.log('');
        console.log(`✅ Project ID found: ${body.result.projectId}`);
        return { success: true, projectId: body.result.projectId };
      }
    }
    
    return { success: false, error: 'No project ID in response' };
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test with different paths to see which one works
async function testMultiplePaths() {
  console.log('🔍 TESTING MULTIPLE ORCHESTRATOR PATHS');
  console.log('='.repeat(80));
  
  const paths = [
    '/workflow/start',
    '/start',
    '/start-enhanced',
    '/health'
  ];
  
  for (const path of paths) {
    console.log(`\\n🧪 Testing path: ${path}`);
    console.log('-'.repeat(40));
    
    try {
      const payload = {
        httpMethod: path === '/health' ? 'GET' : 'POST',
        path: path
      };
      
      if (path !== '/health') {
        payload.body = JSON.stringify({
          baseTopic: 'Travel to France - Complete Guide',
          targetAudience: 'travelers',
          videoDuration: 480,
          videoStyle: 'travel_guide'
        });
      }
      
      const result = await lambda.invoke({
        FunctionName: 'automated-video-pipeline-workflow-orchestrator-v3',
        Payload: JSON.stringify(payload)
      }).promise();
      
      const response = JSON.parse(result.Payload);
      console.log(`   Status: ${response.statusCode}`);
      
      if (response.body) {
        const body = JSON.parse(response.body);
        if (body.result && body.result.projectId) {
          console.log(`   ✅ Project ID: ${body.result.projectId}`);
        } else if (body.service) {
          console.log(`   ✅ Health: ${body.service} - ${body.status}`);
        } else {
          console.log(`   📄 Response: ${JSON.stringify(body).substring(0, 100)}...`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Run both tests
testMultiplePaths().then(() => {
  console.log('\\n');
  return testOrchestratorSimple();
}).then(result => {
  console.log('\\n🏁 SIMPLE ORCHESTRATOR TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ Orchestrator is working and returns project ID');
    console.log(`📋 Project ID: ${result.projectId}`);
  } else {
    console.log('❌ Orchestrator issue identified');
    console.log(`⚠️  Error: ${result.error}`);
  }
  
}).catch(error => {
  console.error('💥 Test suite failed:', error);
});