/**
 * Audio Generator Lambda Handler
 * Wrapper for the existing index.js implementation
 */

const { handler: audioHandler } = require('./index.js');

exports.handler = audioHandler;
