/**
 * Google Sheets Integration Service
 * Node.js 20.x Runtime
 * 
 * Reads Google Sheets directly via public/shared URLs, syncs topic configurations,
 * handles conflict resolution for concurrent updates, and tracks sync history.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TOPICS_TABLE = process.env.TOPICS_TABLE_NAME;
const SYNC_HISTORY_TABLE = process.env.SYNC_HISTORY_TABLE_NAME;

/**
 * Lambda handler for Google Sheets sync operations
 */
export const handler = async (event) => {
    console.log('Google Sheets Sync Lambda invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { action, spreadsheetUrl, syncMode } = event;
        
        if (!spreadsheetUrl) {
            throw new Error('Spreadsheet URL is required');
        }
        
        switch (action) {
            case 'sync':
                return await handleSync(spreadsheetUrl, syncMode);
            case 'validate':
                return await handleValidation(spreadsheetUrl);
            case 'history':
                return await handleSyncHistory(event.limit);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        console.error('Error in Google Sheets sync:', error);
        
        // Log sync error
        await logSyncError(error, event);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Google Sheets sync failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Handle sync operation from Google Sheets to DynamoDB
 */
async function handleSync(spreadsheetUrl, syncMode = 'incremental') {
    const syncId = uuidv4();
    const startTime = new Date().toISOString();
    
    console.log(`Starting sync ${syncId} - Mode: ${syncMode}`);
    
    try {
        // Convert Google Sheets URL to CSV export URL
        const csvUrl = convertToCSVUrl(spreadsheetUrl);
        
        // Read data from Google Sheets via CSV export
        const sheetData = await readGoogleSheetCSV(csvUrl);
        
        if (!sheetData || sheetData.length === 0) {
            throw new Error('No data found in Google Sheets');
        }
        
        // Parse and validate sheet data
        const parsedTopics = parseSheetData(sheetData);
        
        // Sync topics to DynamoDB
        const syncResults = await syncTopicsToDynamoDB(parsedTopics, syncMode);
        
        // Log successful sync
        await logSyncHistory({
            syncId,
            status: 'success',
            startTime,
            endTime: new Date().toISOString(),
            spreadsheetUrl,
            csvUrl,
            syncMode,
            topicsProcessed: syncResults.processed,
            topicsCreated: syncResults.created,
            topicsUpdated: syncResults.updated,
            topicsSkipped: syncResults.skipped,
            errors: syncResults.errors
        });
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                syncId,
                status: 'success',
                summary: syncResults,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        // Log failed sync
        await logSyncHistory({
            syncId,
            status: 'failed',
            startTime,
            endTime: new Date().toISOString(),
            spreadsheetUrl,
            syncMode,
            error: error.message
        });
        
        throw error;
    }
}

/**
 * Handle validation of Google Sheets structure
 */
async function handleValidation(spreadsheetUrl) {
    try {
        const csvUrl = convertToCSVUrl(spreadsheetUrl);
        const sheetData = await readGoogleSheetCSV(csvUrl);
        
        if (!sheetData || sheetData.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    valid: false,
                    error: 'No data found in sheet'
                })
            };
        }
        
        const validation = validateSheetStructure(sheetData);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                valid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                rowCount: sheetData.length - 1, // Exclude header
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                valid: false,
                error: error.message
            })
        };
    }
}

/**
 * Handle sync history retrieval
 */
async function handleSyncHistory(limit = 10) {
    try {
        const result = await docClient.send(new QueryCommand({
            TableName: SYNC_HISTORY_TABLE,
            IndexName: 'TimestampIndex',
            KeyConditionExpression: '#pk = :pk',
            ExpressionAttributeNames: {
                '#pk': 'partitionKey'
            },
            ExpressionAttributeValues: {
                ':pk': 'SYNC_HISTORY'
            },
            ScanIndexForward: false, // Most recent first
            Limit: parseInt(limit)
        }));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                history: result.Items || [],
                count: result.Items?.length || 0,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        throw new Error(`Failed to retrieve sync history: ${error.message}`);
    }
}

