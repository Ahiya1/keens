/**
 * report_phase Tool
 * Report current phase and progress
 * SECURITY: Replaced console.log with proper Logger to prevent sensitive data exposure
 */

import chalk from 'chalk';
import { AgentExecutionContext, AgentPhase } from '../types.js';
import { getLogger } from '../../utils/Logger.js';

export class ReportPhaseTool {
  private logger = getLogger();

  getDescription(): string {
    return 'Report the current phase of agent execution and provide status updates';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: ['EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'],
          description: 'Current phase of agent execution',
        },
        summary: {
          type: 'string',
          description: 'Summary of what was accomplished in this phase',
        }
      },
      required: ['phase', 'summary']
    };
  }

  async execute(parameters: any, context: AgentExecutionContext): Promise<any> {
    // SECURITY: Use Logger instead of console.log
    this.logger.info('phase', `Phase: ${parameters.phase}`, {
      phase: parameters.phase,
      sessionId: context.sessionId,
    });
    this.logger.info('phase', parameters.summary);
    
    return {
      success: true,
      phase: parameters.phase,
      summary: parameters.summary,
      timestamp: new Date().toISOString(),
    };
  }
}
