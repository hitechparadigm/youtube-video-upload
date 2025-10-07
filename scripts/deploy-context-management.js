#!/usr/bin/env node

/**
 * Deploy Context Management Infrastructure
 * Creates DynamoDB table and sets up necessary AWS resources
 */

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize AWS client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function deployContextTable() {
    try {
        console.log('🚀 Deploying Context Management Infrastructure...\n');
        
        // Read table definition
        const tableDefinitionPath = join(__dirname, '..', 'infrastructure', 'context-table.json');
        const tableDefinition = JSON.parse(readFileSync(tableDefinitionPath, 'utf8'));
        
        console.log(`📋 Table Definition: ${tableDefinition.TableName}`);
        console.log(`   - Billing Mode: ${tableDefinition.BillingMode}`);
        console.log(`   - TTL Enabled: ${tableDefinition.TimeToLiveSpecification.Enabled}`);
        console.log(`   - GSI Count: ${tableDefinition.GlobalSecondaryIndexes.length}`);
        
        // Check if table already exists
        try {
            const describeResult = await dynamoClient.send(new DescribeTableCommand({
                TableName: tableDefinition.TableName
            }));
            
            console.log(`\n✅ Table already exists: ${tableDefinition.TableName}`);
            console.log(`   Status: ${describeResult.Table.TableStatus}`);
            console.log(`   Item Count: ${describeResult.Table.ItemCount || 0}`);
            console.log(`   Size: ${Math.round((describeResult.Table.TableSizeBytes || 0) / 1024)} KB`);
            
            return {
                tableName: tableDefinition.TableName,
                status: 'exists',
                tableArn: describeResult.Table.TableArn
            };
            
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.log(`\n📝 Creating new table: ${tableDefinition.TableName}`);
                
                // Create the table
                const createResult = await dynamoClient.send(new CreateTableCommand(tableDefinition));
                
                console.log(`✅ Table creation initiated: ${tableDefinition.TableName}`);
                console.log(`   Table ARN: ${createResult.TableDescription.TableArn}`);
                console.log(`   Status: ${createResult.TableDescription.TableStatus}`);
                
                // Wait for table to become active
                console.log('\n⏳ Waiting for table to become active...');
                await waitForTableActive(tableDefinition.TableName);
                
                console.log(`✅ Table is now active and ready for use!`);
                
                return {
                    tableName: tableDefinition.TableName,
                    status: 'created',
                    tableArn: createResult.TableDescription.TableArn
                };
                
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('❌ Error deploying context table:', error);
        throw error;
    }
}

async function waitForTableActive(tableName, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        try {
            const result = await dynamoClient.send(new DescribeTableCommand({
                TableName: tableName
            }));
            
            const status = result.Table.TableStatus;
            console.log(`   Table status: ${status}`);
            
            if (status === 'ACTIVE') {
                return true;
            }
            
            if (status === 'FAILED') {
                throw new Error(`Table creation failed: ${tableName}`);
            }
            
            // Wait 5 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } catch (error) {
            console.error(`   Error checking table status: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    throw new Error(`Table did not become active within ${maxWaitTime / 1000} seconds`);
}

async function validateDeployment() {
    try {
        console.log('\n🔍 Validating Context Management Deployment...');
        
        const tableName = 'automated-video-pipeline-context';
        
        // Check table status
        const describeResult = await dynamoClient.send(new DescribeTableCommand({
            TableName: tableName
        }));
        
        const table = describeResult.Table;
        
        console.log(`\n📊 Table Validation Results:`);
        console.log(`   ✅ Table Name: ${table.TableName}`);
        console.log(`   ✅ Status: ${table.TableStatus}`);
        console.log(`   ✅ Billing Mode: ${table.BillingModeSummary?.BillingMode || 'PROVISIONED'}`);
        
        // Validate key schema
        const expectedKeys = ['PK', 'SK'];
        const actualKeys = table.KeySchema.map(key => key.AttributeName);
        const keysValid = expectedKeys.every(key => actualKeys.includes(key));
        console.log(`   ${keysValid ? '✅' : '❌'} Key Schema: ${actualKeys.join(', ')}`);
        
        // Validate GSI
        const gsiCount = table.GlobalSecondaryIndexes?.length || 0;
        console.log(`   ${gsiCount > 0 ? '✅' : '❌'} Global Secondary Indexes: ${gsiCount}`);
        
        if (table.GlobalSecondaryIndexes) {
            for (const gsi of table.GlobalSecondaryIndexes) {
                console.log(`      - ${gsi.IndexName}: ${gsi.IndexStatus}`);
            }
        }
        
        // Validate TTL
        const ttlEnabled = table.TimeToLiveDescription?.TimeToLiveStatus === 'ENABLED';
        console.log(`   ${ttlEnabled ? '✅' : '❌'} TTL Configuration: ${ttlEnabled ? 'Enabled' : 'Disabled'}`);
        
        console.log(`\n🎯 Context Management Infrastructure is ready!`);
        
        return {
            valid: true,
            tableName: table.TableName,
            tableArn: table.TableArn,
            status: table.TableStatus
        };
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
        return {
            valid: false,
            error: error.message
        };
    }
}

async function showUsageInstructions() {
    console.log('\n📚 Context Management Usage Instructions:');
    console.log('');
    console.log('🔧 Environment Variables Required:');
    console.log('   CONTEXT_TABLE_NAME=automated-video-pipeline-context');
    console.log('   S3_BUCKET_NAME=your-pipeline-bucket');
    console.log('   AWS_REGION=us-east-1');
    console.log('');
    console.log('📝 Lambda Layer Integration:');
    console.log('   1. Add context-layer to your Lambda functions');
    console.log('   2. Import: const { storeContext, getContext } = require("/opt/nodejs/context-manager");');
    console.log('   3. Use context integration helpers for AI agents');
    console.log('');
    console.log('🔄 AI Agent Integration:');
    console.log('   - Topic Management AI: Use storeTopicContext()');
    console.log('   - Script Generator AI: Use getTopicContext() and storeSceneContext()');
    console.log('   - Media Curator AI: Use getSceneContext() and storeMediaContext()');
    console.log('   - Video Assembler AI: Use getMediaContext() and storeAssemblyContext()');
    console.log('');
    console.log('🌐 REST API Endpoints:');
    console.log('   POST /context - Create new context');
    console.log('   GET /context/{contextId} - Retrieve context');
    console.log('   PUT /context/{contextId} - Update context');
    console.log('   DELETE /context/{contextId} - Delete context');
    console.log('   GET /context/stats - Get usage statistics');
    console.log('   POST /context/cleanup - Clean expired contexts');
}

async function main() {
    try {
        console.log('🎯 Context Management Infrastructure Deployment\n');
        console.log('=' .repeat(80));
        
        // Deploy the context table
        const deployResult = await deployContextTable();
        
        // Validate the deployment
        const validationResult = await validateDeployment();
        
        if (validationResult.valid) {
            console.log('\n✅ Deployment completed successfully!');
            
            // Show usage instructions
            showUsageInstructions();
            
            console.log('\n' + '='.repeat(80));
            console.log('🏁 Context Management Infrastructure is ready for AI agent coordination!');
            
        } else {
            console.log('\n❌ Deployment validation failed');
            console.log(`Error: ${validationResult.error}`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Deployment failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);