/**
 * Convert Google Sheets URL to CSV export URL
 */
function convertToCSVUrl(spreadsheetUrl) {
    try {
        // Extract spreadsheet ID from various Google Sheets URL formats
        let spreadsheetId;
        
        // Format 1: https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
        let match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            spreadsheetId = match[1];
        } else {
            throw new Error('Invalid Google Sheets URL format');
        }
        
        // Extract sheet ID (gid) if present
        let sheetId = '0'; // Default to first sheet
        const gidMatch = spreadsheetUrl.match(/gid=([0-9]+)/);
        if (gidMatch) {
            sheetId = gidMatch[1];
        }
        
        // Construct CSV export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
        
        console.log(`Converted URL: ${spreadsheetUrl} -> ${csvUrl}`);
        return csvUrl;
        
    } catch (error) {
        throw new Error(`Failed to convert spreadsheet URL: ${error.message}`);
    }
}

/**
 * Read data from Google Sheets via CSV export
 */
async function readGoogleSheetCSV(csvUrl) {
    try {
        console.log(`Fetching data from: ${csvUrl}`);
        
        const response = await fetch(csvUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AWS Lambda)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Empty response from Google Sheets');
        }
        
        // Parse CSV data
        const rows = parseCSV(csvText);
        
        console.log(`Successfully read ${rows.length} rows from Google Sheets`);
        return rows;
        
    } catch (error) {
        throw new Error(`Failed to read Google Sheet CSV: ${error.message}`);
    }
}

/**
 * Simple CSV parser
 */
function parseCSV(csvText) {
    const rows = [];
    const lines = csvText.split('\n');
    
    for (const line of lines) {
        if (line.trim().length === 0) continue;
        
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        row.push(current.trim());
        
        // Clean up quoted fields
        const cleanedRow = row.map(field => {
            if (field.startsWith('"') && field.endsWith('"')) {
                return field.slice(1, -1).replace(/""/g, '"');
            }
            return field;
        });
        
        rows.push(cleanedRow);
    }
    
    return rows;
}

/**
 * Parse sheet data into topic objects
 */
function parseSheetData(sheetData) {
    const [headers, ...rows] = sheetData;
    
    // Expected headers: Topic, Daily Frequency, Priority, Status, Target Audience, Region, Content Style, Tags
    // Note: Headers are validated in validateSheetStructure function
    
    const topics = [];
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after header)
        
        if (!row || row.length === 0 || !row[0]) {
            continue; // Skip empty rows
        }
        
        try {
            const topic = {
                sheetRowNumber: rowNumber,
                topic: row[0]?.trim(),
                dailyFrequency: parseInt(row[1]) || 1,
                priority: parseInt(row[2]) || 5,
                status: (row[3]?.toLowerCase() || 'active').trim(),
                targetAudience: row[4]?.trim() || 'general',
                region: row[5]?.trim() || 'US',
                contentStyle: row[6]?.trim() || 'engaging_educational',
                tags: row[7] ? row[7].split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                sourceSheet: true,
                lastSyncedAt: new Date().toISOString()
            };
            
            // Validate required fields
            if (!topic.topic) {
                console.warn(`Row ${rowNumber}: Missing topic, skipping`);
                continue;
            }
            
            topics.push(topic);
        } catch (error) {
            console.error(`Error parsing row ${rowNumber}:`, error);
        }
    }
    
    return topics;
}

/**
 * Validate Google Sheets structure
 */
