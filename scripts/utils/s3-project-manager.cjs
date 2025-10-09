#!/usr/bin/env node

/**
 * S3 Project Manager
 * 
 * Utility script to manage organized video projects in S3 bucket.
 * Provides commands to list, clean up, and organize video projects.
 */

const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { listVideoProjects, parseProjectFolder } = require('../../src/utils/s3-folder-structure.cjs');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'automated-video-pipeline-v2-786673323159-us-east-1';

/**
 * List all video projects with details
 */
async function listProjects() {
    console.log('📁 Listing video projects...\n');
    
    try {
        const projects = await listVideoProjects(s3Client, BUCKET_NAME);
        
        if (projects.length === 0) {
            console.log('No video projects found.');
            return;
        }
        
        console.log(`Found ${projects.length} video projects:\n`);
        
        projects.forEach((project, index) => {
            console.log(`${index + 1}. ${project.folderName}`);
            console.log(`   📅 Created: ${project.date.toLocaleString()}`);
            console.log(`   📝 Title: ${project.title}`);
            console.log(`   📂 S3 Path: ${project.s3Prefix}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error listing projects:', error.message);
    }
}

/**
 * Clean up old or empty folders
 */
async function cleanupOldFolders() {
    console.log('🧹 Cleaning up old and empty folders...\n');
    
    try {
        // List all objects in videos/ prefix
        const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'videos/'
        }));
        
        if (!response.Contents || response.Contents.length === 0) {
            console.log('No files found in videos/ folder.');
            return;
        }
        
        // Group objects by folder
        const folderContents = {};
        response.Contents.forEach(obj => {
            const pathParts = obj.Key.split('/');
            if (pathParts.length >= 2) {
                const folderName = pathParts[1];
                if (!folderContents[folderName]) {
                    folderContents[folderName] = [];
                }
                folderContents[folderName].push(obj);
            }
        });
        
        // Identify folders to clean up
        const foldersToDelete = [];
        
        Object.entries(folderContents).forEach(([folderName, objects]) => {
            const projectInfo = parseProjectFolder(folderName);
            
            // Mark for deletion if:
            // 1. Invalid folder name format
            // 2. Older than 30 days
            // 3. Empty or contains only metadata
            
            if (!projectInfo.isValid) {
                console.log(`❌ Invalid folder format: ${folderName}`);
                foldersToDelete.push({ folderName, objects, reason: 'Invalid format' });
            } else {
                const daysSinceCreation = (Date.now() - projectInfo.date.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceCreation > 30) {
                    console.log(`🗓️ Old folder (${Math.round(daysSinceCreation)} days): ${folderName}`);
                    foldersToDelete.push({ folderName, objects, reason: `${Math.round(daysSinceCreation)} days old` });
                } else if (objects.length <= 2) {
                    console.log(`📂 Nearly empty folder: ${folderName} (${objects.length} files)`);
                    foldersToDelete.push({ folderName, objects, reason: 'Nearly empty' });
                }
            }
        });
        
        if (foldersToDelete.length === 0) {
            console.log('✅ No folders need cleanup.');
            return;
        }
        
        console.log(`\n🗑️ Found ${foldersToDelete.length} folders to clean up:`);
        foldersToDelete.forEach(folder => {
            console.log(`   - ${folder.folderName} (${folder.reason})`);
        });
        
        // In a real implementation, you might want to ask for confirmation here
        console.log('\n⚠️ This is a dry run. To actually delete, uncomment the deletion code.');
        
        // Uncomment to actually delete:
        /*
        for (const folder of foldersToDelete) {
            console.log(`🗑️ Deleting folder: ${folder.folderName}`);
            
            for (const obj of folder.objects) {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: obj.Key
                }));
                console.log(`   Deleted: ${obj.Key}`);
            }
        }
        */
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

/**
 * Show folder structure for a specific project
 */
async function showProjectStructure(folderName) {
    console.log(`📂 Project structure for: ${folderName}\n`);
    
    try {
        const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `videos/${folderName}/`
        }));
        
        if (!response.Contents || response.Contents.length === 0) {
            console.log('No files found in this project.');
            return;
        }
        
        // Organize files by subfolder
        const structure = {};
        response.Contents.forEach(obj => {
            const relativePath = obj.Key.replace(`videos/${folderName}/`, '');
            const pathParts = relativePath.split('/');
            
            if (pathParts.length > 1) {
                const subfolder = pathParts[0];
                if (!structure[subfolder]) {
                    structure[subfolder] = [];
                }
                structure[subfolder].push({
                    path: relativePath,
                    size: obj.Size,
                    modified: obj.LastModified
                });
            }
        });
        
        // Display structure
        Object.entries(structure).sort().forEach(([subfolder, files]) => {
            console.log(`📁 ${subfolder}/`);
            files.forEach(file => {
                const sizeKB = Math.round(file.size / 1024);
                console.log(`   📄 ${file.path} (${sizeKB} KB)`);
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error showing project structure:', error.message);
    }
}

/**
 * Main CLI interface
 */
async function main() {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    console.log('🎬 S3 Video Project Manager\n');
    
    switch (command) {
        case 'list':
            await listProjects();
            break;
            
        case 'cleanup':
            await cleanupOldFolders();
            break;
            
        case 'show':
            if (!arg) {
                console.log('❌ Please provide a folder name: node scripts/utils/s3-project-manager.cjs show <folder-name>');
                return;
            }
            await showProjectStructure(arg);
            break;
            
        default:
            console.log('Available commands:');
            console.log('  list     - List all video projects');
            console.log('  cleanup  - Clean up old/empty folders (dry run)');
            console.log('  show     - Show structure of specific project');
            console.log('');
            console.log('Usage:');
            console.log('  node scripts/utils/s3-project-manager.cjs list');
            console.log('  node scripts/utils/s3-project-manager.cjs cleanup');
            console.log('  node scripts/utils/s3-project-manager.cjs show <folder-name>');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { listProjects, cleanupOldFolders, showProjectStructure };