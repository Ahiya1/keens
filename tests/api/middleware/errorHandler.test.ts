/**
 * Error Handler Middleware Tests - Comprehensive Backend Testing
 * Testing centralized error handling with proper logging and responses
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createValidationError,
  createAuthError,
  createRateLimitError
} from '../../../src/api/middleware/errorHandler.js';
import {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ConcurrencyError,
  MFARequiredError,
  AuthenticatedRequest,
  RateLimitInfo,
  ConcurrencyCheckResult
} from '../../../src/api/types.js';

describe('Error Handler Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    req = {
      id: 'req-test-123',
      method: 'POST',
      url: '/api/v1/test', // Use url instead of path for mocking
      user: { id: 'user-456', is_admin: false } // Use is_admin instead of isAdmin
    } as any;

    // Mock path property since it's read-only
    Object.defineProperty(req, 'path', {
      value: '/api/v1/test',
      writable: false,
      configurable: true
    });

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Spy on console.error to verify error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Set development environment for some tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('errorHandler', () => {
    test('should handle AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid credentials provided');

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
          help_url: 'https://docs.keen.dev/errors/authentication'
        },
        request_id: 'req-test-123'
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle MFARequiredError correctly', () => {
      const error = new MFARequiredError('Two-factor authentication required');

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'MFA_REQUIRED',
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Two-factor authentication required',
          help_url: 'https://docs.keen.dev/auth/mfa'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle ValidationError with details', () => {
      const error = new ValidationError('Invalid input data', {
        field_errors: {
          email: ['Email is required', 'Email format is invalid'],
          password: ['Password too short']
        },
        invalid_fields: 2
      });

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'INVALID_REQUEST',
          message: 'Invalid input data',
          details: {
            field_errors: {
              email: ['Email is required', 'Email format is invalid'],
              password: ['Password too short']
            },
            invalid_fields: 2
          },
          help_url: 'https://docs.keen.dev/api/validation'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle RateLimitError with limit info', () => {
      const rateLimitInfo: RateLimitInfo = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000).getTime(),
        limit: 1000
      };
      const error = new RateLimitError('Rate limit exceeded', rateLimitInfo);

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'RATE_LIMIT_ERROR',
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded',
          details: {
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            reset_time: rateLimitInfo.resetTime
          },
          help_url: 'https://docs.keen.dev/api/rate-limits'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle ConcurrencyError with session info', () => {
      const concurrencyInfo: ConcurrencyCheckResult = {
        allowed: false,
        current: 5,
        limit: 3
      };
      const error = new ConcurrencyError('Too many concurrent sessions', concurrencyInfo);

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'CONCURRENCY_ERROR',
          code: 'TOO_MANY_CONCURRENT_SESSIONS',
          message: 'Too many concurrent sessions',
          details: {
            current: 5,
            limit: 3
          },
          help_url: 'https://docs.keen.dev/api/concurrency'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle InsufficientCreditsError correctly', () => {
      const error = {
        name: 'InsufficientCreditsError',
        message: 'Insufficient credits',
        required: 25.0,
        available: 10.0,
        shortfall: 15.0,
        claudeCost: 5.0,
        markupMultiplier: 5.0
      };

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'INSUFFICIENT_CREDITS',
          code: 'PAYMENT_REQUIRED',
          message: 'Insufficient credits for this operation',
          details: {
            required: 25.0,
            available: 10.0,
            shortfall: 15.0,
            claude_cost: 5.0,
            markup_multiplier: 5.0,
            credit_info: {
              pricing: '5x markup over Claude API costs',
              no_packages: true,
              purchase_url: 'https://app.keen.dev/credits/purchase'
            }
          },
          help_url: 'https://docs.keen.dev/credits/insufficient'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle database connection errors', () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused to database'
      };

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'SERVICE_UNAVAILABLE',
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Database service temporarily unavailable',
          help_url: 'https://status.keen.dev'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle JWT errors correctly', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid signature'
      };

      errorHandler(jwtError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid',
          help_url: 'https://docs.keen.dev/auth/tokens'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle JWT expired error with expiration info', () => {
      const expiredAt = new Date();
      const expiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt
      };

      errorHandler(expiredError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          details: {
            expired_at: expiredAt
          },
          help_url: 'https://docs.keen.dev/auth/refresh'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle Anthropic API errors', () => {
      const anthropicError = {
        name: 'AnthropicError',
        message: 'API rate limit exceeded'
      };

      errorHandler(anthropicError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'EXTERNAL_SERVICE_ERROR',
          code: 'ANTHROPIC_API_ERROR',
          message: 'AI service temporarily unavailable',
          help_url: 'https://docs.keen.dev/troubleshooting/ai-service'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle generic errors in development mode', () => {
      process.env.NODE_ENV = 'development';
      const genericError = {
        message: 'Something went wrong',
        stack: 'Error: Something went wrong\n    at test.js:1:1'
      };

      errorHandler(genericError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          code: 'SYSTEM_ERROR',
          message: 'Something went wrong', // Shows actual message in dev
          stack: 'Error: Something went wrong\n    at test.js:1:1', // Shows stack in dev
          help_url: 'https://docs.keen.dev/support'
        },
        request_id: 'req-test-123'
      });
    });

    test('should hide error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const genericError = {
        message: 'Internal database error with sensitive info',
        stack: 'Error: Database password exposed\n    at secret.js:1:1'
      };

      errorHandler(genericError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          code: 'SYSTEM_ERROR',
          message: 'An unexpected error occurred', // Generic message in production
          stack: undefined, // No stack in production
          help_url: 'https://docs.keen.dev/support'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle errors with custom status codes', () => {
      const customError = {
        statusCode: 418,
        message: "I'm a teapot"
      };

      errorHandler(customError, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });

    test('should handle missing request ID gracefully', () => {
      delete req.id;
      const error = new AuthenticationError('Test error');

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: req.id // Should handle undefined gracefully
        })
      );
    });

    test('should log error information correctly', () => {
      const error = {
        name: 'TestError',
        message: 'Test error message',
        stack: 'Error stack trace'
      };

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🚨 API Error:',
        expect.stringContaining('TestError')
      );
    });

    test('should handle admin user context in error logging', () => {
      req.user = { id: 'admin-123', is_admin: true }; // Use is_admin instead of isAdmin
      const error = new Error('Admin operation failed');

      errorHandler(error, req as AuthenticatedRequest, res as Response, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🚨 API Error:',
        expect.stringContaining('"isAdmin": true')
      );
    });
  });

  describe('notFoundHandler', () => {
    test('should return 404 with helpful endpoint information', () => {
      req.method = 'GET';
      Object.defineProperty(req, 'path', {
        value: '/api/v1/nonexistent',
        writable: false,
        configurable: true
      });

      notFoundHandler(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'NOT_FOUND',
          code: 'ENDPOINT_NOT_FOUND',
          message: 'Endpoint GET /api/v1/nonexistent not found',
          available_endpoints: {
            api_info: 'GET /api',
            health: 'GET /health',
            authentication: 'POST /api/v1/auth/login',
            agents: 'POST /api/v1/agents/execute',
            credits: 'GET /api/v1/credits/balance',
            admin: 'GET /api/v1/admin/analytics',
            websocket: 'ws://localhost:3000/ws'
          },
          help_url: 'https://docs.keen.dev/api'
        },
        request_id: 'req-test-123'
      });
    });

    test('should handle missing request ID in 404 handler', () => {
      delete req.id;
      req.method = 'POST';
      Object.defineProperty(req, 'path', {
        value: '/api/v1/unknown',
        writable: false,
        configurable: true
      });

      notFoundHandler(req as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: req.id // Should handle undefined gracefully
        })
      );
    });
  });

  describe('asyncHandler', () => {
    test('should wrap async function and handle successful execution', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncFunction);

      await wrappedHandler(req as AuthenticatedRequest, res as Response, next);

      expect(asyncFunction).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled(); // No error, so next not called
    });

    test('should catch async errors and pass to next middleware', async () => {
      const error = new Error('Async operation failed');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncFunction);

      await wrappedHandler(req as AuthenticatedRequest, res as Response, next);

      expect(asyncFunction).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle non-promise returning functions', async () => {
      const syncFunction = jest.fn().mockReturnValue('immediate result');
      const wrappedHandler = asyncHandler(syncFunction);

      await wrappedHandler(req as AuthenticatedRequest, res as Response, next);

      expect(syncFunction).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle thrown errors in wrapped function', async () => {
      const error = new Error('Synchronous error');
      const throwingFunction = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedHandler = asyncHandler(throwingFunction);

      await wrappedHandler(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Helper Functions', () => {
    test('createValidationError should create ValidationError with details', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = createValidationError('Validation failed', details);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
    });

    test('createAuthError should create AuthenticationError', () => {
      const error = createAuthError('Authentication failed');

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Authentication failed');
    });

    test('createRateLimitError should create RateLimitError with rate limit info', () => {
      const rateLimitInfo: RateLimitInfo = {
        allowed: false,
        remaining: 0,
        resetTime: new Date().getTime(),
        limit: 100
      };
      const error = createRateLimitError('Rate limit exceeded', rateLimitInfo);

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.rateLimitInfo).toEqual(rateLimitInfo);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null error object', () => {
      const nullError = null;

      errorHandler(nullError as any, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'INTERNAL_SERVER_ERROR',
            code: 'SYSTEM_ERROR'
          })
        })
      );
    });

    test('should handle error without message property', () => {
      const errorWithoutMessage = {
        name: 'WeirdError'
        // no message property
      };

      errorHandler(errorWithoutMessage, req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should handle circular reference in error object', () => {
      const circularError: any = {
        name: 'CircularError',
        message: 'Circular reference'
      };
      circularError.self = circularError;

      // Should not throw when logging
      expect(() => {
        errorHandler(circularError, req as AuthenticatedRequest, res as Response, next);
      }).not.toThrow();

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
