/**
 * Video Assembly Lambda Handler
 * Main entry point for video assembly and synchronization
 * Updated to use new direct video processing implementation
 */

// Import the updated handler from index.js
const { handler: indexHandler } = require('./index');

/**
 * Lambda handler for video assembly requests
 * Delegates to the updated implementation in index.js
 */
exports.handler = async (event) => {
    console.log('Video Assembly Handler (handler.js) delegating to index.js implementation');
    
    // Delegate to the updated implementation in index.js
    return await indexHandler(event);
};

// All functionality is now handled by index.js