/**
 * CodeQualityValidator - Syntax and style validation
 * FIXED: Always use silent mode and truncated output
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ValidationIssue } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// OUTPUT MANAGEMENT - NEVER ALLOW MASSIVE OUTPUT
const MAX_OUTPUT_LENGTH = 1000; // Maximum characters for command output
const MAX_OUTPUT_LINES = 30;    // Maximum lines for command output

interface CodeQualityOptions {
  silentMode?: boolean;
}

interface SyntaxResult {
  issues: ValidationIssue[];
  suggestions?: string[];
}

interface StyleResult {
  issues: ValidationIssue[];
  criticalIssues: number;
  suggestions?: string[];
}

export class CodeQualityValidator {
  private options: CodeQualityOptions;
  
  constructor(options: CodeQualityOptions = {}) {
    this.options = {
      silentMode: true, // ALWAYS ENFORCED
      ...options
    };
  }
  
  /**
   * Truncate output to prevent massive responses
   */
  private truncateOutput(output: string): string {
    if (!output) return '';
    
    // First truncate by lines
    const lines = output.split('\n');
    let result = lines;
    
    if (lines.length > MAX_OUTPUT_LINES) {
      result = [
        ...lines.slice(0, Math.floor(MAX_OUTPUT_LINES / 2)),
        `... [TRUNCATED: ${lines.length - MAX_OUTPUT_LINES} lines omitted] ...`,
        ...lines.slice(-Math.floor(MAX_OUTPUT_LINES / 2))
      ];
    }
    
    let finalResult = result.join('\n');
    
    // Then truncate by character count
    if (finalResult.length > MAX_OUTPUT_LENGTH) {
      const halfLength = Math.floor(MAX_OUTPUT_LENGTH / 2) - 50;
      finalResult = finalResult.substring(0, halfLength) + 
        `\n... [TRUNCATED: ${finalResult.length - MAX_OUTPUT_LENGTH} chars] ...\n` +
        finalResult.substring(finalResult.length - halfLength);
    }
    
    return finalResult;
  }
  
  /**
   * Validate syntax of project files
   */
  async validateSyntax(projectPath: string, scope: string[] = []): Promise<SyntaxResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    try {
      // Find TypeScript/JavaScript files (limit to prevent excessive processing)
      const files = await this.findSourceFiles(projectPath, scope);
      
      // Check TypeScript compilation
      if (await this.hasTypeScriptConfig(projectPath)) {
        const tsResult = await this.validateTypeScriptSyntax(projectPath);
        issues.push(...tsResult.issues);
        suggestions.push(...tsResult.suggestions);
      }
      
      // Basic syntax checks for individual files (limit to first 20 files)
      const filesToCheck = files.slice(0, 20);
      for (const file of filesToCheck) {
        const fileIssues = await this.validateFileSyntax(file);
        issues.push(...fileIssues);
      }
      
      if (files.length > 20) {
        suggestions.push(`Note: Only checked first 20 files out of ${files.length} total`);
      }
      
      return {
        issues,
        suggestions: suggestions.length > 0 ? suggestions : ['Syntax validation completed'],
      };
      
    } catch (error: any) {
      return {
        issues: [{,
          type: 'syntax_validator_error',
          severity: 'high',
          message: `Syntax validation failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        suggestions: ['Check project structure and TypeScript configuration'],
      };
    }
  }
  
  /**
   * Validate code style
   */
  async validateStyle(projectPath: string, scope: string[] = []): Promise<StyleResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    try {
      // Try ESLint if available
      const eslintResult = await this.runESLint(projectPath);
      issues.push(...eslintResult.issues);
      suggestions.push(...eslintResult.suggestions);
      
      // Basic style checks (limit to first 10 files for performance)
      const files = await this.findSourceFiles(projectPath, scope);
      const filesToCheck = files.slice(0, 10);
      
      for (const file of filesToCheck) {
        const styleIssues = await this.validateFileStyle(file);
        issues.push(...styleIssues);
      }
      
      if (files.length > 10) {
        suggestions.push(`Note: Only style-checked first 10 files out of ${files.length} total`);
      }
      
      const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
      
      return {
        issues,
        criticalIssues,
        suggestions: suggestions.length > 0 ? suggestions : ['Consider setting up ESLint and Prettier for better code quality'],
      };
      
    } catch (error: any) {
      return {
        issues: [{,
          type: 'style_validator_error',
          severity: 'medium',
          message: `Style validation failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        criticalIssues: 0,
        suggestions: ['Install and configure ESLint and Prettier'],
      };
    }
  }
  
  /**
   * Find source files in project (with limits)
   */
  private async findSourceFiles(projectPath: string, scope: string[] = []): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    const maxFiles = 100; // Limit total files to prevent excessive processing
    
    const searchDirs = scope.length > 0 ? scope : ['src', '.'];
    
    for (const searchDir of searchDirs) {
      if (files.length >= maxFiles) break;
      
      const fullPath = path.resolve(projectPath, searchDir);
      
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        } else if (stat.isDirectory()) {
          const dirFiles = await this.findFilesRecursive(fullPath, extensions, maxFiles - files.length);
          files.push(...dirFiles);
        }
      } catch (error) {
        // Skip inaccessible files/directories
      }
    }
    
    return files.slice(0, maxFiles);
  }
  
  /**
   * Recursively find files with specific extensions (with limits)
   */
  private async findFilesRecursive(dir: string, extensions: string[], maxFiles: number): Promise<string[]> {
    const files: string[] = [];
    
    if (maxFiles <= 0) return files;
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (files.length >= maxFiles) break;
        
        const fullPath = path.join(dir, item.name);
        
        // Skip node_modules, dist, and hidden directories
        if (item.name.startsWith('.') || 
            item.name === 'node_modules' || 
            item.name === 'dist' ||
            item.name === 'build' ||
            item.name === 'coverage') {
          continue;
        }
        
        if (item.isDirectory()) {
          const subFiles = await this.findFilesRecursive(fullPath, extensions, maxFiles - files.length);
          files.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return files;
  }
  
  /**
   * Check if project has TypeScript configuration
   */
  private async hasTypeScriptConfig(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'tsconfig.json'));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate TypeScript syntax using tsc - ALWAYS SILENT
   */
  private async validateTypeScriptSyntax(projectPath: string): Promise<{ issues: ValidationIssue[]; suggestions: string[] }> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    try {
      // ENFORCED: Always use --silent flag and other quiet flags
      const { stdout, stderr } = await execAsync(
        `cd "${projectPath}" && npx tsc --noEmit --silent`,
        {
          timeout: 30000,
          maxBuffer: 128 * 1024, // REDUCED: Only 128KB buffer
          env: { ...process.env, NODE_ENV: 'production' }
        }
      );
      
      // Parse TypeScript compiler output (truncated)
      if (stderr) {
        const truncatedStderr = this.truncateOutput(stderr);
        const lines = truncatedStderr.split('\n');
        
        let issueCount = 0;
        for (const line of lines) {
          if (issueCount >= 10) break; // Limit to 10 issues max
          
          const match = line.match(/(.+)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.+)/);
          if (match) {
            const [, file, line, column, message] = match;
            issues.push({
              type: 'typescript_error',
              severity: 'high',
              message: message.substring(0, 200), // Limit message length
              file: path.relative(projectPath, file),
              line: parseInt(line),
              column: parseInt(column),
              autoFixable: false,
            });
            issueCount++;
          }
        }
        
        if (issues.length >= 10) {
          suggestions.push('Note: Only showing first 10 TypeScript errors');
        }
      }
      
      if (issues.length === 0) {
        suggestions.push('TypeScript compilation successful');
      } else {
        suggestions.push('Fix TypeScript compilation errors');
      }
      
    } catch (error: any) {
      if (error.message.includes('tsc')) {
        suggestions.push('Install TypeScript compiler: npm install -g typescript');
      } else {
        issues.push({
          type: 'typescript_validation_error',
          severity: 'medium',
          message: `TypeScript validation failed: ${error.message.substring(0, 200)}`,
          file: '',
          line: 0,
          autoFixable: false,
        });
      }
    }
    
    return { issues, suggestions };
  }
  
  /**
   * Validate individual file syntax (with limits)
   */
  private async validateFileSyntax(filePath: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Limit file size processing
      if (content.length > 100000) { // 100KB limit
        return [{
          type: 'file_too_large',
          severity: 'low',
          message: 'File too large for syntax validation',
          file: path.basename(filePath),
          line: 0,
          autoFixable: false,
        }];
      }
      
      const lines = content.split('\n');
      
      // Basic syntax checks (limit to first 100 lines)
      const linesToCheck = Math.min(lines.length, 100);
      
      for (let i = 0; i < linesToCheck; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for common syntax issues
        if (line.includes('console.log(') && !line.includes('//')) {
          issues.push({
            type: 'console_log_found',
            severity: 'low',
            message: 'Console.log statement found (consider removing in production)',
            file: path.basename(filePath),
            line: lineNumber,
            autoFixable: true // Can be commented out automatically,
          });
        }
        
        // Check for trailing whitespace
        if (line.match(/\s+$/)) {
          issues.push({
            type: 'trailing_whitespace',
            severity: 'low',
            message: 'Trailing whitespace found',
            file: path.basename(filePath),
            line: lineNumber,
            autoFixable: true,
          });
        }
        
        // Limit total issues per file
        if (issues.length >= 20) {
          issues.push({
            type: 'too_many_issues',
            severity: 'low',
            message: `Too many issues in file, showing first 20`,
            file: path.basename(filePath),
            line: 0,
            autoFixable: false,
          });
          break;
        }
      }
      
    } catch (error) {
      issues.push({
        type: 'file_read_error',
        severity: 'medium',
        message: `Could not read file: ${path.basename(filePath)}`,
        file: path.basename(filePath),
        line: 0,
        autoFixable: false,
      });
    }
    
    return issues;
  }
  
  /**
   * Run ESLint if available - ALWAYS SILENT
   */
  private async runESLint(projectPath: string): Promise<{ issues: ValidationIssue[]; suggestions: string[] }> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    try {
      // ENFORCED: Always use --quiet flag for ESLint
      const { stdout, stderr } = await execAsync(
        `cd "${projectPath}" && npx eslint . --format json --quiet --max-warnings 0`,
        {
          timeout: 30000,
          maxBuffer: 128 * 1024, // REDUCED: Only 128KB buffer
          env: { ...process.env, NODE_ENV: 'production' }
        }
      );
      
      if (stdout) {
        try {
          const results = JSON.parse(stdout);
          let issueCount = 0;
          
          for (const result of results) {
            if (issueCount >= 20) break; // Limit to 20 issues max
            
            for (const message of result.messages || []) {
              if (issueCount >= 20) break;
              
              issues.push({
                type: `eslint_${message.ruleId || 'error'}`,
                severity: message.severity === 2 ? 'high' : 'medium',
                message: message.message.substring(0, 200), // Limit message length
                file: path.relative(projectPath, result.filePath || ''),
                line: message.line || 0,
                column: message.column || 0,
                autoFixable: message.fix !== undefined,
              });
              issueCount++;
            }
          }
          
          if (issueCount >= 20) {
            suggestions.push('Note: Only showing first 20 ESLint issues');
          }
          
          if (issues.length === 0) {
            suggestions.push('ESLint passed with no issues');
          } else {
            suggestions.push('Run "npx eslint . --fix" to auto-fix some issues');
          }
          
        } catch (parseError) {
          suggestions.push('ESLint output could not be parsed');
        }
      }
      
    } catch (error: any) {
      if (error.message.includes('eslint')) {
        suggestions.push('Install ESLint: npm install --save-dev eslint');
      } else {
        suggestions.push('ESLint not configured or available');
      }
    }
    
    return { issues, suggestions };
  }
  
  /**
   * Validate file style (with limits)
   */
  private async validateFileStyle(filePath: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Limit file size processing
      if (content.length > 50000) { // 50KB limit for style checking
        return [];
      }
      
      const lines = content.split('\n');
      const linesToCheck = Math.min(lines.length, 50); // Check max 50 lines
      
      for (let i = 0; i < linesToCheck; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check line length
        if (line.length > 120) {
          issues.push({
            type: 'line_too_long',
            severity: 'low',
            message: `Line too long (${line.length} characters, max 120)`,
            file: path.basename(filePath),
            line: lineNumber,
            autoFixable: false,
          });
        }
        
        // Check for inconsistent indentation (basic check)
        if (line.match(/^\t/)) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.match(/^  /)) {
            issues.push({
              type: 'inconsistent_indentation',
              severity: 'medium',
              message: 'Inconsistent indentation (mixing tabs and spaces)',
              file: path.basename(filePath),
              line: lineNumber,
              autoFixable: true,
            });
          }
        }
        
        // Limit issues per file
        if (issues.length >= 10) {
          break;
        }
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
    
    return issues;
  }
}
