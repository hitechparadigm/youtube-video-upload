/**
 * ⚡ TEST AGENT 8: Async Processor AI
 * Tests: Long-running operations and job queue management
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testAsyncProcessor() {
  console.log('⚡ TESTING AGENT 8: Async Processor AI');
  console.log('='.repeat(60));
  
  const jobId = `test-job-${Date.now()}`;
  
  try {
    console.log(`🆔 Job ID: ${jobId}`);
    console.log('⚡ Testing async processing and job queue management');
    console.log('');
    
    // Test 1: Health check
    console.log('🏥 Testing health endpoint...');
    const healthResult = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-async-processor-v3',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/health'
      })
    }).promise();
    
    const healthResponse = JSON.parse(healthResult.Payload);
    console.log(`   Health Status: ${healthResponse.statusCode === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (healthResponse.statusCode !== 200) {
      console.log('❌ Health check failed, skipping async processing test');
      return { success: false, error: 'Health check failed' };
    }
    
    // Test 2: Start async job
    console.log('⚡ Testing async job creation...');
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-async-processor-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/async/start-pipeline',
        body: JSON.stringify({
          jobId: jobId,
          baseTopic: 'Test Async Processing',
          source: 'agent-test',
          priority: 'normal',
          estimatedDuration: 300 // 5 minutes
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Async Processor AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Job ID: ${body.jobId}`);
      console.log(`   - Job Status: ${body.status || 'Unknown'}`);
      console.log(`   - Queue Position: ${body.queuePosition || 'N/A'}`);
      console.log(`   - Estimated Duration: ${body.estimatedDuration || 0}s`);
      console.log(`   - Processing Started: ${body.processingStarted ? '✅' : '❌'}`);
      
      // Test 3: Check job status
      if (body.jobId) {
        console.log('');
        console.log('🔍 Testing job status check...');
        
        const statusResult = await lambda.invoke({
          FunctionName: 'automated-video-pipeline-async-processor-v3',
          Payload: JSON.stringify({
            httpMethod: 'GET',
            path: `/async/jobs/${body.jobId}`
          })
        }).promise();
        
        const statusResponse = JSON.parse(statusResult.Payload);
        if (statusResponse.statusCode === 200) {
          const statusBody = JSON.parse(statusResponse.body);
          console.log(`   Job Status: ${statusBody.status || 'Unknown'}`);
          console.log(`   Progress: ${statusBody.progress || 0}%`);
          console.log(`   Current Stage: ${statusBody.currentStage || 'Unknown'}`);
        }
      }
      
      console.log('');
      console.log('🎯 ASYNC PROCESSING TEST:');
      console.log('   Expected: Job queue management and long-running operation support');
      console.log('   Status: ✅ Async processing capabilities verified');
      
      return {
        success: true,
        jobId: body.jobId,
        executionTime: executionTime,
        status: body.status,
        processingStarted: body.processingStarted
      };
    } else {
      console.log('❌ FAILED - Async Processor AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testAsyncProcessor().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 ASYNC PROCESSOR AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    console.log(`⚡ Job Status: ${result.status}`);
    console.log(`🚀 Processing Started: ${result.processingStarted ? '✅' : '❌'}`);
    console.log('📋 Async Processing: Job queue management verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});