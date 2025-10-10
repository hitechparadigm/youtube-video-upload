#!/usr/bin/env node

/**
 * Test Media Curator Standalone
 */

async function testMediaCurator() {
  console.log('🧪 Testing Media Curator Standalone');
  
  try {
    const { handler: mediaHandler } = require('./src/lambda/media-curator/standalone.js');
    
    const result = await mediaHandler({
      body: JSON.stringify({
        projectId: 'test-project',
        baseTopic: 'Travel to Mexico',
        action: 'curate'
      })
    });

    console.log('Status Code:', result.statusCode);
    console.log('Response:', result.body);

    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      console.log('✅ SUCCESS');
      console.log('Media Assets:', data.mediaAssets?.length || 0);
    } else {
      console.log('❌ FAILED');
      const errorData = JSON.parse(result.body);
      console.log('Error:', errorData.error);
    }

  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

testMediaCurator();