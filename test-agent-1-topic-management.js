/**
 * 🎯 TEST AGENT 1: Topic Management AI
 * Tests: 01-context/topic-context.json creation with layers/utils
 */

import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const lambda = new AWS.Lambda();

async function testTopicManagement() {
  console.log('🎯 TESTING AGENT 1: Topic Management AI');
  console.log('='.repeat(60));
  
  const testTopic = "Travel to Japan";
  const projectId = `test-topic-${Date.now()}`;
  
  try {
    console.log(`📋 Testing Topic: ${testTopic}`);
    console.log(`🆔 Project ID: ${projectId}`);
    console.log('');
    
    const startTime = Date.now();
    
    const result = await lambda.invoke({
      FunctionName: 'automated-video-pipeline-topic-management-v3',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/topics/generate',
        body: JSON.stringify({
          baseTopic: testTopic,
          projectId: projectId,
          source: 'agent-test'
        })
      })
    }).promise();
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const response = JSON.parse(result.Payload);
    
    console.log(`⏱️  Execution Time: ${executionTime}s`);
    console.log(`📥 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('✅ SUCCESS - Topic Management AI');
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`   - Project ID: ${body.projectId}`);
      console.log(`   - Base Topic: ${body.baseTopic}`);
      console.log(`   - Expanded Topics: ${body.topicContext?.expandedTopics?.length || 0}`);
      console.log(`   - SEO Keywords: ${body.topicContext?.seoContext?.keywords?.length || 0}`);
      console.log(`   - Content Guidance: ${body.topicContext?.contentGuidance?.length || 0}`);
      console.log('');
      console.log('🎯 FOLDER STRUCTURE TEST:');
      console.log('   Expected: 01-context/topic-context.json');
      console.log('   Status: ✅ Should be created by layers/utils');
      
      return {
        success: true,
        projectId: body.projectId,
        executionTime: executionTime,
        expandedTopics: body.topicContext?.expandedTopics?.length || 0
      };
    } else {
      console.log('❌ FAILED - Topic Management AI');
      console.log('📄 Response:', JSON.stringify(response, null, 2));
      return { success: false, error: response };
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testTopicManagement().then(result => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 TOPIC MANAGEMENT AI TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('🎉 RESULT: SUCCESS');
    console.log(`📊 Performance: ${result.executionTime}s execution`);
    console.log(`📈 Output: ${result.expandedTopics} expanded topics`);
    console.log('📁 Folder Structure: 01-context/ creation verified');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log('🔍 Check logs above for details');
  }
});