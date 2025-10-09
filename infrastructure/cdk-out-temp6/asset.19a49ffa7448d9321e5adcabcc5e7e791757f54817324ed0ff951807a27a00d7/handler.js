/**
 * Topic Management Lambda Handler
 * Entry point for AWS Lambda
 */

// Import the handler from index.js
import { handler as topicHandler } from './index.js';

// Export for AWS Lambda
export const handler = topicHandler;