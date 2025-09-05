/**
 * keen API Gateway - Integration Tests
 * End-to-end testing of complete API Gateway functionality
 */
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeOneOf(expected: any[]): R;
        }
    }
}
export {};
//# sourceMappingURL=integration.test.d.ts.map