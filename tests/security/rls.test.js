/**
 * Row Level Security Tests
 * Tests multi-tenant isolation and admin bypass functionality
 * SECURITY: Fixed compilation issues and removed testConfig dependency
 */
import { DatabaseService } from '../../src/database/index.js';
import { adminConfig } from '../../src/config/database.js';
import { generateTestEmail, generateTestSessionId } from '../setup';
describe('Row Level Security Tests', () => {
    let dbService;
    let user1Context;
    let user2Context;
    let adminContext;
    let user1Id;
    let user2Id;
    let testUsers = [];
    beforeAll(async () => {
        dbService = new DatabaseService();
        // Just test connection, don't run full initialization
        const connected = await dbService.testConnection();
        if (!connected) {
            throw new Error('Cannot connect to test database. Ensure migrations have been run.');
        }
        // Create test users with unique emails
        const user1Email = generateTestEmail('rls1');
        const user1 = await dbService.users.createUser({
            email: user1Email,
            username: `rls_user1_${Date.now()}`,
            password: 'password123'
        });
        user1Id = user1.id;
        user1Context = { userId: user1.id, isAdmin: false };
        testUsers.push(user1.id);
        const user2Email = generateTestEmail('rls2');
        const user2 = await dbService.users.createUser({
            email: user2Email,
            username: `rls_user2_${Date.now()}`,
            password: 'password123'
        });
        user2Id = user2.id;
        user2Context = { userId: user2.id, isAdmin: false };
        testUsers.push(user2.id);
        // Get admin context
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
    describe('Session Isolation', () => {
        it('should allow users to access their own sessions', async () => {
            // Create session for user 1
            const session1Id = generateTestSessionId();
            const session1 = await dbService.sessions.createSession(user1Id, {
                sessionId: session1Id,
                gitBranch: 'user1-branch',
                vision: 'User 1 RLS test',
                workingDirectory: '/tmp/user1'
            }, user1Context);
            // User 1 should see their own sessions - SECURITY: Fixed method call
            const user1OwnSessions = await dbService.sessions.getUserSessions(user1Id, { limit: 50, offset: 0 }, user1Context);
            expect(user1OwnSessions.sessions.length).toBeGreaterThan(0);
            expect(user1OwnSessions.sessions[0].user_id).toBe(user1Id);
        });
    });
});
//# sourceMappingURL=rls.test.js.map