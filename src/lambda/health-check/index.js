/**
 * Health Check Lambda Function
 * Provides API Gateway health status and basic system information
 */

exports.handler = async (event) => {
    console.log('Health check request:', JSON.stringify(event, null, 2));

    try {
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown',
            region: process.env.AWS_REGION || process.env.REGION,
            version: '1.0.0',
            api: {
                gateway: 'operational',
                authentication: 'api-key-required'
            },
            services: {
                s3: process.env.S3_BUCKET ? 'configured' : 'not-configured',
                dynamodb: process.env.CONTEXT_TABLE ? 'configured' : 'not-configured'
            }
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            body: JSON.stringify(response, null, 2)
        };
    } catch (error) {
        console.error('Health check error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};