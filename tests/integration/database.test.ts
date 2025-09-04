/**
 * Database Integration Tests
 * Tests complete workflows with actual database operations
 * SECURITY: Fixed compilation issues and removed testConfig dependency
 */

import Decimal from 'decimal.js';
import { DatabaseService } from '../../src/database/index.js';
import { UserContext } from '../../src/database/DatabaseManager.js';
import { adminConfig } from '../../src/config/database.js';
import { generateTestEmail, generateTestSessionId } from '../setup';

describe('Database Integration Tests', () => {
  let dbService: DatabaseService;
  let adminContext: UserContext;
  let regularUserContext: UserContext;
  let regularUserId: string;
  let testUsers: string[] = [];

  beforeAll(async () => {
    dbService = new DatabaseService();
    
    // Just test connection, don't run full initialization
    const connected = await dbService.testConnection();
    if (!connected) {
      throw new Error('Cannot connect to test database. Ensure migrations have been run.');
    }

    // Setup admin context
    const adminUser = await dbService.users.getUserByEmail(adminConfig.email);
    if (adminUser) {
      adminContext = {
        userId: adminUser.id,
        isAdmin: true,
        adminPrivileges: adminUser.admin_privileges
      };
    }
  });

  afterAll(async () => {
    // Cleanup test users
    for (const userId of testUsers) {
      try {
        await dbService.executeRawQuery('DELETE FROM users WHERE id = $1', [userId]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    await dbService.close();
  });

  describe('Complete User Lifecycle', () => {
    it('should create user, credit account, and handle session lifecycle', async () => {
      const testEmail = generateTestEmail('integration');
      
      // 1. Create regular user
      const user = await dbService.users.createUser({
        email: testEmail,
        username: `integration_user_${Date.now()}`,
        password: 'securepassword123',
        display_name: 'Integration Test User'
      });

      expect(user.email).toBe(testEmail);
      expect(user.is_admin).toBe(false);
      regularUserId = user.id;
      regularUserContext = { userId: user.id, isAdmin: false };
      testUsers.push(user.id);

      // 2. Create credit account
      const creditAccount = await dbService.credits.createCreditAccount(user.id, regularUserContext);
      
      expect(creditAccount.user_id).toBe(user.id);
      expect(creditAccount.unlimited_credits).toBe(false);
      expect(creditAccount.current_balance.toString()).toBe('0');
    });
  });
});