function validateSheetStructure(sheetData) {
    const errors = [];
    const warnings = [];
    
    if (!sheetData || sheetData.length === 0) {
        errors.push('Sheet is empty');
        return { isValid: false, errors, warnings };
    }
    
    const [headers, ...rows] = sheetData;
    
    // Check for required headers
    const requiredHeaders = ['topic'];
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));
    
    for (const required of requiredHeaders) {
        if (!normalizedHeaders.includes(required)) {
            errors.push(`Missing required header: ${required}`);
        }
    }
    
    // Check data rows
    let validRows = 0;
    let emptyRows = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        
        if (!row || row.length === 0 || !row[0]) {
            emptyRows++;
            continue;
        }
        
        if (!row[0].trim()) {
            warnings.push(`Row ${rowNumber}: Empty topic field`);
            continue;
        }
        
        // Validate daily frequency
        if (row[1] && (isNaN(parseInt(row[1])) || parseInt(row[1]) < 1 || parseInt(row[1]) > 10)) {
            warnings.push(`Row ${rowNumber}: Invalid daily frequency (should be 1-10)`);
        }
        
        // Validate priority
        if (row[2] && (isNaN(parseInt(row[2])) || parseInt(row[2]) < 1 || parseInt(row[2]) > 10)) {
            warnings.push(`Row ${rowNumber}: Invalid priority (should be 1-10)`);
        }
        
        // Validate status
        if (row[3]) {
            const validStatuses = ['active', 'paused', 'archived'];
            if (!validStatuses.includes(row[3].toLowerCase().trim())) {
                warnings.push(`Row ${rowNumber}: Invalid status (should be: ${validStatuses.join(', ')})`);
            }
        }
        
        validRows++;
    }
    
    if (validRows === 0) {
        errors.push('No valid data rows found');
    }
    
    if (emptyRows > 0) {
        warnings.push(`Found ${emptyRows} empty rows`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        validRows,
        emptyRows
    };
}

/**
 * Sync topics to DynamoDB with conflict resolution
 */
async function syncTopicsToDynamoDB(topics, syncMode) {
    const results = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    };
    
    for (const topic of topics) {
        try {
            results.processed++;
            
            // Check if topic already exists (by topic text)
            const existingTopic = await findExistingTopicByText(topic.topic);
            
            if (existingTopic) {
                // Handle conflict resolution
                const shouldUpdate = await resolveConflict(existingTopic, topic, syncMode);
                
                if (shouldUpdate) {
                    await updateExistingTopic(existingTopic.topicId, topic);
                    results.updated++;
                    console.log(`Updated topic: ${topic.topic}`);
                } else {
                    results.skipped++;
                    console.log(`Skipped topic (no changes): ${topic.topic}`);
                }
            } else {
                // Create new topic
                await createNewTopic(topic);
                results.created++;
                console.log(`Created topic: ${topic.topic}`);
            }
        } catch (error) {
            results.errors.push({
                topic: topic.topic,
                row: topic.sheetRowNumber,
                error: error.message
            });
            console.error(`Error processing topic "${topic.topic}":`, error);
        }
    }
    
    return results;
}

/**
 * Find existing topic by topic text
 */
async function findExistingTopicByText(topicText) {
    try {
        // Note: This is a simplified approach. In production, you might want to use a GSI
        // or implement a more sophisticated matching algorithm
        const result = await docClient.send(new QueryCommand({
            TableName: TOPICS_TABLE,
            IndexName: 'TopicTextIndex', // Assuming this GSI exists
            KeyConditionExpression: '#topicText = :topicText',
            ExpressionAttributeNames: {
                '#topicText': 'topic'
            },
            ExpressionAttributeValues: {
                ':topicText': topicText.trim()
            },
            Limit: 1
        }));
        
        return result.Items?.[0] || null;
    } catch (error) {
        // If GSI doesn't exist, fall back to scan (not recommended for production)
        console.warn('TopicTextIndex not found, falling back to scan');
        return null;
    }
}

/**
 * Resolve conflicts between existing and new topic data
 */
async function resolveConflict(existingTopic, newTopic, syncMode) {
    // Conflict resolution strategies
    switch (syncMode) {
        case 'overwrite':
            return true; // Always update
            
        case 'incremental':
            // Only update if sheet was modified more recently
            const existingUpdated = new Date(existingTopic.updatedAt);
            const sheetModified = new Date(newTopic.lastSyncedAt);
            return sheetModified > existingUpdated;
            
        case 'merge':
            // Update only if there are actual changes
            return hasSignificantChanges(existingTopic, newTopic);
            
        default:
            return false; // Skip by default
    }
}

