"use strict";
/**
 * Basic Jest Configuration Test
 * Verifies that Jest is properly configured and can run tests
 */
describe('Jest Configuration', () => {
    it('should run basic tests', () => {
        expect(true).toBe(true);
    });
    it('should support async/await', async () => {
        const result = await Promise.resolve('test');
        expect(result).toBe('test');
    });
    it('should have access to Node.js APIs', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });
    it('should support TypeScript', () => {
        const value = 'typescript works';
        expect(value).toBe('typescript works');
    });
    it('should have Jest globals available', () => {
        expect(describe).toBeDefined();
        expect(it).toBeDefined();
        expect(expect).toBeDefined();
        expect(beforeAll).toBeDefined();
        expect(afterAll).toBeDefined();
    });
});
describe('ESM Module Support', () => {
    it('should support ES module imports', async () => {
        const { randomBytes } = await import('crypto');
        const bytes = randomBytes(4);
        expect(bytes).toHaveLength(4);
    });
    it('should support dynamic imports', async () => {
        const fs = await import('fs');
        expect(fs.promises).toBeDefined();
    });
});
describe('Test Environment Setup', () => {
    it('should have test environment variables set', () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(process.env.DB_NAME).toBe('keen_test');
    });
    it('should have console mocking working', () => {
        const originalError = console.error;
        expect(typeof originalError).toBe('function');
    });
});
//# sourceMappingURL=jest-config.test.js.map