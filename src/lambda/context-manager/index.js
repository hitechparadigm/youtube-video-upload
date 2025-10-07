/**
 * Context Management Lambda Function
 * Provides REST API for context storage and retrieval between AI agents
 */

const {
    storeContext,
    getContext,
    updateContext,
    deleteContext,
    validateContext,
    listContexts,
    cleanupExpiredContexts,
    getContextStats
} = require('/opt/nodejs/context-manager');

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Context Manager invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
        
        // Parse request body if present
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        // Route requests
        if (httpMethod === 'POST' && path === '/context') {
            return await createContext(requestBody);
        } else if (httpMethod === 'GET' && path === '/context/stats') {
            return await getStats();
        } else if (httpMethod === 'GET' && path === '/context/list') {
            return await listAllContexts(queryStringParameters || {});
        } else if (httpMethod === 'POST' && path === '/context/cleanup') {
            return await performCleanup();
        } else if (httpMethod === 'GET' && path.startsWith('/context/')) {
            const contextId = pathParameters?.contextId || path.split('/').pop();
            return await retrieveContext(contextId);
        } else if (httpMethod === 'PUT' && path.startsWith('/context/')) {
            const contextId = pathParameters?.contextId || path.split('/').pop();
            return await modifyContext(contextId, requestBody);
        } else if (httpMethod === 'DELETE' && path.startsWith('/context/')) {
            const contextId = pathParameters?.contextId || path.split('/').pop();
            return await removeContext(contextId);
        } else if (httpMethod === 'POST' && path === '/context/validate') {
            return await validateContextData(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Context Manager:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Create new context
 */
async function createContext(requestBody) {
    try {
        const { 
            contextId, 
            contextType, 
            contextData, 
            options = {} 
        } = requestBody;
        
        if (!contextId || !contextType || !contextData) {
            return createResponse(400, { 
                error: 'Missing required fields: contextId, contextType, and contextData are required' 
            });
        }
        
        // Validate context type
        const validTypes = ['topic', 'scene', 'media', 'assembly'];
        if (!validTypes.includes(contextType)) {
            return createResponse(400, { 
                error: `Invalid context type. Must be one of: ${validTypes.join(', ')}` 
            });
        }
        
        const result = await storeContext(contextId, contextType, contextData, options);
        
        return createResponse(201, {
            message: 'Context created successfully',
            context: result
        });
        
    } catch (error) {
        console.error('Error creating context:', error);
        return createResponse(500, { 
            error: 'Failed to create context',
            message: error.message 
        });
    }
}

/**
 * Retrieve context by ID
 */
async function retrieveContext(contextId) {
    try {
        if (!contextId) {
            return createResponse(400, { error: 'Context ID is required' });
        }
        
        const context = await getContext(contextId);
        
        return createResponse(200, {
            message: 'Context retrieved successfully',
            context
        });
        
    } catch (error) {
        console.error('Error retrieving context:', error);
        
        if (error.message.includes('not found') || error.message.includes('expired')) {
            return createResponse(404, { 
                error: 'Context not found or expired',
                message: error.message 
            });
        }
        
        return createResponse(500, { 
            error: 'Failed to retrieve context',
            message: error.message 
        });
    }
}

/**
 * Update existing context
 */
async function modifyContext(contextId, requestBody) {
    try {
        const { updates, options = {} } = requestBody;
        
        if (!contextId) {
            return createResponse(400, { error: 'Context ID is required' });
        }
        
        if (!updates || typeof updates !== 'object') {
            return createResponse(400, { error: 'Updates object is required' });
        }
        
        const result = await updateContext(contextId, updates, options);
        
        return createResponse(200, {
            message: 'Context updated successfully',
            context: result
        });
        
    } catch (error) {
        console.error('Error updating context:', error);
        
        if (error.message.includes('not found')) {
            return createResponse(404, { 
                error: 'Context not found',
                message: error.message 
            });
        }
        
        return createResponse(500, { 
            error: 'Failed to update context',
            message: error.message 
        });
    }
}

/**
 * Delete context
 */
async function removeContext(contextId) {
    try {
        if (!contextId) {
            return createResponse(400, { error: 'Context ID is required' });
        }
        
        await deleteContext(contextId);
        
        return createResponse(200, {
            message: 'Context deleted successfully',
            contextId
        });
        
    } catch (error) {
        console.error('Error deleting context:', error);
        return createResponse(500, { 
            error: 'Failed to delete context',
            message: error.message 
        });
    }
}

/**
 * Validate context data against schema
 */
async function validateContextData(requestBody) {
    try {
        const { contextType, contextData } = requestBody;
        
        if (!contextType || !contextData) {
            return createResponse(400, { 
                error: 'Missing required fields: contextType and contextData are required' 
            });
        }
        
        const validation = validateContext(contextType, contextData);
        
        return createResponse(200, {
            message: 'Context validation completed',
            validation
        });
        
    } catch (error) {
        console.error('Error validating context:', error);
        return createResponse(500, { 
            error: 'Failed to validate context',
            message: error.message 
        });
    }
}

/**
 * List contexts with filtering
 */
async function listAllContexts(queryParams) {
    try {
        const options = {
            contextType: queryParams.contextType || null,
            limit: parseInt(queryParams.limit) || 50,
            includeExpired: queryParams.includeExpired === 'true'
        };
        
        const contexts = await listContexts(options);
        
        return createResponse(200, {
            message: 'Contexts retrieved successfully',
            contexts,
            count: contexts.length,
            filters: options
        });
        
    } catch (error) {
        console.error('Error listing contexts:', error);
        return createResponse(500, { 
            error: 'Failed to list contexts',
            message: error.message 
        });
    }
}

/**
 * Get context statistics
 */
async function getStats() {
    try {
        const stats = await getContextStats();
        
        return createResponse(200, {
            message: 'Context statistics retrieved successfully',
            stats
        });
        
    } catch (error) {
        console.error('Error getting context stats:', error);
        return createResponse(500, { 
            error: 'Failed to get context statistics',
            message: error.message 
        });
    }
}

/**
 * Perform cleanup of expired contexts
 */
async function performCleanup() {
    try {
        const result = await cleanupExpiredContexts();
        
        return createResponse(200, {
            message: 'Context cleanup completed successfully',
            result
        });
        
    } catch (error) {
        console.error('Error performing cleanup:', error);
        return createResponse(500, { 
            error: 'Failed to perform cleanup',
            message: error.message 
        });
    }
}

/**
 * Create standardized HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}