/**
 * CompilationValidator - Ensures code compiles before completion
 * CRITICAL: Prevents agents from completing tasks with non-compiling code
 *
 * This validator performs comprehensive compilation checks using TypeScript compiler,
 * Node.js syntax validation, and build system verification.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  ValidationIssue,
  CompilationResult,
  CompilationError,
  CompilationValidatorOptions
} from './types.js';
import chalk from 'chalk';

export class CompilationValidator {
  private options: CompilationValidatorOptions;
  private debug: boolean;

  constructor(options: CompilationValidatorOptions = {}) {
    this.options = {
      silentMode: true,
      includeWarnings: false,
      checkDependencies: true,
      validateBuildScripts: true,
      ...options
    };
    this.debug = this.options.debug || false;
  }

  /**
   * CRITICAL: Main compilation validation entry point
   * This MUST pass before any agent can report completion
   */
  async validateCompilation(projectPath: string): Promise<CompilationResult> {
    this.debugLog('COMPILATION_START', 'Starting compilation validation', { projectPath });

    const result: CompilationResult = {
      success: false,
      errors: [],
      warnings: [],
      summary: '',
      executionTime: 0,
      validationSteps: [],
    };

    const startTime = Date.now();

    try {
      // Step 1: Check project structure
      const structureCheck = await this.validateProjectStructure(projectPath);
      result.validationSteps.push('Project structure check');

      if (!structureCheck.valid) {
        result.errors.push(...structureCheck.errors);
        result.summary = 'Project structure validation failed';
        return this.finalizeResult(result, startTime);
      }

      // Step 2: TypeScript compilation (if applicable)
      const tsResult = await this.validateTypeScriptCompilation(projectPath);
      result.validationSteps.push('TypeScript compilation check');

      if (tsResult.errors.length > 0) {
        result.errors.push(...tsResult.errors);
      }
      if (tsResult.warnings.length > 0) {
        result.warnings.push(...tsResult.warnings);
      }

      // Step 3: Node.js syntax validation
      const syntaxResult = await this.validateNodeSyntax(projectPath);
      result.validationSteps.push('Node.js syntax validation');

      if (syntaxResult.errors.length > 0) {
        result.errors.push(...syntaxResult.errors);
      }

      // Step 4: Build script validation (if applicable)
      if (this.options.validateBuildScripts) {
        const buildResult = await this.validateBuildScripts(projectPath);
        result.validationSteps.push('Build scripts validation');

        if (buildResult.errors.length > 0) {
          result.errors.push(...buildResult.errors);
        }
      }

      // Step 5: Dependency validation
      if (this.options.checkDependencies) {
        const depResult = await this.validateDependencies(projectPath);
        result.validationSteps.push('Dependency validation');

        if (depResult.errors.length > 0) {
          result.errors.push(...depResult.errors);
        }
      }

      // Determine success
      result.success = result.errors.length === 0;
      result.summary = result.success
        ? `Compilation validation passed (${result.validationSteps.length} checks)`
        : `Compilation validation failed with ${result.errors.length} errors`;

      this.debugLog('COMPILATION_COMPLETE', 'Compilation validation completed', {
        success: result.success,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return this.finalizeResult(result, startTime);

    } catch (error: any) {
      this.debugLog('COMPILATION_ERROR', 'Compilation validation failed', {
        error: error.message,
      });

      result.errors.push({
        type: 'validation_error',
        severity: 'critical',
        message: `Compilation validation failed: ${error.message}`,
        file: '',
        line: 0,
        autoFixable: false,
      });

      result.summary = 'Compilation validation threw an exception';
      return this.finalizeResult(result, startTime);
    }
  }

  /**
   * Validate project structure for compilation requirements
   */
  private async validateProjectStructure(projectPath: string): Promise<{
    valid: boolean;
    errors: ValidationIssue[];
  }> {
    const errors: ValidationIssue[] = [];

    try {
      // Check if project path exists
      const pathExists = await fs.access(projectPath).then(() => true).catch(() => false);
      if (!pathExists) {
        errors.push({
          type: 'project_not_found',
          severity: 'critical',
          message: `Project path does not exist: ${projectPath}`,
          file: projectPath,
          line: 0,
          autoFixable: false,
        });
        return { valid: false, errors };
      }

      // Check for package.json (Node.js projects)
      const packageJsonPath = path.join(projectPath, 'package.json');
      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);

      // Check for tsconfig.json (TypeScript projects)
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      const hasTsConfig = await fs.access(tsconfigPath).then(() => true).catch(() => false);

      if (!hasPackageJson && !hasTsConfig) {
        errors.push({
          type: 'no_config_files',
          severity: 'high',
          message: 'No package.json or tsconfig.json found - cannot validate compilation',
          file: projectPath,
          line: 0,
          autoFixable: false,
          suggestion: 'Create package.json for Node.js project or tsconfig.json for TypeScript project',
        });
      }

      return { valid: errors.length === 0, errors };
    } catch (error: any) {
      errors.push({
        type: 'structure_check_error',
        severity: 'critical',
        message: `Failed to validate project structure: ${error.message}`,
        file: projectPath,
        line: 0,
        autoFixable: false,
      });
      return { valid: false, errors };
    }
  }

  /**
   * Validate TypeScript compilation
   */
  private async validateTypeScriptCompilation(projectPath: string): Promise<{
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  }> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    try {
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      const hasTsConfig = await fs.access(tsconfigPath).then(() => true).catch(() => false);

      if (!hasTsConfig) {
        this.debugLog('TS_SKIP', 'No tsconfig.json found, skipping TypeScript validation');
        return { errors, warnings };
      }

      // Run TypeScript compiler
      this.debugLog('TS_COMPILE', 'Running TypeScript compilation check');

      try {
        const tscCommand = 'npx tsc --noEmit --skipLibCheck';
        const output = execSync(tscCommand, {
          cwd: projectPath,
          encoding: 'utf8',
          stdio: this.options.silentMode ? 'pipe' : 'inherit',
          timeout: 30000 // 30 second timeout,
        });

        this.debugLog('TS_SUCCESS', 'TypeScript compilation successful');

      } catch (execError: any) {
        // Parse TypeScript compiler output
        const output = execError.stdout + execError.stderr;
        const tsErrors = this.parseTSCompilerOutput(output);

        errors.push(...tsErrors.filter(err => err.severity === 'critical' || err.severity === 'high'));
        warnings.push(...tsErrors.filter(err => err.severity === 'medium' || err.severity === 'low'));

        this.debugLog('TS_ERRORS', 'TypeScript compilation errors found', {
          errorCount: errors.length,
          warningCount: warnings.length,
        });
      }

    } catch (error: any) {
      errors.push({
        type: 'typescript_validation_error',
        severity: 'critical',
        message: `TypeScript validation failed: ${error.message}`,
        file: '',
        line: 0,
        autoFixable: false,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate Node.js syntax for JavaScript files
   */
  private async validateNodeSyntax(projectPath: string): Promise<{
    errors: ValidationIssue[];
  }> {
    const errors: ValidationIssue[] = [];

    try {
      // Find all .js and .mjs files
      const jsFiles = await this.findJSFiles(projectPath);

      for (const file of jsFiles) {
        try {
          // Use Node.js to check syntax
          execSync(`node --check "${file}"`, {
            cwd: projectPath,
            stdio: this.options.silentMode ? 'pipe' : 'inherit',
            timeout: 10000,
          });
        } catch (syntaxError: any) {
          errors.push({
            type: 'javascript_syntax_error',
            severity: 'critical',
            message: `JavaScript syntax error: ${syntaxError.message}`,
            file: path.relative(projectPath, file),
            line: this.extractLineNumber(syntaxError.message) || 0,
            autoFixable: false,
          });
        }
      }

      this.debugLog('JS_SYNTAX', 'JavaScript syntax validation completed', {
        filesChecked: jsFiles.length,
        errorsFound: errors.length,
      });

    } catch (error: any) {
      errors.push({
        type: 'node_syntax_validation_error',
        severity: 'high',
        message: `Node.js syntax validation failed: ${error.message}`,
        file: '',
        line: 0,
        autoFixable: false,
      });
    }

    return { errors };
  }

  /**
   * Validate build scripts can execute
   */
  private async validateBuildScripts(projectPath: string): Promise<{
    errors: ValidationIssue[];
  }> {
    const errors: ValidationIssue[] = [];

    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);

      if (!hasPackageJson) {
        return { errors };
      }

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      // Check common build scripts
      const buildScriptsToCheck = ['build', 'compile', 'tsc', 'webpack'];

      for (const scriptName of buildScriptsToCheck) {
        if (scripts[scriptName]) {
          try {
            // Dry-run build scripts if possible
            if (scriptName === 'build' || scriptName === 'compile') {
              this.debugLog('BUILD_CHECK', `Testing build script: ${scriptName}`);

              // For now, just validate the script exists and looks valid
              // TODO: Could implement actual dry-run execution
              const script = scripts[scriptName];
              if (typeof script !== 'string' || script.trim().length === 0) {
                errors.push({
                  type: 'invalid_build_script',
                  severity: 'medium',
                  message: `Build script '${scriptName}' is empty or invalid`,
                  file: 'package.json',
                  line: 0,
                  autoFixable: false,
                });
              }
            }
          } catch (buildError: any) {
            errors.push({
              type: 'build_script_error',
              severity: 'high',
              message: `Build script '${scriptName}' validation failed: ${buildError.message}`,
              file: 'package.json',
              line: 0,
              autoFixable: false,
            });
          }
        }
      }

    } catch (error: any) {
      errors.push({
        type: 'build_validation_error',
        severity: 'medium',
        message: `Build script validation failed: ${error.message}`,
        file: 'package.json',
        line: 0,
        autoFixable: false,
      });
    }

    return { errors };
  }

  /**
   * Validate dependencies are properly resolved
   */
  private async validateDependencies(projectPath: string): Promise<{
    errors: ValidationIssue[];
  }> {
    const errors: ValidationIssue[] = [];

    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const nodeModulesPath = path.join(projectPath, 'node_modules');

      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      const hasNodeModules = await fs.access(nodeModulesPath).then(() => true).catch(() => false);

      if (!hasPackageJson) {
        return { errors };
      }

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (Object.keys(dependencies).length > 0 && !hasNodeModules) {
        errors.push({
          type: 'missing_dependencies',
          severity: 'high',
          message: 'Dependencies declared in package.json but node_modules not found',
          file: 'package.json',
          line: 0,
          autoFixable: false,
          suggestion: 'Run npm install or yarn install to install dependencies',
        });
      }

      // Check for critical missing dependencies that would cause compilation to fail
      const criticalDeps = ['typescript', '@types/node'];
      const installedDeps = hasNodeModules ? await fs.readdir(nodeModulesPath).catch(() => []) : [];

      for (const depName of criticalDeps) {
        if (dependencies[depName] && !installedDeps.includes(depName)) {
          errors.push({
            type: 'missing_critical_dependency',
            severity: 'high',
            message: `Critical dependency '${depName}' is missing from node_modules`,
            file: 'package.json',
            line: 0,
            autoFixable: false,
            suggestion: `Install missing dependency: npm install ${depName}`
          });
        }
      }

    } catch (error: any) {
      errors.push({
        type: 'dependency_validation_error',
        severity: 'medium',
        message: `Dependency validation failed: ${error.message}`,
        file: 'package.json',
        line: 0,
        autoFixable: false,
      });
    }

    return { errors };
  }

  /**
   * Parse TypeScript compiler output to extract errors
   */
  private parseTSCompilerOutput(output: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Match TypeScript compiler error format: path(line,col): error TS#### message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS(\d+):\s*(.+)$/);

      if (match) {
        const [, file, lineNum, col, type, code, message] = match;

        issues.push({
          type: `typescript_${type}`,
          severity: type === 'error' ? 'critical' : 'medium',
          message: `TS${code}: ${message}`,
          file: file,
          line: parseInt(lineNum, 10),
          autoFixable: false,
          suggestion: this.getTSErrorSuggestion(parseInt(code, 10))
        });
      }
    }

    return issues;
  }

  /**
   * Get suggestions for common TypeScript errors
   */
  private getTSErrorSuggestion(errorCode: number): string | undefined {
    const suggestions: Record<number, string> = {
      2304: 'Cannot find name - check imports and declarations',
      2307: 'Cannot find module - verify import paths and installed packages',
      2322: 'Type mismatch - check variable types and assignments',
      2345: 'Argument type mismatch - verify function parameter types',
      2571: 'Object is of type unknown - add proper type annotations',
      7016: 'Could not find declaration file - install @types package or add type declarations'
    };

    return suggestions[errorCode];
  }

  /**
   * Find all JavaScript files in the project
   */
  private async findJSFiles(projectPath: string): Promise<string[]> {
    const jsFiles: string[] = [];

    const findFiles = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          await findFiles(fullPath);
        } else if (entry.isFile() && this.isJSFile(entry.name)) {
          jsFiles.push(fullPath);
        }
      }
    };

    await findFiles(projectPath);
    return jsFiles;
  }

  /**
   * Check if directory should be skipped during JS file search
   */
  private shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
    return skipDirs.includes(dirname);
  }

  /**
   * Check if file is a JavaScript file to validate
   */
  private isJSFile(filename: string): boolean {
    return /\.(js|mjs|jsx)$/.test(filename);
  }

  /**
   * Extract line number from error message
   */
  private extractLineNumber(message: string): number | null {
    const match = message.match(/:?(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Finalize result with execution time
   */
  private finalizeResult(result: CompilationResult, startTime: number): CompilationResult {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Debug logging helper
   */
  private debugLog(category: string, message: string, data?: any): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();if (data) {}
    }
  }
}
