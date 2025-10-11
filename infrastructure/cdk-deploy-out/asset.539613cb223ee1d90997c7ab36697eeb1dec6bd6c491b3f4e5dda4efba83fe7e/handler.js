/**
 * Topic Management Lambda Handler
 * Entry point for AWS Lambda
 */

// Import the handler from index.js
const { handler: topicHandler } = require('./index.js');

// Export for AWS Lambda
module.exports = { handler: topicHandler };
