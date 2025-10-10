/**
 * Video Assembly Lambda Handler
 * Main entry point for video assembly and synchronization
 * Updated to use new direct video processing implementation
 */

// Import the updated handler from index.js (CommonJS syntax)
const { handler: indexHandler } = require('./index.js');

/**
 * Lambda handler for video assembly requests
 * Delegates to the updated implementation in index.js
 */
const handler = async (event, context) => {
    console.log('Video Assembly Handler (handler.js) delegating to index.js implementation');
    
    // Delegate to the updated implementation in index.js
    return await indexHandler(event, context);
};

module.exports = { handler };

// All functionality is now handled by index.js
