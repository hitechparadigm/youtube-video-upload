/**
 * Script Generator Lambda Handler
 * Wrapper for the existing index.js implementation
 */

const { handler: scriptHandler } = require('./index.js');

exports.handler = scriptHandler;
