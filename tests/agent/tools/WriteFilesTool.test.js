/**
 * WriteFilesTool Tests - Simplified stub for compilation
 */
import { WriteFilesTool } from '../../../src/agent/tools/WriteFilesTool.js';
describe('WriteFilesTool', () => {
    test('should create WriteFilesTool instance', () => {
        const tool = new WriteFilesTool();
        expect(tool).toBeInstanceOf(WriteFilesTool);
    });
    test('should have execute method', () => {
        const tool = new WriteFilesTool();
        expect(typeof tool.execute).toBe('function');
    });
});
//# sourceMappingURL=WriteFilesTool.test.js.map