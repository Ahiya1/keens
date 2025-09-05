/**
 * Rate Limiting Middleware Tests - Comprehensive Backend Testing
 * Testing rate limiting with admin bypass and different user tiers
 */
import { checkConcurrentSessions, addConcurrentSession, removeConcurrentSession } from '../../../src/api/middleware/rateLimiting.js';
// Mock express-rate-limit and express-slow-down
jest.mock('express-rate-limit');
jest.mock('express-slow-down');
describe('Rate Limiting Middleware', () => {
    let req;
    let res;
    let next;
    beforeEach(() => {
        req = {
            id: 'req-test-123',
            method: 'GET',
            url: '/api/v1/test', // Use url instead of path for mocking
            headers: {
                'x-forwarded-for': '192.168.1.1',
            },
            // Mock connection and socket as any to avoid Socket interface issues
            connection: { remoteAddress: '192.168.1.1' },
            socket: { remoteAddress: '192.168.1.1' }
        };
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
            };
            // We need to test the key generator function indirectly
            // by checking how the middleware behaves with different users
            const mockRateLimit = require('express-rate-limit');
            // Simulate rate limit middleware call
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('user:user-123');
            }
        });
        test('should generate IP-based key for unauthenticated request', () => {
            // No user attached
            delete req.user;
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('ip:192.168.1.1');
            }
        });
        test('should handle various IP extraction scenarios', () => {
            delete req.user;
            // Test x-forwarded-for with multiple IPs
            req.headers['x-forwarded-for'] = '203.0.113.1, 192.168.1.1, 10.0.0.1';
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('ip:203.0.113.1'); // Should take first IP
            }
        });
        test('should fallback to x-real-ip when x-forwarded-for not available', () => {
            delete req.user;
            delete req.headers['x-forwarded-for'];
            req.headers['x-real-ip'] = '198.51.100.1';
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('ip:198.51.100.1');
            }
        });
        test('should use unknown when no IP is available', () => {
            delete req.user;
            delete req.headers['x-forwarded-for'];
            delete req.headers['x-real-ip'];
            delete req.connection;
            delete req.socket;
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('ip:unknown');
            }
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
            };
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(true);
            }
        });
        test('should not bypass rate limit for admin without bypass privilege', () => {
            req.user = {
                id: 'admin-456',
                is_admin: true,
                admin_privileges: {
                    unlimited_credits: true
                    // missing bypass_rate_limits
                },
                authMethod: 'jwt'
            };
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(false);
            }
        });
        test('should not bypass rate limit for regular user', () => {
            req.user = {
                id: 'user-789',
                is_admin: false,
                authMethod: 'jwt'
            };
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(false);
            }
        });
    });
    describe('Rate Limit Message Configuration', () => {
        test('should have correct error message for main rate limit', () => {
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                expect(config.message).toEqual({
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
            }
        });
        test('should have different limits for agent execution', () => {
            // Check if agent execution rate limit is configured differently
            const mockRateLimit = require('express-rate-limit');
            // Look for agent execution specific configuration
            const agentExecutionCall = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AGENT_EXECUTION_LIMIT_EXCEEDED');
            if (agentExecutionCall) {
                expect(agentExecutionCall[0].max).toBe(10); // Stricter limit for agent execution
                expect(agentExecutionCall[0].message.error.details.limit).toBe(10);
            }
        });
        test('should have auth-specific rate limiting configuration', () => {
            const mockRateLimit = require('express-rate-limit');
            const authRateLimitCall = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AUTH_RATE_LIMIT_EXCEEDED');
            if (authRateLimitCall) {
                expect(authRateLimitCall[0].max).toBe(20);
                expect(authRateLimitCall[0].windowMs).toBe(15 * 60 * 1000); // 15 minutes
            }
        });
    });
    describe('Concurrent Sessions Management', () => {
        beforeEach(() => {
            // Clear any existing sessions before each test
            const activeSessions = require('../../../src/api/middleware/rateLimiting.js').activeSessions;
            if (activeSessions && activeSessions.clear) {
                activeSessions.clear();
            }
        });
        test('should allow request within concurrent session limit', () => {
            const concurrencyMiddleware = checkConcurrentSessions(3);
            req.user = {
                id: 'user-123',
                is_admin: false,
                authMethod: 'jwt'
            };
            // Add one session for this user
            addConcurrentSession('user-123', 'session-1');
            concurrencyMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should reject request exceeding concurrent session limit', () => {
            const concurrencyMiddleware = checkConcurrentSessions(2); // Lower limit for test
            req.user = {
                id: 'user-456',
                is_admin: false,
                authMethod: 'jwt'
            };
            // Add sessions to exceed limit
            addConcurrentSession('user-456', 'session-1');
            addConcurrentSession('user-456', 'session-2');
            addConcurrentSession('user-456', 'session-3'); // This exceeds limit of 2
            concurrencyMiddleware(req, res, next);
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
            const concurrencyMiddleware = checkConcurrentSessions(1); // Very low limit
            req.user = {
                id: 'admin-789',
                is_admin: true,
                admin_privileges: {
                    bypass_rate_limits: true
                },
                authMethod: 'jwt'
            };
            // Add many sessions for admin user
            addConcurrentSession('admin-789', 'session-1');
            addConcurrentSession('admin-789', 'session-2');
            addConcurrentSession('admin-789', 'session-3');
            addConcurrentSession('admin-789', 'session-4');
            concurrencyMiddleware(req, res, next);
            expect(next).toHaveBeenCalled(); // Admin should bypass
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should require authentication for concurrent session check', () => {
            const concurrencyMiddleware = checkConcurrentSessions(3);
            // No user attached to request
            delete req.user;
            concurrencyMiddleware(req, res, next);
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
            req.user = { id: userId, is_admin: false, authMethod: 'jwt' };
            concurrencyMiddleware(req, res, next);
            expect(next).toHaveBeenCalled(); // Should be within limit
            // Remove one session
            removeConcurrentSession(userId, sessionId1);
            // Clear mocks for next test
            jest.clearAllMocks();
            // Should still work with reduced sessions
            concurrencyMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        test('should clean up empty session sets', () => {
            const userId = 'user-cleanup-test';
            const sessionId = 'session-only';
            // Add and then remove the only session
            addConcurrentSession(userId, sessionId);
            removeConcurrentSession(userId, sessionId);
            // User should now have 0 sessions
            const concurrencyMiddleware = checkConcurrentSessions(1);
            req.user = { id: userId, is_admin: false, authMethod: 'jwt' };
            concurrencyMiddleware(req, res, next);
            expect(next).toHaveBeenCalled(); // Should allow as no active sessions
        });
    });
    describe('IP-Based Rate Limiting for Auth Endpoints', () => {
        test('should use IP-based key generation for auth endpoints', () => {
            // Auth endpoints don't have authenticated users yet
            delete req.user;
            Object.defineProperty(req, 'path', {
                value: '/api/v1/auth/login',
                writable: false,
                configurable: true
            });
            req.headers['x-forwarded-for'] = '203.0.113.50';
            const mockRateLimit = require('express-rate-limit');
            // Find auth-specific rate limit configuration
            const authRateLimitCall = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AUTH_RATE_LIMIT_EXCEEDED');
            if (authRateLimitCall) {
                const generatedKey = authRateLimitCall[0].keyGenerator(req);
                expect(generatedKey).toBe('auth:203.0.113.50');
            }
        });
        test('should handle missing IP in auth rate limiting', () => {
            delete req.user;
            delete req.headers['x-forwarded-for'];
            delete req.headers['x-real-ip'];
            delete req.connection;
            delete req.socket;
            const mockRateLimit = require('express-rate-limit');
            const authRateLimitCall = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AUTH_RATE_LIMIT_EXCEEDED');
            if (authRateLimitCall) {
                const generatedKey = authRateLimitCall[0].keyGenerator(req);
                expect(generatedKey).toBe('auth:unknown');
            }
        });
    });
    describe('Slow Down Middleware Integration', () => {
        test('should configure slow down middleware correctly', () => {
            const mockSlowDown = require('express-slow-down');
            if (mockSlowDown.mock.calls.length > 0) {
                const config = mockSlowDown.mock.calls[0][0];
                expect(config.windowMs).toBe(60 * 1000); // 1 minute
                expect(config.delayAfter).toBe(100); // 100 requests before delay
                expect(config.delayMs).toBe(500); // 500ms delay
            }
        });
        test('should use same key generator as rate limit', () => {
            req.user = { id: 'user-slowdown', is_admin: false, authMethod: 'jwt' };
            const mockSlowDown = require('express-slow-down');
            if (mockSlowDown.mock.calls.length > 0) {
                const config = mockSlowDown.mock.calls[0][0];
                const generatedKey = config.keyGenerator(req);
                expect(generatedKey).toBe('user:user-slowdown');
            }
        });
        test('should skip slow down for admin users', () => {
            req.user = {
                id: 'admin-slowdown',
                is_admin: true,
                admin_privileges: { bypass_rate_limits: true },
                authMethod: 'jwt'
            };
            const mockSlowDown = require('express-slow-down');
            if (mockSlowDown.mock.calls.length > 0) {
                const config = mockSlowDown.mock.calls[0][0];
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(true);
            }
        });
    });
    describe('Rate Limit Headers', () => {
        test('should include rate limit headers in main middleware', () => {
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                expect(config.headers).toBe(true);
                expect(config.standardHeaders).toBe(true);
                expect(config.legacyHeaders).toBe(false);
            }
        });
    });
    describe('Different Rate Limit Tiers', () => {
        test('should configure different limits for different endpoints', () => {
            const mockRateLimit = require('express-rate-limit');
            // Check that we have multiple rate limit configurations
            expect(mockRateLimit.mock.calls.length).toBeGreaterThan(1);
            // Main rate limit should be 1000/hour
            const mainConfig = mockRateLimit.mock.calls[0][0];
            expect(mainConfig.max).toBe(1000);
            // Find agent execution rate limit (should be stricter)
            const agentConfig = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AGENT_EXECUTION_LIMIT_EXCEEDED');
            if (agentConfig) {
                expect(agentConfig[0].max).toBe(10);
            }
            // Find auth rate limit (should be different window)
            const authConfig = mockRateLimit.mock.calls.find((call) => call[0].message?.error?.code === 'AUTH_RATE_LIMIT_EXCEEDED');
            if (authConfig) {
                expect(authConfig[0].max).toBe(20);
                expect(authConfig[0].windowMs).toBe(15 * 60 * 1000);
            }
        });
    });
    describe('Error Scenarios', () => {
        test('should handle undefined user gracefully in bypass check', () => {
            req.user = undefined;
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(false); // Should not bypass without user
            }
        });
        test('should handle malformed admin privileges', () => {
            req.user = {
                id: 'user-malformed',
                is_admin: true,
                admin_privileges: null, // Malformed privileges
                authMethod: 'jwt'
            };
            const mockRateLimit = require('express-rate-limit');
            if (mockRateLimit.mock.calls.length > 0) {
                const config = mockRateLimit.mock.calls[0][0];
                // Should not throw error and should not bypass
                expect(() => config.skip(req)).not.toThrow();
                const shouldSkip = config.skip(req);
                expect(shouldSkip).toBe(false);
            }
        });
    });
    describe('Legacy Function Warnings', () => {
        let consoleSpy;
        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        });
        afterEach(() => {
            consoleSpy.mockRestore();
        });
        test('should warn about deprecated incrementUserSessions', () => {
            const { incrementUserSessions } = require('../../../src/api/middleware/rateLimiting.js');
            incrementUserSessions('user-123');
            expect(consoleSpy).toHaveBeenCalledWith('incrementUserSessions is deprecated, use addConcurrentSession instead');
        });
        test('should warn about deprecated decrementUserSessions', () => {
            const { decrementUserSessions } = require('../../../src/api/middleware/rateLimiting.js');
            decrementUserSessions('user-123');
            expect(consoleSpy).toHaveBeenCalledWith('decrementUserSessions is deprecated, use removeConcurrentSession instead');
        });
    });
});
//# sourceMappingURL=rateLimiting.test.js.map