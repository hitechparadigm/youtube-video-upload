// Simple test for Google Sheets integration
process.env.AWS_REGION = 'us-east-1';
process.env.TOPICS_TABLE_NAME = 'automated-video-pipeline-topics-v2';

console.log('🧪 Testing Google Sheets integration...');

// Test the Google Sheets reading functionality directly
const SPREADSHEET_ID = '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

async function testSheetsReading() {
    try {
        console.log('📥 Fetching data from Google Sheets...');
        console.log('🔗 URL:', CSV_URL);
        
        const response = await fetch(CSV_URL);
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvData = await response.text();
        console.log('✅ Successfully fetched data');
        console.log('📝 First 200 characters:', csvData.substring(0, 200));
        
        // Parse CSV data
        const lines = csvData.trim().split('\n');
        console.log('📊 Total lines:', lines.length);
        
        if (lines.length > 1) {
            console.log('📋 Header:', lines[0]);
            console.log('📋 First data row:', lines[1]);
        }
        
        // Parse topics
        const topics = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Improved CSV parsing
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
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
            
            // Clean up quoted values
            for (let k = 0; k < values.length; k++) {
                if (values[k].startsWith('"') && values[k].endsWith('"')) {
                    values[k] = values[k].slice(1, -1);
                }
            }
            const topicText = values[0];
            const frequency = parseInt(values[1]) || 1;
            const status = (values[3] || 'active').toLowerCase(); // Status is column 4 (index 3)
            
            console.log(`🔍 Row ${i}: Topic="${topicText}", Freq="${values[1]}", Status="${values[3]}"`);
            
            if (topicText && topicText !== 'Topic' && status === 'active') {
                topics.push({
                    topic: topicText,
                    frequency: frequency,
                    status: status
                });
            }
        }
        
        console.log(`🎯 Found ${topics.length} active topics:`);
        topics.forEach((topic, index) => {
            console.log(`   ${index + 1}. ${topic.topic} (${topic.frequency}x daily)`);
        });
        
        return topics;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

testSheetsReading();