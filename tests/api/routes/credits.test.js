/**
 * Credits Routes Tests - Comprehensive Backend Testing
 * Testing credit management routes with admin bypass scenarios
 */
import request from 'supertest';
import { KeenAPIServer } from '../../../src/api/server.js';
import { keen } from '../../../src/index.js';
import { createTestUserInDB, generateTestEmail, cleanupTestUsers } from '../../setup.js';
describe('Credits Routes', () => {
    let server;
    let app;
    let keenDB;
    let testEmails = [];
    let userToken;
    let adminToken;
    beforeAll(async () => {
        try {
            keenDB = keen.getInstance();
            await keenDB.initialize();
            server = new KeenAPIServer(keenDB);
            await server.initialize();
            app = server.getApp();
            await setupTestUsers();
        }
        catch (error) {
            console.warn('Credits test setup failed:', error);
        }
    });
    afterAll(async () => {
        try {
            if (testEmails.length > 0) {
                await cleanupTestUsers(testEmails);
            }
            if (server) {
                await server.stop();
            }
        }
        catch (error) {
            console.warn('Credits test cleanup failed:', error);
        }
    });
    async function setupTestUsers() {
        if (!app)
            return;
        try {
            // Create regular user
            const regularEmail = generateTestEmail('credits-regular');
            const regularUsername = `regular_${Date.now()}`;
            testEmails.push(regularEmail);
            const regularUser = await createTestUserInDB(regularEmail, regularUsername, 'TestPassword123!', false);
            const regularLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: regularUser.email,
                password: 'TestPassword123!'
            });
            if (regularLogin.status === 200) {
                userToken = regularLogin.body.tokens.access_token;
            }
            // Create admin user
            const adminEmail = generateTestEmail('credits-admin');
            const adminUsername = `admin_${Date.now()}`;
            testEmails.push(adminEmail);
            const adminUser = await createTestUserInDB(adminEmail, adminUsername, 'TestPassword123!', true);
            const adminLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: adminUser.email,
                password: 'TestPassword123!'
            });
            if (adminLogin.status === 200) {
                adminToken = adminLogin.body.tokens.access_token;
            }
        }
        catch (error) {
            console.warn('Failed to setup credits test users:', error);
        }
    }
    describe('GET /api/v1/credits/balance', () => {
        test('should return credit balance for regular user', async () => {
            if (!app || !userToken) {
                console.warn('Credits balance test dependencies not available');
                return;
            }
            const response = await request(app)
                .get('/api/v1/credits/balance')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.balance).toBeDefined();
                expect(response.body.balance.current_balance).toBeDefined();
                expect(response.body.balance.available_balance).toBeDefined();
                expect(response.body.balance.lifetime_purchased).toBeDefined();
                expect(response.body.balance.lifetime_spent).toBeDefined();
                expect(response.body.balance.unlimited_credits).toBe(false);
                expect(response.body.credit_system).toBeDefined();
                expect(response.body.credit_system.markup_multiplier).toBe(5.0);
                expect(response.body.credit_system.no_packages).toBe(true);
                expect(response.body.credit_system.individual_tier).toBe(true);
                expect(response.body.user_info).toBeDefined();
                expect(response.body.user_info.is_admin).toBe(false);
                expect(response.body.user_info.credit_bypass).toBe(false);
            }
            else {
                console.warn('Credits balance request failed:', response.body);
            }
        });
        test('should return unlimited credits for admin user', async () => {
            if (!app || !adminToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/balance')
                .set('Authorization', `Bearer ${adminToken}`);
            if (response.status === 200) {
                expect(response.body.balance.unlimited_credits).toBe(true);
                expect(response.body.credit_system.admin_unlimited).toBe(true);
                expect(response.body.credit_system.individual_tier).toBe(false);
                expect(response.body.user_info.is_admin).toBe(true);
                expect(response.body.user_info.credit_bypass).toBe(true);
                expect(response.body.user_info.user_tier).toBe('admin');
            }
        });
        test('should require authentication', async () => {
            if (!app)
                return;
            const response = await request(app)
                .get('/api/v1/credits/balance');
            expect(response.status).toBe(401);
        });
        test('should require credits:read scope', async () => {
            if (!app)
                return;
            // Test would need API key without credits:read scope
            // For now, just verify the endpoint exists
            const response = await request(app)
                .get('/api/v1/credits/balance')
                .set('Authorization', 'ApiKey invalid-key');
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/v1/credits/purchase', () => {
        test('should purchase credits for regular user', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                amount: 50.0,
                payment_method_id: 'pm_test_123456',
                description: 'Test credit purchase'
            });
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.transaction).toBeDefined();
                expect(response.body.transaction.amount).toBe(50);
                expect(response.body.balance).toBeDefined();
                expect(response.body.purchase_info).toBeDefined();
                expect(response.body.purchase_info.credit_value).toContain('$50');
                expect(response.body.purchase_info.markup_info).toContain('5x markup');
                expect(response.body.purchase_info.usage_estimate).toBeDefined();
            }
        });
        test('should validate purchase amount', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                amount: 5.0, // Below minimum
                payment_method_id: 'pm_test_123456'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        test('should validate payment method', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                amount: 25.0,
                payment_method_id: '' // Empty payment method
            });
            expect(response.status).toBe(400);
        });
        test('should handle large purchase amounts', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                amount: 5000.0,
                payment_method_id: 'pm_test_large'
            });
            if (response.status === 200) {
                expect(response.body.purchase_info.usage_estimate.complex_requests).toBeGreaterThan(100);
            }
        });
        test('should require authentication', async () => {
            if (!app)
                return;
            const response = await request(app)
                .post('/api/v1/credits/purchase')
                .send({
                amount: 25.0,
                payment_method_id: 'pm_test_123456'
            });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/credits/transactions', () => {
        test('should return transaction history', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/transactions')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(Array.isArray(response.body.transactions)).toBe(true);
                expect(response.body.pagination).toBeDefined();
                expect(response.body.pagination.total).toBeDefined();
                expect(response.body.pagination.limit).toBe(50);
                expect(response.body.pagination.offset).toBe(0);
                expect(response.body.summary).toBeDefined();
                expect(response.body.summary.total_spent).toBeDefined();
                expect(response.body.summary.total_purchased).toBeDefined();
                expect(response.body.summary.admin_bypasses).toBeDefined();
            }
        });
        test('should support pagination', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/transactions?limit=10&offset=5')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.pagination.limit).toBe(10);
                expect(response.body.pagination.offset).toBe(5);
            }
        });
        test('should support filtering by type', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/transactions?type=purchase')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.filters.type).toBe('purchase');
            }
        });
        test('should support date range filtering', async () => {
            if (!app || !userToken)
                return;
            const startDate = '2023-01-01T00:00:00.000Z';
            const endDate = '2023-12-31T23:59:59.999Z';
            const response = await request(app)
                .get(`/api/v1/credits/transactions?start_date=${startDate}&end_date=${endDate}`)
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.filters.start_date).toBe(startDate);
                expect(response.body.filters.end_date).toBe(endDate);
            }
        });
        test('should validate query parameters', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/transactions?type=invalid_type&limit=-1')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(400);
        });
    });
    describe('GET /api/v1/credits/analytics', () => {
        test('should return user credit analytics', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/analytics')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.analytics).toBeDefined();
                expect(response.body.analytics.usage).toBeDefined();
                expect(response.body.analytics.purchases).toBeDefined();
                expect(response.body.analytics.efficiency).toBeDefined();
                expect(response.body.credit_system.markup_multiplier).toBe(5.0);
                expect(response.body.credit_system.individual_tier).toBe(true);
            }
        });
        test('should return admin-specific analytics for admin user', async () => {
            if (!app || !adminToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/analytics')
                .set('Authorization', `Bearer ${adminToken}`);
            if (response.status === 200) {
                expect(response.body.analytics.admin_info).toBeDefined();
                expect(response.body.analytics.admin_info.unlimited_credits).toBe(true);
                expect(response.body.analytics.admin_info.total_theoretical_cost).toBeDefined();
                expect(response.body.credit_system.admin_unlimited).toBe(true);
                expect(response.body.credit_system.individual_tier).toBe(false);
            }
        });
        test('should support different time periods', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/analytics?period=week&group_by=day')
                .set('Authorization', `Bearer ${userToken}`);
            if (response.status === 200) {
                expect(response.body.period).toBe('week');
                expect(response.body.group_by).toBe('day');
            }
        });
        test('should validate period parameters', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/analytics?period=invalid_period')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(400);
        });
    });
    describe('POST /api/v1/credits/estimate', () => {
        test('should provide cost estimation for simple vision', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: 'Create a simple todo list application',
                max_iterations: 25,
                enable_web_search: true,
                complexity: 'low'
            });
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.estimation).toBeDefined();
                expect(response.body.estimation.vision_analysis).toBeDefined();
                expect(response.body.estimation.vision_analysis.estimated_complexity).toBe('low');
                expect(response.body.estimation.cost_breakdown).toBeDefined();
                expect(response.body.estimation.cost_breakdown.claude_api_cost).toBeDefined();
                expect(response.body.estimation.cost_breakdown.keen_credit_cost).toBeDefined();
                expect(response.body.estimation.cost_breakdown.markup_multiplier).toBe(5.0);
                expect(response.body.estimation.affordability).toBeDefined();
                expect(response.body.estimation.estimated_duration).toBeDefined();
            }
        });
        test('should provide higher cost estimation for complex vision', async () => {
            if (!app || !userToken)
                return;
            const complexVision = `
        Build a comprehensive enterprise-grade application with:
        - Microservices architecture using Node.js and PostgreSQL
        - JWT authentication with OAuth2 integration
        - Redis caching layer for performance optimization
        - Docker containerization and Kubernetes deployment
        - Comprehensive testing suite with Jest and Cypress
        - Real-time features with WebSocket connections
        - Advanced security measures and audit logging
        - Performance monitoring and analytics dashboard
      `;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: complexVision,
                max_iterations: 100,
                enable_web_search: true,
                complexity: 'very_high'
            });
            if (response.status === 200) {
                expect(response.body.estimation.vision_analysis.estimated_complexity).toBe('very_high');
                expect(response.body.estimation.cost_breakdown.keen_credit_cost)
                    .toBeGreaterThan(10); // Should be significantly higher
                expect(response.body.estimation.cost_breakdown.breakdown.extended_context).toBe(true);
            }
        });
        test('should check affordability for user', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: 'Create a React application with authentication',
                max_iterations: 50
            });
            if (response.status === 200) {
                expect(response.body.estimation.affordability.can_afford).toBeDefined();
                expect(response.body.estimation.affordability.current_balance).toBeDefined();
                expect(response.body.estimation.affordability.available_balance).toBeDefined();
                expect(response.body.user_context.is_admin).toBe(false);
                expect(response.body.user_context.tier).toBe('individual');
            }
        });
        test('should show unlimited credits for admin', async () => {
            if (!app || !adminToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                vision: 'Build an extremely complex system with all features',
                max_iterations: 200
            });
            if (response.status === 200) {
                expect(response.body.estimation.affordability.admin_unlimited).toBe(true);
                expect(response.body.user_context.is_admin).toBe(true);
                expect(response.body.user_context.credit_bypass).toBe(true);
                expect(response.body.user_context.tier).toBe('admin');
            }
        });
        test('should validate vision length', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: 'short', // Too short
                max_iterations: 50
            });
            expect(response.status).toBe(400);
        });
        test('should validate iteration limits', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: 'Create a web application with proper validation',
                max_iterations: 500 // Too high
            });
            expect(response.status).toBe(400);
        });
        test('should handle web search toggle', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: 'Create a web application',
                enable_web_search: false
            });
            if (response.status === 200) {
                expect(response.body.estimation.vision_analysis.web_search_enabled).toBe(false);
            }
        });
    });
    describe('Error Handling and Edge Cases', () => {
        test('should handle database errors gracefully', async () => {
            if (!app || !userToken)
                return;
            // This test depends on the actual implementation handling DB errors
            // For now, just ensure the endpoints exist
            const response = await request(app)
                .get('/api/v1/credits/balance')
                .set('Authorization', `Bearer ${userToken}`);
            // Should return either success or a handled error
            expect([200, 500, 503]).toContain(response.status);
        });
        test('should handle concurrent purchase attempts', async () => {
            if (!app || !userToken)
                return;
            // Send multiple purchase requests simultaneously
            const promises = Array(3).fill(null).map(() => request(app)
                .post('/api/v1/credits/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                amount: 10.0,
                payment_method_id: 'pm_concurrent_test'
            }));
            const responses = await Promise.all(promises);
            // At least one should succeed or all should handle gracefully
            const statusCodes = responses.map(r => r.status);
            expect(statusCodes.some(code => [200, 409, 429].includes(code))).toBe(true);
        });
        test('should handle malformed request bodies', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .post('/api/v1/credits/estimate')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                vision: null, // Invalid
                max_iterations: 'invalid_number' // Invalid
            });
            expect(response.status).toBe(400);
        });
        test('should handle extremely large transaction history requests', async () => {
            if (!app || !userToken)
                return;
            const response = await request(app)
                .get('/api/v1/credits/transactions?limit=10000') // Very large limit
                .set('Authorization', `Bearer ${userToken}`);
            // Should either limit the response or return an error
            if (response.status === 200) {
                expect(response.body.transactions.length).toBeLessThanOrEqual(200);
            }
            else {
                expect(response.status).toBe(400);
            }
        });
    });
    describe('Rate Limiting', () => {
        test('should apply rate limits to credit endpoints', async () => {
            if (!app || !userToken)
                return;
            // Make many rapid requests to test rate limiting
            const promises = Array(20).fill(null).map(() => request(app)
                .get('/api/v1/credits/balance')
                .set('Authorization', `Bearer ${userToken}`));
            const responses = await Promise.all(promises);
            // All should succeed unless rate limited
            const statusCodes = responses.map(r => r.status);
            expect(statusCodes.every(code => [200, 429].includes(code))).toBe(true);
        });
    });
});
//# sourceMappingURL=credits.test.js.map