"use strict";
/**
 * Simple Progress Reporter Test - Basic functionality test
 */
describe('Simple Progress Reporter Test', () => {
    test('should import ProgressReporter successfully', async () => {
        // Test that we can import the ProgressReporter
        const progressModule = await import('../../src/utils/ProgressReporter.js');
        expect(progressModule).toBeDefined();
        expect(progressModule.ProgressReporter).toBeDefined();
    });
    test('should create progress reporter instance', async () => {
        const { ProgressReporter } = await import('../../src/utils/ProgressReporter.js');
        const reporter = new ProgressReporter('test_session', 10, false, false);
        expect(reporter).toBeDefined();
        expect(reporter.getCurrentState).toBeDefined();
        expect(reporter.updateIteration).toBeDefined();
        expect(reporter.getProgress).toBeDefined();
        reporter.destroy();
    });
    test('should track progress correctly', async () => {
        const { ProgressReporter } = await import('../../src/utils/ProgressReporter.js');
        const reporter = new ProgressReporter('test_session', 10, false, false);
        expect(reporter.getProgress()).toBe(0);
        reporter.updateIteration(5, 'Halfway there');
        expect(reporter.getProgress()).toBe(50);
        reporter.updateIteration(10, 'Complete');
        expect(reporter.getProgress()).toBe(100);
        const state = reporter.getCurrentState();
        expect(state.currentIteration).toBe(10);
        expect(state.totalIterations).toBe(10);
        reporter.destroy();
    });
    test('should track phase changes', async () => {
        const { ProgressReporter } = await import('../../src/utils/ProgressReporter.js');
        const reporter = new ProgressReporter('test_session', 5, false, false);
        const initialState = reporter.getCurrentState();
        expect(initialState.phase).toBe('EXPLORE');
        reporter.updatePhase('COMPLETE', 'Task finished');
        const finalState = reporter.getCurrentState();
        expect(finalState.phase).toBe('COMPLETE');
        reporter.destroy();
    });
    test('should handle tool execution tracking', async () => {
        const { ProgressReporter } = await import('../../src/utils/ProgressReporter.js');
        const reporter = new ProgressReporter('test_session', 5, false, false);
        const startTime = Date.now();
        reporter.reportToolExecution('test_tool', startTime, true);
        const state = reporter.getCurrentState();
        expect(state.toolsExecuted).toContain('test_tool');
        expect(state.errorsEncountered).toBe(0);
        reporter.reportToolExecution('failed_tool', startTime, false, 'Tool failed');
        const finalState = reporter.getCurrentState();
        expect(finalState.errorsEncountered).toBe(1);
        reporter.destroy();
    });
});
//# sourceMappingURL=simple-progress.test.js.map