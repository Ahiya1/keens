/**
 * Tests for Enhanced Logger System
 */

import { Logger, LogLevel, createLogger } from '../../src/utils/Logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('Logger System', () => {
  let tempDir: string;
  let tempLogFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'keen-logger-test-'));
    tempLogFile = path.join(tempDir, 'test.log');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Logger Creation', () => {
    test('should create logger with default options', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.getStats().totalLogs).toBe(0);
    });

    test('should create logger with custom options', () => {
      const logger = createLogger({
        level: LogLevel.DEBUG,
        verbose: true,
        debug: true,
        writeToFile: true,
        filePath: tempLogFile
      });
      
      expect(logger).toBeDefined();
    });

    test('should auto-generate file path when writeToFile is true', () => {
      const logger = createLogger({
        writeToFile: true
      });
      
      expect(logger).toBeDefined();
    });
  });

  describe('Log Levels', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({ level: LogLevel.TRACE });
    });

    test('should log at all levels', async () => {
      await logger.trace('test', 'Trace message');
      await logger.debug('test', 'Debug message');
      await logger.info('test', 'Info message');
      await logger.warn('test', 'Warning message');
      await logger.error('test', 'Error message');
      await logger.critical('test', 'Critical message');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(6);
      expect(stats.errors).toBe(2); // error + critical
      expect(stats.warnings).toBe(1);
    });

    test('should respect log level filtering', async () => {
      const errorLogger = createLogger({ level: LogLevel.ERROR });
      
      await errorLogger.trace('test', 'Should be filtered');
      await errorLogger.debug('test', 'Should be filtered');
      await errorLogger.info('test', 'Should be filtered');
      await errorLogger.warn('test', 'Should be filtered');
      await errorLogger.error('test', 'Should be logged');
      await errorLogger.critical('test', 'Should be logged');

      const stats = errorLogger.getStats();
      expect(stats.totalLogs).toBe(2);
      expect(stats.errors).toBe(2);
    });
  });

  describe('Specialized Logging Methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({ level: LogLevel.TRACE, debug: true });
    });

    test('should log tool execution success', async () => {
      const startTime = Date.now();
      await logger.logToolExecution(
        'test_tool',
        { param1: 'value1' },
        startTime,
        { result: 'success' }
      );

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
      expect(stats.toolExecutions).toBe(1);
    });

    test('should log tool execution failure', async () => {
      const startTime = Date.now();
      await logger.logToolExecution(
        'test_tool',
        { param1: 'value1' },
        startTime,
        undefined,
        new Error('Tool failed')
      );

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
      expect(stats.toolExecutions).toBe(1);
      expect(stats.errors).toBe(1);
    });

    test('should log phase transitions', async () => {
      await logger.logPhaseTransition('EXPLORE', 'COMPLETE', 'Task finished');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
      expect(stats.phaseTransitions).toBe(1);
    });

    test('should log agent progress', async () => {
      await logger.logAgentProgress('EXPLORE', 5, 10, 'Analyzing project structure');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
    });

    test('should log streaming progress', async () => {
      await logger.logStreamingProgress('thinking', 1500, 30000, 'Processing complex request');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
    });

    test('should log API calls', async () => {
      await logger.logApiCall('claude-sonnet-4-20250514', 1000, 500, 200, 2500, 0.0125);

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(1);
    });
  });

  describe('File Output', () => {
    test('should write logs to file', async () => {
      const logger = createLogger({
        writeToFile: true,
        filePath: tempLogFile,
        level: LogLevel.TRACE
      });

      await logger.info('test', 'Test message');
      await logger.error('test', 'Error message');

      // Give some time for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const fileContent = await fs.readFile(tempLogFile, 'utf-8');
      const lines = fileContent.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      
      const log1 = JSON.parse(lines[0]);
      const log2 = JSON.parse(lines[1]);
      
      expect(log1.message).toBe('Test message');
      expect(log1.level).toBe(LogLevel.INFO);
      expect(log2.message).toBe('Error message');
      expect(log2.level).toBe(LogLevel.ERROR);
    });

    test('should handle file write errors gracefully', async () => {
      const logger = createLogger({
        writeToFile: true,
        filePath: '/invalid/path/test.log' // Invalid path
      });

      // Should not throw
      await expect(logger.info('test', 'Test message')).resolves.not.toThrow();
    });
  });

  describe('Log Buffer and Export', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({ level: LogLevel.TRACE });
    });

    test('should maintain log buffer', async () => {
      await logger.info('test', 'Message 1');
      await logger.warn('test', 'Message 2');
      await logger.error('test', 'Message 3');

      const buffer = logger.getLogBuffer();
      expect(buffer).toHaveLength(3);
      expect(buffer[0].message).toBe('Message 1');
      expect(buffer[1].message).toBe('Message 2');
      expect(buffer[2].message).toBe('Message 3');
    });

    test('should clear log buffer', async () => {
      await logger.info('test', 'Message 1');
      await logger.info('test', 'Message 2');

      expect(logger.getLogBuffer()).toHaveLength(2);
      
      logger.clearBuffer();
      
      expect(logger.getLogBuffer()).toHaveLength(0);
      // Stats should remain
      expect(logger.getStats().totalLogs).toBe(2);
    });

    test('should export logs to JSON file', async () => {
      await logger.info('test', 'Message 1');
      await logger.warn('test', 'Message 2', { data: 'test' });

      const exportPath = path.join(tempDir, 'exported.json');
      await logger.exportLogs(exportPath);

      const exportedContent = await fs.readFile(exportPath, 'utf-8');
      const exportedLogs = JSON.parse(exportedContent);

      expect(Array.isArray(exportedLogs)).toBe(true);
      expect(exportedLogs).toHaveLength(3); // 2 original + 1 export message
      expect(exportedLogs[0].message).toBe('Message 1');
      expect(exportedLogs[1].message).toBe('Message 2');
      expect(exportedLogs[1].data).toEqual({ data: 'test' });
    });
  });

  describe('Progress Reporter Integration', () => {
    test('should create progress reporter', async () => {
      const logger = createLogger();
      const reporter = logger.createProgressReporter('test', 5);

      await reporter.step('Step 1 completed');
      await reporter.step('Step 2 completed');
      await reporter.step('Step 3 completed');
      await reporter.complete('All steps finished');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(4);
    });
  });

  describe('Session Management', () => {
    test('should set and use session ID', async () => {
      const logger = createLogger({ debug: true });
      logger.setSessionId('session_123');

      await logger.info('test', 'Test message');

      const buffer = logger.getLogBuffer();
      expect(buffer[0].sessionId).toBe('session_123');
    });

    test('should update log level dynamically', async () => {
      const logger = createLogger({ level: LogLevel.INFO });
      
      await logger.debug('test', 'Should be filtered');
      expect(logger.getStats().totalLogs).toBe(0);
      
      logger.setLogLevel(LogLevel.DEBUG);
      await logger.debug('test', 'Should be logged');
      expect(logger.getStats().totalLogs).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle undefined data gracefully', async () => {
      const logger = createLogger();
      
      await expect(logger.info('test', 'Message', undefined)).resolves.not.toThrow();
      await expect(logger.info('test', 'Message', null)).resolves.not.toThrow();
    });

    test('should handle circular references in data', async () => {
      const logger = createLogger({ debug: true });
      
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw due to circular reference
      await expect(logger.info('test', 'Message', circular)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should handle high volume logging', async () => {
      const logger = createLogger({ level: LogLevel.TRACE });
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(logger.info('perf', `Message ${i}`));
      }
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const stats = logger.getStats();
      
      expect(stats.totalLogs).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});

// Integration test with the main logger instance
describe('Global Logger', () => {
  test('should provide global logger instance', () => {
    // Import after describe to avoid issues with jest hoisting
    const { getLogger, setLogger } = require('../../src/utils/Logger.js');
    
    const logger1 = getLogger();
    const logger2 = getLogger();
    
    expect(logger1).toBe(logger2); // Should be same instance
  });

  test('should allow setting custom global logger', () => {
    const { getLogger, setLogger, createLogger } = require('../../src/utils/Logger.js');
    
    const customLogger = createLogger({ level: LogLevel.DEBUG });
    setLogger(customLogger);
    
    const retrievedLogger = getLogger();
    expect(retrievedLogger).toBe(customLogger);
  });
});