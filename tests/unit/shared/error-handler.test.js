/**
 * Unit Tests for Error Handler Shared Utility
 * Tests error handling, logging, and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  AppError,
  ERROR_TYPES,
  logError,
  createErrorResponse,
  shouldRetry,
  getRetryDelay,
  executeWithRetry,
  validateRequiredParams,
  withTimeout
} from '../../../src/shared/error-handler.js';

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    global.console = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
  });

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', ERROR_TYPES.VALIDATION, 400, { detail: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ERROR_TYPES.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should use default status code for error type', () => {
      const error = new AppError('Test error', ERROR_TYPES.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('logError', () => {
    it('should log error with structured format', () => {
      const error = new Error('Test error');
      const context = { requestId: '123', userId: 'user1' };
      
      logError(error, context, 'error');
      
      expect(console.error).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(console.error.mock.calls[0][0]);
      expect(loggedData.message).toBe('Test error');
      expect(loggedData.level).toBe('error');
      expect(loggedData.context.requestId).toBe('123');
    });
  });

  describe('createErrorResponse', () => {
    it('should create API Gateway error response', () => {
      const error = new AppError('Test error', ERROR_TYPES.VALIDATION, 400);
      const context = { requestId: '123' };
      
      const response = createErrorResponse(error, context);
      
      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe(true);
      expect(body.type).toBe(ERROR_TYPES.VALIDATION);
      expect(body.message).toBe('Test error');
      expect(body.requestId).toBe('123');
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors', () => {
      const throttlingError = new Error('ThrottlingException');
      expect(shouldRetry(throttlingError)).toBe(true);
      
      const timeoutError = new Error('RequestTimeout');
      expect(shouldRetry(timeoutError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const validationError = new AppError('Invalid input', ERROR_TYPES.VALIDATION);
      expect(shouldRetry(validationError)).toBe(false);
      
      const authError = new AppError('Unauthorized', ERROR_TYPES.AUTHENTICATION);
      expect(shouldRetry(authError)).toBe(false);
    });

    it('should return true for rate limit and timeout operational errors', () => {
      const rateLimitError = new AppError('Rate limited', ERROR_TYPES.RATE_LIMIT);
      expect(shouldRetry(rateLimitError)).toBe(true);
      
      const timeoutError = new AppError('Timeout', ERROR_TYPES.TIMEOUT);
      expect(shouldRetry(timeoutError)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay1 = getRetryDelay(1, 1000, 30000);
      const delay2 = getRetryDelay(2, 1000, 30000);
      const delay3 = getRetryDelay(3, 1000, 30000);
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1100); // 1000 + 10% jitter
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2200); // 2000 + 10% jitter
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4400); // 4000 + 10% jitter
    });

    it('should cap delay at maximum', () => {
      const delay = getRetryDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('validateRequiredParams', () => {
    it('should pass validation for valid params', () => {
      const params = { name: 'test', age: 25 };
      const required = ['name', 'age'];
      
      expect(() => validateRequiredParams(params, required, 'test operation'))
        .not.toThrow();
    });

    it('should throw AppError for missing params', () => {
      const params = { name: 'test' };
      const required = ['name', 'age', 'email'];
      
      expect(() => validateRequiredParams(params, required, 'test operation'))
        .toThrow(AppError);
      
      try {
        validateRequiredParams(params, required, 'test operation');
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION);
        expect(error.statusCode).toBe(400);
        expect(error.details.missingParams).toEqual(['age', 'email']);
      }
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes within timeout', async () => {
      const operation = () => new Promise(resolve => setTimeout(() => resolve('success'), 100));
      
      const result = await withTimeout(operation, 200, 'test operation');
      expect(result).toBe('success');
    });

    it('should reject with timeout error if operation takes too long', async () => {
      const operation = () => new Promise(resolve => setTimeout(() => resolve('success'), 300));
      
      await expect(withTimeout(operation, 100, 'test operation'))
        .rejects.toThrow('test operation timed out after 100ms');
    });
  });
});