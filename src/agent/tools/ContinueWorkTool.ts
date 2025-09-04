/**
 * continue_work Tool
 * Indicate that the agent will continue working on the current task with details about the next steps
 * SECURITY: Replaced console.log with proper Logger to prevent sensitive data exposure
 */

import chalk from 'chalk';
import { getLogger } from '../../utils/Logger.js';

export class ContinueWorkTool {
  private logger = getLogger();

  getDescription(): string {
    return 'Indicate that the agent will continue working on the current task with details about the next steps';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        nextAction: {
          type: 'string',
          description: 'Clear description of what the agent will do next',
        },
        reasoning: {
          type: 'string',
          description: 'Optional reasoning behind the chosen next action',
        },
        estimatedDuration: {
          type: 'string',
          description: 'Estimated time to complete the next action (e.g., \'5 minutes\', \'2 steps\')'
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dependencies that must be met before proceeding',
        },
        risks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Potential risks or issues with the planned action',
        },
        requiresUserInput: {
          type: 'boolean',
          description: 'Whether the next action requires user input or intervention',
        }
      },
      required: ['nextAction'],
    };
  }

  async execute(parameters: any, context: any): Promise<any> {
    const {
      nextAction,
      reasoning,
      estimatedDuration,
      dependencies = [],
      risks = [],
      requiresUserInput = false
    } = parameters;

    if (!nextAction || typeof nextAction !== 'string') {
      throw new Error('nextAction parameter must be a non-empty string');
    }

    // Display continuation plan to user
    if (!context.dryRun) {
      this.displayContinuationPlan({
        nextAction,
        reasoning,
        estimatedDuration,
        dependencies,
        risks,
        requiresUserInput
      });
    }

    // SECURITY: Log continuation plan securely without exposing sensitive context data
    this.logger.info('continue', 'Agent continuing work', {
      hasNextAction: !!nextAction,
      hasReasoning: !!reasoning,
      hasDependencies: dependencies.length > 0,
      hasRisks: risks.length > 0,
      requiresUserInput,
      sessionId: context.sessionId,
    });

    return {
      success: true,
      continuing: true,
      nextAction,
      reasoning,
      estimatedDuration,
      dependencies,
      risks,
      requiresUserInput,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
    };
  }

  /**
   * Display formatted continuation plan
   * SECURITY: Uses proper Logger instead of console.log to prevent sensitive data exposure
   */
  private displayContinuationPlan(plan: any): void {
    // SECURITY: Use Logger instead of console.log for secure output
    this.logger.info('display', 'Continuing Work', { status: 'continuing' });
    this.logger.info('display', `Next Action: ${plan.nextAction}`);
    
    if (plan.reasoning) {
      this.logger.info('display', `Reasoning: ${plan.reasoning}`);
    }

    if (plan.estimatedDuration) {
      this.logger.info('display', `Estimated Duration: ${plan.estimatedDuration}`);
    }

    if (plan.dependencies && plan.dependencies.length > 0) {
      this.logger.info('display', 'Dependencies:', { dependencies: plan.dependencies });
    }

    if (plan.risks && plan.risks.length > 0) {
      this.logger.warn('display', 'Risks identified:', { risks: plan.risks });
    }

    if (plan.requiresUserInput) {
      this.logger.info('display', 'User input will be required');
    }
    
    this.logger.debug('continue', 'Continuation plan displayed');
  }
}
