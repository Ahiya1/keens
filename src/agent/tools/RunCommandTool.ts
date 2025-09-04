/**
 * run_command Tool
 * Execute shell commands with timeout and error handling
 * FIXED: Always truncate output to prevent massive responses
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// OUTPUT MANAGEMENT - NEVER ALLOW MASSIVE OUTPUT
const MAX_OUTPUT_LENGTH = 2000; // Maximum characters for stdout/stderr
const MAX_OUTPUT_LINES = 50;    // Maximum lines for stdout/stderr

export class RunCommandTool {
  getDescription(): string {
    return 'Execute shell commands with timeout and error handling';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for command execution',
        },
        env: {
          type: 'object',
          description: 'Environment variables to set',
        },
        shell: {
          type: 'string',
          description: 'Shell to use (default: system default)',
        }
      },
      required: ['command'],
    };
  }

  /**
   * Truncate output to prevent massive responses that waste AI credits
   */
  private truncateOutput(output: string, type: string = 'output'): string {
    if (!output) return '';

    // First truncate by lines
    const lines = output.split('\n');
    let truncatedLines = lines;

    if (lines.length > MAX_OUTPUT_LINES) {
      truncatedLines = [
        ...lines.slice(0, Math.floor(MAX_OUTPUT_LINES / 2)),
        `\n... [TRUNCATED: ${lines.length - MAX_OUTPUT_LINES} lines omitted to prevent excessive output] ...\n`,
        ...lines.slice(-Math.floor(MAX_OUTPUT_LINES / 2))
      ];
    }

    let result = truncatedLines.join('\n');

    // Then truncate by character count
    if (result.length > MAX_OUTPUT_LENGTH) {
      const halfLength = Math.floor(MAX_OUTPUT_LENGTH / 2) - 100;
      result = result.substring(0, halfLength) +
        `\n\n... [TRUNCATED: ${result.length - MAX_OUTPUT_LENGTH} characters omitted] ...\n\n` +
        result.substring(result.length - halfLength);
    }

    return result;
  }

  /**
   * Add silent flags to common commands to prevent verbose output
   */
  private addSilentFlags(command: string): string {
    let modifiedCommand = command;

    // Add silent flags for common verbose commands
    if (command.includes('npm test') && !command.includes('--silent')) {
      modifiedCommand = command.replace('npm test', 'npm test --silent');
    }
    if (command.includes('jest') && !command.includes('--silent')) {
      modifiedCommand = modifiedCommand.replace('jest', 'jest --silent');
    }
    if (command.includes('npm run test') && !command.includes('--silent')) {
      modifiedCommand = modifiedCommand.replace('npm run test', 'npm run test --silent');
    }
    if (command.includes('npm install') && !command.includes('--silent')) {
      modifiedCommand = modifiedCommand.replace('npm install', 'npm install --silent');
    }
    if (command.includes('npm ci') && !command.includes('--silent')) {
      modifiedCommand = modifiedCommand.replace('npm ci', 'npm ci --silent');
    }

    return modifiedCommand;
  }

  async execute(parameters: any, context: any): Promise<any> {
    const {
      command,
      timeout = 30000,
      workingDirectory,
      env = {},
      shell
    } = parameters;

    if (!command || typeof command !== 'string') {
      throw new Error('command parameter must be a non-empty string');
    }

    // Security checks
    const forbiddenPatterns = [
      'rm -rf /',
      'sudo rm',
      'format',
      'del /f /q',
      'rmdir /s /q',
      '> /dev/null 2>&1 &',
      'curl | sh',
      'wget | sh'
    ];

    const lowerCommand = command.toLowerCase();
    for (const pattern of forbiddenPatterns) {
      if (lowerCommand.includes(pattern)) {
        throw new Error(`Potentially dangerous command blocked: ${pattern}`);
      }
    }

    const cwd = workingDirectory || context.workingDirectory;
    const dryRun = context.dryRun;

    // ALWAYS add silent flags to prevent verbose output
    const safeCommand = this.addSilentFlags(command);

    if (dryRun) {
      return {
        success: true,
        message: `Dry run: Would execute command: ${safeCommand}`,
        command: safeCommand,
        workingDirectory: cwd,
        dryRun: true,
      };
    }

    try {
      const startTime = Date.now();

      // Prepare execution environment
      const execEnv = {
        ...process.env,
        ...env
      };

      const options: any = {
        cwd,
        env: execEnv,
        timeout,
        maxBuffer: 256 * 1024, // REDUCED from 1MB to 256KB to prevent massive output
        killSignal: 'SIGKILL',
      };

      if (shell) {
        options.shell = shell;
      }

      // Execute command with modified safe command
      const { stdout, stderr } = await execAsync(safeCommand, options);

      const duration = Date.now() - startTime;

      // CRITICAL: Always truncate output to prevent credit waste
      const truncatedStdout = this.truncateOutput(stdout.toString(), 'stdout');
      const truncatedStderr = this.truncateOutput(stderr.toString(), 'stderr');

      return {
        success: true,
        command: safeCommand,
        workingDirectory: cwd,
        stdout: truncatedStdout,
        stderr: truncatedStderr,
        duration,
        exitCode: 0,
        outputTruncated: stdout.length > MAX_OUTPUT_LENGTH || stderr.length > MAX_OUTPUT_LENGTH,
      };

    } catch (error: any) {
      const duration = Date.now() - Date.now();

      // Handle timeout
      if (error.killed && error.signal === 'SIGKILL') {
        return {
          success: false,
          error: `Command timed out after ${timeout}ms`,
          command: safeCommand,
          workingDirectory: cwd,
          timeout: true,
          duration
        };
      }

      // Handle command execution errors with truncated output
      const errorStdout = error.stdout ? this.truncateOutput(error.stdout.toString(), 'error_stdout') : '';
      const errorStderr = error.stderr ? this.truncateOutput(error.stderr.toString(), 'error_stderr') : '';

      return {
        success: false,
        error: error.message,
        command: safeCommand,
        workingDirectory: cwd,
        stdout: errorStdout,
        stderr: errorStderr,
        exitCode: error.code || -1,
        duration,
        outputTruncated: (error.stdout && error.stdout.length > MAX_OUTPUT_LENGTH) ||
                        (error.stderr && error.stderr.length > MAX_OUTPUT_LENGTH)
      };
    }
  }

  /**
   * Execute command with real-time output streaming
   * FIXED: Always truncate streaming output too
   */
  async executeWithStreaming(
    command: string,
    options: any,
    context: any,
    onStdout?: (data: string) => void,
    onStderr?: (data: string) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const cwd = options.workingDirectory || context.workingDirectory;
      const safeCommand = this.addSilentFlags(command);

      const child = spawn(safeCommand, {
        cwd,
        shell: true,
        env: { ...process.env, ...options.env },
        timeout: options.timeout || 30000,
      });

      let stdout = '';
      let stderr = '';
      const startTime = Date.now();

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;

        // Truncate real-time output too
        if (stdout.length > MAX_OUTPUT_LENGTH) {
          stdout = this.truncateOutput(stdout, 'streaming_stdout');
        }

        if (onStdout) {
          onStdout(text);
        }
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;

        // Truncate real-time output too
        if (stderr.length > MAX_OUTPUT_LENGTH) {
          stderr = this.truncateOutput(stderr, 'streaming_stderr');
        }

        if (onStderr) {
          onStderr(text);
        }
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          command: safeCommand,
          workingDirectory: cwd,
          stdout: this.truncateOutput(stdout, 'final_stdout'),
          stderr: this.truncateOutput(stderr, 'final_stderr'),
          exitCode: code,
          duration,
          streaming: true,
          outputTruncated: stdout.length > MAX_OUTPUT_LENGTH || stderr.length > MAX_OUTPUT_LENGTH,
        });
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        reject({
          success: false,
          error: error.message,
          command: safeCommand,
          workingDirectory: cwd,
          duration,
          streaming: true,
        });
      });
    });
  }
}
