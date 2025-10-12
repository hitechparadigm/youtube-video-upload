/**
 * 🎬 TEST YOUTUBE PUBLISHER - COMPLETE METADATA CREATION
 * 
 * Tests the enhanced YouTube Publisher that creates:
 * - YouTube metadata
 * - Project summary
 * - Cost tracking  
 * - Analytics
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const API_ENDPOINT = 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'beusjltbol';
const PROJECT_ID = '2025-10-12T01-42-31_javascript-fundamentals';
const S3_BUCKET = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function testYouTubePublisherComplete() {
  console.log('🎬 TESTING YOUTUBE PUBLISHER - COMPLETE METADATA CREATION');
  console.log('=======================================================');
  
  try {
    // Step 1: Check current metadata folder
    console.log(`📝 Step 1: Checking current metadata folder for project: ${PROJECT_ID}`);
    const currentFiles = await listS3Files(`videos/${PROJECT_ID}/06-metadata/`);
    console.log(`📁 Current metadata files: ${currentFiles.length}`);
    currentFiles.forEach(file => {
      console.log(`   ${file.Key} (${file.Size} bytes)`);
    });
    
    // Step 2: Test YouTube Publisher health
    console.log('\n📝 Step 2: Testing YouTube Publisher health...');
    const healthResponse = await fetch(`${API_ENDPOINT}/youtube/health`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    console.log('Health response status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('Health response data:', JSON.stringify(healthData, null, 2));
    console.log('✅ Health check:', healthData.service, '-', healthData.status);
    console.log('📋 Capabilities:', healthData.capabilities ? healthData.capabilities.join(', ') : 'none');
    
    // Step 3: Invoke YouTube Publisher for complete metadata creation
    console.log('\n📝 Step 3: Invoking YouTube Publisher for COMPLETE metadata creation...');
    const publishResponse = await fetch(`${API_ENDPOINT}/youtube/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        projectId: PROJECT_ID,
        privacy: 'unlisted',
        metadata: {
          title: 'JavaScript Fundamentals - AI Generated Tutorial',
          category: 'Education',
          description: 'Comprehensive JavaScript tutorial created by AI pipeline'
        }
      })
    });
    
    const publishData = await publishResponse.json();
    console.log(`📋 YouTube Publisher Response Status: ${publishResponse.status}`);
    console.log('📋 Response data:', JSON.stringify(publishData, null, 2));
    
    if (publishData.success) {
      console.log('✅ YouTube Publisher succeeded');
      console.log(`   Mode: ${publishData.mode}`);
      console.log(`   Video ID: ${publishData.videoId}`);
      console.log(`   YouTube URL: ${publishData.youtubeUrl}`);
      console.log(`   Privacy: ${publishData.privacy}`);
      console.log(`   Status: ${publishData.status}`);
      console.log(`   Metadata Files Created: ${publishData.metadataFiles.length}`);
      
      console.log('\n📁 Created Files:');
      publishData.metadataFiles.forEach(file => {
        console.log(`     ${file.type}: ${file.key} (${file.size} bytes)`);
      });
      
      console.log('\n📊 Project Analysis:');
      console.log(`     Total Files: ${publishData.projectAnalysis.totalFiles}`);
      console.log(`     Content Types: ${publishData.projectAnalysis.contentTypes.join(', ')}`);
      console.log(`     Total Size: ${Math.round(publishData.projectAnalysis.totalSize / 1024)} KB`);
      
    } else {
      console.error('❌ YouTube Publisher failed:', publishData.error);
      if (publishData.details) {
        console.error('   Details:', publishData.details);
      }
    }
    
    // Step 4: Verify all metadata files were created
    console.log('\n📝 Step 4: Verifying all metadata files were created...');
    const updatedFiles = await listS3Files(`videos/${PROJECT_ID}/06-metadata/`);
    console.log(`📁 Updated metadata files: ${updatedFiles.length}`);
    
    const expectedFiles = [
      'youtube-metadata.json',
      'project-summary.json', 
      'cost-tracking.json',
      'analytics.json'
    ];
    
    console.log('\n🎯 METADATA FILE VERIFICATION:');
    console.log('===============================');
    
    for (const expectedFile of expectedFiles) {
      const found = updatedFiles.find(f => f.Key.includes(expectedFile));
      if (found) {
        console.log(`✅ ${expectedFile}: EXISTS (${found.Size} bytes)`);
        
        // Download and preview the file content
        try {
          const fileContent = await s3.getObject({
            Bucket: S3_BUCKET,
            Key: found.Key
          }).promise();
          
          const jsonContent = JSON.parse(fileContent.Body.toString());
          console.log(`   Type: ${jsonContent.type || 'metadata'}`);
          console.log(`   Project: ${jsonContent.projectId}`);
          console.log(`   Created: ${jsonContent.createdAt}`);
          
          // Show specific details for each file type
          if (expectedFile === 'youtube-metadata.json') {
            console.log(`   Video Title: ${jsonContent.videoDetails?.title}`);
            console.log(`   Privacy: ${jsonContent.videoDetails?.privacy}`);
            console.log(`   Quality Score: ${jsonContent.contentAnalysis?.qualityScore}`);
          } else if (expectedFile === 'project-summary.json') {
            console.log(`   Status: ${jsonContent.overview?.status}`);
            console.log(`   Total Assets: ${jsonContent.contentBreakdown?.totalAssets}`);
            console.log(`   Completeness: ${jsonContent.qualityMetrics?.contentCompleteness}%`);
          } else if (expectedFile === 'cost-tracking.json') {
            console.log(`   Total Cost: $${jsonContent.totalEstimatedCost}`);
            console.log(`   Lambda Cost: $${jsonContent.costBreakdown?.lambdaInvocations?.totalLambdaCost}`);
          } else if (expectedFile === 'analytics.json') {
            console.log(`   Success Rate: ${jsonContent.performanceMetrics?.pipelineEfficiency?.successRate}%`);
            console.log(`   Content Richness: ${jsonContent.performanceMetrics?.contentQuality?.contentRichness}`);
          }
          
        } catch (previewError) {
          console.log(`   Preview: Unable to read content (${previewError.message})`);
        }
        
      } else {
        console.log(`❌ ${expectedFile}: MISSING`);
      }
    }
    
    // Step 5: Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    console.log('====================');
    const createdCount = expectedFiles.filter(file => 
      updatedFiles.some(f => f.Key.includes(file))
    ).length;
    
    if (createdCount === expectedFiles.length) {
      console.log(`🎉 SUCCESS! All ${expectedFiles.length} metadata files created:`);
      console.log('   ✅ youtube-metadata.json (YouTube upload configuration)');
      console.log('   ✅ project-summary.json (Project completion summary)');
      console.log('   ✅ cost-tracking.json (AWS cost breakdown)');
      console.log('   ✅ analytics.json (Performance analytics)');
      console.log('\n🚀 06-metadata/ folder is now COMPLETE!');
      console.log('   Ready for YouTube upload and project archival');
    } else {
      console.log(`⚠️  PARTIAL SUCCESS: ${createdCount}/${expectedFiles.length} files created`);
      console.log('   Some metadata files may be missing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function listS3Files(prefix) {
  try {
    const response = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: prefix
    }).promise();
    
    return response.Contents || [];
  } catch (error) {
    console.error(`❌ Failed to list S3 files with prefix ${prefix}:`, error.message);
    return [];
  }
}

// Run the test
testYouTubePublisherComplete().catch(console.error);