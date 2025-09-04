/**
 * delete_files Tool
 * Safely delete multiple files with validation and rollback protection
 * SECURITY: Includes path validation to prevent unauthorized deletions
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getLogger } from '../../utils/Logger.js';

export interface DeleteFilesOptions {
  dryRun?: boolean;
  skipMissing?: boolean;
  createBackup?: boolean;
  backupSuffix?: string;
  confirmation?: boolean;
}

export interface DeleteResult {
  path: string;
  success: boolean;
  error?: string;
  backedUp?: boolean;
  backupPath?: string;
}

export class DeleteFilesTool {
  private logger = getLogger();
  private allowedPaths: string[] = [
    // Allow deletions in project directories
    'src/',
    'tests/',
    'dist/',
    'coverage/',
    'temp/',
    'tmp/',
    '.cache/',
    // Allow specific file types
    '.log',
    '.tmp',
    '.bak',
    '~',
    '.orig',
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini'
  ];

  private forbiddenPaths: string[] = [
    // Prevent deletion of critical files
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'node_modules/',
    '.git/',
    '.env',
    // System directories
    '/',
    '/home/',
    '/etc/',
    '/usr/',
    '/var/',
    '/bin/',
    '/sbin/'
  ];

  getDescription(): string {
    return 'Safely delete multiple files with validation and optional backup creation';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file paths to delete',
          minItems: 1
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview deletions without actually deleting files (default: false)'
        },
        skipMissing: {
          type: 'boolean',
          description: 'Skip files that do not exist without error (default: true)'
        },
        createBackup: {
          type: 'boolean',
          description: 'Create backups before deletion (default: false)'
        },
        backupSuffix: {
          type: 'string',
          description: 'Suffix for backup files (default: .backup)'
        }
      },
      required: ['paths']
    };
  }

  async execute(parameters: any, context: any): Promise<any> {
    const {
      paths,
      dryRun = false,
      skipMissing = true,
      createBackup = false,
      backupSuffix = '.backup'
    } = parameters;

    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error('paths parameter must be a non-empty array');
    }

    const startTime = Date.now();
    const results: DeleteResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      this.logger.info('delete', `${dryRun ? 'DRY RUN: ' : ''}Deleting ${paths.length} files`, {
        dryRun,
        createBackup,
        skipMissing,
        sessionId: context.sessionId
      });

      for (const filePath of paths) {
        try {
          const result = await this.deleteFile(filePath, {
            dryRun,
            skipMissing,
            createBackup,
            backupSuffix
          });

          results.push(result);

          if (result.success) {
            successCount++;
            this.logger.debug('delete', `${dryRun ? '[DRY RUN] ' : ''}Deleted: ${result.path}`, {
              backedUp: result.backedUp,
              backupPath: result.backupPath
            });
          } else {
            errorCount++;
            this.logger.warn('delete', `Failed to delete: ${result.path}`, {
              error: result.error
            });
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          results.push({
            path: filePath,
            success: false,
            error: errorMessage
          });
          errorCount++;
          this.logger.error('delete', `Error deleting ${filePath}`, { error: errorMessage });
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('delete', `${dryRun ? 'DRY RUN: ' : ''}File deletion completed`, {
        total: paths.length,
        success: successCount,
        errors: errorCount,
        duration,
        sessionId: context.sessionId
      });

      return {
        success: errorCount === 0,
        total: paths.length,
        deleted: successCount,
        errors: errorCount,
        results,
        dryRun,
        duration,
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error('delete', 'File deletion operation failed', {
        error: errorMessage,
        sessionId: context.sessionId
      });
      throw error;
    }
  }

  private async deleteFile(filePath: string, options: DeleteFilesOptions): Promise<DeleteResult> {
    // Security validation
    this.validatePath(filePath);

    // Normalize path
    const normalizedPath = path.normalize(filePath);

    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(normalizedPath);
      fileExists = true;
    } catch {
      if (options.skipMissing) {
        return {
          path: normalizedPath,
          success: true // Skip missing files is considered success
        };
      } else {
        return {
          path: normalizedPath,
          success: false,
          error: 'File does not exist'
        };
      }
    }

    let backupPath: string | undefined;
    let backedUp = false;

    if (options.dryRun) {
      return {
        path: normalizedPath,
        success: true,
        backedUp: options.createBackup || false
      };
    }

    try {
      // Create backup if requested
      if (options.createBackup && fileExists) {
        backupPath = `${normalizedPath}${options.backupSuffix || '.backup'}`;
        await fs.copyFile(normalizedPath, backupPath);
        backedUp = true;
      }

      // Delete the file
      await fs.unlink(normalizedPath);

      return {
        path: normalizedPath,
        success: true,
        backedUp,
        backupPath
      };

    } catch (error) {
      // If backup was created but deletion failed, try to restore
      if (backedUp && backupPath) {
        try {
          await fs.copyFile(backupPath, normalizedPath);
          await fs.unlink(backupPath);
        } catch {
          // Ignore restore errors
        }
      }

      return {
        path: normalizedPath,
        success: false,
        error: (error as Error).message,
        backedUp: false
      };
    }
  }

  private validatePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path: must be a non-empty string');
    }

    const normalizedPath = path.normalize(filePath);

    // Check for forbidden paths
    for (const forbidden of this.forbiddenPaths) {
      if (normalizedPath.startsWith(forbidden) || normalizedPath === forbidden) {
        throw new Error(`Access denied: Cannot delete critical path '${forbidden}'`);
      }
    }

    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      throw new Error('Access denied: Path traversal detected');
    }

    // Check if path is within project directory or allowed patterns
    const isAllowed = this.allowedPaths.some(allowed => {
      return normalizedPath.startsWith(allowed) || normalizedPath.endsWith(allowed);
    });

    if (!isAllowed) {
      throw new Error(`Access denied: Path '${normalizedPath}' is not in allowed deletion paths`);
    }
  }

  // Utility method for common cleanup patterns
  static getCommonTrashPatterns(): string[] {
    return [
      '**/*.tmp',
      '**/*.bak',
      '**/*~',
      '**/*.orig',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/desktop.ini',
      '**/*.log',
      'dist/**/*',
      'coverage/**/*',
      '.cache/**/*'
    ];
  }

  // Utility method to find trash files
  static async findTrashFiles(rootPath: string = '.'): Promise<string[]> {
    const trashFiles: string[] = [];
    const patterns = DeleteFilesTool.getCommonTrashPatterns();

    // This is a simplified implementation
    // In a real implementation, you might use a glob library
    const extensions = ['.tmp', '.bak', '.orig', '.log'];
    const names = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];

    try {
      // Recursively find files (simplified approach)
      const findFiles = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Skip node_modules and other directories we don't want to clean
            if (entry.isDirectory()) {
              if (!['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) {
                await findFiles(fullPath);
              }
              continue;
            }

            // Check if file matches trash patterns
            const isTrash = extensions.some(ext => entry.name.endsWith(ext)) ||
                           names.includes(entry.name) ||
                           entry.name.endsWith('~');

            if (isTrash) {
              trashFiles.push(fullPath);
            }
          }
        } catch {
          // Ignore errors for directories we can't read
        }
      };

      await findFiles(rootPath);
    } catch (error) {
      // Return empty array if there are issues
    }

    return trashFiles;
  }
}