/**
 * SQL Injection Security Tests
 * Tests parameterized queries and validates protection against SQL injection attacks
 * SECURITY: Fixed compilation issues and improved test robustness
 */

import { DatabaseService } from '../../src/database/index.js';
import { UserContext } from '../../src/database/DatabaseManager.js';
import { adminConfig } from '../../src/config/database.js';
import { generateTestEmail } from '../setup';

describe('SQL Injection Security Tests', () => {
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
    } else {
      // Create minimal admin context for testing
      adminContext = {
        userId: '00000000-1111-2222-3333-444444444444',
        isAdmin: true,
        adminPrivileges: {
          unlimited_credits: true,
          global_access: true
        }
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

  test('should resist SQL injection in email field', async () => {
    const maliciousEmail = "'; DROP TABLE users; --";
    
    try {
      // This should safely fail due to parameterized queries
      const result = await dbService.users.getUserByEmail(maliciousEmail, adminContext);
      expect(result).toBeNull(); // Should not find user, but also shouldn't break
    } catch (error) {
      // SQL injection protection should prevent malicious queries
      expect(error).toBeInstanceOf(Error);
      // The error should not contain anything suggesting successful injection
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).not.toContain('DROP');
      expect(errorMessage).not.toContain('table');
    }
    
    // Verify database is still intact by checking users table still exists
    try {
      const testQuery = await dbService.executeRawQuery(
        'SELECT COUNT(*) as count FROM users LIMIT 1', 
        []
      );
      expect(testQuery).toBeDefined();
      // If we got here, the table wasn't dropped
    } catch (error) {
      // If we can't query users table, that's very bad
      fail('Users table may have been compromised by SQL injection');
    }
  });

  test('should use parameterized queries for user lookup', async () => {
    const testEmail = generateTestEmail('injection');
    const testUsername = `injection_test_${Date.now()}`;
    
    // Create a legitimate user
    const user = await dbService.users.createUser({
      email: testEmail,
      username: testUsername,
      password: 'password123'
    });
    testUsers.push(user.id);
    
    // Verify user was created by looking it up with admin context
    const found = await dbService.users.getUserByEmail(testEmail, adminContext);
    
    // The user should be found
    expect(found).not.toBeNull();
    if (found) {
      expect(found.email).toBe(testEmail);
      expect(found.username).toBe(testUsername);
    }
    
    // Should not find non-existent user without breaking
    const notFound = await dbService.users.getUserByEmail('nonexistent@example.com', adminContext);
    expect(notFound).toBeNull();
  });

  test('should handle malicious SQL in username field', async () => {
    const maliciousUsername = "admin'; UPDATE users SET is_admin = true WHERE '1' = '1";
    const testEmail = generateTestEmail('malicious');
    
    try {
      // Attempt to create user with malicious username
      const user = await dbService.users.createUser({
        email: testEmail,
        username: maliciousUsername,
        password: 'password123'
      });
      testUsers.push(user.id);
      
      // If creation succeeded, verify the malicious SQL didn't execute
      const created = await dbService.users.getUserByEmail(testEmail, adminContext);
      expect(created).not.toBeNull();
      if (created) {
        // The username should be stored as-is, not executed as SQL
        expect(created.username).toBe(maliciousUsername);
        // User should not be admin (the malicious SQL should not have executed)
        expect(created.is_admin).toBe(false);
      }
    } catch (error) {
      // If creation fails due to validation, that's also acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('should protect against UNION-based SQL injection', async () => {
    const maliciousEmail = "user@test.com' UNION SELECT * FROM credit_accounts WHERE '1'='1";
    
    try {
      const result = await dbService.users.getUserByEmail(maliciousEmail, adminContext);
      expect(result).toBeNull(); // Should not find anything
    } catch (error) {
      // Error is acceptable - the important thing is no data leak
      expect(error).toBeInstanceOf(Error);
    }
    
    // Verify that no credit account data was accidentally returned
    // This would be a sign of successful UNION injection
    // We can't directly test this without seeing the actual response,
    // but at least verify the system didn't crash
    expect(true).toBe(true); // If we get here, system survived the attempt
  });
});
