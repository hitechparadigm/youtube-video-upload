#!/usr/bin/env node

import LambdaInvoker from '../utils/lambda-invoker.js';

const invoker = new LambdaInvoker();
const agents = [
  'automated-video-pipeline-topic-management-v2',
  'automated-video-pipeline-script-generator-v2', 
  'automated-video-pipeline-media-curator-v2',
  'automated-video-pipeline-audio-generator-v2',
  'automated-video-pipeline-video-assembler-v2',
  'automated-video-pipeline-youtube-publisher-v2'
];

console.log('🔍 Quick AI Agent Test\n');

const results = { working: 0, broken: 0, details: [] };

for (const agent of agents) {
  console.log(`Testing ${agent}...`);
  try {
    const result = await invoker.invokeWithHTTP(agent, 'GET', '/health', {});
    const status = result.success ? '✅ Working' : '❌ Failed';
    console.log(`  Status: ${status}`);
    
    if (result.success) {
      results.working++;
    } else {
      results.broken++;
      if (result.data?.errorMessage) {
        console.log(`  Error: ${result.data.errorMessage.substring(0, 100)}...`);
        results.details.push({ agent, error: result.data.errorMessage });
      }
    }
  } catch (error) {
    console.log(`  💥 Exception: ${error.message}`);
    results.broken++;
    results.details.push({ agent, error: error.message });
  }
  console.log('');
}

console.log('📊 SUMMARY:');
console.log(`✅ Working: ${results.working}/${agents.length}`);
console.log(`❌ Broken: ${results.broken}/${agents.length}`);
console.log(`📈 Health: ${Math.round(results.working/agents.length*100)}%`);

if (results.details.length > 0) {
  console.log('\n🔧 Issues Found:');
  results.details.forEach(({ agent, error }) => {
    console.log(`  ${agent}: ${error.substring(0, 80)}...`);
  });
}