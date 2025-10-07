/**
 * Test reading public Google Sheets without authentication
 */

const https = require('https');

// Your spreadsheet URL
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao/edit?gid=0#gid=0';
const SPREADSHEET_ID = '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao';

/**
 * Read public Google Sheet as CSV
 */
function readPublicSheet(spreadsheetId, sheetId = 0) {
    return new Promise((resolve, reject) => {
        // Google Sheets public CSV export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
        
        console.log('📥 Fetching:', csvUrl);
        
        https.get(csvUrl, (res) => {
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

/**
 * Parse CSV data into structured format
 */
function parseCSV(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const rows = lines.slice(1).map(line => {
        // Simple CSV parsing (handles basic cases)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        return values;
    });
    
    return { headers, rows };
}

/**
 * Convert sheet data to topics
 */
function convertToTopics(headers, rows) {
    const topics = [];
    
    // Try to identify columns (flexible mapping)
    const topicCol = headers.findIndex(h => 
        h.toLowerCase().includes('topic') || 
        h.toLowerCase().includes('title') ||
        h.toLowerCase().includes('subject')
    );
    
    const keywordsCol = headers.findIndex(h => 
        h.toLowerCase().includes('keyword') || 
        h.toLowerCase().includes('tag')
    );
    
    const priorityCol = headers.findIndex(h => 
        h.toLowerCase().includes('priority') || 
        h.toLowerCase().includes('importance')
    );
    
    const statusCol = headers.findIndex(h => 
        h.toLowerCase().includes('status') || 
        h.toLowerCase().includes('state')
    );
    
    console.log('📊 Column mapping:');
    console.log(`  Topic: ${topicCol >= 0 ? headers[topicCol] : 'Not found'} (col ${topicCol})`);
    console.log(`  Keywords: ${keywordsCol >= 0 ? headers[keywordsCol] : 'Not found'} (col ${keywordsCol})`);
    console.log(`  Priority: ${priorityCol >= 0 ? headers[priorityCol] : 'Not found'} (col ${priorityCol})`);
    console.log(`  Status: ${statusCol >= 0 ? headers[statusCol] : 'Not found'} (col ${statusCol})`);
    
    rows.forEach((row, index) => {
        if (topicCol >= 0 && row[topicCol] && row[topicCol].trim()) {
            const topic = {
                topic: row[topicCol].trim(),
                keywords: keywordsCol >= 0 ? (row[keywordsCol] || '').split(',').map(k => k.trim()).filter(k => k) : [],
                priority: priorityCol >= 0 ? parseInt(row[priorityCol]) || 5 : 5,
                status: statusCol >= 0 ? (row[statusCol] || 'active').toLowerCase() : 'active',
                dailyFrequency: 1,
                targetAudience: 'general',
                region: 'US',
                contentStyle: 'engaging_educational',
                source: 'google_sheets',
                rowIndex: index + 2 // +2 for header and 1-based indexing
            };
            
            // Only add if topic is substantial
            if (topic.topic.length > 10) {
                topics.push(topic);
            }
        }
    });
    
    return topics;
}

/**
 * Create topics using the topic management API
 */
async function createTopicsInPipeline(topics) {
    const AWS = require('aws-sdk');
    const lambda = new AWS.Lambda({ region: 'us-east-1' });
    
    const results = {
        created: 0,
        failed: 0,
        errors: []
    };
    
    for (const topic of topics) {
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
                results.created++;
                console.log(`✅ Created: ${topic.topic}`);
            } else {
                results.failed++;
                const error = JSON.parse(response.body);
                console.log(`❌ Failed: ${topic.topic} - ${error.error}`);
                results.errors.push(`${topic.topic}: ${error.error}`);
            }
            
        } catch (error) {
            results.failed++;
            console.log(`❌ Error creating ${topic.topic}:`, error.message);
            results.errors.push(`${topic.topic}: ${error.message}`);
        }
    }
    
    return results;
}

async function main() {
    console.log('🚀 Testing Public Google Sheets Integration\n');
    console.log('📊 Your spreadsheet:', SPREADSHEET_URL);
    
    try {
        // Step 1: Read the public sheet
        console.log('\n📥 Step 1: Reading spreadsheet data...');
        const csvData = await readPublicSheet(SPREADSHEET_ID);
        console.log(`✅ Successfully read ${csvData.length} characters of data`);
        
        // Step 2: Parse the data
        console.log('\n📋 Step 2: Parsing spreadsheet...');
        const { headers, rows } = parseCSV(csvData);
        console.log(`✅ Found ${headers.length} columns and ${rows.length} rows`);
        console.log('📄 Headers:', headers);
        
        // Show first few rows
        console.log('\n🔍 First 3 rows:');
        rows.slice(0, 3).forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, row);
        });
        
        // Step 3: Convert to topics
        console.log('\n🎯 Step 3: Converting to topics...');
        const topics = convertToTopics(headers, rows);
        console.log(`✅ Converted ${topics.length} valid topics`);
        
        if (topics.length > 0) {
            console.log('\n📝 Topics found:');
            topics.forEach((topic, index) => {
                console.log(`  ${index + 1}. ${topic.topic} (Priority: ${topic.priority})`);
            });
            
            // Step 4: Create topics in pipeline
            console.log('\n🔄 Step 4: Creating topics in pipeline...');
            const results = await createTopicsInPipeline(topics);
            
            console.log('\n📊 Results:');
            console.log(`✅ Created: ${results.created} topics`);
            console.log(`❌ Failed: ${results.failed} topics`);
            
            if (results.errors.length > 0) {
                console.log('\n⚠️  Errors:');
                results.errors.forEach(error => console.log(`  - ${error}`));
            }
            
            if (results.created > 0) {
                console.log('\n🎉 Success! Your spreadsheet topics are now in the pipeline!');
                console.log('🎬 The system will automatically:');
                console.log('  1. Generate scripts for each topic');
                console.log('  2. Create audio narration');
                console.log('  3. Find relevant media (images/videos)');
                console.log('  4. Assemble final videos');
                console.log('  5. Upload to your platforms');
            }
        } else {
            console.log('\n⚠️  No valid topics found in spreadsheet');
            console.log('💡 Make sure your spreadsheet has:');
            console.log('  - A column with "topic" or "title" in the header');
            console.log('  - Topics that are at least 10 characters long');
            console.log('  - The spreadsheet is publicly accessible');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        
        if (error.message.includes('403') || error.message.includes('401')) {
            console.log('\n🔒 The spreadsheet is not publicly accessible.');
            console.log('📋 To fix this:');
            console.log('  1. Open your Google Sheet');
            console.log('  2. Click "Share" button');
            console.log('  3. Change to "Anyone with the link can view"');
            console.log('  4. Copy the new shareable link');
        } else if (error.message.includes('404')) {
            console.log('\n🔍 Spreadsheet not found. Check the URL is correct.');
        } else {
            console.log('\n🔧 Unexpected error. The spreadsheet might have restrictions.');
        }
    }
}

main().catch(console.error);