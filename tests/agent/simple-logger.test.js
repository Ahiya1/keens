"use strict";
/**
 * Simple Logger Test - Basic functionality test
 */
describe('Simple Logger Test', () => {
    test('should import Logger successfully', async () => {
        // Test that we can import the Logger
        const loggerModule = await import('../../src/utils/Logger.js');
        expect(loggerModule).toBeDefined();
        expect(loggerModule.Logger).toBeDefined();
        expect(loggerModule.createLogger).toBeDefined();
        expect(loggerModule.getLogger).toBeDefined();
    });
    test('should create logger instance', async () => {
        const { createLogger, LogLevel } = await import('../../src/utils/Logger.js');
        const logger = createLogger({
            level: LogLevel.INFO,
            writeToFile: false,
            verbose: false,
            debug: false
        });
        expect(logger).toBeDefined();
        expect(logger.getStats).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
    });
    test('should log messages correctly', async () => {
        const { createLogger, LogLevel } = await import('../../src/utils/Logger.js');
        const logger = createLogger({
            level: LogLevel.INFO,
            writeToFile: false,
            verbose: false,
            debug: false
        });
        await logger.info('test', 'Test message');
        const stats = logger.getStats();
        expect(stats.totalLogs).toBe(1);
    });
    test('should track different log levels', async () => {
        const { createLogger, LogLevel } = await import('../../src/utils/Logger.js');
        const logger = createLogger({
            level: LogLevel.TRACE,
            writeToFile: false,
            verbose: false,
            debug: false
        });
        await logger.info('test', 'Info message');
        await logger.warn('test', 'Warning message');
        await logger.error('test', 'Error message');
        const stats = logger.getStats();
        expect(stats.totalLogs).toBe(3);
        expect(stats.warnings).toBe(1);
        expect(stats.errors).toBe(1);
    });
});
//# sourceMappingURL=simple-logger.test.js.map