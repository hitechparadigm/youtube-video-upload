/**
 * Media Curator Lambda Handler
 * Wrapper for the existing index.js implementation
 */

const { handler } = require('./index.js');

module.exports = { handler };