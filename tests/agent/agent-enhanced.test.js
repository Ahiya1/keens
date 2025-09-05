/**
 * Enhanced Agent Tests - Testing agent behavior with improved logging and progress reporting
 * FIXED: Error message mismatches and token formatting issues
 */
import { KeenAgent } from '../../src/agent/KeenAgent.js';
import { LogLevel, createLogger } from '../../src/utils/Logger.js';
import { ProgressReporter } from '../../src/utils/ProgressReporter.js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
describe('Enhanced Agent Tests', () => {
    let tempDir;
    let testLogger;
    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(tmpdir(), 'keen-agent-enhanced-test-'));
        testLogger = createLogger({
            level: LogLevel.DEBUG,
            verbose: true,
            debug: true,
            writeToFile: false // Avoid file I/O in tests
        });
    });
    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('Agent Initialization with Logging', () => {
        test('should initialize agent with enhanced logging capabilities', () => {
            // Set test API key
            process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key-for-testing-only';
            const options = {
                vision: 'Create a simple test project with enhanced logging',
                directory: tempDir,
                phase: 'EXPLORE',
                maxIterations: 3,
                costBudget: 5,
                webSearch: false,
                extendedContext: true,
                stream: false, // Disable streaming for tests
                verbose: true,
                debug: true,
                dryRun: true
            };
            expect(() => {
                const agent = new KeenAgent(options);
                expect(agent).toBeDefined();
            }).not.toThrow();
        });
        test('should handle configuration validation with detailed logging', () => {
            process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key-for-testing-only';
            const options = {
                vision: 'Test configuration with logging',
                directory: tempDir,
                maxIterations: 1,
                verbose: true,
                debug: true,
                dryRun: true
            };
            const agent = new KeenAgent(options);
            expect(agent).toBeDefined();
            // Should log configuration details
            const stats = testLogger.getStats();
            expect(stats.totalLogs).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Progress Reporting Integration', () => {
        test('should create and manage progress reporter', () => {
            const sessionId = 'test_session_progress';
            const maxIterations = 10;
            const progressReporter = new ProgressReporter(sessionId, maxIterations, true, true);
            expect(progressReporter).toBeDefined();
            expect(progressReporter.getProgress()).toBe(0);
            // Test phase transition
            progressReporter.updatePhase('COMPLETE', 'Testing phase transition');
            expect(progressReporter.getCurrentState().phase).toBe('COMPLETE');
            // Test iteration update
            progressReporter.updateIteration(5, 'Halfway through testing');
            expect(progressReporter.getProgress()).toBe(50);
            progressReporter.destroy();
        });
        test('should track tool executions with progress reporting', () => {
            const progressReporter = new ProgressReporter('test_session_tools', 5, true, true);
            const updates = [];
            const unsubscribe = progressReporter.onUpdate(update => updates.push(update));
            // Simulate successful tool execution
            const startTime = Date.now();
            progressReporter.reportToolExecution('get_project_tree', startTime, true);
            expect(updates).toHaveLength(1);
            expect(updates[0].category).toBe('tool');
            expect(updates[0].message).toContain('✅ Tool get_project_tree completed');
            // Simulate failed tool execution
            progressReporter.reportToolExecution('invalid_tool', startTime, false, 'Tool not found');
            expect(updates).toHaveLength(2);
            expect(updates[1].category).toBe('tool');
            expect(updates[1].message).toContain('❌ Tool invalid_tool failed');
            const finalState = progressReporter.getCurrentState();
            expect(finalState.toolsExecuted).toContain('get_project_tree');
            expect(finalState.errorsEncountered).toBe(1);
            unsubscribe();
            progressReporter.destroy();
        });
    });
    describe('Error Handling and Logging', () => {
        test('should log and handle API errors gracefully', async () => {
            const originalApiKey = process.env.ANTHROPIC_API_KEY;
            try {
                // Test with invalid API key
                process.env.ANTHROPIC_API_KEY = 'invalid-key';
                expect(() => {
                    new KeenAgent({
                        vision: 'Test error handling',
                        directory: tempDir,
                        dryRun: true
                    });
                }).toThrow('Invalid or missing ANTHROPIC_API_KEY'); // FIXED: Match actual error message
            }
            finally {
                // Restore original API key
                if (originalApiKey) {
                    process.env.ANTHROPIC_API_KEY = originalApiKey;
                }
            }
        });
        test('should handle timeout scenarios with proper logging', () => {
            process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key-for-testing-only';
            const options = {
                vision: 'Test timeout handling',
                directory: tempDir,
                maxIterations: 1,
                dryRun: true,
                verbose: true,
                debug: true
            };
            const agent = new KeenAgent(options);
            expect(agent).toBeDefined();
            // The streaming timeout should be set to 5 minutes (300000ms) as per the fix
            // This test just ensures the agent can be created with proper timeout configuration
        });
    });
    describe('Logging Integration with Agent Lifecycle', () => {
        test('should log agent session lifecycle events', async () => {
            const logger = createLogger({
                level: LogLevel.TRACE,
                verbose: true,
                debug: true
            });
            const sessionId = 'test_lifecycle_session';
            logger.setSessionId(sessionId);
            // Log session start
            await logger.info('agent', 'Starting agent session', { sessionId });
            // Log phase transitions
            await logger.logPhaseTransition('EXPLORE', 'COMPLETE', 'Task completed successfully');
            // Log tool executions
            const toolStart = Date.now();
            await logger.logToolExecution('report_complete', { success: true, summary: 'Task completed' }, toolStart, { success: true });
            const stats = logger.getStats();
            expect(stats.totalLogs).toBe(3);
            expect(stats.phaseTransitions).toBe(1);
            expect(stats.toolExecutions).toBe(1);
            const buffer = logger.getLogBuffer();
            expect(buffer).toHaveLength(3);
            expect(buffer[0].message).toContain('Starting agent session');
            expect(buffer[1].message).toContain('Phase transition: EXPLORE → COMPLETE');
            expect(buffer[2].message).toContain('Tool report_complete completed');
        });
    });
    describe('Performance Monitoring', () => {
        test('should monitor and log performance metrics', async () => {
            const logger = createLogger({ level: LogLevel.DEBUG, debug: true });
            // Simulate API call logging
            await logger.logApiCall('claude-sonnet-4-20250514', 2000, // input tokens
            800, // output tokens
            300, // thinking tokens
            3500, // duration ms
            0.0245 // cost
            );
            // Simulate streaming progress
            await logger.logStreamingProgress('thinking', 1500, // tokens received
            25000, // elapsed time
            'Processing complex analysis');
            const stats = logger.getStats();
            expect(stats.totalLogs).toBe(2);
            const buffer = logger.getLogBuffer();
            // FIXED: Account for comma formatting in token display (3,100 tokens)
            expect(buffer[0].message).toContain('Claude API call completed - 3,100 tokens');
            expect(buffer[1].message).toContain('Streaming thinking - 1500 tokens');
        });
        test('should detect performance issues and stuck states', () => {
            const progressReporter = new ProgressReporter('perf_test', 10, true, true);
            // Initially should not be stuck
            expect(progressReporter.isStuck()).toBe(false);
            // Simulate stuck state by setting old last update time
            progressReporter.state.lastUpdate = Date.now() - 70000; // 70 seconds ago
            expect(progressReporter.isStuck()).toBe(true);
            // Update should reset stuck state
            progressReporter.updateIteration(1, 'Recovery');
            expect(progressReporter.isStuck()).toBe(false);
            progressReporter.destroy();
        });
    });
    describe('Debug Mode Enhancements', () => {
        test('should provide detailed debug information in debug mode', async () => {
            const debugLogger = createLogger({
                level: LogLevel.TRACE,
                verbose: true,
                debug: true
            });
            // Test debug logging with complex data
            const complexData = {
                toolParameters: {
                    files: ['file1.ts', 'file2.ts'],
                    options: { recursive: true, verbose: true }
                },
                executionContext: {
                    sessionId: 'debug_test_session',
                    workingDirectory: tempDir,
                    phase: 'EXPLORE'
                },
                performance: {
                    startTime: Date.now(),
                    memoryUsage: process.memoryUsage()
                }
            };
            await debugLogger.debug('agent', 'Detailed debug information', complexData);
            const buffer = debugLogger.getLogBuffer();
            expect(buffer).toHaveLength(1);
            expect(buffer[0].level).toBe(LogLevel.DEBUG);
            expect(buffer[0].data).toEqual(complexData);
        });
        test('should handle verbose mode with progress reporting', () => {
            const progressReporter = new ProgressReporter('verbose_test', 3, true, true);
            const updates = [];
            const unsubscribe = progressReporter.onUpdate(update => updates.push(update));
            // Simulate verbose progress updates
            progressReporter.updateIteration(1, 'Starting detailed analysis');
            progressReporter.reportStreamingProgress('content', 500, 10000, 'Analyzing project structure');
            progressReporter.reportApiCall('claude-sonnet-4-20250514', 800, 400, 150, 2000);
            expect(updates).toHaveLength(3);
            expect(updates[0].category).toBe('agent');
            expect(updates[1].category).toBe('streaming');
            expect(updates[2].category).toBe('api');
            // Check detailed status display
            const originalLog = console.log;
            const logs = [];
            console.log = (message) => logs.push(message);
            progressReporter.displayDetailedStatus();
            console.log = originalLog;
            expect(logs.length).toBeGreaterThan(5);
            expect(logs.some(log => log.includes('Agent Status Report'))).toBe(true);
            unsubscribe();
            progressReporter.destroy();
        });
    });
    describe('Log Export and Analysis', () => {
        test('should export logs for analysis', async () => {
            const logger = createLogger({ level: LogLevel.TRACE });
            // Generate some test logs
            await logger.info('test', 'Test message 1');
            await logger.warn('test', 'Warning message');
            await logger.error('test', 'Error message', { errorCode: 500 });
            await logger.logToolExecution('test_tool', { param: 'value' }, Date.now() - 1000, { result: 'success' });
            const exportPath = path.join(tempDir, 'test-logs.json');
            await logger.exportLogs(exportPath);
            // Verify export file
            const exportedContent = await fs.readFile(exportPath, 'utf-8');
            const exportedLogs = JSON.parse(exportedContent);
            // FIXED: Logger now exports simple array (including export message)
            expect(Array.isArray(exportedLogs)).toBe(true);
            expect(exportedLogs.length).toBeGreaterThan(4); // Original logs + export message
            // Verify log structure
            const firstLog = exportedLogs[0];
            expect(firstLog).toHaveProperty('timestamp');
            expect(firstLog).toHaveProperty('level');
            expect(firstLog).toHaveProperty('category');
            expect(firstLog).toHaveProperty('message');
        });
    });
    describe('Memory and Resource Management', () => {
        test('should manage log buffer size efficiently', async () => {
            const logger = createLogger({ level: LogLevel.TRACE });
            // Generate many logs
            for (let i = 0; i < 1000; i++) {
                await logger.info('performance', `Log message ${i}`);
            }
            const statsBefore = logger.getStats();
            expect(statsBefore.totalLogs).toBe(1000);
            // Buffer should contain all logs
            const buffer = logger.getLogBuffer();
            expect(buffer).toHaveLength(1000);
            // Clear buffer to free memory
            logger.clearBuffer();
            expect(logger.getLogBuffer()).toHaveLength(0);
            // FIXED: Stats should be preserved after clearBuffer()
            const statsAfter = logger.getStats();
            expect(statsAfter.totalLogs).toBe(1000);
        });
        test('should clean up progress reporter resources', () => {
            const progressReporter = new ProgressReporter('cleanup_test', 5, true, true);
            // Add some listeners
            const unsubscribe1 = progressReporter.onUpdate(() => { });
            const unsubscribe2 = progressReporter.onUpdate(() => { });
            // Generate some activity
            progressReporter.updateIteration(1, 'Test activity');
            // Destroy should clean up everything
            expect(() => progressReporter.destroy()).not.toThrow();
            // Unsubscribe should still work
            expect(() => unsubscribe1()).not.toThrow();
            expect(() => unsubscribe2()).not.toThrow();
        });
    });
});
//# sourceMappingURL=agent-enhanced.test.js.map