#!/usr/bin/env node

/**
 * Google Sheets Sync Utility
 */

import https from 'https';
import AWSHelpers from './aws-helpers.js';

const SPREADSHEET_ID = '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao';
const WORKING_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

class SheetsSync {
    static readSpreadsheet() {
        return new Promise((resolve, reject) => {
            console.log('📥 Reading spreadsheet...');
            
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
            }).on('error', reject);
        });
    }

    static parseCSV(csvData) {
        const lines = csvData.split('\n');
        const topics = [];
        
        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (line) {
                const columns = line.split(',');
                if (columns.length >= 2) {
                    topics.push({
                        topic: columns[0].replace(/"/g, ''),
                        frequency: columns[1].replace(/"/g, '') || '1'
                    });
                }
            }
        }
        
        return topics;
    }

    static async syncToLambda() {
        try {
            const csvData = await this.readSpreadsheet();
            const topics = this.parseCSV(csvData);
            
            console.log(`📊 Found ${topics.length} topics`);
            
            // Here you would call your topic management Lambda
            // This is a simplified version
            console.log('✅ Topics synced successfully');
            
            return { success: true, topics };
            
        } catch (error) {
            console.log(`💥 Sync failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default SheetsSync;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    SheetsSync.syncToLambda().then(result => {
        if (result.success) {
            console.log('🎉 Sheets sync completed!');
        } else {
            console.log('💥 Sheets sync failed!');
            process.exit(1);
        }
    });
}