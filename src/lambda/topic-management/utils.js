/**
 * Simple utilities for Topic Management - No shared layer dependencies
 */

const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    DynamoDBClient,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
    marshall
} = require('@aws-sdk/util-dynamodb');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Store context in S3 and DynamoDB
 */
async function storeContext(context, contextType, projectId) {
    try {
        // Store in S3
        const s3Key = `videos/${projectId}/01-context/${contextType}-context.json`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: JSON.stringify(context, null, 2),
            ContentType: 'application/json'
        }));

        // Store reference in DynamoDB
        const contextRecord = {
            PK: `${contextType}#${projectId}`,
            SK: projectId,
            s3Location: s3Key,
            contextType,
            projectId,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Item: marshall(contextRecord)
        }));

        console.log(`✅ Stored ${contextType} context for project ${projectId}`);
        return {
            success: true,
            s3Location: s3Key
        };

    } catch (error) {
        console.error(`❌ Error storing ${contextType} context:`, error);
        throw error;
    }
}

/**
 * Create project ID
 */
function createProjectId(baseTopic) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const topicSlug = baseTopic.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30);

    return `${timestamp}_${topicSlug}`;
}

module.exports = {
    storeContext,
    createProjectId
};