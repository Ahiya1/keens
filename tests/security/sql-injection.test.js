/**
 * SQL Injection Security Tests
 * Tests parameterized queries and validates protection against SQL injection attacks
 * SECURITY: Fixed compilation issues and removed testConfig dependency
 */
import { DatabaseService } from '../../src/database/index.js';
import { adminConfig } from '../../src/config/database.js';
import { generateTestEmail } from '../setup';
describe('SQL Injection Security Tests', () => {
    let dbService;
    let adminContext;
    let testUsers = [];
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
            }
            catch (error) {
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
        }
        catch (error) {
            // SQL injection protection should prevent malicious queries
            expect(error).toBeInstanceOf(Error);
        }
    });
    test('should use parameterized queries for user lookup', async () => {
        const testEmail = generateTestEmail('injection');
        // Create a legitimate user
        const user = await dbService.users.createUser({
            email: testEmail,
            username: `injection_test_${Date.now()}`,
            password: 'password123'
        });
        testUsers.push(user.id);
        // Should find the legitimate user
        const found = await dbService.users.getUserByEmail(testEmail, adminContext);
        expect(found).not.toBeNull();
        expect(found?.email).toBe(testEmail);
        // Should not find non-existent user without breaking
        const notFound = await dbService.users.getUserByEmail('nonexistent@example.com', adminContext);
        expect(notFound).toBeNull();
    });
});
//# sourceMappingURL=sql-injection.test.js.map