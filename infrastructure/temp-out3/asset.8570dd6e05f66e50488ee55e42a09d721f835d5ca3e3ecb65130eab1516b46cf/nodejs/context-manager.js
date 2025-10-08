/**
 * Context Management System for AI Agent Communication
 * Handles context storage, validation, and transfer between agents
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { gzipSync, gunzipSync } = require('zlib');

// Initialize AWS clients
let dynamoClient = null;
let docClient = null;
let s3Client = null;

// Configuration
let CONTEXT_TABLE = null;
let S3_BUCKET = null;

/**
 * Initialize the context manager
 */
function initializeContextManager() {
    if (dynamoClient) return; // Already initialized
    
    const region = process.env.AWS_REGION || 'us-east-1';
    dynamoClient = new DynamoDBClient({ region });
    docClient = DynamoDBDocumentClient.from(dynamoClient, {
        marshallOptions: {
            removeUndefinedValues: true
        }
    });
    s3Client = new S3Client({ region });
    
    CONTEXT_TABLE = process.env.CONTEXT_TABLE_NAME || 'automated-video-pipeline-context';
    S3_BUCKET = process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1';
    
    console.log('Context Manager initialized');
}

/**
 * Context validation schemas for different agent types
 */
const CONTEXT_SCHEMAS = {
    topic: {
        required: ['mainTopic', 'expandedTopics', 'videoStructure', 'seoContext'],
        optional: ['contentGuidance', 'sceneContexts'],
        validation: {
            expandedTopics: (value) => Array.isArray(value) && value.length >= 5,
            videoStructure: (value) => value && typeof value.recommendedScenes === 'number',
            seoContext: (value) => value && Array.isArray(value.primaryKeywords)
        }
    },
    scene: {
        required: ['scenes', 'totalDuration', 'sceneCount'],
        optional: ['overallStyle', 'targetAudience', 'sceneFlow'],
        validation: {
            scenes: (value) => Array.isArray(value) && value.length > 0,
            totalDuration: (value) => typeof value === 'number' && value > 0,
            sceneCount: (value) => typeof value === 'number' && value > 0
        }
    },
    media: {
        required: ['sceneMediaMapping', 'totalAssets', 'coverageComplete'],
        optional: ['qualityScore', 'visualFlow'],
        validation: {
            sceneMediaMapping: (value) => Array.isArray(value) && value.length > 0,
            totalAssets: (value) => typeof value === 'number' && value > 0,
            coverageComplete: (value) => typeof value === 'boolean'
        }
    },
    assembly: {
        required: ['videoId', 'finalVideoPath', 'duration', 'status'],
        optional: ['qualityMetrics', 'processingTime'],
        validation: {
            duration: (value) => typeof value === 'number' && value > 0,
            status: (value) => ['processing', 'completed', 'failed'].includes(value)
        }
    }
};

/**
 * Store context object with automatic compression and storage optimization
 */
async function storeContext(contextId, contextType, contextData, options = {}) {
    try {
        initializeContextManager();
        
        const {
            ttlHours = 24,
            compress = true,
            useS3ForLarge = true,
            maxDynamoSize = 350000 // DynamoDB item size limit minus buffer
        } = options;
        
        // Validate context against schema
        const validationResult = validateContext(contextType, contextData);
        if (!validationResult.isValid) {
            throw new Error(`Context validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        // Prepare context metadata
        const contextMetadata = {
            contextId,
            contextType,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + (ttlHours * 3600),
            version: '1.0',
            compressed: false,
            storedInS3: false,
            size: 0
        };
        
        // Serialize and optionally compress the context data
        let serializedData = JSON.stringify(contextData);
        let finalData = serializedData;
        
        if (compress) {
            const compressed = gzipSync(Buffer.from(serializedData));
            if (compressed.length < serializedData.length * 0.8) { // Only use if significant compression
                finalData = compressed.toString('base64');
                contextMetadata.compressed = true;
                console.log(`Context compressed: ${serializedData.length} -> ${compressed.length} bytes`);
            }
        }
        
        contextMetadata.size = finalData.length;
        
        // Determine storage location based on size
        if (useS3ForLarge && finalData.length > maxDynamoSize) {
            // Store large contexts in S3
            const s3Key = `contexts/${contextType}/${contextId}.json${contextMetadata.compressed ? '.gz' : ''}`;
            
            await s3Client.send(new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: contextMetadata.compressed ? Buffer.from(finalData, 'base64') : finalData,
                ContentType: contextMetadata.compressed ? 'application/gzip' : 'application/json',
                Metadata: {
                    contextId,
                    contextType,
                    compressed: contextMetadata.compressed.toString(),
                    createdAt: contextMetadata.createdAt
                }
            }));
            
            contextMetadata.storedInS3 = true;
            contextMetadata.s3Key = s3Key;
            contextMetadata.contextData = null; // Don't store data in DynamoDB
            
            console.log(`Large context stored in S3: ${s3Key} (${finalData.length} bytes)`);
        } else {
            // Store in DynamoDB
            contextMetadata.contextData = finalData;
            console.log(`Context stored in DynamoDB (${finalData.length} bytes)`);
        }
        
        // Store metadata in DynamoDB
        await docClient.send(new PutCommand({
            TableName: CONTEXT_TABLE,
            Item: {
                PK: `CONTEXT#${contextId}`,
                SK: 'METADATA',
                ...contextMetadata
            }
        }));
        
        console.log(`Context stored successfully: ${contextId} (${contextType})`);
        
        return {
            contextId,
            contextType,
            size: contextMetadata.size,
            compressed: contextMetadata.compressed,
            storedInS3: contextMetadata.storedInS3,
            s3Key: contextMetadata.s3Key
        };
        
    } catch (error) {
        console.error('Error storing context:', error);
        throw error;
    }
}

