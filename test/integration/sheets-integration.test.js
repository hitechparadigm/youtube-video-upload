/**
 * Test Google Sheets integration with your specific spreadsheet
 */

const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Extract spreadsheet ID from your URL
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao/edit?gid=0#gid=0';
const SPREADSHEET_ID = '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao';

async function testGoogleSheetsConnection() {
    console.log('🔗 Testing Google Sheets Integration');
    console.log(`📊 Spreadsheet: ${SPREADSHEET_URL}`);
    console.log(`🆔 ID: ${SPREADSHEET_ID}\n`);
    
    try {
        // Test connection to the sheets sync function
        const testPayload = {
            httpMethod: 'GET',
            path: '/sync/sheets/test',
            queryStringParameters: {
                spreadsheetId: SPREADSHEET_ID
            }
        };
        
        console.log('🧪 Testing connection...');
        
        const result = await lambda.invoke({
            FunctionName: 'google-sheets-sync',
            Payload: JSON.stringify(testPayload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log('📋 Response Status:', response.statusCode);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log('✅ Connection successful!');
            console.log('📝 Spreadsheet Title:', body.spreadsheet);
            console.log('📄 Available Sheets:', body.sheets?.join(', '));
            
            if (body.preview) {
                console.log('\n📊 Preview of data:');
                console.log('Headers:', body.preview.headers);
                console.log('Sample rows:', body.preview.sampleRows?.length || 0);
                console.log('Total rows:', body.preview.totalRows);
                
                if (body.preview.sampleRows && body.preview.sampleRows.length > 0) {
                    console.log('\n🔍 First few rows:');
                    body.preview.sampleRows.forEach((row, index) => {
                        console.log(`Row ${index + 1}:`, row);
                    });
                }
            }
            
            return true;
        } else {
            const body = JSON.parse(response.body);
            console.log('❌ Connection failed:', body.error);
            console.log('Details:', body.details);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Error testing connection:', error.message);
        return false;
    }
}

async function testSyncFromSheets() {
    console.log('\n🔄 Testing sync from Google Sheets...');
    
    try {
        const syncPayload = {
            httpMethod: 'POST',
            path: '/sync/sheets',
            body: JSON.stringify({
                spreadsheetId: SPREADSHEET_ID,
                sheetName: 'Sheet1', // Adjust if your sheet has a different name
                dryRun: false // Set to true for testing without actually creating topics
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'google-sheets-sync',
            Payload: JSON.stringify(syncPayload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log('📋 Sync Response Status:', response.statusCode);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log('✅ Sync completed!');
            console.log('📊 Sync Report:');
            console.log(`  - Total rows processed: ${body.report?.totalRowsProcessed || 0}`);
            console.log(`  - Topics created: ${body.report?.topicsCreated || 0}`);
            console.log(`  - Topics updated: ${body.report?.topicsUpdated || 0}`);
            console.log(`  - Topics skipped: ${body.report?.topicsSkipped || 0}`);
            console.log(`  - Processing time: ${body.report?.processingTimeMs || 0}ms`);
            
            if (body.report?.errors && body.report.errors.length > 0) {
                console.log('⚠️  Errors encountered:');
                body.report.errors.forEach(error => console.log(`  - ${error}`));
            }
            
            return body.report;
        } else {
            const body = JSON.parse(response.body);
            console.log('❌ Sync failed:', body.error);
            return null;
        }
        
    } catch (error) {
        console.log('❌ Error during sync:', error.message);
        return null;
    }
}

async function checkCreatedTopics() {
    console.log('\n📋 Checking created topics...');
    
    try {
        const result = await lambda.invoke({
            FunctionName: 'topic-management',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/topics',
                queryStringParameters: { limit: '10' }
            })
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            console.log(`✅ Found ${body.count} topics in database`);
            
            // Show topics from Google Sheets
            const sheetsTopics = body.topics?.filter(topic => 
                topic.metadata?.source === 'google_sheets' || 
                topic.source === 'google_sheets'
            ) || [];
            
            if (sheetsTopics.length > 0) {
                console.log(`📊 ${sheetsTopics.length} topics from Google Sheets:`);
                sheetsTopics.forEach((topic, index) => {
                    console.log(`  ${index + 1}. ${topic.topic} (Priority: ${topic.priority})`);
                });
            } else {
                console.log('📝 No topics from Google Sheets found yet');
            }
            
            return body.topics;
        } else {
            console.log('❌ Failed to retrieve topics');
            return [];
        }
        
    } catch (error) {
        console.log('❌ Error checking topics:', error.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Google Sheets Integration Test\n');
    
    // Test connection
    const connectionWorking = await testGoogleSheetsConnection();
    
    if (connectionWorking) {
        // Test sync
        const syncReport = await testSyncFromSheets();
        
        if (syncReport) {
            // Check created topics
            await checkCreatedTopics();
            
            console.log('\n🎉 Google Sheets integration is working!');
            console.log('\n📋 Next steps:');
            console.log('1. ✅ Your spreadsheet is accessible');
            console.log('2. ✅ Topics can be synced from sheets');
            console.log('3. 🔄 Set up automatic sync (every 15 minutes)');
            console.log('4. 🎬 Topics will automatically generate scripts and videos');
        } else {
            console.log('\n⚠️  Sync had issues - check configuration');
        }
    } else {
        console.log('\n❌ Connection failed - need to configure Google Sheets credentials');
        console.log('\n📋 Required setup:');
        console.log('1. Create Google Service Account');
        console.log('2. Share spreadsheet with service account email');
        console.log('3. Configure credentials in Lambda environment');
    }
}

main().catch(console.error);