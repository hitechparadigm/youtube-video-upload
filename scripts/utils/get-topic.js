#!/usr/bin/env node

/**
 * Simple utility to get first topic from Google Sheets
 */

import https from 'https';

const SHEETS_URL = 'https://doc-0g-7g-sheets.googleusercontent.com/export/54bogvaave6cua4cdnls17ksc4/25kvu36g8qv2rm15aeve514oj8/1759864415000/102276318090070491808/*/1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao?format=csv';

class TopicGetter {
    static getFirstTopic() {
        return new Promise((resolve, reject) => {
            console.log('📊 Getting First Topic from Google Sheets');
            
            https.get(SHEETS_URL, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const lines = data.trim().split('\n');
                    console.log('✅ Google Sheets accessed successfully!');
                    console.log(`📊 Total rows: ${lines.length}`);
                    
                    if (lines.length > 1) {
                        console.log('📋 Headers:', lines[0]);
                        console.log('🎯 First topic row:', lines[1]);
                        
                        const firstRow = lines[1].split(',');
                        const topic = firstRow[0]?.replace(/"/g, '') || 'Default Topic';
                        
                        resolve({ topic, rawData: lines[1] });
                    } else {
                        reject(new Error('No data found in sheets'));
                    }
                });
            }).on('error', reject);
        });
    }
}

export default TopicGetter;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    TopicGetter.getFirstTopic().then(result => {
        console.log(`🎯 Topic: ${result.topic}`);
    }).catch(error => {
        console.log(`💥 Error: ${error.message}`);
    });
}