/**
 * Retrieve context object with automatic decompression
 */
async function getContext(contextId) {
    try {
        initializeContextManager();
        
        // Get context metadata from DynamoDB
        const result = await docClient.send(new GetCommand({
            TableName: CONTEXT_TABLE,
            Key: {
                PK: `CONTEXT#${contextId}`,
                SK: 'METADATA'
            }
        }));
        
        if (!result.Item) {
            throw new Error(`Context not found: ${contextId}`);
        }
        
        const metadata = result.Item;
        
        // Check if context has expired
        const now = Math.floor(Date.now() / 1000);
        if (metadata.ttl && metadata.ttl < now) {
            console.log(`Context expired: ${contextId}`);
            await deleteContext(contextId); // Clean up expired context
            throw new Error(`Context expired: ${contextId}`);
        }
        
        let contextData;
        
        if (metadata.storedInS3) {
            // Retrieve from S3
            const s3Response = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: metadata.s3Key
            }));
            
            const s3Data = await streamToBuffer(s3Response.Body);
            
            if (metadata.compressed) {
                const decompressed = gunzipSync(s3Data);
                contextData = JSON.parse(decompressed.toString());
            } else {
                contextData = JSON.parse(s3Data.toString());
            }
            
            console.log(`Context retrieved from S3: ${metadata.s3Key}`);
        } else {
            // Retrieve from DynamoDB
            let rawData = metadata.contextData;
            
            if (metadata.compressed) {
                const decompressed = gunzipSync(Buffer.from(rawData, 'base64'));
                contextData = JSON.parse(decompressed.toString());
            } else {
                contextData = JSON.parse(rawData);
            }
            
            console.log(`Context retrieved from DynamoDB: ${contextId}`);
        }
        
        return {
            contextId: metadata.contextId,
            contextType: metadata.contextType,
            contextData,
            metadata: {
                createdAt: metadata.createdAt,
                size: metadata.size,
                compressed: metadata.compressed,
                storedInS3: metadata.storedInS3,
                version: metadata.version
            }
        };
        
    } catch (error) {
        console.error('Error retrieving context:', error);
        throw error;
    }
}

/**
 * Update existing context with new data
 */
async function updateContext(contextId, updates, options = {}) {
    try {
        initializeContextManager();
        
        // Get existing context
        const existingContext = await getContext(contextId);
        
        // Merge updates with existing data
        const updatedData = {
            ...existingContext.contextData,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Store updated context (this will replace the existing one)
        return await storeContext(contextId, existingContext.contextType, updatedData, options);
        
    } catch (error) {
        console.error('Error updating context:', error);
        throw error;
    }
}

/**
 * Delete context and clean up storage
 */
async function deleteContext(contextId) {
    try {
        initializeContextManager();
        
        // Get context metadata to check if stored in S3
        const result = await docClient.send(new GetCommand({
            TableName: CONTEXT_TABLE,
            Key: {
                PK: `CONTEXT#${contextId}`,
                SK: 'METADATA'
            }
        }));
        
        if (result.Item && result.Item.storedInS3 && result.Item.s3Key) {
            // Delete from S3
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: result.Item.s3Key
                }));
                console.log(`Deleted context from S3: ${result.Item.s3Key}`);
            } catch (s3Error) {
                console.warn('Error deleting from S3:', s3Error);
                // Continue with DynamoDB deletion even if S3 deletion fails
            }
        }
        
        // Delete from DynamoDB
        await docClient.send(new DeleteCommand({
            TableName: CONTEXT_TABLE,
            Key: {
                PK: `CONTEXT#${contextId}`,
                SK: 'METADATA'
            }
        }));
        
        console.log(`Context deleted: ${contextId}`);
        
    } catch (error) {
        console.error('Error deleting context:', error);
        throw error;
    }
}

/**
 * Validate context data against schema
 */
