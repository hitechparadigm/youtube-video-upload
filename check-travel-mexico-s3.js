#!/usr/bin/env node

/**
 * Check specific Travel to Mexico project in S3
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

async function checkTravelMexicoS3() {
  console.log('🔍 Checking Travel to Mexico Project in S3');
  console.log('=' .repeat(50));

  const bucketName = 'automated-video-pipeline-v2-786673323159-us-east-1';
  const projectId = '2025-10-10T04-03-17_travel-to-mexico';
  
  console.log(`🪣 Bucket: ${bucketName}`);
  console.log(`📁 Project: ${projectId}`);
  console.log('');

  try {
    const s3Client = new S3Client({ region: 'us-east-1' });

    // List objects for our specific project
    console.log('📋 Searching for project files...');
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `videos/${projectId}/`,
      MaxKeys: 50
    }));

    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log(`✅ Found ${listResult.Contents.length} files for the project:`);
      console.log('');

      // Group files by folder
      const folders = {};
      listResult.Contents.forEach(obj => {
        const pathParts = obj.Key.split('/');
        if (pathParts.length >= 3) {
          const folder = pathParts[2]; // 01-context, 02-script, etc.
          if (!folders[folder]) {
            folders[folder] = [];
          }
          folders[folder].push(obj);
        }
      });

      // Display files by folder
      Object.keys(folders).sort().forEach(folder => {
        const folderIcon = {
          '01-context': '📋',
          '02-script': '📝',
          '03-media': '🖼️',
          '04-audio': '🎵',
          '05-video': '🎬',
          '06-metadata': '📺'
        }[folder] || '📁';

        console.log(`${folderIcon} ${folder}/`);
        folders[folder].forEach(file => {
          const fileName = file.Key.split('/').pop();
          const size = (file.Size / 1024).toFixed(1);
          const date = file.LastModified.toLocaleString();
          console.log(`   - ${fileName} (${size} KB, ${date})`);
        });
        console.log('');
      });

      // Try to read the topic context file
      try {
        console.log('📖 Reading topic context file...');
        const contextKey = `videos/${projectId}/01-context/topic-context.json`;
        const contextResult = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: contextKey
        }));

        const contextData = await contextResult.Body.transformToString();
        const context = JSON.parse(contextData);
        
        console.log('✅ Topic Context Content:');
        console.log(`   📋 Selected Topic: ${context.selectedTopic}`);
        console.log(`   🎯 Subtopics: ${context.expandedTopics.length}`);
        console.log(`   🔑 Keywords: ${context.seoContext.primaryKeywords.join(', ')}`);
        console.log(`   ⏱️  Duration: ${context.videoStructure.totalDuration}s`);
        console.log('');

      } catch (readError) {
        console.log('❌ Could not read topic context file:', readError.message);
      }

      // Try to read the script file
      try {
        console.log('📖 Reading script file...');
        const scriptKey = `videos/${projectId}/02-script/script.json`;
        const scriptResult = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: scriptKey
        }));

        const scriptData = await scriptResult.Body.transformToString();
        const script = JSON.parse(scriptData);
        
        console.log('✅ Script Content:');
        console.log(`   📝 Scenes: ${script.scenes?.length || 'N/A'}`);
        console.log(`   ⏱️  Total Duration: ${script.totalDuration || 'N/A'}s`);
        if (script.scenes && script.scenes.length > 0) {
          console.log(`   🎬 First Scene: "${script.scenes[0].title || 'Untitled'}"`);
        }
        console.log('');

      } catch (readError) {
        console.log('❌ Could not read script file:', readError.message);
      }

    } else {
      console.log('❌ No files found for this project');
      console.log('');
      console.log('💡 This could mean:');
      console.log('   1. The project files were not actually saved to S3');
      console.log('   2. There was an error during the S3 upload process');
      console.log('   3. The project ID is different than expected');
      console.log('');
      console.log('🔍 Let\'s check for any recent "travel-to-mexico" projects...');
      
      // Search for any travel-to-mexico projects
      const searchResult = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'videos/',
        MaxKeys: 1000
      }));

      if (searchResult.Contents) {
        const travelMexicoProjects = searchResult.Contents
          .filter(obj => obj.Key.includes('travel-to-mexico'))
          .map(obj => {
            const pathParts = obj.Key.split('/');
            return pathParts.length >= 2 ? pathParts[1] : null;
          })
          .filter((project, index, arr) => project && arr.indexOf(project) === index);

        if (travelMexicoProjects.length > 0) {
          console.log(`\n🎯 Found ${travelMexicoProjects.length} "travel-to-mexico" projects:`);
          travelMexicoProjects.forEach((project, index) => {
            console.log(`   ${index + 1}. ${project}`);
          });
        } else {
          console.log('\n❌ No "travel-to-mexico" projects found in S3');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking S3:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkTravelMexicoS3()
    .then(() => {
      console.log('\n✅ Travel to Mexico S3 check completed');
    })
    .catch((error) => {
      console.error('\n💥 Travel to Mexico S3 check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkTravelMexicoS3 };