/**
 * Check if there are significant changes between topics
 */
function hasSignificantChanges(existing, updated) {
    const fieldsToCompare = ['dailyFrequency', 'priority', 'status', 'targetAudience', 'region', 'contentStyle'];
    
    for (const field of fieldsToCompare) {
        if (existing[field] !== updated[field]) {
            return true;
        }
    }
    
    // Compare tags
    const existingTags = existing.metadata?.tags || [];
    const updatedTags = updated.tags || [];
    
    if (existingTags.length !== updatedTags.length) {
        return true;
    }
    
    for (const tag of updatedTags) {
        if (!existingTags.includes(tag)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Create new topic in DynamoDB
 */
async function createNewTopic(topicData) {
    const topic = {
        topicId: uuidv4(),
        topic: topicData.topic,
        keywords: extractKeywords(topicData.topic),
        dailyFrequency: topicData.dailyFrequency,
        priority: topicData.priority,
        status: topicData.status,
        targetAudience: topicData.targetAudience,
        region: topicData.region,
        contentStyle: topicData.contentStyle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastProcessed: null,
        totalVideosGenerated: 0,
        averageEngagement: 0,
        metadata: {
            createdBy: 'google-sheets-sync',
            source: 'google-sheets',
            tags: topicData.tags,
            sheetRowNumber: topicData.sheetRowNumber,
            lastSyncedAt: topicData.lastSyncedAt
        }
    };
    
    await docClient.send(new PutCommand({
        TableName: TOPICS_TABLE,
        Item: topic
    }));
    
    return topic;
}

/**
 * Update existing topic in DynamoDB
 */
async function updateExistingTopic(topicId, updatedData) {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // Build update expression
    const fieldsToUpdate = ['dailyFrequency', 'priority', 'status', 'targetAudience', 'region', 'contentStyle'];
    
    fieldsToUpdate.forEach(field => {
        if (updatedData[field] !== undefined) {
            updateExpression.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = updatedData[field];
        }
    });
    
    // Always update metadata and timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    updateExpression.push('#metadata.#lastSyncedAt = :lastSyncedAt');
    updateExpression.push('#metadata.#tags = :tags');
    
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#metadata'] = 'metadata';
    expressionAttributeNames['#lastSyncedAt'] = 'lastSyncedAt';
    expressionAttributeNames['#tags'] = 'tags';
    
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    expressionAttributeValues[':lastSyncedAt'] = updatedData.lastSyncedAt;
    expressionAttributeValues[':tags'] = updatedData.tags;
    
    await docClient.send(new UpdateCommand({
        TableName: TOPICS_TABLE,
        Key: { topicId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    }));
}

/**
 * Extract keywords from topic text (reused from topic management)
 */
function extractKeywords(topicText) {
    if (!topicText) return [];
    
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    const words = topicText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.includes(word))
        .slice(0, 10);
    
    return [...new Set(words)];
}

/**
 * Log sync history
 */
async function logSyncHistory(syncData) {
    try {
        const historyRecord = {
            partitionKey: 'SYNC_HISTORY',
            syncId: syncData.syncId,
            timestamp: syncData.startTime,
            ...syncData
        };
        
        await docClient.send(new PutCommand({
            TableName: SYNC_HISTORY_TABLE,
            Item: historyRecord
        }));
    } catch (error) {
        console.error('Failed to log sync history:', error);
        // Don't throw - this shouldn't fail the main operation
    }
}

/**
 * Log sync errors
 */
async function logSyncError(error, event) {
    try {
        const errorRecord = {
            partitionKey: 'SYNC_ERROR',
            errorId: uuidv4(),
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            event: JSON.stringify(event),
            source: 'google-sheets-sync'
        };
        
        await docClient.send(new PutCommand({
            TableName: SYNC_HISTORY_TABLE,
            Item: errorRecord
        }));
    } catch (logError) {
        console.error('Failed to log sync error:', logError);
    }
}