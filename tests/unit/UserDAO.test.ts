/**
 * UserDAO Unit Tests
 * Tests user management with admin privilege handling
 * FIXED: Complete Supabase mock overhaul using module-level mocking
 */

import { DatabaseManager, UserContext } from '../../src/database/DatabaseManager.js';
import { UserDAO, CreateUserRequest, LoginRequest } from '../../src/database/dao/UserDAO.js';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-4567-8901-123456789012')
}));

// FIXED: Complete overhaul - mock at higher level to avoid chaining issues
jest.mock('../../src/config/database.js', () => {
  // Mock responses  
  const mockSupabaseResponse = { data: null, error: null };
  
  // Create mock functions that can be controlled from tests
  const supabaseMockOperations = {
    // Database operation mocks
    insertUser: jest.fn().mockResolvedValue(mockSupabaseResponse),
    selectUser: jest.fn().mockResolvedValue(mockSupabaseResponse),
    updateUser: jest.fn().mockResolvedValue(mockSupabaseResponse),
    
    // Auth operation mocks
    createAuthUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInUser: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
  };
  
  // FIXED: Define chainable mock builder inside the mock
  const createChainableMock = (finalResult: any) => {
    const chain = {
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue(finalResult),
    };
    
    // Make all methods except single() return the chain itself
    chain.from.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    
    return chain;
  };
  
  const supabaseChain = createChainableMock(mockSupabaseResponse);
  const supabaseAdminChain = createChainableMock(mockSupabaseResponse);
  
  return {
    adminConfig: {
      email: 'admin@keen-s-a.com',
      username: 'admin',
      password: 'admin123'
    },
    securityConfig: {
      jwtSecret: 'test-secret-key',
      jwtExpiresIn: '24h',
      bcryptRounds: 12
    },
    supabase: {
      from: jest.fn().mockReturnValue(supabaseChain),
      auth: {
        signInWithPassword: supabaseMockOperations.signInUser,
        getUser: jest.fn()
      }
    },
    supabaseAdmin: {
      from: jest.fn().mockReturnValue(supabaseAdminChain),
      auth: {
        admin: {
          createUser: supabaseMockOperations.createAuthUser,
          updateUserById: jest.fn(),
          deleteUser: jest.fn()
        },
        signInWithPassword: jest.fn(),
        getUser: jest.fn()
      }
    },
    // Export test utilities
    _mockUtils: {
      supabaseChain,
      supabaseAdminChain,
      mockOperations: supabaseMockOperations,
      setMockResponse: (response: any) => {
        supabaseChain.single.mockResolvedValue(response);
        supabaseAdminChain.single.mockResolvedValue(response);
      }
    }
  };
});

// Import after mocking
import { adminConfig, securityConfig, supabase, supabaseAdmin } from '../../src/config/database.js';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Get mock utilities
const { _mockUtils } = require('../../src/config/database.js');
const { mockOperations } = _mockUtils;

// FIXED: Proper typing for mocked bcrypt
const mockBcrypt = jest.mocked(bcrypt);
const mockJwt = jest.mocked(jwt);

// Mock DatabaseManager
class MockDatabaseManager {
  async query<T = any>(): Promise<T[]> { return []; }
  async transaction<T>(callback: any): Promise<T> { return await callback(this); }
  async testConnection(): Promise<boolean> { return true; }
  async close(): Promise<void> {}
  subscribeToRealtime() { return { unsubscribe: jest.fn() }; }
}

describe('UserDAO', () => {
  let userDAO: UserDAO;
  let mockDb: MockDatabaseManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new MockDatabaseManager();
    userDAO = new UserDAO(mockDb as any);
    
    // Reset all mock responses to defaults
    _mockUtils.setMockResponse({ data: null, error: null });
  });

  describe('createUser', () => {
    it('should create a new user successfully with Supabase Auth', async () => {
      // Mock password hashing
      mockBcrypt.hash.mockResolvedValue('hashed-password-123' as never);
      
      // Mock Supabase Auth user creation
      mockOperations.createAuthUser.mockResolvedValue({
        data: {
          user: {
            id: '12345678-1234-4567-8901-123456789012',
            email: 'newuser@example.com',
            user_metadata: { username: 'newuser', display_name: 'New User' }
          }
        },
        error: null
      });
      
      // Mock database insert response
      _mockUtils.setMockResponse({
        data: {
          id: '12345678-1234-4567-8901-123456789012',
          email: 'newuser@example.com',
          username: 'newuser',
          display_name: 'New User',
          timezone: 'America/New_York',
          role: 'user',
          is_admin: false,
          password_hash: null,
          email_verified: true,
          account_status: 'active',
          mfa_enabled: false,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });
      
      const request: CreateUserRequest = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'securepassword123',
        display_name: 'New User',
        timezone: 'America/New_York'
      };

      const user = await userDAO.createUser(request);

      expect(user.email).toBe(request.email);
      expect(user.username).toBe(request.username);
      expect(user.password_hash).toBeUndefined();
    });

    it('should handle Supabase Auth creation failure', async () => {
      mockOperations.createAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      });
      
      const request: CreateUserRequest = {
        email: 'existing@example.com',
        username: 'existing',
        password: 'password123'
      };

      await expect(userDAO.createUser(request)).rejects.toThrow('Failed to create user with Supabase Auth: Email already exists');
    });
  });

  describe('login', () => {
    it('should authenticate user successfully with Supabase Auth', async () => {
      // Mock successful Supabase Auth login
      mockOperations.signInUser.mockResolvedValue({
        data: {
          user: { id: '12345678-1234-4567-8901-123456789012' },
          session: {
            access_token: 'supabase-token-123',
            refresh_token: 'refresh-token-456',
            expires_in: 3600
          }
        },
        error: null
      });
      
      // Mock user data retrieval
      _mockUtils.setMockResponse({
        data: {
          id: '12345678-1234-4567-8901-123456789012',
          email: 'test@example.com',
          username: 'testuser',
          role: 'user',
          is_admin: false,
          account_status: 'active',
          email_verified: true,
          mfa_enabled: false,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });
      
      const request: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
        ip_address: '127.0.0.1'
      };

      const result = await userDAO.login(request);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('supabase-token-123');
      expect(result.expires_in).toBe(3600);
    });
  });

  describe('isAdminUser', () => {
    it('should return admin status and privileges', async () => {
      // Mock admin user data
      _mockUtils.setMockResponse({
        data: {
          is_admin: true,
          admin_privileges: { 
            unlimited_credits: true,
            bypass_rate_limits: true,
            view_all_analytics: true
          }
        },
        error: null
      });

      const result = await userDAO.isAdminUser('admin-user-id');
      expect(result.isAdmin).toBe(true);
      expect(result.privileges?.unlimited_credits).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      const mockUser = {
        id: '12345678-1234-4567-8901-123456789012',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        is_admin: false,
        account_status: 'active',
        email_verified: true,
        mfa_enabled: false,
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock user data response
      _mockUtils.setMockResponse({
        data: mockUser,
        error: null
      });

      const result = await userDAO.getUserById('12345678-1234-4567-8901-123456789012');
      expect(result?.email).toBe('test@example.com');
      expect(result?.username).toBe('testuser');
      expect(result?.id).toBe('12345678-1234-4567-8901-123456789012');
    });
  });
});