function validateContext(contextType, contextData) {
    const schema = CONTEXT_SCHEMAS[contextType];
    if (!schema) {
        return {
            isValid: false,
            errors: [`Unknown context type: ${contextType}`]
        };
    }
    
    const errors = [];
    
    // Check required fields
    for (const field of schema.required) {
        if (!(field in contextData)) {
            errors.push(`Missing required field: ${field}`);
        } else if (schema.validation[field]) {
            const isValid = schema.validation[field](contextData[field]);
            if (!isValid) {
                errors.push(`Invalid value for field: ${field}`);
            }
        }
    }
    
    // Validate optional fields if present
    for (const field of schema.optional) {
        if (field in contextData && schema.validation[field]) {
            const isValid = schema.validation[field](contextData[field]);
            if (!isValid) {
                errors.push(`Invalid value for optional field: ${field}`);
            }
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * List contexts by type or pattern
 */
async function listContexts(options = {}) {
    try {
        initializeContextManager();
        
        const {
            contextType = null,
            limit = 50,
            includeExpired = false
        } = options;
        
        let queryParams = {
            TableName: CONTEXT_TABLE,
            Limit: limit
        };
        
        if (contextType) {
            // Query by context type using GSI (would need to be created)
            queryParams.IndexName = 'ContextTypeIndex';
            queryParams.KeyConditionExpression = 'contextType = :contextType';
            queryParams.ExpressionAttributeValues = {
                ':contextType': contextType
            };
        } else {
            // Scan all contexts
            queryParams = {
                TableName: CONTEXT_TABLE,
                Limit: limit,
                FilterExpression: 'begins_with(PK, :pk)',
                ExpressionAttributeValues: {
                    ':pk': 'CONTEXT#'
                }
            };
        }
        
        const result = contextType 
            ? await docClient.send(new QueryCommand(queryParams))
            : await docClient.send(new ScanCommand(queryParams));
        
        const contexts = result.Items || [];
        const now = Math.floor(Date.now() / 1000);
        
        // Filter out expired contexts unless requested
        const filteredContexts = includeExpired 
            ? contexts 
            : contexts.filter(item => !item.ttl || item.ttl >= now);
        
        return filteredContexts.map(item => ({
            contextId: item.contextId,
            contextType: item.contextType,
            createdAt: item.createdAt,
            size: item.size,
            compressed: item.compressed,
            storedInS3: item.storedInS3,
            ttl: item.ttl,
            expired: item.ttl && item.ttl < now
        }));
        
    } catch (error) {
        console.error('Error listing contexts:', error);
        throw error;
    }
}

/**
 * Clean up expired contexts
 */
async function cleanupExpiredContexts() {
    try {
        initializeContextManager();
        
        console.log('Starting cleanup of expired contexts...');
        
        const allContexts = await listContexts({ includeExpired: true, limit: 1000 });
        const now = Math.floor(Date.now() / 1000);
        
        const expiredContexts = allContexts.filter(ctx => ctx.ttl && ctx.ttl < now);
        
        console.log(`Found ${expiredContexts.length} expired contexts to clean up`);
        
        for (const context of expiredContexts) {
            try {
                await deleteContext(context.contextId);
                console.log(`Cleaned up expired context: ${context.contextId}`);
            } catch (error) {
                console.error(`Error cleaning up context ${context.contextId}:`, error);
            }
        }
        
        console.log(`Cleanup completed. Removed ${expiredContexts.length} expired contexts`);
        
        return {
            totalContexts: allContexts.length,
            expiredContexts: expiredContexts.length,
            cleanedUp: expiredContexts.length
        };
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

/**
 * Get context statistics
 */
async function getContextStats() {
    try {
        initializeContextManager();
        
        const allContexts = await listContexts({ includeExpired: true, limit: 1000 });
        const now = Math.floor(Date.now() / 1000);
        
        const stats = {
            total: allContexts.length,
            active: 0,
            expired: 0,
            byType: {},
            totalSize: 0,
            compressed: 0,
            storedInS3: 0,
            storedInDynamoDB: 0
        };
        
        for (const context of allContexts) {
            // Count by status
            if (context.ttl && context.ttl < now) {
                stats.expired++;
            } else {
                stats.active++;
            }
            
            // Count by type
            stats.byType[context.contextType] = (stats.byType[context.contextType] || 0) + 1;
            
            // Size and storage stats
            stats.totalSize += context.size || 0;
            if (context.compressed) stats.compressed++;
            if (context.storedInS3) stats.storedInS3++;
            else stats.storedInDynamoDB++;
        }
        
        return stats;
        
    } catch (error) {
        console.error('Error getting context stats:', error);
        throw error;
    }
}

/**
 * Helper function to convert stream to buffer
 */
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = {
    storeContext,
    getContext,
    updateContext,
    deleteContext,
    validateContext,
    listContexts,
    cleanupExpiredContexts,
    getContextStats,
    CONTEXT_SCHEMAS
};