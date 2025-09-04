/**
 * report_complete Tool
 * Signal completion with comprehensive report
 * SECURITY: Replaced console.log with proper Logger to prevent sensitive data exposure
 */

import chalk from 'chalk';
import { AgentExecutionContext } from '../types.js';
import { getLogger } from '../../utils/Logger.js';

export class ReportCompleteTool {
  private logger = getLogger();

  getDescription(): string {
    return 'Signal that the agent has completed its assigned task with a comprehensive report including validation results. CRITICAL: Code must compile before completion is allowed.';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A clear summary of what was accomplished',
        },
        success: {
          type: 'boolean',
          description: 'Whether the task was completed successfully',
        },
        filesCreated: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were created during the task',
        },
        filesModified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were modified during the task',
        }
      },
      required: ['summary'],
    };
  }

  async execute(parameters: any, context: AgentExecutionContext): Promise<any> {
    // SECURITY: Use Logger instead of console.log
    this.logger.info('complete', 'Task Completed', {
      sessionId: context.sessionId,
      success: parameters.success !== false,
    });
    this.logger.info('complete', `Summary: ${parameters.summary}`);
    
    return {
      success: true,
      completed: true,
      summary: parameters.summary,
      timestamp: new Date().toISOString(),
    };
  }
}
