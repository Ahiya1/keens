/**
 * Write Files Tool Comprehensive Tests
 * Tests file writing with atomicity, validation, and error handling
 */

import { WriteFilesTool } from '../../../src/agent/tools/WriteFilesTool.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { ProgressReporter } from '../../../src/utils/ProgressReporter.js';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

describe('WriteFilesTool', () => {
  let writeFilesTool: WriteFilesTool;
  let mockLogger: Logger;
  let mockProgress: ProgressReporter;
  let tempDir: string;

  beforeEach(async () => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    mockProgress = new ProgressReporter('write_test', 10, false, false);
    writeFilesTool = new WriteFilesTool(mockLogger, mockProgress);
    
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'write-files-test-'));
  });

  afterEach(async () => {
    mockProgress.destroy();
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Single File Writing', () => {
    test('should write single file', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: content
        }]
      });

      expect(result.success).toBe(true);
      
      const writtenContent = await fs.readFile(testFile, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('should create directories if needed', async () => {
      const nestedFile = path.join(tempDir, 'nested', 'dir', 'test.txt');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: nestedFile,
          content: 'nested content'
        }],
        createDirectories: true
      });

      expect(result.success).toBe(true);
      
      const writtenContent = await fs.readFile(nestedFile, 'utf-8');
      expect(writtenContent).toBe('nested content');
    });

    test('should fail without createDirectories when parent missing', async () => {
      const nestedFile = path.join(tempDir, 'nonexistent', 'test.txt');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: nestedFile,
          content: 'content'
        }],
        createDirectories: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });
  });

  describe('Multiple File Writing', () => {
    test('should write multiple files atomically', async () => {
      const files = [
        { path: path.join(tempDir, 'file1.txt'), content: 'Content 1' },
        { path: path.join(tempDir, 'file2.txt'), content: 'Content 2' },
        { path: path.join(tempDir, 'file3.txt'), content: 'Content 3' }
      ];
      
      const result = await writeFilesTool.execute({ files });

      expect(result.success).toBe(true);
      expect(result.content.filesWritten).toBe(3);
      
      for (const file of files) {
        const content = await fs.readFile(file.path, 'utf-8');
        expect(content).toBe(file.content);
      }
    });

    test('should handle mixed file types', async () => {
      const files = [
        { path: path.join(tempDir, 'text.txt'), content: 'Plain text' },
        { path: path.join(tempDir, 'json.json'), content: JSON.stringify({key: 'value'}, null, 2) },
        { path: path.join(tempDir, 'code.js'), content: 'console.log("Hello");' }
      ];
      
      const result = await writeFilesTool.execute({ files });

      expect(result.success).toBe(true);
      expect(result.content.filesWritten).toBe(3);
    });
  });

  describe('File Overwriting', () => {
    test('should overwrite existing files', async () => {
      const testFile = path.join(tempDir, 'overwrite.txt');
      
      // Write initial content
      await fs.writeFile(testFile, 'Initial content');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: 'New content'
        }]
      });

      expect(result.success).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('New content');
    });

    test('should create backup when requested', async () => {
      const testFile = path.join(tempDir, 'backup-test.txt');
      const originalContent = 'Original content';
      
      // Create original file
      await fs.writeFile(testFile, originalContent);
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: 'New content'
        }],
        backup: true
      });

      expect(result.success).toBe(true);
      expect(result.content.backupsCreated).toBeGreaterThan(0);
      
      // Check that backup was created
      const backupFiles = (await fs.readdir(tempDir))
        .filter(file => file.includes('backup-test') && file.includes('.bak'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should validate file parameter structure', async () => {
      const result = await writeFilesTool.execute({
        files: [{
          // Missing required 'content' field
          path: path.join(tempDir, 'test.txt')
        }]
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('content');
    });

    test('should handle invalid file paths', async () => {
      const result = await writeFilesTool.execute({
        files: [{
          path: '', // Invalid empty path
          content: 'test'
        }]
      });

      expect(result.success).toBe(false);
    });

    test('should handle permission errors gracefully', async () => {
      const result = await writeFilesToool.execute({
        files: [{
          path: '/root/protected-file.txt', // Likely permission denied
          content: 'test'
        }]
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should rollback on partial failure', async () => {
      const validFile = path.join(tempDir, 'valid.txt');
      const invalidFile = '/invalid/path/file.txt';
      
      const result = await writeFilesTool.execute({
        files: [
          { path: validFile, content: 'Valid content' },
          { path: invalidFile, content: 'Invalid content' }
        ]
      });

      expect(result.success).toBe(false);
      
      // Valid file should not exist due to rollback
      const validFileExists = await fs.access(validFile)
        .then(() => true)
        .catch(() => false);
      expect(validFileExists).toBe(false);
    });
  });

  describe('Large File Handling', () => {
    test('should handle large file content', async () => {
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
      const testFile = path.join(tempDir, 'large.txt');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: largeContent
        }]
      });

      expect(result.success).toBe(true);
      
      const stats = await fs.stat(testFile);
      expect(stats.size).toBeGreaterThan(1024 * 1024 - 100); // Allow some margin
    });

    test('should handle multiple large files', async () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        path: path.join(tempDir, `large${i}.txt`),
        content: 'B'.repeat(512 * 1024) // 512KB each
      }));
      
      const result = await writeFilesTool.execute({ files });

      expect(result.success).toBe(true);
      expect(result.content.filesWritten).toBe(5);
    });
  });

  describe('Special Characters and Encoding', () => {
    test('should handle UTF-8 content', async () => {
      const utf8Content = 'Hello 世界 🌍 ñoël';
      const testFile = path.join(tempDir, 'utf8.txt');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: utf8Content
        }]
      });

      expect(result.success).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(utf8Content);
    });

    test('should handle special JSON characters', async () => {
      const jsonContent = JSON.stringify({
        string: 'test "quotes" and \\backslashes',
        unicode: '\u0041\u0042\u0043',
        special: '\n\r\t'
      }, null, 2);
      
      const testFile = path.join(tempDir, 'special.json');
      
      const result = await writeFilesTool.execute({
        files: [{
          path: testFile,
          content: jsonContent
        }]
      });

      expect(result.success).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(JSON.parse(content)).toEqual(JSON.parse(jsonContent));
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent write operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        writeFilesTool.execute({
          files: [{
            path: path.join(tempDir, `concurrent${i}.txt`),
            content: `Concurrent content ${i}`
          }]
        })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
      });
      
      // Verify all files were written
      const files = await fs.readdir(tempDir);
      const concurrentFiles = files.filter(f => f.startsWith('concurrent'));
      expect(concurrentFiles.length).toBe(10);
    });
  });

  describe('Tool Schema and Metadata', () => {
    test('should have correct tool definition', () => {
      expect(writeFilesTool.name).toBe('write_files');
      expect(writeFilesTool.description).toBeTruthy();
      expect(writeFilesTool.input_schema).toBeDefined();
      expect(writeFilesTool.input_schema.type).toBe('object');
      expect(writeFilesTool.input_schema.properties.files).toBeDefined();
    });

    test('should define required parameters', () => {
      expect(writeFilesTool.input_schema.required).toContain('files');
    });
  });
});
