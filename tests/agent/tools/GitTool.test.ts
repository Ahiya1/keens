/**
 * Git Tool Comprehensive Tests
 * Tests all Git operations: status, add, commit, push, pull, branch, etc.
 */

import { GitTool } from '../../../src/agent/tools/GitTool.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { ProgressReporter } from '../../../src/utils/ProgressReporter.js';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

describe('GitTool', () => {
  let gitTool: GitTool;
  let mockLogger: Logger;
  let mockProgress: ProgressReporter;
  let tempDir: string;

  beforeEach(async () => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    mockProgress = new ProgressReporter('git_test', 10, false, false);
    gitTool = new GitTool(mockLogger, mockProgress);
    
    // Create temp directory for git tests
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'git-tool-test-'));
  });

  afterEach(async () => {
    mockProgress.destroy();
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Git Status', () => {
    test('should get git status in existing repo', async () => {
      const result = await gitTool.execute({
        action: 'status'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('object');
    });

    test('should handle non-git directory', async () => {
      const result = await gitTool.execute({
        action: 'status'
      }, tempDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a git repository');
    });
  });

  describe('Git Init', () => {
    test('should initialize new git repository', async () => {
      const result = await gitTool.execute({
        action: 'init'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      
      // Verify .git directory was created
      const gitDirExists = await fs.access(path.join(tempDir, '.git'))
        .then(() => true)
        .catch(() => false);
      expect(gitDirExists).toBe(true);
    });

    test('should handle already initialized repository', async () => {
      // Initialize once
      await gitTool.execute({ action: 'init' }, tempDir);
      
      // Try to initialize again
      const result = await gitTool.execute({
        action: 'init'
      }, tempDir);

      expect(result.success).toBe(true); // Git init is idempotent
    });
  });

  describe('Git Add', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
    });

    test('should add specific files', async () => {
      const result = await gitTool.execute({
        action: 'add',
        files: ['test.txt']
      }, tempDir);

      expect(result.success).toBe(true);
    });

    test('should add all files with dot', async () => {
      const result = await gitTool.execute({
        action: 'add',
        files: ['.']
      }, tempDir);

      expect(result.success).toBe(true);
    });

    test('should handle non-existent files', async () => {
      const result = await gitTool.execute({
        action: 'add',
        files: ['nonexistent.txt']
      }, tempDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pathspec');
    });
  });

  describe('Git Commit', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      await gitTool.execute({ action: 'add', files: ['test.txt'] }, tempDir);
    });

    test('should commit with message', async () => {
      const result = await gitTool.execute({
        action: 'commit',
        message: 'Test commit message'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test commit message');
    });

    test('should handle empty commit', async () => {
      // Try to commit without any changes
      const result = await gitTool.execute({
        action: 'commit',
        message: 'Empty commit'
      }, tempDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nothing to commit');
    });

    test('should require commit message', async () => {
      const result = await gitTool.execute({
        action: 'commit'
        // No message provided
      }, tempDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message');
    });
  });

  describe('Git Branch', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      await gitTool.execute({ action: 'add', files: ['test.txt'] }, tempDir);
      await gitTool.execute({ action: 'commit', message: 'Initial commit' }, tempDir);
    });

    test('should list branches', async () => {
      const result = await gitTool.execute({
        action: 'branch'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content).toContain('main');
    });

    test('should create new branch', async () => {
      const result = await gitTool.execute({
        action: 'branch',
        branch: 'test-branch'
      }, tempDir);

      expect(result.success).toBe(true);
      
      // Verify branch was created
      const listResult = await gitTool.execute({ action: 'branch' }, tempDir);
      expect(listResult.content).toContain('test-branch');
    });
  });

  describe('Git Checkout', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      await gitTool.execute({ action: 'add', files: ['test.txt'] }, tempDir);
      await gitTool.execute({ action: 'commit', message: 'Initial commit' }, tempDir);
      await gitTool.execute({ action: 'branch', branch: 'test-branch' }, tempDir);
    });

    test('should checkout existing branch', async () => {
      const result = await gitTool.execute({
        action: 'checkout',
        branch: 'test-branch'
      }, tempDir);

      expect(result.success).toBe(true);
    });

    test('should handle non-existent branch', async () => {
      const result = await gitTool.execute({
        action: 'checkout',
        branch: 'nonexistent-branch'
      }, tempDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('did not match any file');
    });
  });

  describe('Git Log', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      await gitTool.execute({ action: 'add', files: ['test.txt'] }, tempDir);
      await gitTool.execute({ action: 'commit', message: 'Test commit for log' }, tempDir);
    });

    test('should show commit log', async () => {
      const result = await gitTool.execute({
        action: 'log'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test commit for log');
      expect(result.content).toContain('commit');
    });

    test('should limit log entries', async () => {
      const result = await gitTool.execute({
        action: 'log',
        args: ['--oneline', '-1']
      }, tempDir);

      expect(result.success).toBe(true);
      const lines = result.content.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(1);
    });
  });

  describe('Git Diff', () => {
    beforeEach(async () => {
      await gitTool.execute({ action: 'init' }, tempDir);
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'original content');
      await gitTool.execute({ action: 'add', files: ['test.txt'] }, tempDir);
      await gitTool.execute({ action: 'commit', message: 'Initial commit' }, tempDir);
    });

    test('should show differences', async () => {
      // Modify file
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'modified content');
      
      const result = await gitTool.execute({
        action: 'diff'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content).toContain('modified content');
      expect(result.content).toContain('original content');
    });

    test('should handle no differences', async () => {
      const result = await gitTool.execute({
        action: 'diff'
      }, tempDir);

      expect(result.success).toBe(true);
      expect(result.content.trim()).toBe('');
    });
  });

  describe('Parameter Validation', () => {
    test('should validate required action parameter', async () => {
      const result = await gitTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('action is required');
    });

    test('should validate valid actions', async () => {
      const result = await gitTool.execute({
        action: 'invalid_action'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid git action');
    });

    test('should validate branch name for checkout', async () => {
      const result = await gitTool.execute({
        action: 'checkout'
        // Missing branch parameter
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('branch');
    });
  });

  describe('Tool Schema', () => {
    test('should have correct tool definition', () => {
      expect(gitTool.name).toBe('git');
      expect(gitTool.description).toBeTruthy();
      expect(gitTool.input_schema).toBeDefined();
      expect(gitTool.input_schema.type).toBe('object');
      expect(gitTool.input_schema.properties.action).toBeDefined();
    });
  });
});
