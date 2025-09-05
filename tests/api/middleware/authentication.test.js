/**
 * Authentication Middleware Tests - Comprehensive Backend Testing
 * Testing JWT and API key authentication middleware with admin privilege handling
 */
import { createAuthMiddleware, requireAdmin, requireAdminPrivilege, requireScopes, optionalAuth, shouldBypassRateLimit } from '../../../src/api/middleware/authentication.js';
import { AuthenticationError } from '../../../src/api/types.js';
// Mock dependencies
jest.mock('../../../src/api/services/AuthenticationService.js');
jest.mock('../../../src/api/services/AuditLogger.js');
describe('Authentication Middleware', () => {
    let mockAuthService;
    let mockAuditLogger;
    let req;
    let res;
    let next;
    beforeEach(() => {
        mockAuthService = {
            verifyAccessToken: jest.fn(),
            validateAPIKey: jest.fn(),
        };
        mockAuditLogger = {
            logSecurityEvent: jest.fn(),
            logError: jest.fn(),
        };
        // Create proper mock Socket objects
        const mockSocket = { remoteAddress: '192.168.1.1' };
        const mockConnection = { remoteAddress: '192.168.1.1' };
        req = {
            headers: {},
            id: 'req-123',
            path: '/api/v1/test',
            method: 'GET',
            connection: mockConnection,
            socket: mockSocket
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('createAuthMiddleware', () => {
        let authMiddleware;
        beforeEach(() => {
            authMiddleware = createAuthMiddleware(mockAuthService, mockAuditLogger);
        });
        describe('JWT Authentication', () => {
            test('should authenticate valid JWT token', async () => {
                req.headers.authorization = 'Bearer valid-jwt-token';
                const mockPayload = {
                    sub: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    isAdmin: false,
                    adminPrivileges: {},
                    scopes: ['profile:read', 'credits:read'],
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                };
                mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);
                await authMiddleware(req, res, next);
                expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token');
                expect(req.user).toEqual({
                    id: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    is_admin: false,
                    admin_privileges: {},
                    authMethod: 'jwt',
                    tokenIsAdmin: false,
                    tokenScopes: ['profile:read', 'credits:read']
                });
                expect(next).toHaveBeenCalled();
                expect(res.status).not.toHaveBeenCalled();
            });
            test('should authenticate admin JWT token with privileges', async () => {
                req.headers.authorization = 'Bearer admin-jwt-token';
                const mockAdminPayload = {
                    sub: 'admin-123',
                    email: 'admin@example.com',
                    username: 'admin',
                    role: 'admin',
                    isAdmin: true,
                    adminPrivileges: {
                        unlimited_credits: true,
                        view_all_analytics: true
                    },
                    scopes: ['admin:analytics', 'credits:unlimited'],
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                };
                mockAuthService.verifyAccessToken.mockResolvedValue(mockAdminPayload);
                await authMiddleware(req, res, next);
                const authenticatedReq = req;
                expect(authenticatedReq.user?.is_admin).toBe(true);
                expect(authenticatedReq.user?.admin_privileges).toEqual({
                    unlimited_credits: true,
                    view_all_analytics: true
                });
                expect(next).toHaveBeenCalled();
            });
            test('should reject invalid JWT token', async () => {
                req.headers.authorization = 'Bearer invalid-jwt-token';
                mockAuthService.verifyAccessToken.mockRejectedValue(new AuthenticationError('Invalid authentication token'));
                await authMiddleware(req, res, next);
                expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
                    type: 'invalid_token',
                    ip: '192.168.1.1',
                    details: {
                        reason: 'Invalid authentication token',
                        path: '/api/v1/test',
                        method: 'GET'
                    }
                });
                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    error: {
                        type: 'AUTHENTICATION_ERROR',
                        code: 'INVALID_TOKEN',
                        message: 'Invalid authentication token',
                        help_url: 'https://docs.keen.dev/auth/troubleshooting'
                    },
                    request_id: 'req-123'
                });
                expect(next).not.toHaveBeenCalled();
            });
        });
        describe('API Key Authentication', () => {
            test('should authenticate valid API key', async () => {
                req.headers.authorization = 'ApiKey ak_live_test123';
                const mockValidation = {
                    userId: 'user-456',
                    scopes: ['profile:read', 'agents:execute'],
                    rateLimitRemaining: 500,
                    isAdmin: false,
                    adminPrivileges: null
                };
                mockAuthService.validateAPIKey.mockResolvedValue(mockValidation);
                await authMiddleware(req, res, next);
                expect(mockAuthService.validateAPIKey).toHaveBeenCalledWith('ak_live_test123');
                expect(req.user).toEqual({
                    id: 'user-456',
                    is_admin: false,
                    admin_privileges: null,
                    authMethod: 'api_key',
                    tokenIsAdmin: false,
                    tokenScopes: ['profile:read', 'agents:execute']
                });
                expect(req.apiKeyScopes).toEqual(['profile:read', 'agents:execute']);
                expect(next).toHaveBeenCalled();
            });
            test('should authenticate admin API key with unlimited access', async () => {
                req.headers.authorization = 'ApiKey ak_admin_test456';
                const mockAdminValidation = {
                    userId: 'admin-789',
                    scopes: ['admin:analytics', 'credits:unlimited'],
                    rateLimitRemaining: 'unlimited',
                    isAdmin: true,
                    adminPrivileges: {
                        unlimited_credits: true,
                        bypass_rate_limits: true
                    }
                };
                mockAuthService.validateAPIKey.mockResolvedValue(mockAdminValidation);
                await authMiddleware(req, res, next);
                const authenticatedReq = req;
                expect(authenticatedReq.user?.is_admin).toBe(true);
                expect(authenticatedReq.user?.admin_privileges).toEqual({
                    unlimited_credits: true,
                    bypass_rate_limits: true
                });
                expect(next).toHaveBeenCalled();
            });
            test('should reject invalid API key', async () => {
                req.headers.authorization = 'ApiKey invalid-api-key';
                mockAuthService.validateAPIKey.mockRejectedValue(new AuthenticationError('Invalid API key'));
                await authMiddleware(req, res, next);
                expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
                    type: 'invalid_token',
                    ip: '192.168.1.1',
                    details: {
                        reason: 'Invalid API key',
                        path: '/api/v1/test',
                        method: 'GET'
                    }
                });
                expect(res.status).toHaveBeenCalledWith(401);
                expect(next).not.toHaveBeenCalled();
            });
        });
        describe('Authorization Header Validation', () => {
            test('should reject request without authorization header', async () => {
                // No authorization header
                delete req.headers.authorization;
                await authMiddleware(req, res, next);
                expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
                    type: 'invalid_token',
                    ip: '192.168.1.1',
                    details: {
                        reason: 'missing_authorization_header',
                        path: '/api/v1/test',
                        method: 'GET'
                    }
                });
                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    error: {
                        type: 'AUTHENTICATION_ERROR',
                        code: 'MISSING_AUTHORIZATION',
                        message: 'Authorization header is required',
                        help_url: 'https://docs.keen.dev/auth/headers'
                    },
                    request_id: 'req-123'
                });
                expect(next).not.toHaveBeenCalled();
            });
            test('should reject invalid authorization format', async () => {
                req.headers.authorization = 'Basic dGVzdDp0ZXN0';
                await authMiddleware(req, res, next);
                expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
                    type: 'invalid_token',
                    ip: '192.168.1.1',
                    details: {
                        reason: 'invalid_authorization_format',
                        auth_header_prefix: 'Basic dGVz',
                        path: '/api/v1/test'
                    }
                });
                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    error: {
                        type: 'AUTHENTICATION_ERROR',
                        code: 'INVALID_AUTHORIZATION_FORMAT',
                        message: 'Authorization header must start with "Bearer " or "ApiKey "',
                        help_url: 'https://docs.keen.dev/auth/formats'
                    },
                    request_id: 'req-123'
                });
                expect(next).not.toHaveBeenCalled();
            });
        });
        describe('Error Handling', () => {
            test('should handle unexpected errors gracefully', async () => {
                req.headers.authorization = 'Bearer valid-token';
                mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Database connection failed'));
                await authMiddleware(req, res, next);
                expect(mockAuditLogger.logError).toHaveBeenCalledWith({
                    requestId: 'req-123',
                    error: 'Database connection failed',
                    isAdmin: false
                });
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    error: {
                        type: 'SYSTEM_ERROR',
                        code: 'AUTHENTICATION_SYSTEM_ERROR',
                        message: 'Authentication system temporarily unavailable'
                    },
                    request_id: 'req-123'
                });
                expect(next).not.toHaveBeenCalled();
            });
            test('should handle missing request ID gracefully', async () => {
                delete req.id;
                req.headers.authorization = 'Bearer invalid-token';
                mockAuthService.verifyAccessToken.mockRejectedValue(new AuthenticationError('Token expired'));
                await authMiddleware(req, res, next);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    request_id: req.id // should handle undefined gracefully
                }));
            });
        });
    });
    describe('requireAdmin', () => {
        let adminMiddleware;
        beforeEach(() => {
            adminMiddleware = requireAdmin();
        });
        test('should allow admin user to proceed', () => {
            req.user = {
                id: 'admin-123',
                is_admin: true,
                admin_privileges: {},
                authMethod: 'jwt',
                tokenIsAdmin: true
            };
            adminMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should reject non-admin user', () => {
            req.user = {
                id: 'user-123',
                is_admin: false,
                authMethod: 'jwt'
            };
            adminMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    type: 'AUTHORIZATION_ERROR',
                    code: 'INSUFFICIENT_PRIVILEGES',
                    message: 'Admin privileges required for this operation',
                    help_url: 'https://docs.keen.dev/auth/admin'
                },
                request_id: req.id
            });
            expect(next).not.toHaveBeenCalled();
        });
        test('should reject request without user', () => {
            // No user attached to request
            delete req.user;
            adminMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireAdminPrivilege', () => {
        let privilegeMiddleware;
        const privilege = 'view_all_analytics';
        beforeEach(() => {
            privilegeMiddleware = requireAdminPrivilege(privilege);
        });
        test('should allow admin user with specific privilege', () => {
            req.user = {
                id: 'admin-123',
                is_admin: true,
                admin_privileges: {
                    view_all_analytics: true,
                    unlimited_credits: true
                },
                authMethod: 'jwt'
            };
            privilegeMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should reject admin user without specific privilege', () => {
            req.user = {
                id: 'admin-456',
                is_admin: true,
                admin_privileges: {
                    unlimited_credits: true
                    // missing view_all_analytics
                },
                authMethod: 'jwt'
            };
            privilegeMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    type: 'AUTHORIZATION_ERROR',
                    code: 'INSUFFICIENT_ADMIN_PRIVILEGES',
                    message: `Admin privilege '${privilege}' required for this operation`,
                    details: {
                        required_privilege: privilege,
                        user_privileges: { unlimited_credits: true }
                    },
                    help_url: 'https://docs.keen.dev/auth/admin-privileges'
                },
                request_id: req.id
            });
            expect(next).not.toHaveBeenCalled();
        });
        test('should reject non-admin user', () => {
            req.user = {
                id: 'user-123',
                is_admin: false,
                authMethod: 'jwt'
            };
            privilegeMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireScopes', () => {
        let scopeMiddleware;
        const requiredScopes = ['profile:read', 'agents:execute'];
        beforeEach(() => {
            scopeMiddleware = requireScopes(requiredScopes);
        });
        test('should allow user with all required scopes', () => {
            req.user = {
                id: 'user-123',
                is_admin: false,
                tokenScopes: ['profile:read', 'agents:execute', 'credits:read'],
                authMethod: 'jwt'
            };
            req.apiKeyScopes = [];
            scopeMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should allow admin user regardless of scopes', () => {
            req.user = {
                id: 'admin-123',
                is_admin: true,
                tokenScopes: [], // Admin doesn't need specific scopes
                authMethod: 'jwt'
            };
            scopeMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should allow API key with required scopes', () => {
            req.user = {
                id: 'user-456',
                is_admin: false,
                tokenScopes: [],
                authMethod: 'api_key'
            };
            req.apiKeyScopes = ['profile:read', 'agents:execute'];
            scopeMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        test('should reject user with missing scopes', () => {
            req.user = {
                id: 'user-789',
                is_admin: false,
                tokenScopes: ['profile:read'], // missing agents:execute
                authMethod: 'jwt'
            };
            req.apiKeyScopes = [];
            scopeMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    type: 'AUTHORIZATION_ERROR',
                    code: 'INSUFFICIENT_SCOPES',
                    message: 'Required API scopes are missing',
                    details: {
                        required_scopes: requiredScopes,
                        user_scopes: ['profile:read'],
                        missing_scopes: ['agents:execute']
                    },
                    help_url: 'https://docs.keen.dev/auth/scopes'
                },
                request_id: req.id
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('optionalAuth', () => {
        let optionalAuthMiddleware;
        beforeEach(() => {
            optionalAuthMiddleware = optionalAuth(mockAuthService, mockAuditLogger);
        });
        test('should proceed without authentication when no header provided', () => {
            delete req.headers.authorization;
            optionalAuthMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
        });
        test('should validate auth when header is provided', async () => {
            req.headers.authorization = 'Bearer valid-token';
            const mockPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                isAdmin: false,
                scopes: ['profile:read'],
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600
            };
            mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);
            await new Promise((resolve) => {
                next = jest.fn(() => resolve());
                optionalAuthMiddleware(req, res, next);
            });
            expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
            expect(req.user).toBeDefined();
            expect(next).toHaveBeenCalled();
        });
    });
    describe('shouldBypassRateLimit', () => {
        test('should return true for admin user with bypass privilege', () => {
            req.user = {
                id: 'admin-123',
                is_admin: true,
                admin_privileges: {
                    bypass_rate_limits: true
                }
            };
            const result = shouldBypassRateLimit(req);
            expect(result).toBe(true);
        });
        test('should return false for admin user without bypass privilege', () => {
            req.user = {
                id: 'admin-456',
                is_admin: true,
                admin_privileges: {
                    unlimited_credits: true
                    // missing bypass_rate_limits
                }
            };
            const result = shouldBypassRateLimit(req);
            expect(result).toBe(false);
        });
        test('should return false for regular user', () => {
            req.user = {
                id: 'user-123',
                is_admin: false
            };
            const result = shouldBypassRateLimit(req);
            expect(result).toBe(false);
        });
        test('should return false for unauthenticated request', () => {
            delete req.user;
            const result = shouldBypassRateLimit(req);
            expect(result).toBe(false);
        });
    });
    describe('Client IP Detection', () => {
        test('should extract IP from x-forwarded-for header', async () => {
            const authMiddleware = createAuthMiddleware(mockAuthService, mockAuditLogger);
            req.headers['x-forwarded-for'] = '203.0.113.1, 192.168.1.1';
            delete req.headers.authorization;
            await authMiddleware(req, res, next);
            expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: '203.0.113.1' // First IP in forwarded header
            }));
        });
        test('should extract IP from x-real-ip header', async () => {
            const authMiddleware = createAuthMiddleware(mockAuthService, mockAuditLogger);
            req.headers['x-real-ip'] = '198.51.100.1';
            delete req.headers.authorization;
            await authMiddleware(req, res, next);
            expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: '198.51.100.1'
            }));
        });
        test('should fallback to connection remote address', async () => {
            const authMiddleware = createAuthMiddleware(mockAuthService, mockAuditLogger);
            const mockConnection = { remoteAddress: '172.16.0.1' };
            req.connection = mockConnection;
            delete req.headers.authorization;
            await authMiddleware(req, res, next);
            expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: '172.16.0.1'
            }));
        });
        test('should use "unknown" when no IP is available', async () => {
            const authMiddleware = createAuthMiddleware(mockAuthService, mockAuditLogger);
            delete req.connection;
            delete req.socket;
            delete req.headers.authorization;
            await authMiddleware(req, res, next);
            expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: 'unknown'
            }));
        });
    });
});
//# sourceMappingURL=authentication.test.js.map