/**
 * Database Performance Tests
 * Tests database operations under load and measures performance
 * SECURITY: Fixed compilation issues and removed testConfig dependency
 */

import { DatabaseService } from '../../src/database/index.js';
import { UserContext } from '../../src/database/DatabaseManager.js';
import { adminConfig } from '../../src/config/database.js';
import { generateTestEmail, generateTestSessionId } from '../setup';

describe('Database Performance Tests', () => {
  let dbService: DatabaseService;
  let adminContext: UserContext;
  let testUsers: string[] = [];

  beforeAll(async () => {
    dbService = new DatabaseService();
    
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

  test('user creation performance', async () => {
    const start = Date.now();
    const testEmail = generateTestEmail('perf');
    
    const user = await dbService.users.createUser({
      email: testEmail,
      username: `perf_user_${Date.now()}`,
      password: 'password123',
      display_name: 'Performance Test User'
    });
    
    const duration = Date.now() - start;
    testUsers.push(user.id);
    
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(user.email).toBe(testEmail);
  });
});
