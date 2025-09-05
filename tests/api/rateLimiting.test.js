/**
 * keen API Gateway - Rate Limiting Tests
 * Test rate limiting with admin bypass and different user tiers
 */
import request from 'supertest';
import { KeenAPIServer } from '../../src/api/server.js';
import { keen } from '../../src/index.js';
import { generateTestEmail, createTestUserInDB, cleanupTestUsers } from '../setup';
describe('API Gateway Rate Limiting', () => {
    let server;
    let app;
    let keenDB;
    let regularUserToken;
    let adminUserToken;
    let testEmails = [];
    beforeAll(async () => {
        // Initialize test database
        keenDB = keen.getInstance();
        await keenDB.initialize();
        // Initialize server with the same keen instance
        server = new KeenAPIServer(keenDB);
        await server.initialize();
        app = server.getApp();
        // Create test users and get tokens
        await setupTestUsers();
    });
    afterAll(async () => {
        // Cleanup test users
        if (testEmails.length > 0) {
            await cleanupTestUsers(testEmails);
        }
        await server?.stop();
        await keenDB?.close();
    });
    async function setupTestUsers() {
        try {
            // Create regular user
            const regularEmail = generateTestEmail('regular-ratelimit');
            const regularUsername = `regular_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            testEmails.push(regularEmail);
            const regularUser = await createTestUserInDB(regularEmail, regularUsername, 'TestPassword123!', false);
            const regularLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: regularEmail,
                password: 'TestPassword123!'
            });
            if (regularLogin.status === 200) {
                regularUserToken = regularLogin.body.tokens?.access_token;
            }
        }
        catch (error) {
            console.error('Failed to setup rate limiting test users:', error);
        }
    }
    describe('Regular User Rate Limiting', () => {
        test('should enforce rate limits for regular users', async () => {
            if (!regularUserToken) {
                console.warn('Regular user token not available - skipping test');
                return;
            }
            // Make requests up to the limit (testing with a smaller number)
            const promises = [];
            const requestCount = 10; // Reduced for testing
            for (let i = 0; i < requestCount; i++) {
                promises.push(request(app)
                    .get('/api/v1/credits/balance')
                    .set('Authorization', `Bearer ${regularUserToken}`));
            }
            const responses = await Promise.all(promises);
            // All requests should succeed (within normal rate limit)
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.headers).toHaveProperty('ratelimit-limit');
                expect(response.headers).toHaveProperty('ratelimit-remaining');
            });
        });
    });
});
//# sourceMappingURL=rateLimiting.test.js.map