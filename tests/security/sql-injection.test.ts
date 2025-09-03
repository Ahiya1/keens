/**
 * SQL Injection Prevention Tests
 * Tests that parameterized queries prevent SQL injection attacks
 */

import { DatabaseManager, UserContext } from '../../src/database/DatabaseManager.js';
import { WebSocketDAO } from '../../src/database/dao/WebSocketDAO.js';
import { testConfig } from '../../src/config/database.js';
import { generateTestEmail } from '../setup';

// Use test database
process.env.DB_NAME = testConfig.database;
process.env.DB_USER = testConfig.user;
process.env.DB_PASSWORD = testConfig.password;

describe('SQL Injection Prevention Tests', () => {
  let dbManager: DatabaseManager;
  let webSocketDAO: WebSocketDAO;
  let testUserId: string;

  beforeAll(async () => {
    dbManager = new DatabaseManager(testConfig);
    await dbManager.initialize();
    webSocketDAO = new WebSocketDAO(dbManager);

    // Create test user for context testing
    const testEmail = generateTestEmail('sqlinjection');
    const testUser = await dbManager.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [testEmail, `sqltest_${Date.now()}`, 'hash123']
    );
    testUserId = testUser[0].id;
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await dbManager.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await dbManager.close();
  });

  describe('General SQL Injection Protection', () => {
    it('should prevent injection in parameterized queries', async () => {
      const maliciousEmail = "test'; DROP TABLE users; --@example.com";
      
      // This should safely handle the malicious input via parameters
      const result = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [maliciousEmail]
      );
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0); // No user with this email should exist
      
      // Verify users table still exists
      const countResult = await dbManager.query('SELECT COUNT(*) FROM users');
      expect(countResult).toBeDefined();
    });
  });
});
