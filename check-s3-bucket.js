#!/usr/bin/env node

/**
 * Check S3 Bucket Configuration and Contents
 */

const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function checkS3Bucket() {
  console.log('🔍 Checking S3 Bucket Configuration');
  console.log('=' .repeat(50));

  try {
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    // List all buckets
    console.log('📋 Listing all S3 buckets...');
    const bucketsResult = await s3Client.send(new ListBucketsCommand({}));
    
    console.log(`Found ${bucketsResult.Buckets.length} buckets:`);
    bucketsResult.Buckets.forEach((bucket, index) => {
      console.log(`   ${index + 1}. ${bucket.Name} (created: ${bucket.CreationDate})`);
    });

    // Look for video pipeline buckets
    const videoPipelineBuckets = bucketsResult.Buckets.filter(bucket => 
      bucket.Name.includes('automated-video-pipeline') || 
      bucket.Name.includes('video-pipeline')
    );

    if (videoPipelineBuckets.length > 0) {
      console.log('\n🎬 Found video pipeline buckets:');
      
      for (const bucket of videoPipelineBuckets) {
        console.log(`\n📁 Bucket: ${bucket.Name}`);
        
        try {
          // List objects in the bucket
          const objectsResult = await s3Client.send(new ListObjectsV2Command({
            Bucket: bucket.Name,
            Prefix: 'videos/',
            MaxKeys: 100
          }));

          if (objectsResult.Contents && objectsResult.Contents.length > 0) {
            console.log(`   📊 Found ${objectsResult.Contents.length} objects:`);
            
            // Group by project folder
            const projects = {};
            objectsResult.Contents.forEach(obj => {
              const pathParts = obj.Key.split('/');
              if (pathParts.length >= 2 && pathParts[0] === 'videos') {
                const projectId = pathParts[1];
                if (!projects[projectId]) {
                  projects[projectId] = [];
                }
                projects[projectId].push(obj);
              }
            });

            Object.keys(projects).forEach(projectId => {
              console.log(`\n   📁 Project: ${projectId}`);
              console.log(`      Files: ${projects[projectId].length}`);
              
              // Show recent files
              const recentFiles = projects[projectId]
                .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
                .slice(0, 5);
              
              recentFiles.forEach(file => {
                const size = (file.Size / 1024).toFixed(1);
                console.log(`      - ${file.Key} (${size} KB, ${file.LastModified})`);
              });
            });
          } else {
            console.log('   📭 No objects found in videos/ folder');
          }
        } catch (listError) {
          console.log(`   ❌ Error listing objects: ${listError.message}`);
        }
      }
    } else {
      console.log('\n❌ No video pipeline buckets found');
      console.log('💡 The CDK stack may not be deployed, or buckets have different names');
    }

    // Check environment variables
    console.log('\n🔧 Environment Variables:');
    console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'not set'}`);
    console.log(`   S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || 'not set'}`);
    console.log(`   S3_BUCKET: ${process.env.S3_BUCKET || 'not set'}`);

  } catch (error) {
    console.error('❌ Error checking S3:', error.message);
    
    if (error.name === 'CredentialsProviderError') {
      console.log('\n💡 AWS credentials not configured. To fix this:');
      console.log('   1. Run: aws configure');
      console.log('   2. Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      console.log('   3. Or use AWS CLI profiles');
    }
  }
}

// Run the check
if (require.main === module) {
  checkS3Bucket()
    .then(() => {
      console.log('\n✅ S3 bucket check completed');
    })
    .catch((error) => {
      console.error('\n💥 S3 bucket check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkS3Bucket };