/**
 * Authentication Service Tests - Comprehensive Backend Testing
 * Testing JWT authentication, API key validation, and admin privileges
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthenticationService } from '../../src/api/services/AuthenticationService.js';
import { DatabaseManager } from '../../src/database/DatabaseManager.js';
import { UserDAO } from '../../src/database/dao/UserDAO.js';
import { AuditLogger } from '../../src/api/services/AuditLogger.js';
import { AuthenticationError, MFARequiredError } from '../../src/api/types.js';
// Mock dependencies
jest.mock('../../src/database/DatabaseManager.js');
jest.mock('../../src/database/dao/UserDAO.js');
jest.mock('../../src/api/services/AuditLogger.js');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');
describe('AuthenticationService', () => {
    let authService;
    let mockDB;
    let mockUserDAO;
    let mockAuditLogger;
    const mockJwtSecret = 'test-jwt-secret-key';
    beforeAll(() => {
        process.env.JWT_SECRET = mockJwtSecret;
    });
    beforeEach(() => {
        mockDB = new DatabaseManager({});
        mockUserDAO = new UserDAO({});
        mockAuditLogger = new AuditLogger({});
        mockDB.query = jest.fn();
        mockAuditLogger.logSuccessfulLogin = jest.fn();
        mockAuditLogger.logFailedLogin = jest.fn();
        mockAuditLogger.logAdminAction = jest.fn();
        authService = new AuthenticationService(mockDB, mockUserDAO, mockAuditLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('constructor', () => {
        test('should throw error when JWT_SECRET is missing', () => {
            delete process.env.JWT_SECRET;
            expect(() => {
                new AuthenticationService(mockDB, mockUserDAO, mockAuditLogger);
            }).toThrow('JWT_SECRET environment variable is required');
            process.env.JWT_SECRET = mockJwtSecret; // Restore for other tests
        });
    });
    describe('login', () => {
        const mockCredentials = {
            email: 'test@example.com',
            password: 'TestPassword123!'
        };
        const mockClientInfo = {
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Test Browser'
        };
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            password_hash: '$2b$10$hashedpassword',
            is_admin: false,
            admin_privileges: {},
            account_status: 'active',
            role: 'user',
            mfa_enabled: false,
            mfa_secret: null
        };
        test('should successfully login regular user with valid credentials', async () => {
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock-jwt-token');
            mockDB.query.mockResolvedValue([]);
            const result = await authService.login(mockCredentials, mockClientInfo);
            expect(result.user.email).toBe(mockCredentials.email);
            expect(result.user.authMethod).toBe('jwt');
            expect(result.tokens.access_token).toBe('mock-jwt-token');
            expect(result.tokens.expires_in).toBe(900); // Regular user: 15 minutes
            expect(result.adminAccess).toBe(false);
            expect(mockAuditLogger.logSuccessfulLogin).toHaveBeenCalledWith(mockUser.id, mockClientInfo, expect.objectContaining({ isAdmin: false }));
        });
        test('should successfully login admin user with extended token expiry', async () => {
            const adminUser = { ...mockUser, is_admin: true, admin_privileges: { unlimited_credits: true } };
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock-admin-jwt-token');
            mockDB.query.mockResolvedValue([]);
            const result = await authService.login(mockCredentials, mockClientInfo);
            expect(result.user.is_admin).toBe(true);
            expect(result.tokens.expires_in).toBe(3600); // Admin: 1 hour
            expect(result.adminAccess).toBe(true);
            expect(mockAuditLogger.logSuccessfulLogin).toHaveBeenCalledWith(adminUser.id, mockClientInfo, expect.objectContaining({ isAdmin: true }));
        });
        test('should fail login with invalid email', async () => {
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(null);
            await expect(authService.login(mockCredentials, mockClientInfo)).rejects.toThrow(AuthenticationError);
            expect(mockAuditLogger.logFailedLogin).toHaveBeenCalledWith(mockCredentials.email, mockClientInfo, 'invalid_credentials');
        });
        test('should fail login with invalid password', async () => {
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            await expect(authService.login(mockCredentials, mockClientInfo)).rejects.toThrow(AuthenticationError);
            expect(mockAuditLogger.logFailedLogin).toHaveBeenCalledWith(mockCredentials.email, mockClientInfo, 'invalid_credentials');
        });
        test('should fail login for suspended account', async () => {
            const suspendedUser = { ...mockUser, account_status: 'suspended' };
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(suspendedUser);
            bcrypt.compare.mockResolvedValue(true);
            await expect(authService.login(mockCredentials, mockClientInfo)).rejects.toThrow('Account is suspended or inactive');
            expect(mockAuditLogger.logFailedLogin).toHaveBeenCalledWith(mockCredentials.email, mockClientInfo, 'account_suspended');
        });
        test('should require MFA token when MFA is enabled', async () => {
            const mfaUser = { ...mockUser, mfa_enabled: true, mfa_secret: 'secret123' };
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(mfaUser);
            bcrypt.compare.mockResolvedValue(true);
            await expect(authService.login(mockCredentials, mockClientInfo)).rejects.toThrow(MFARequiredError);
        });
        test('should validate MFA token when provided', async () => {
            const mfaUser = { ...mockUser, mfa_enabled: true, mfa_secret: 'secret123' };
            const credentialsWithMFA = { ...mockCredentials, mfaToken: '123456' };
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(mfaUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock-jwt-token');
            mockDB.query.mockResolvedValue([]);
            const result = await authService.login(credentialsWithMFA, mockClientInfo);
            expect(result.user.email).toBe(mockCredentials.email);
            expect(result.tokens.access_token).toBe('mock-jwt-token');
        });
        test('should skip rate limiting for admin email', async () => {
            const adminCredentials = {
                email: process.env.ADMIN_EMAIL || 'admin@keen.dev',
                password: 'AdminPassword123!'
            };
            const adminUser = {
                ...mockUser,
                email: adminCredentials.email,
                is_admin: true
            };
            mockUserDAO.getUserByEmailForAuth = jest.fn().mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('admin-jwt-token');
            mockDB.query.mockResolvedValue([]);
            const result = await authService.login(adminCredentials, mockClientInfo);
            expect(result.adminAccess).toBe(true);
            expect(result.tokens.expires_in).toBe(3600);
        });
    });
    describe('generateAccessToken', () => {
        test('should generate JWT with correct payload for regular user', async () => {
            const user = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: 'user',
                is_admin: false,
                admin_privileges: {}
            };
            jwt.sign.mockReturnValue('mock-token');
            const token = await authService.generateAccessToken(user);
            expect(token).toBe('mock-token');
            expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({
                sub: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                isAdmin: false,
                scopes: expect.arrayContaining(['profile:read', 'credits:read', 'agents:execute', 'sessions:read'])
            }), mockJwtSecret, { algorithm: 'HS256' });
        });
        test('should generate JWT with admin scopes for admin user', async () => {
            const adminUser = {
                id: 'admin-123',
                email: 'admin@example.com',
                username: 'admin',
                role: 'admin',
                is_admin: true,
                admin_privileges: { unlimited_credits: true }
            };
            jwt.sign.mockReturnValue('admin-token');
            const token = await authService.generateAccessToken(adminUser);
            expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({
                isAdmin: true,
                scopes: expect.arrayContaining([
                    'admin:analytics',
                    'admin:users:read',
                    'agents:unlimited',
                    'credits:unlimited'
                ])
            }), mockJwtSecret, { algorithm: 'HS256' });
        });
    });
    describe('verifyAccessToken', () => {
        test('should verify valid JWT token', async () => {
            const mockPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                isAdmin: false,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 900
            };
            const mockUser = {
                id: 'user-123',
                account_status: 'active',
                is_admin: false
            };
            jwt.verify.mockReturnValue(mockPayload);
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(mockUser);
            const result = await authService.verifyAccessToken('valid-token');
            expect(result).toEqual(mockPayload);
            expect(mockUserDAO.getUserById).toHaveBeenCalledWith(mockPayload.sub);
        });
        test('should throw error for invalid token', async () => {
            jwt.verify.mockImplementation(() => {
                throw new jwt.JsonWebTokenError('invalid token');
            });
            await expect(authService.verifyAccessToken('invalid-token')).rejects.toThrow(AuthenticationError);
        });
        test('should throw error for expired token', async () => {
            jwt.verify.mockImplementation(() => {
                throw new jwt.TokenExpiredError('token expired', new Date());
            });
            await expect(authService.verifyAccessToken('expired-token')).rejects.toThrow(AuthenticationError);
        });
        test('should throw error when user no longer exists', async () => {
            const mockPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                isAdmin: false
            };
            jwt.verify.mockReturnValue(mockPayload);
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(null);
            await expect(authService.verifyAccessToken('token-for-deleted-user')).rejects.toThrow('Token is invalid - user account not active');
        });
        test('should throw error when admin privileges revoked', async () => {
            const mockPayload = {
                sub: 'user-123',
                isAdmin: true
            };
            const nonAdminUser = {
                id: 'user-123',
                account_status: 'active',
                is_admin: false // Admin privileges revoked
            };
            jwt.verify.mockReturnValue(mockPayload);
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(nonAdminUser);
            await expect(authService.verifyAccessToken('revoked-admin-token')).rejects.toThrow('Admin privileges have been revoked');
        });
    });
    describe('createAPIKey', () => {
        const mockKeyConfig = {
            name: 'Test API Key',
            scopes: ['profile:read', 'credits:read'],
            rateLimitPerHour: 1000
        };
        test('should create API key for regular user', async () => {
            const userId = 'user-123';
            const context = { userId, isAdmin: false };
            const mockUser = {
                id: userId,
                is_admin: false,
                admin_privileges: {}
            };
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(mockUser);
            mockDB.query.mockResolvedValue([]);
            const result = await authService.createAPIKey(userId, mockKeyConfig, context);
            expect(result.name).toBe(mockKeyConfig.name);
            expect(result.scopes).toEqual(mockKeyConfig.scopes);
            expect(result.rateLimitPerHour).toBe(1000);
            expect(result.bypassLimits).toBe(false);
            expect(result.key).toMatch(/^ak_live_/);
            expect(mockDB.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auth_tokens'), expect.arrayContaining([
                expect.any(String), // id
                userId,
                expect.any(String), // token_hash
                mockKeyConfig.name,
                JSON.stringify(mockKeyConfig.scopes),
                1000, // rate_limit_per_hour
                true, // is_active
                undefined // expires_at
            ]), context);
        });
        test('should create API key for admin user with unlimited rate limits', async () => {
            const userId = 'admin-123';
            const context = { userId, isAdmin: true };
            const mockAdminUser = {
                id: userId,
                is_admin: true,
                admin_privileges: { unlimited_credits: true }
            };
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(mockAdminUser);
            mockDB.query.mockResolvedValue([]);
            const result = await authService.createAPIKey(userId, mockKeyConfig, context);
            expect(result.rateLimitPerHour).toBeNull();
            expect(result.bypassLimits).toBe(true);
            expect(result.key).toMatch(/^ak_admin_/);
        });
        test('should throw error when user not found', async () => {
            const userId = 'nonexistent-user';
            const context = { userId, isAdmin: false };
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(null);
            await expect(authService.createAPIKey(userId, mockKeyConfig, context)).rejects.toThrow('User not found');
        });
    });
    describe('validateAPIKey', () => {
        test('should validate active API key', async () => {
            const keyValue = 'ak_live_test123';
            const mockAPIKey = {
                id: 'key-123',
                user_id: 'user-456',
                token_type: 'api_key',
                scopes: JSON.stringify(['profile:read', 'credits:read']),
                is_active: true,
                expires_at: null,
                is_admin: false,
                admin_privileges: {}
            };
            mockDB.query.mockResolvedValueOnce([mockAPIKey])
                .mockResolvedValueOnce([]); // Update query
            const result = await authService.validateAPIKey(keyValue);
            expect(result.userId).toBe(mockAPIKey.user_id);
            expect(result.scopes).toEqual(['profile:read', 'credits:read']);
            expect(result.isAdmin).toBe(false);
            expect(result.adminPrivileges).toBeNull();
        });
        test('should validate admin API key with privileges', async () => {
            const keyValue = 'ak_admin_test123';
            const mockAdminAPIKey = {
                id: 'admin-key-123',
                user_id: 'admin-456',
                scopes: JSON.stringify(['admin:analytics', 'credits:unlimited']),
                is_active: true,
                expires_at: null,
                is_admin: true,
                admin_privileges: { unlimited_credits: true }
            };
            mockDB.query.mockResolvedValueOnce([mockAdminAPIKey])
                .mockResolvedValueOnce([]);
            const result = await authService.validateAPIKey(keyValue);
            expect(result.isAdmin).toBe(true);
            expect(result.adminPrivileges).toEqual({ unlimited_credits: true });
        });
        test('should throw error for invalid API key', async () => {
            mockDB.query.mockResolvedValue([]);
            await expect(authService.validateAPIKey('invalid-key')).rejects.toThrow('Invalid API key');
        });
        test('should throw error for expired API key', async () => {
            const keyValue = 'ak_live_expired123';
            const pastDate = new Date(Date.now() - 86400000); // 24 hours ago
            const mockExpiredKey = {
                id: 'expired-key-123',
                user_id: 'user-456',
                scopes: JSON.stringify(['profile:read']),
                is_active: true,
                expires_at: pastDate,
                is_admin: false
            };
            mockDB.query.mockResolvedValue([mockExpiredKey]);
            await expect(authService.validateAPIKey(keyValue)).rejects.toThrow('API key has expired');
        });
    });
    describe('refreshAccessToken', () => {
        test('should refresh valid token', async () => {
            const refreshToken = 'valid-refresh-token';
            const mockUser = {
                id: 'user-123',
                account_status: 'active',
                is_admin: false
            };
            // Setup in-memory refresh token
            authService.refreshTokens.set(refreshToken, {
                userId: mockUser.id,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
                clientInfo: { ip: '127.0.0.1' }
            });
            mockUserDAO.getUserById = jest.fn().mockResolvedValue(mockUser);
            jwt.sign.mockReturnValue('new-access-token');
            const result = await authService.refreshAccessToken(refreshToken);
            expect(result.access_token).toBe('new-access-token');
            expect(result.expires_in).toBe(900);
        });
        test('should throw error for invalid refresh token', async () => {
            await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
        });
    });
    describe('listAPIKeys and revokeAPIKey', () => {
        test('should list user API keys', async () => {
            const userId = 'user-123';
            const context = { userId, isAdmin: false };
            const mockKeys = [
                {
                    id: 'key-1',
                    token_name: 'Production Key',
                    scopes: JSON.stringify(['profile:read']),
                    rate_limit_per_hour: 1000,
                    is_active: true,
                    created_at: new Date()
                }
            ];
            mockDB.query.mockResolvedValue(mockKeys);
            const result = await authService.listAPIKeys(userId, context);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Production Key');
            expect(result[0].scopes).toEqual(['profile:read']);
            expect(result[0].bypassLimits).toBe(false);
        });
        test('should revoke API key', async () => {
            const userId = 'user-123';
            const keyId = 'key-456';
            const context = { userId, isAdmin: false };
            mockDB.query.mockResolvedValue([{ affected: 1 }]);
            const result = await authService.revokeAPIKey(userId, keyId, context);
            expect(result).toBe(true);
            expect(mockDB.query).toHaveBeenCalledWith('UPDATE auth_tokens SET is_active = false WHERE id = $1 AND user_id = $2 AND token_type = $3', [keyId, userId, 'api_key'], context);
        });
    });
});
//# sourceMappingURL=AuthenticationService.test.js.map