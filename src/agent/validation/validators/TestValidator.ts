/**
 * TestValidator - Test execution and validation
 * FIXED: ALWAYS use silent mode and truncated output
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestExecutionResult } from '../types.js';

const execAsync = promisify(exec);

// OUTPUT MANAGEMENT - NEVER ALLOW MASSIVE OUTPUT FROM TESTS
const MAX_OUTPUT_LENGTH = 1500; // Maximum characters for test output
const MAX_OUTPUT_LINES = 40;    // Maximum lines for test output

interface TestOptions {
  silentMode?: boolean;
  timeout?: number;
}

export class TestValidator {
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.options = {
      silentMode: true, // ALWAYS ENFORCED - NEVER ALLOW VERBOSE TESTS
      timeout: 60000,
      ...options
    };
  }

  /**
   * Truncate test output to prevent massive responses
   */
  private truncateOutput(output: string): string {
    if (!output) return '';

    // First truncate by lines
    const lines = output.split('\n');
    let result = lines;

    if (lines.length > MAX_OUTPUT_LINES) {
      result = [
        ...lines.slice(0, Math.floor(MAX_OUTPUT_LINES / 2)),
        `... [TEST OUTPUT TRUNCATED: ${lines.length - MAX_OUTPUT_LINES} lines omitted to prevent spam] ...`,
        ...lines.slice(-Math.floor(MAX_OUTPUT_LINES / 2))
      ];
    }

    let finalResult = result.join('\n');

    // Then truncate by character count
    if (finalResult.length > MAX_OUTPUT_LENGTH) {
      const halfLength = Math.floor(MAX_OUTPUT_LENGTH / 2) - 70;
      finalResult = finalResult.substring(0, halfLength) +
        `\n\n... [TEST OUTPUT TRUNCATED: ${finalResult.length - MAX_OUTPUT_LENGTH} characters omitted] ...\n\n` +
        finalResult.substring(finalResult.length - halfLength);
    }

    return finalResult;
  }

  /**
   * Execute tests and return results - ENFORCED SILENT MODE
   */
  async executeTests(projectPath: string, options: TestOptions = {}): Promise<TestExecutionResult> {
    const testOptions = {
      silentMode: true, // ALWAYS ENFORCED
      timeout: 60000,
      ...this.options,
      ...options
    };

    try {
      // Check if package.json exists and has test scripts
      const packageInfo = await this.getPackageInfo(projectPath);

      if (!packageInfo.hasTests) {
        return {
          passed: false,
          total: 0,
          failed: 0,
          duration: 0,
          output: 'No tests found',
          errors: ['No test scripts found in package.json'],
        };
      }

      // Determine test runner and command - ALWAYS SILENT
      const testCommand = this.getSilentTestCommand(packageInfo);

      // Execute tests with ENFORCED silent mode
      const result = await this.runTests(projectPath, testCommand, testOptions);

      return result;

    } catch (error: any) {
      return {
        passed: false,
        total: 0,
        failed: 0,
        duration: 0,
        output: '',
        errors: [`Test execution failed: ${error.message.substring(0, 200)}`]
      };
    }
  }

  /**
   * Get package.json information
   */
  private async getPackageInfo(projectPath: string): Promise<{
    hasTests: boolean;
    testRunner: string;
    scripts: any;
  }> {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const scripts = packageJson.scripts || {};
      const hasTests = 'test' in scripts;

      let testRunner = 'unknown';
      if (packageJson.devDependencies || packageJson.dependencies) {
        const deps = { ...packageJson.devDependencies, ...packageJson.dependencies };
        if (deps.jest) testRunner = 'jest';
        else if (deps.mocha) testRunner = 'mocha';
        else if (deps.vitest) testRunner = 'vitest';
        else if (deps.ava) testRunner = 'ava';
      }

      return {
        hasTests,
        testRunner,
        scripts
      };

    } catch (error) {
      return {
        hasTests: false,
        testRunner: 'unknown',
        scripts: {}
      };
    }
  }

  /**
   * Get the appropriate SILENT test command - CRITICAL: Always silent
   */
  private getSilentTestCommand(packageInfo: any): string {
    // CRITICAL: ALWAYS add multiple silent flags to ensure no verbose output

    // Check for specific test scripts
    if (packageInfo.scripts.test) {
      const testScript = packageInfo.scripts.test;

      // For npm test, add MULTIPLE silent flags
      if (testScript.includes('jest')) {
        return `npm test --silent -- --silent --passWithNoTests --verbose=false`;
      } else if (testScript.includes('mocha')) {
        return `npm test --silent -- --reporter min --quiet`;
      } else if (testScript.includes('vitest')) {
        return `npm test --silent -- --run --silent`;
      } else {
        return `npm test --silent`;
      }
    }

    // Fallback based on detected test runner - ALWAYS with silent flags
    switch (packageInfo.testRunner) {
      case 'jest':
        return `npx jest --silent --passWithNoTests --verbose=false --noStackTrace`;
      case 'mocha':
        return `npx mocha --reporter min --quiet test/**/*.test.js`;
      case 'vitest':
        return `npx vitest run --silent --reporter=basic`;
      default:
        return `npm test --silent`;
    }
  }

  /**
   * Run tests with the specified command - ENFORCED SILENT
   */
  private async runTests(projectPath: string, command: string, options: TestOptions): Promise<TestExecutionResult> {
    const startTime = Date.now();

    try {
      // CRITICAL: ALWAYS use silent mode with reduced buffer
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: options.timeout,
        maxBuffer: 256 * 1024, // REDUCED: Only 256KB buffer (was 2MB!)
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true',
          SILENT: 'true',
          JEST_SILENT: 'true',
          // Disable verbose output for all common test runners
          npm_config_loglevel: 'silent',
          npm_config_silent: 'true',
        }
      });

      const duration = Date.now() - startTime;

      // CRITICAL: Always truncate output
      const truncatedOutput = this.truncateOutput(stdout + stderr);

      // Parse test results from truncated output
      const results = this.parseTestResults(truncatedOutput, command);

      return {
        passed: results.failed === 0 && results.total > 0,
        total: results.total,
        failed: results.failed,
        duration,
        coverage: results.coverage,
        output: truncatedOutput,
        errors: results.errors,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle test failures vs execution failures
      if (error.code === 1 && error.stdout) {
        // Tests ran but some failed
        const truncatedOutput = this.truncateOutput(error.stdout + (error.stderr || ''));
        const results = this.parseTestResults(truncatedOutput, command);

        return {
          passed: false,
          total: results.total,
          failed: results.failed,
          duration,
          coverage: results.coverage,
          output: truncatedOutput,
          errors: results.errors,
        };
      } else {
        // Execution failed
        const errorOutput = error.stdout ? this.truncateOutput(error.stdout) : '';
        return {
          passed: false,
          total: 0,
          failed: 0,
          duration,
          output: errorOutput,
          errors: [`Test execution failed: ${error.message.substring(0, 200)}`]
        };
      }
    }
  }

  /**
   * Parse test results from output (handles truncated output)
   */
  private parseTestResults(output: string, command: string): {
    total: number;
    failed: number;
    coverage?: any;
    errors: string[];
  } {
    const results = {
      total: 0,
      failed: 0,
      coverage: undefined as any,
      errors: [] as string[],
    };

    // Jest output parsing
    if (command.includes('jest') || output.includes('Jest')) {
      return this.parseJestResults(output);
    }

    // Mocha output parsing
    if (command.includes('mocha') || output.includes('passing') || output.includes('failing')) {
      return this.parseMochaResults(output);
    }

    // Generic parsing
    return this.parseGenericResults(output);
  }

  /**
   * Parse Jest test results (handles truncated output)
   */
  private parseJestResults(output: string): {
    total: number;
    failed: number;
    coverage?: any;
    errors: string[];
  } {
    const results = { total: 0, failed: 0, coverage: undefined as any, errors: [] as string[] };

    // Look for test summary patterns (more robust parsing)
    const testSummaryPatterns = [
      /(\d+) tests?,\s*(\d+) failed/,
      /Tests:\s*(\d+) failed,\s*(\d+) passed/,
      /Tests:\s*(\d+) passed,\s*(\d+) failed/
    ];

    for (const pattern of testSummaryPatterns) {
      const match = output.match(pattern);
      if (match) {
        if (pattern.source.includes('failed,')) {
          results.failed = parseInt(match[1]);
          results.total = results.failed + parseInt(match[2]);
        } else if (pattern.source.includes('passed,')) {
          results.total = parseInt(match[1]) + parseInt(match[2]);
          results.failed = parseInt(match[2]);
        } else {
          results.total = parseInt(match[1]);
          results.failed = parseInt(match[2]);
        }
        break;
      }
    }

    // Alternative Jest format parsing
    if (results.total === 0) {
      const passMatch = output.match(/(\d+) passing/);
      const failMatch = output.match(/(\d+) failing/);
      if (passMatch || failMatch) {
        const passed = passMatch ? parseInt(passMatch[1]) : 0;
        const failed = failMatch ? parseInt(failMatch[1]) : 0;
        results.total = passed + failed;
        results.failed = failed;
      }
    }

    // Look for coverage information (simplified)
    const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)/);
    if (coverageMatch) {
      const coverage = parseFloat(coverageMatch[1]);
      results.coverage = {
        statements: coverage,
        branches: coverage,
        functions: coverage,
        lines: coverage,
      };
    }

    return results;
  }

  /**
   * Parse Mocha test results
   */
  private parseMochaResults(output: string): {
    total: number;
    failed: number;
    coverage?: any;
    errors: string[];
  } {
    const results = { total: 0, failed: 0, coverage: undefined as any, errors: [] as string[] };

    // Look for Mocha summary
    const passMatch = output.match(/(\d+) passing/);
    const failMatch = output.match(/(\d+) failing/);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    results.total = passed + failed;
    results.failed = failed;

    return results;
  }

  /**
   * Parse generic test results
   */
  private parseGenericResults(output: string): {
    total: number;
    failed: number;
    coverage?: any;
    errors: string[];
  } {
    const results = { total: 0, failed: 0, coverage: undefined as any, errors: [] as string[] };

    // Look for common test patterns
    const lines = output.split('\n');
    let testCount = 0;
    let failCount = 0;

    for (const line of lines) {
      if (line.includes('✓') || line.includes('✔') || line.includes('pass')) {
        testCount++;
      } else if (line.includes('✗') || line.includes('✘') || line.includes('fail') || line.includes('error')) {
        testCount++;
        failCount++;
      }

      // Don't process too many lines from truncated output
      if (testCount > 100) break;
    }

    if (testCount > 0) {
      results.total = testCount;
      results.failed = failCount;
    }

    return results;
  }
}
