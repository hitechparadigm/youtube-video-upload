/**
 * Lambda Utilities
 * Common utilities for Lambda function development
 */

export const parseEvent = (event) => {
  const { httpMethod, path, pathParameters, queryStringParameters, body, headers } = event;
  
  let requestBody = {};
  if (body) {
    try {
      requestBody = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }
  
  return {
    method: httpMethod,
    path,
    pathParams: pathParameters || {},
    queryParams: queryStringParameters || {},
    body: requestBody,
    headers: headers || {}
  };
};

export const getPathParameter = (event, paramName, required = true) => {
  const value = event.pathParameters?.[paramName];
  
  if (required && !value) {
    throw new Error(`Missing required path parameter: ${paramName}`);
  }
  
  return value;
};

export const getQueryParameter = (event, paramName, defaultValue = null) => {
  return event.queryStringParameters?.[paramName] || defaultValue;
};

export const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  });
  
  return {
    isValid: missing.length === 0,
    errors: missing.map(field => `${field} is required`)
  };
};
