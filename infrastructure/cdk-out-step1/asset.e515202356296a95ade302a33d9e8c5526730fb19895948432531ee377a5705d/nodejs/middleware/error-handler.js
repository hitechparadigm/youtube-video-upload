/**
 * Error Handler Middleware
 * Provides consistent error handling across all Lambda functions
 */

import { createErrorResponse } from '../http/response-handler.js';

export const withErrorHandler = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (error) {
    console.error('Lambda Error:', {
      error: error.message,
      stack: error.stack,
      event: JSON.stringify(event, null, 2),
      requestId: context.awsRequestId
    });
    
    return createErrorResponse(500, error, context.awsRequestId);
  }
};

export const withValidation = (validator) => (handler) => async (event, context) => {
  try {
    // Parse and validate request body
    let requestBody = {};
    if (event.body) {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    const validation = validator(requestBody, event);
    if (!validation.isValid) {
      return createErrorResponse(400, {
        error: 'Validation failed',
        details: validation.errors
      }, context.awsRequestId);
    }
    
    // Add validated data to event
    event.validatedBody = requestBody;
    return await handler(event, context);
  } catch (error) {
    return createErrorResponse(400, 'Invalid request format', context.awsRequestId);
  }
};

export const withCors = (handler) => async (event, context) => {
  const response = await handler(event, context);
  
  // Ensure CORS headers are always present
  response.headers = {
    ...response.headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,X-Amz-Security-Token'
  };
  
  return response;
};
