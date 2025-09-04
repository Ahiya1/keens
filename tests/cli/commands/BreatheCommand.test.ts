/**
 * BreatheCommand Comprehensive Tests
 * Tests vision parsing, evolution tracking, and command execution
 */

import { BreatheCommand } from '../../../src/cli/commands/BreatheCommand.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

// Mock the KeenAgent to avoid actual execution
jest.mock('../../../src/agent/KeenAgent.js', () => {
  return {
    KeenAgent: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        success: true,
        summary: 'Mock execution completed',
        phase: 'COMPLETE',
        iterations: 5
      })
    }))
  };
});

describe('BreatheCommand', () => {
  let breatheCommand: BreatheCommand;
  let tempDir: string;
  let mockLogger: Logger;

  beforeEach(async () => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    breatheCommand = new BreatheCommand();
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'breathe-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Command Metadata', () => {
    test('should have correct command name and description', () => {
      expect(breatheCommand.name).toBe('breathe');
      expect(breatheCommand.description).toContain('agent');
      expect(breatheCommand.description).toContain('execute');
    });

    test('should define command aliases', () => {
      expect(breatheCommand.aliases).toContain('run');
      expect(breatheCommand.aliases).toContain('execute');
    });
  });

  describe('Vision Parameter Parsing', () => {
    test('should accept vision as positional argument', () => {
      const args = ['"Create a simple web app"'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe('Create a simple web app');
    });

    test('should accept vision as option', () => {
      const args = ['--vision', 'Build a REST API'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe('Build a REST API');
    });

    test('should handle quoted visions with spaces', () => {
      const args = ['--vision', '"Complex vision with multiple words and, punctuation!"'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe('Complex vision with multiple words and, punctuation!');
    });

    test('should handle multiline visions', () => {
      const multilineVision = `Create a web application that:
- Has user authentication
- Stores data in PostgreSQL
- Uses React frontend`;
      
      const args = ['--vision', multilineVision];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe(multilineVision);
      expect(parsed.vision).toContain('\n');
    });
  });

  describe('Directory Options', () => {
    test('should use current directory by default', () => {
      const args = ['"Test vision"'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.directory).toBe(process.cwd());
    });

    test('should accept custom directory', () => {
      const args = ['--directory', tempDir, 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.directory).toBe(tempDir);
    });

    test('should expand relative paths', () => {
      const args = ['--directory', './test', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(path.isAbsolute(parsed.directory)).toBe(true);
    });

    test('should handle directory aliases', () => {
      const args = ['-d', tempDir, 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.directory).toBe(tempDir);
    });
  });

  describe('Execution Options', () => {
    test('should parse max iterations', () => {
      const args = ['--max-iterations', '10', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.maxIterations).toBe(10);
    });

    test('should parse cost budget', () => {
      const args = ['--cost-budget', '25.50', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.costBudget).toBe(25.5);
    });

    test('should parse phase option', () => {
      const args = ['--phase', 'PLAN', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.phase).toBe('PLAN');
    });

    test('should validate phase values', () => {
      const args = ['--phase', 'INVALID_PHASE', 'Test vision'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('Invalid phase');
    });
  });

  describe('Feature Flags', () => {
    test('should parse web search flag', () => {
      const args = ['--web-search', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.webSearch).toBe(true);
    });

    test('should parse extended context flag', () => {
      const args = ['--extended-context', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.extendedContext).toBe(true);
    });

    test('should parse streaming flag', () => {
      const args = ['--no-stream', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.stream).toBe(false);
    });

    test('should parse verbose and debug flags', () => {
      const args = ['--verbose', '--debug', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.verbose).toBe(true);
      expect(parsed.debug).toBe(true);
    });

    test('should parse dry run flag', () => {
      const args = ['--dry-run', 'Test vision'];
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.dryRun).toBe(true);
    });
  });

  describe('Command Validation', () => {
    test('should require vision parameter', () => {
      const args: string[] = [];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('Vision is required');
    });

    test('should validate directory exists', async () => {
      const nonExistentDir = '/path/that/does/not/exist';
      const args = ['--directory', nonExistentDir, 'Test vision'];
      
      await expect(breatheCommand.validate(breatheCommand.parseArgs(args)))
        .rejects.toThrow('Directory does not exist');
    });

    test('should validate directory is readable', async () => {
      // Create a directory without read permissions (if possible)
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir);
      
      // Note: This test may not work on all systems due to permission handling
      const args = ['--directory', restrictedDir, 'Test vision'];
      const options = breatheCommand.parseArgs(args);
      
      // Should not throw for readable directory
      await expect(breatheCommand.validate(options))
        .resolves.not.toThrow();
    });

    test('should validate positive max iterations', () => {
      const args = ['--max-iterations', '-5', 'Test vision'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('max-iterations must be positive');
    });

    test('should validate positive cost budget', () => {
      const args = ['--cost-budget', '-10', 'Test vision'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('cost-budget must be positive');
    });
  });

  describe('Complex Command Parsing', () => {
    test('should parse complex command with all options', () => {
      const complexVision = 'Build a full-stack application with authentication and database';
      const args = [
        '--directory', tempDir,
        '--phase', 'EXPLORE',
        '--max-iterations', '20',
        '--cost-budget', '50.0',
        '--web-search',
        '--extended-context',
        '--verbose',
        '--debug',
        complexVision
      ];
      
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe(complexVision);
      expect(parsed.directory).toBe(tempDir);
      expect(parsed.phase).toBe('EXPLORE');
      expect(parsed.maxIterations).toBe(20);
      expect(parsed.costBudget).toBe(50.0);
      expect(parsed.webSearch).toBe(true);
      expect(parsed.extendedContext).toBe(true);
      expect(parsed.verbose).toBe(true);
      expect(parsed.debug).toBe(true);
    });

    test('should handle mixed argument order', () => {
      const args = [
        '--verbose',
        'Create a todo app',
        '--directory', tempDir,
        '--debug',
        '--max-iterations', '15'
      ];
      
      const parsed = breatheCommand.parseArgs(args);
      
      expect(parsed.vision).toBe('Create a todo app');
      expect(parsed.directory).toBe(tempDir);
      expect(parsed.maxIterations).toBe(15);
      expect(parsed.verbose).toBe(true);
      expect(parsed.debug).toBe(true);
    });
  });

  describe('Help and Usage', () => {
    test('should provide help text', () => {
      const helpText = breatheCommand.getHelp();
      
      expect(helpText).toContain('breathe');
      expect(helpText).toContain('vision');
      expect(helpText).toContain('--directory');
      expect(helpText).toContain('--max-iterations');
      expect(helpText).toContain('Examples:');
    });

    test('should include examples in help', () => {
      const helpText = breatheCommand.getHelp();
      
      expect(helpText).toContain('keen breathe');
      expect(helpText).toContain('--web-search');
      expect(helpText).toContain('--debug');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed arguments gracefully', () => {
      const args = ['--invalid-option', 'value'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow();
    });

    test('should handle empty vision string', () => {
      const args = ['""'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('Vision cannot be empty');
    });

    test('should handle whitespace-only vision', () => {
      const args = ['"   \n  \t  "'];
      
      expect(() => breatheCommand.parseArgs(args))
        .toThrow('Vision cannot be empty');
    });
  });

  describe('Agent Integration', () => {
    test('should create agent with parsed options', async () => {
      const { KeenAgent } = require('../../../src/agent/KeenAgent.js');
      
      const args = ['--verbose', '--debug', 'Test agent creation'];
      const options = breatheCommand.parseArgs(args);
      
      await breatheCommand.execute(options);
      
      expect(KeenAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          vision: 'Test agent creation',
          verbose: true,
          debug: true
        })
      );
    });

    test('should execute agent and return result', async () => {
      const args = ['Test execution'];
      const options = breatheCommand.parseArgs(args);
      
      const result = await breatheCommand.execute(options);
      
      expect(result.success).toBe(true);
      expect(result.summary).toBe('Mock execution completed');
    });
  });
});
