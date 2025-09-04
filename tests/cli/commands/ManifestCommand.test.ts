/**
 * ManifestCommand Comprehensive Tests
 * Tests project analysis, manifest generation, and output formatting
 */

import { ManifestCommand } from '../../../src/cli/commands/ManifestCommand.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

describe('ManifestCommand', () => {
  let manifestCommand: ManifestCommand;
  let tempDir: string;
  let mockLogger: Logger;

  beforeEach(async () => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    manifestCommand = new ManifestCommand();
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'manifest-test-'));
    
    // Create a sample project structure
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.mkdir(path.join(tempDir, 'tests'));
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for manifest generation',
      main: 'index.js',
      dependencies: {
        'express': '^4.18.0',
        'lodash': '^4.17.21'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'typescript': '^5.0.0'
      }
    }, null, 2));
    
    await fs.writeFile(path.join(tempDir, 'src', 'index.js'), 
      'const express = require(\'express\');\nconst app = express();\napp.listen(3000);'
    );
    
    await fs.writeFile(path.join(tempDir, 'README.md'), 
      '# Test Project\nThis is a test project for manifest generation.'
    );
    
    await fs.writeFile(path.join(tempDir, '.gitignore'), 
      'node_modules/\n*.log\ndist/'
    );
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
      expect(manifestCommand.name).toBe('manifest');
      expect(manifestCommand.description).toContain('project');
      expect(manifestCommand.description).toContain('analyze');
    });

    test('should define command aliases', () => {
      expect(manifestCommand.aliases).toContain('analyze');
      expect(manifestCommand.aliases).toContain('scan');
    });
  });

  describe('Directory Analysis', () => {
    test('should analyze project structure', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.manifest.projectName).toBe('test-project');
      expect(result.manifest.structure).toBeDefined();
    });

    test('should detect package.json metadata', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.manifest.version).toBe('1.0.0');
      expect(result.manifest.description).toContain('Test project');
      expect(result.manifest.dependencies).toContain('express');
      expect(result.manifest.devDependencies).toContain('jest');
    });

    test('should analyze file types', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.manifest.fileTypes).toBeDefined();
      expect(result.manifest.fileTypes['.js']).toBeGreaterThan(0);
      expect(result.manifest.fileTypes['.json']).toBeGreaterThan(0);
      expect(result.manifest.fileTypes['.md']).toBeGreaterThan(0);
    });

    test('should calculate project statistics', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.manifest.stats).toBeDefined();
      expect(result.manifest.stats.totalFiles).toBeGreaterThan(0);
      expect(result.manifest.stats.totalDirectories).toBeGreaterThan(0);
      expect(result.manifest.stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Output Formats', () => {
    test('should generate JSON output by default', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.format).toBe('json');
      expect(typeof result.output).toBe('string');
      expect(() => JSON.parse(result.output)).not.toThrow();
    });

    test('should generate YAML output', async () => {
      const args = ['--directory', tempDir, '--format', 'yaml'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.format).toBe('yaml');
      expect(result.output).toContain('projectName:');
      expect(result.output).toContain('version:');
    });

    test('should generate table output', async () => {
      const args = ['--directory', tempDir, '--format', 'table'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.format).toBe('table');
      expect(result.output).toContain('│'); // Table border characters
      expect(result.output).toContain('Project Summary');
    });

    test('should generate markdown output', async () => {
      const args = ['--directory', tempDir, '--format', 'markdown'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.format).toBe('markdown');
      expect(result.output).toContain('# Project Manifest');
      expect(result.output).toContain('##');
    });
  });

  describe('File Output', () => {
    test('should write output to file', async () => {
      const outputFile = path.join(tempDir, 'manifest.json');
      const args = ['--directory', tempDir, '--output', outputFile];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(true);
      expect(result.outputFile).toBe(outputFile);
      
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(() => JSON.parse(fileContent)).not.toThrow();
    });

    test('should create output directory if needed', async () => {
      const outputFile = path.join(tempDir, 'output', 'manifest.json');
      const args = ['--directory', tempDir, '--output', outputFile];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(true);
      
      const fileExists = await fs.access(outputFile)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should handle file write errors', async () => {
      const invalidPath = '/root/cannot-write-here.json';
      const args = ['--directory', tempDir, '--output', invalidPath];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('write');
    });
  });

  describe('Filtering Options', () => {
    test('should exclude hidden files by default', async () => {
      // Create hidden file
      await fs.writeFile(path.join(tempDir, '.hidden'), 'hidden content');
      
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      const files = result.manifest.files;
      const hiddenFiles = files.filter((file: string) => path.basename(file).startsWith('.'));
      expect(hiddenFiles.length).toBe(1); // Only .gitignore
    });

    test('should include hidden files when requested', async () => {
      await fs.writeFile(path.join(tempDir, '.hidden'), 'hidden content');
      await fs.writeFile(path.join(tempDir, '.env'), 'SECRET=value');
      
      const args = ['--directory', tempDir, '--include-hidden'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      const files = result.manifest.files;
      const hiddenFiles = files.filter((file: string) => path.basename(file).startsWith('.'));
      expect(hiddenFiles.length).toBeGreaterThan(1);
    });

    test('should respect max depth option', async () => {
      // Create nested structure
      await fs.mkdir(path.join(tempDir, 'level1', 'level2', 'level3'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'level1', 'level2', 'level3', 'deep.txt'), 'deep file');
      
      const args = ['--directory', tempDir, '--max-depth', '2'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      const deepFile = result.manifest.files.find(
        (file: string) => file.includes('level3')
      );
      expect(deepFile).toBeUndefined();
    });

    test('should exclude patterns', async () => {
      await fs.mkdir(path.join(tempDir, 'node_modules'));
      await fs.writeFile(path.join(tempDir, 'node_modules', 'package.js'), 'module');
      
      const args = ['--directory', tempDir, '--exclude', 'node_modules'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      const nodeModulesFiles = result.manifest.files.filter(
        (file: string) => file.includes('node_modules')
      );
      expect(nodeModulesFiles.length).toBe(0);
    });
  });

  describe('Git Integration', () => {
    test('should detect git repository', async () => {
      // Initialize git repo
      await fs.mkdir(path.join(tempDir, '.git'));
      await fs.writeFile(path.join(tempDir, '.git', 'config'), '[core]\nrepositoryformatversion = 0');
      
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.manifest.git).toBeDefined();
      expect(result.manifest.git.isRepository).toBe(true);
    });

    test('should detect non-git directory', async () => {
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.manifest.git.isRepository).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent directory', async () => {
      const args = ['--directory', '/path/that/does/not/exist'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    test('should handle permission denied', async () => {
      // This test may not work on all systems
      const args = ['--directory', '/root'];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      // Either succeeds or fails gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should validate output format', () => {
      const args = ['--format', 'invalid-format'];
      
      expect(() => manifestCommand.parseArgs(args))
        .toThrow('Invalid format');
    });
  });

  describe('Performance', () => {
    test('should handle large directory structures', async () => {
      // Create many files
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(path.join(tempDir, `file${i}.txt`), `Content ${i}`);
      }
      
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const startTime = Date.now();
      const result = await manifestCommand.execute(options);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.manifest.stats.totalFiles).toBeGreaterThan(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle deep directory nesting', async () => {
      // Create deep nesting
      let currentPath = tempDir;
      for (let i = 0; i < 10; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        await fs.mkdir(currentPath, { recursive: true });
        await fs.writeFile(path.join(currentPath, 'file.txt'), `Level ${i}`);
      }
      
      const args = ['--directory', tempDir];
      const options = manifestCommand.parseArgs(args);
      
      const result = await manifestCommand.execute(options);
      
      expect(result.success).toBe(true);
      expect(result.manifest.stats.maxDepth).toBeGreaterThan(5);
    });
  });

  describe('Help and Usage', () => {
    test('should provide comprehensive help', () => {
      const helpText = manifestCommand.getHelp();
      
      expect(helpText).toContain('manifest');
      expect(helpText).toContain('--format');
      expect(helpText).toContain('--output');
      expect(helpText).toContain('--include-hidden');
      expect(helpText).toContain('Examples:');
    });
  });
});
