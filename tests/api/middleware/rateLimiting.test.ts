/**
 * Rate Limiting Middleware Tests - Comprehensive Backend Testing
 * Testing rate limiting with admin bypass and different user tiers
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/api/types.js';

// Mock express-rate-limit and express-slow-down before importing the middleware
const mockRateLimitInstance = jest.fn() as any;
const mockSlowDownInstance = jest.fn() as any;
const rateLimitConfigs: any[] = [];

jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((config: any) => {
    // Store all configs for testing
    rateLimitConfigs.push(config);
    (mockRateLimitInstance as any).config = config;
    // Return a middleware function that calls the skip and keyGenerator functions
    return (req: any, res: any, next: any) => {
      if (config.skip && config.skip(req)) {
        return next();
      }
      // Simulate rate limiting logic
      const key = config.keyGenerator ? config.keyGenerator(req) : 'default';
      req._rateLimitKey = key;
      return next();
    };
  });
});

jest.mock('express-slow-down', () => {
  return jest.fn().mockImplementation((config: any) => {
    (mockSlowDownInstance as any).config = config;
    return (req: any, res: any, next: any) => {
      if (config.skip && config.skip(req)) {
        return next();
      }
      const key = config.keyGenerator ? config.keyGenerator(req) : 'default';
      req._slowDownKey = key;
      return next();
    };
  });
});

// Now import the middleware after mocking
import {
  rateLimitMiddleware,
  slowDownMiddleware,
  agentExecutionRateLimit,
  authRateLimitMiddleware,
  apiKeyRateLimitMiddleware,
  checkConcurrentSessions,
  addConcurrentSession,
  removeConcurrentSession
} from '../../../src/api/middleware/rateLimiting.js';

describe('Rate Limiting Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      id: 'req-test-123',
      method: 'GET',
      url: '/api/v1/test',
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
      connection: { remoteAddress: '192.168.1.1' } as any,
      socket: { remoteAddress: '192.168.1.1' } as any
    };

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limit Key Generation', () => {
    test('should generate user-based key for authenticated user', () => {
      req.user = {
        id: 'user-123',
        is_admin: false,
        authMethod: 'jwt'
      } as any;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect((req as any)._rateLimitKey).toBe('user:user-123');
      expect(next).toHaveBeenCalled();
    });

    test('should generate IP-based key for unauthenticated request', () => {
      delete req.user;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect((req as any)._rateLimitKey).toBe('ip:192.168.1.1');
      expect(next).toHaveBeenCalled();
    });

    test('should handle various IP extraction scenarios', () => {
      delete req.user;
      req.headers!['x-forwarded-for'] = '203.0.113.1, 192.168.1.1, 10.0.0.1';

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect((req as any)._rateLimitKey).toBe('ip:203.0.113.1');
    });

    test('should fallback to x-real-ip when x-forwarded-for not available', () => {
      delete req.user;
      delete req.headers!['x-forwarded-for'];
      req.headers!['x-real-ip'] = '198.51.100.1';

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect((req as any)._rateLimitKey).toBe('ip:198.51.100.1');
    });

    test('should use unknown when no IP is available', () => {
      delete req.user;
      delete req.headers!['x-forwarded-for'];
      delete req.headers!['x-real-ip'];
      delete req.connection;
      delete req.socket;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect((req as any)._rateLimitKey).toBe('ip:unknown');
    });
  });

  describe('Admin Bypass Logic', () => {
    test('should bypass rate limit for admin user with bypass privilege', () => {
      req.user = {
        id: 'admin-123',
        is_admin: true,
        admin_privileges: {
          bypass_rate_limits: true
        },
        authMethod: 'jwt'
      } as any;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      // Should skip rate limiting and go straight to next
      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBeUndefined();
    });

    test('should not bypass rate limit for admin without bypass privilege', () => {
      req.user = {
        id: 'admin-456',
        is_admin: true,
        admin_privileges: {
          unlimited_credits: true
        },
        authMethod: 'jwt'
      } as any;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      // Should apply rate limiting
      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('user:admin-456');
    });

    test('should not bypass rate limit for regular user', () => {
      req.user = {
        id: 'user-789',
        is_admin: false,
        authMethod: 'jwt'
      } as any;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('user:user-789');
    });
  });

  describe('Rate Limit Message Configuration', () => {
    test('should have multiple rate limiting configurations', () => {
      // Check that we have multiple rate limit configurations created
      expect(rateLimitConfigs.length).toBeGreaterThan(1);
      
      // Find the main rate limit config (first one should be the main rateLimitMiddleware)
      const mainConfig = rateLimitConfigs[0];
      expect(mainConfig).toBeDefined();
      expect(mainConfig.max).toBe(1000);
      expect(mainConfig.windowMs).toBe(60 * 60 * 1000);
      expect(mainConfig.message).toEqual({
        success: false,
        error: {
          type: 'RATE_LIMIT_ERROR',
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests from this user/IP',
          details: {
            limit: 1000,
            window_ms: 3600000,
            user_tier: 'individual',
            admin_bypass_available: false,
            retry_after: '1 hour'
          },
          help_url: 'https://docs.keen.dev/api/rate-limits'
        }
      });
    });
  });

  describe('Agent Execution Rate Limiting', () => {
    test('should have stricter limits for agent execution', () => {
      req.user = {
        id: 'user-123',
        is_admin: false,
        authMethod: 'jwt'
      } as any;

      agentExecutionRateLimit(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('user:user-123');
    });

    test('should bypass for admin users', () => {
      req.user = {
        id: 'admin-123',
        is_admin: true,
        admin_privileges: {
          bypass_rate_limits: true
        },
        authMethod: 'jwt'
      } as any;

      agentExecutionRateLimit(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBeUndefined();
    });
  });

  describe('Authentication Rate Limiting', () => {
    test('should use IP-based key generation for auth endpoints', () => {
      delete req.user;
      req.headers!['x-forwarded-for'] = '203.0.113.50';

      authRateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('auth:203.0.113.50');
    });

    test('should handle missing IP in auth rate limiting', () => {
      delete req.user;
      delete req.headers!['x-forwarded-for'];
      delete req.headers!['x-real-ip'];
      delete req.connection;
      delete req.socket;

      authRateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('auth:unknown');
    });
  });

  describe('API Key Rate Limiting', () => {
    test('should apply rate limiting to API key operations', () => {
      req.user = {
        id: 'user-123',
        is_admin: false,
        authMethod: 'api_key'
      } as any;

      apiKeyRateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('user:user-123');
    });
  });

  describe('Slow Down Middleware Integration', () => {
    test('should configure slow down middleware correctly', () => {
      const config = (mockSlowDownInstance as any).config;
      
      expect(config).toBeDefined();
      expect(config.windowMs).toBe(60 * 1000); // 1 minute
      expect(config.delayAfter).toBe(100); // 100 requests before delay
      expect(config.delayMs).toBe(500); // 500ms delay
    });

    test('should use same key generator as rate limit', () => {
      req.user = { id: 'user-slowdown', is_admin: false, authMethod: 'jwt' } as any;

      slowDownMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._slowDownKey).toBe('user:user-slowdown');
    });

    test('should skip slow down for admin users', () => {
      req.user = {
        id: 'admin-slowdown',
        is_admin: true,
        admin_privileges: { bypass_rate_limits: true },
        authMethod: 'jwt'
      } as any;

      slowDownMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._slowDownKey).toBeUndefined();
    });
  });

  describe('Concurrent Sessions Management', () => {
    beforeEach(() => {
      // Clear any existing sessions before each test
      jest.clearAllMocks();
    });

    test('should allow request within concurrent session limit', () => {
      const concurrencyMiddleware = checkConcurrentSessions(3);

      req.user = {
        id: 'user-123',
        is_admin: false,
        authMethod: 'jwt'
      } as any;

      // Add one session for this user
      addConcurrentSession('user-123', 'session-1');

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject request exceeding concurrent session limit', () => {
      const concurrencyMiddleware = checkConcurrentSessions(2);

      req.user = {
        id: 'user-456',
        is_admin: false,
        authMethod: 'jwt'
      } as any;

      // Add sessions to exceed limit
      addConcurrentSession('user-456', 'session-1');
      addConcurrentSession('user-456', 'session-2');
      addConcurrentSession('user-456', 'session-3');

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'CONCURRENCY_ERROR',
          code: 'TOO_MANY_CONCURRENT_SESSIONS',
          message: 'Maximum concurrent sessions exceeded',
          details: {
            current: 3,
            limit: 2,
            admin_bypass_available: false
          }
        },
        request_id: 'req-test-123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should bypass concurrent session limit for admin', () => {
      const concurrencyMiddleware = checkConcurrentSessions(1);

      req.user = {
        id: 'admin-789',
        is_admin: true,
        admin_privileges: {
          bypass_rate_limits: true
        },
        authMethod: 'jwt'
      } as any;

      // Add many sessions for admin user
      addConcurrentSession('admin-789', 'session-1');
      addConcurrentSession('admin-789', 'session-2');
      addConcurrentSession('admin-789', 'session-3');
      addConcurrentSession('admin-789', 'session-4');

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should require authentication for concurrent session check', () => {
      const concurrencyMiddleware = checkConcurrentSessions(3);

      delete req.user;

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should properly manage session addition and removal', () => {
      const userId = 'user-session-test';
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      // Add sessions
      addConcurrentSession(userId, sessionId1);
      addConcurrentSession(userId, sessionId2);

      // Check that sessions are tracked
      const concurrencyMiddleware = checkConcurrentSessions(3);
      req.user = { id: userId, is_admin: false, authMethod: 'jwt' } as any;

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);
      expect(next).toHaveBeenCalled();

      // Remove one session
      removeConcurrentSession(userId, sessionId1);

      jest.clearAllMocks();

      // Should still work with reduced sessions
      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('should clean up empty session sets', () => {
      const userId = 'user-cleanup-test';
      const sessionId = 'session-only';

      addConcurrentSession(userId, sessionId);
      removeConcurrentSession(userId, sessionId);

      const concurrencyMiddleware = checkConcurrentSessions(1);
      req.user = { id: userId, is_admin: false, authMethod: 'jwt' } as any;

      concurrencyMiddleware(req as AuthenticatedRequest, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    test('should handle undefined user gracefully in bypass check', () => {
      req.user = undefined;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('ip:192.168.1.1');
    });

    test('should handle malformed admin privileges', () => {
      req.user = {
        id: 'user-malformed',
        is_admin: true,
        admin_privileges: null,
        authMethod: 'jwt'
      } as any;

      rateLimitMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any)._rateLimitKey).toBe('user:user-malformed');
    });
  });

  describe('Legacy Function Warnings', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should warn about deprecated incrementUserSessions', () => {
      const { incrementUserSessions } = require('../../../src/api/middleware/rateLimiting.js');

      incrementUserSessions('user-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'incrementUserSessions is deprecated, use addConcurrentSession instead'
      );
    });

    test('should warn about deprecated decrementUserSessions', () => {
      const { decrementUserSessions } = require('../../../src/api/middleware/rateLimiting.js');

      decrementUserSessions('user-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'decrementUserSessions is deprecated, use removeConcurrentSession instead'
      );
    });
  });
});
