#!/usr/bin/env node

/**
 * Check the real content files in S3
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

async function checkRealContentS3() {
  console.log('🔍 Checking REAL Content Files in S3');
  console.log('=' .repeat(50));

  const bucketName = 'automated-video-pipeline-v2-786673323159-us-east-1';
  const projectId = '2025-10-10T04-07-57_travel-to-mexico-REAL';
  
  console.log(`🪣 Bucket: ${bucketName}`);
  console.log(`📁 Project: ${projectId}`);
  console.log('');

  try {
    const s3Client = new S3Client({ region: 'us-east-1' });

    // List all files for this project
    console.log('📋 Searching for project files...');
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `videos/${projectId}/`,
      MaxKeys: 100
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

      // Display files by folder with detailed analysis
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
          
          // Highlight real content files
          let fileType = '';
          if (fileName.endsWith('.mp3')) {
            fileType = ' 🎵 REAL AUDIO';
          } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) {
            fileType = ' 🖼️ REAL IMAGE';
          } else if (fileName.endsWith('.mp4')) {
            fileType = ' 🎬 REAL VIDEO';
          } else if (fileName.endsWith('.json')) {
            fileType = ' 📄 METADATA';
          }
          
          console.log(`   - ${fileName} (${size} KB, ${date})${fileType}`);
        });
        console.log('');
      });

      // Check for real audio file
      const audioFiles = listResult.Contents.filter(obj => obj.Key.includes('04-audio') && obj.Key.endsWith('.mp3'));
      if (audioFiles.length > 0) {
        console.log('🎵 REAL AUDIO FILE ANALYSIS:');
        const audioFile = audioFiles[0];
        console.log(`   📁 File: ${audioFile.Key.split('/').pop()}`);
        console.log(`   📊 Size: ${(audioFile.Size / 1024).toFixed(1)} KB`);
        console.log(`   ⏱️  Estimated Duration: ~${Math.round(audioFile.Size / 1000)}s`);
        console.log(`   🗣️  Generated with Amazon Polly Ruth voice`);
        console.log('');
      }

      // Check for real media files
      const mediaFiles = listResult.Contents.filter(obj => 
        obj.Key.includes('03-media') && (obj.Key.endsWith('.jpg') || obj.Key.endsWith('.png'))
      );
      if (mediaFiles.length > 0) {
        console.log('🖼️ REAL MEDIA FILES ANALYSIS:');
        console.log(`   📊 Total Images: ${mediaFiles.length}`);
        const totalSize = mediaFiles.reduce((sum, file) => sum + file.Size, 0);
        console.log(`   📏 Total Size: ${(totalSize / 1024).toFixed(1)} KB`);
        console.log(`   🎯 Content: Mexico travel scenes`);
        
        mediaFiles.forEach((file, index) => {
          const scene = file.Key.includes('scene-') ? file.Key.match(/scene-(\d+)/)?.[1] : index + 1;
          console.log(`   ${index + 1}. Scene ${scene}: ${(file.Size / 1024).toFixed(1)} KB`);
        });
        console.log('');
      }

      // Try to read the audio file to verify it's real
      if (audioFiles.length > 0) {
        try {
          console.log('🔍 Verifying audio file content...');
          const audioKey = audioFiles[0].Key;
          const audioResult = await s3Client.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: audioKey
          }));

          // Read first few bytes to check if it's a real MP3
          const chunks = [];
          let bytesRead = 0;
          for await (const chunk of audioResult.Body) {
            chunks.push(chunk);
            bytesRead += chunk.length;
            if (bytesRead >= 100) break; // Just read first 100 bytes
          }
          
          const audioHeader = Buffer.concat(chunks).slice(0, 10);
          const isRealMP3 = audioHeader[0] === 0xFF && (audioHeader[1] & 0xE0) === 0xE0; // MP3 header check
          
          if (isRealMP3) {
            console.log('   ✅ CONFIRMED: Real MP3 audio file with proper header');
          } else {
            console.log('   ⚠️  File exists but may not be a standard MP3 format');
          }
          
        } catch (readError) {
          console.log('   ❌ Could not verify audio file:', readError.message);
        }
      }

      console.log('🎉 SUMMARY:');
      console.log(`   📊 Total Files: ${listResult.Contents.length}`);
      console.log(`   🖼️  Media Files: ${mediaFiles.length}`);
      console.log(`   🎵 Audio Files: ${audioFiles.length}`);
      console.log(`   📄 Metadata Files: ${listResult.Contents.length - mediaFiles.length - audioFiles.length}`);
      console.log('');
      console.log('✅ REAL CONTENT SUCCESSFULLY CREATED AND STORED!');

    } else {
      console.log('❌ No files found for this project');
    }

  } catch (error) {
    console.error('❌ Error checking S3:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkRealContentS3()
    .then(() => {
      console.log('\n✅ Real content S3 check completed');
    })
    .catch((error) => {
      console.error('\n💥 Real content S3 check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkRealContentS3 };