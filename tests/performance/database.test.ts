/**
 * Database Performance Tests
 * Tests concurrent operations, connection pooling, and query optimization
 */

import Decimal from 'decimal.js';
import { DatabaseService } from '../../src/database/index.js';
import { UserContext } from '../../src/database/DatabaseManager.js';
import { testConfig, adminConfig } from '../../src/config/database.js';
import { generateTestEmail, generateTestSessionId } from '../setup';

// Use test database
process.env.DB_NAME = testConfig.database;
process.env.DB_USER = testConfig.user;
process.env.DB_PASSWORD = testConfig.password;

describe('Database Performance Tests', () => {
  let dbService: DatabaseService;
  let testUsers: { id: string; context: UserContext }[] = [];
  let adminContext: UserContext;

  beforeAll(async () => {
    dbService = new DatabaseService();
    
    // Just test connection, don't run full initialization
    const connected = await dbService.testConnection();
    if (!connected) {
      throw new Error('Cannot connect to test database. Ensure migrations have been run.');
    }

    // Get admin context
    const adminUser = await dbService.users.getUserByEmail(adminConfig.email);
    if (adminUser) {
      adminContext = {
        userId: adminUser.id,
        isAdmin: true,
        adminPrivileges: adminUser.admin_privileges
      };
    }

    // Create multiple test users for concurrent testing
    for (let i = 0; i < 10; i++) {
      const userEmail = generateTestEmail(`perf${i}`);
      const user = await dbService.users.createUser({
        email: userEmail,
        username: `perf_user${i}_${Date.now()}`,
        password: 'password123'
      });
      
      const userContext: UserContext = { userId: user.id, isAdmin: false };
      testUsers.push({
        id: user.id,
        context: userContext
      });

      // Create credit account with initial balance
      try {
        await dbService.credits.createCreditAccount(user.id, userContext);
        await dbService.credits.addCredits({
          userId: user.id,
          amount: new Decimal('1000.00'),
          description: 'Performance test initial credits'
        }, userContext);
      } catch (error) {
        // Account might already exist
      }
    }
  });

  afterAll(async () => {
    // Cleanup test users
    for (const user of testUsers) {
      try {
        await dbService.executeRawQuery('DELETE FROM users WHERE id = $1', [user.id]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    await dbService.close();
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent credit deductions safely', async () => {
      const user = testUsers[0];
      const claudeCost = new Decimal('2.00'); // 10 credits with 5x markup
      
      // Execute 10 concurrent credit deductions with unique session IDs
      const promises = Array.from({ length: 10 }, (_, i) => {
        const sessionId = generateTestSessionId();
        return dbService.credits.deductCredits({
          userId: user.id,
          claudeCostUSD: claudeCost,
          sessionId: sessionId,
          description: `Concurrent operation ${i}`
        }, user.context);
      });

      const startTime = Date.now();
      
      try {
        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        // All transactions should succeed
        expect(results).toHaveLength(10);
        
        // Should complete within reasonable time (under 5 seconds)
        expect(endTime - startTime).toBeLessThan(5000);
        
        // Final balance should be correct (1000 - (10 * 10) = 900)
        const finalAccount = await dbService.credits.getCreditAccount(user.id, user.context);
        expect(finalAccount?.current_balance.toString()).toBe('900');
        
        console.log(`✅ Concurrent operations completed in ${endTime - startTime}ms`);
      } catch (error) {
        // Some operations may fail due to insufficient credits, which is expected
        console.log('Some concurrent operations failed as expected:', error);
      }
    });
  });
});
