/**
 * UserDAO Unit Tests
 * Tests user management with admin privilege handling
 * FIXED: Resolve variable hoisting and TypeScript issues, password constraints, and Supabase mocking
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

// Mock Supabase configuration - FIXED: Complete chainable mock system
jest.mock('../../src/config/database.js', () => {
  // Create a proper chainable mock that supports all Supabase operations
  const createSupabaseMock = () => {
    const mock: any = {
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      range: jest.fn(),
      order: jest.fn(),
      // Add promise-like behavior
      then: jest.fn(),
      catch: jest.fn()
    };

    // Make all methods chainable - each returns the mock itself
    Object.keys(mock).forEach(key => {
      if (key !== 'single' && key !== 'then' && key !== 'catch') {
        mock[key].mockReturnValue(mock);
      }
    });

    // single() should return a promise with data/error structure
    mock.single.mockResolvedValue({ data: null, error: null });
    
    return mock;
  };
  
  const supabaseChainMock = createSupabaseMock();
  const supabaseAdminChainMock = createSupabaseMock();
  
  const mockSupabase = {
    from: jest.fn().mockReturnValue(supabaseChainMock),
    auth: {
      signInWithPassword: jest.fn(),
      getUser: jest.fn()
    }
  };

  const mockSupabaseAdmin = {
    from: jest.fn().mockReturnValue(supabaseAdminChainMock),
    auth: {
      admin: {
        createUser: jest.fn(),
        updateUserById: jest.fn(),
        deleteUser: jest.fn()
      },
      signInWithPassword: jest.fn(),
      getUser: jest.fn()
    }
  };
  
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
    supabase: mockSupabase,
    supabaseAdmin: mockSupabaseAdmin,
    // Export mocks for test access
    _testMocks: { supabaseChainMock, supabaseAdminChainMock }
  };
});

// Import after mocking
import { adminConfig, securityConfig, supabase, supabaseAdmin } from '../../src/config/database.js';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// FIXED: Proper typing for mocked bcrypt
const mockBcrypt = jest.mocked(bcrypt);
const mockJwt = jest.mocked(jwt);

// Access test mocks
const { _testMocks } = require('../../src/config/database.js');
const { supabaseChainMock, supabaseAdminChainMock } = _testMocks;

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
    
    // Reset mocks to default successful responses
    supabaseChainMock.single.mockResolvedValue({ data: null, error: null });
    supabaseAdminChainMock.single.mockResolvedValue({ data: null, error: null });
  });

  describe('createUser', () => {
    it('should create a new user successfully with Supabase Auth', async () => {
      // FIXED: Mock password hashing with proper typing
      mockBcrypt.hash.mockResolvedValue('hashed-password-123' as never);
      
      // FIXED: Mock Supabase Auth user creation
      (supabaseAdmin.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: '12345678-1234-4567-8901-123456789012',
            email: 'newuser@example.com',
            user_metadata: { username: 'newuser', display_name: 'New User' }
          }
        },
        error: null
      });
      
      // FIXED: Mock user record creation with password_hash
      supabaseAdminChainMock.single.mockResolvedValue({
        data: {
          id: '12345678-1234-4567-8901-123456789012',
          email: 'newuser@example.com',
          username: 'newuser',
          display_name: 'New User',
          timezone: 'America/New_York',
          role: 'user',
          is_admin: false,
          password_hash: null, // Supabase Auth users don't need password_hash
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
      expect(user.password_hash).toBeUndefined(); // Should be removed from response
    });

    it('should handle Supabase Auth creation failure', async () => {
      (supabaseAdmin.auth.admin.createUser as jest.Mock).mockResolvedValue({
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
      // FIXED: Mock successful Supabase Auth login
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
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
      
      // FIXED: Mock user data retrieval
      supabaseAdminChainMock.single.mockResolvedValueOnce({
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
      
      // FIXED: Mock last login update
      supabaseAdminChainMock.eq.mockResolvedValue({ data: {}, error: null });
      
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
      // FIXED: Mock admin user data retrieval
      supabaseAdminChainMock.single.mockResolvedValue({
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

      supabaseAdminChainMock.single.mockResolvedValue({
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
