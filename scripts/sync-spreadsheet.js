/**
 * Sync your specific Google Spreadsheet to the video pipeline
 */

const https = require('https');
const AWS = require('aws-sdk');

const SPREADSHEET_ID = '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao';
const WORKING_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

const lambda = new AWS.Lambda({ region: 'us-east-1' });

function readSpreadsheet() {
    return new Promise((resolve, reject) => {
        console.log('📥 Reading your spreadsheet...');
        
        https.get(WORKING_URL, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

function parseCSV(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const rows = lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.replace(/"/g, '').trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.replace(/"/g, '').trim());
        
        return values;
    });
    
    return { headers, rows };
}

function convertToTopics(headers, rows) {
    console.log('📊 Your spreadsheet structure:');
    console.log('Headers:', headers);
    
    const topics = [];
    
    // Map your specific columns
    const topicCol = 0; // "Topic"
    const frequencyCol = 1; // "Daily Frequency" 
    const statusCol = 2; // "Status"
    const notesCol = 3; // "Notes"
    
    console.log(`\n🎯 Processing ${rows.length} rows...`);
    
    rows.forEach((row, index) => {
        if (row[topicCol] && row[topicCol].trim() && row[topicCol] !== 'Topic') {
            const topicText = row[topicCol].trim();
            const frequency = parseInt(row[frequencyCol]) || 1;
            const status = (row[statusCol] || 'active').toLowerCase();
            const notes = row[notesCol] || '';
            
            // Extract keywords from topic
            const keywords = topicText
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
                .slice(0, 8);
            
            const topic = {
                topic: topicText,
                keywords: keywords,
                dailyFrequency: Math.min(frequency, 3), // Cap at 3 per day
                priority: frequency > 1 ? 3 : 5, // Higher frequency = higher priority
                status: ['active', 'paused', 'archived'].includes(status) ? status : 'active',
                targetAudience: 'general',
                region: 'US',
                contentStyle: 'engaging_educational',
                metadata: {
                    source: 'google_sheets',
                    notes: notes,
                    rowIndex: index + 2,
                    originalFrequency: frequency
                }
            };
            
            topics.push(topic);
            console.log(`  ✅ ${index + 1}. ${topicText} (${frequency}x daily)`);
        }
    });
    
    return topics;
}

async function createTopicInPipeline(topic) {
    try {
        const payload = {
            httpMethod: 'POST',
            path: '/topics',
            body: JSON.stringify(topic)
        };
        
        const result = await lambda.invoke({
            FunctionName: 'topic-management',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 201) {
            const createdTopic = JSON.parse(response.body);
            return { success: true, topicId: createdTopic.topicId };
        } else {
            const error = JSON.parse(response.body);
            return { success: false, error: error.error || 'Unknown error' };
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function triggerScriptGeneration(topicId) {
    try {
        // Check if script generator function exists
        const functions = await lambda.listFunctions().promise();
        const scriptGenerator = functions.Functions.find(f => 
            f.FunctionName.includes('script') || f.FunctionName.includes('generator')
        );
        
        if (scriptGenerator) {
            console.log(`🎬 Triggering script generation for topic ${topicId}...`);
            
            const payload = {
                topicId: topicId,
                action: 'generate_script'
            };
            
            await lambda.invoke({
                FunctionName: scriptGenerator.FunctionName,
                InvocationType: 'Event', // Async
                Payload: JSON.stringify(payload)
            }).promise();
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.log(`⚠️  Could not trigger script generation: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Syncing Your Google Spreadsheet to Video Pipeline\n');
    
    try {
        // Step 1: Read spreadsheet
        const csvData = await readSpreadsheet();
        console.log('✅ Successfully read spreadsheet data\n');
        
        // Step 2: Parse data
        const { headers, rows } = parseCSV(csvData);
        
        // Step 3: Convert to topics
        const topics = convertToTopics(headers, rows);
        console.log(`\n📋 Found ${topics.length} topics to create\n`);
        
        if (topics.length === 0) {
            console.log('❌ No valid topics found in spreadsheet');
            return;
        }
        
        // Step 4: Create topics in pipeline
        console.log('🔄 Creating topics in pipeline...\n');
        
        const results = {
            created: [],
            failed: [],
            scriptsTriggered: 0
        };
        
        for (const topic of topics) {
            const result = await createTopicInPipeline(topic);
            
            if (result.success) {
                results.created.push({
                    topic: topic.topic,
                    topicId: result.topicId,
                    frequency: topic.dailyFrequency
                });
                console.log(`✅ Created: ${topic.topic}`);
                
                // Try to trigger script generation
                const scriptTriggered = await triggerScriptGeneration(result.topicId);
                if (scriptTriggered) {
                    results.scriptsTriggered++;
                }
                
            } else {
                results.failed.push({
                    topic: topic.topic,
                    error: result.error
                });
                console.log(`❌ Failed: ${topic.topic} - ${result.error}`);
            }
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Step 5: Summary
        console.log('\n🎉 Sync Complete!\n');
        console.log('📊 Results:');
        console.log(`  ✅ Successfully created: ${results.created.length} topics`);
        console.log(`  ❌ Failed: ${results.failed.length} topics`);
        console.log(`  🎬 Scripts triggered: ${results.scriptsTriggered} topics`);
        
        if (results.created.length > 0) {
            console.log('\n📝 Created Topics:');
            results.created.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.topic} (${item.frequency}x daily)`);
                console.log(`     ID: ${item.topicId}`);
            });
            
            console.log('\n🎬 What happens next:');
            console.log('  1. ✅ Topics are now in your pipeline');
            console.log('  2. 🤖 AI will generate scripts for each topic');
            console.log('  3. 🎙️  Audio narration will be created');
            console.log('  4. 🖼️  Relevant images/videos will be found');
            console.log('  5. 🎥 Complete videos will be assembled');
            console.log('  6. 📤 Videos will be ready for upload');
            
            console.log('\n⏰ Timeline:');
            console.log('  - Script generation: 2-5 minutes per topic');
            console.log('  - Audio generation: 1-3 minutes per script');
            console.log('  - Video assembly: 3-7 minutes per video');
            console.log('  - Total time: ~10-15 minutes per video');
            
            const totalVideosPerDay = results.created.reduce((sum, item) => sum + item.frequency, 0);
            console.log(`\n📈 Your pipeline will create ~${totalVideosPerDay} videos per day!`);
        }
        
        if (results.failed.length > 0) {
            console.log('\n⚠️  Failed Topics:');
            results.failed.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.topic}: ${item.error}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

main().catch(console.error);