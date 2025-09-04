/**
 * Phase 3.3: Summon Agent Tool
 * Spawns a single sub-agent with sequential blocking execution
 * Implements recursive agent spawning with workspace isolation
 * SECURITY: Fixed weak random number generation
 */

import { randomBytes } from 'crypto';
import { 
  AgentExecutionContext, 
  AgentSpawnRequest, 
  AgentSpawnResult, 
  AgentSpecialization,
  GitBranchUtils
} from '../types.js';
import { KeenAgent } from '../KeenAgent.js';
import chalk from 'chalk';
import { getLogger } from '../../utils/Logger.js';

export class SummonAgentTool {
  private logger = getLogger();

  getDescription(): string {
    return 'Spawn a specialized sub-agent with focused expertise. Sequential execution - parent waits until child completes fully before continuing.';
  }
  
  getInputSchema() {
    return {
      type: 'object',
      properties: {
        vision: {,
          type: 'string',
          description: 'Clear sub-vision/task for the child agent to accomplish',
        },
        specialization: {,
          type: 'string',
          enum: ['frontend', 'backend', 'database', 'testing', 'security', 'devops', 'general'],
          description: 'Area of expertise for the child agent',
        },
        maxIterations: {,
          type: 'number',
          description: 'Maximum iterations for child agent (default: 50)',
          minimum: 1,
          maximum: 200,
        },
        costBudget: {,
          type: 'number',
          description: 'Maximum cost budget for child agent in credits (default: 5.0)',
          minimum: 0.1,
          maximum: 50.0,
        },
        context: {,
          type: 'object',
          description: 'Filtered context to pass to child agent (optional)',
        }
      },
      required: ['vision', 'specialization']
    };
  }
  
  async execute(
    parameters: {,
      vision: string;
      specialization: AgentSpecialization;
      maxIterations?: number;
      costBudget?: number;
      context?: any;
    },
    context: AgentExecutionContext,
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Validate that we have AgentTreeManager
      const agentTreeManager = context.toolManagerOptions?.agentTreeManager;
      if (!agentTreeManager) {
        throw new Error('AgentTreeManager not available - recursive spawning not supported');
      }
      
      // Validate that parent can spawn a child (sequential execution)
      if (!agentTreeManager.canSpawnChild(context.sessionId)) {
        throw new Error(
          `Parent agent ${context.sessionId} cannot spawn child - ` +
          'either parent is not active or there is already an active child. ' +
          'Sequential execution requires waiting for current child to complete.'
        );
      }
      
      // Generate child session ID and branch name
      const childSessionId = this.generateChildSessionId(context.sessionId);
      const childBranch = agentTreeManager.generateChildBranch(context.sessionId);
      
      // Get specialization context
      const specializationContext = agentTreeManager.getSpecializationContext(parameters.specialization);
      
      // Build spawn request
      const spawnRequest: AgentSpawnRequest = {
        vision: this.buildChildVision(parameters.vision, parameters.specialization, specializationContext),
        specialization: parameters.specialization,
        parentSessionId: context.sessionId,
        workingDirectory: context.workingDirectory,
        gitBranch: childBranch,
        maxIterations: parameters.maxIterations || 50,
        costBudget: parameters.costBudget || 5.0,
        context: parameters.context,
      };
      
      // Add child to tree (this validates sequential execution)
      const childNode = await agentTreeManager.addChild(
        context.sessionId,
        childSessionId,
        spawnRequest
      );

      // Create child agent with inherited context
      const childAgent = new KeenAgent({
        vision: spawnRequest.vision,
        directory: spawnRequest.workingDirectory,
        maxIterations: spawnRequest.maxIterations,
        costBudget: spawnRequest.costBudget,
        webSearch: true, // Inherit web search capability
        stream: context.verbose,
        debug: context.verbose,
        dryRun: context.dryRun,
        userContext: context.userContext // Pass user context,
      });
      
      // Execute child agent (BLOCKING - sequential execution)
      const childResult = await childAgent.execute();
      
      const duration = Date.now() - startTime;
      
      // Mark child as completed in tree and merge its work
      await agentTreeManager.completeChild(
        childSessionId,
        childResult,
        context.workingDirectory
      );

      if (childResult.success) {
        // SECURITY: Use proper logger instead of console.log
        if (context.verbose) {
          this.logger.info('summon', `Child agent ${childSessionId} completed successfully`, {
            specialization: parameters.specialization,
            duration,
            gitBranch: childBranch,
          });
        }
      } else {
        this.logger.warn('summon', `Child agent ${childSessionId} failed`, {
          specialization: parameters.specialization,
          duration,
          error: childResult.error,
        });
      }
      
      const result: AgentSpawnResult = {
        success: childResult.success,
        childSessionId,
        gitBranch: childBranch,
        result: childResult,
        error: childResult.success ? undefined : (childResult.error || 'Child agent execution failed'),
      };
      
      return {
        success: true,
        spawnResult: result,
        executionTime: duration,
        specializationContext,
        childMetrics: {,
          sessionId: childSessionId,
          specialization: parameters.specialization,
          gitBranch: childBranch,
          depth: childNode.depth,
          duration,
          cost: childResult.totalCost || 0,
          filesCreated: childResult.filesCreated?.length || 0,
          filesModified: childResult.filesModified?.length || 0,
          iterations: childResult.enhancedData?.totalIterations || 0,
        }
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: `Failed to spawn ${parameters.specialization} agent: ${error.message}`,
        duration,
        spawnRequest: {,
          vision: parameters.vision,
          specialization: parameters.specialization,
          maxIterations: parameters.maxIterations,
          costBudget: parameters.costBudget,
        }
      };
    }
  }
  
  /**
   * Generate unique child session ID using cryptographically secure random bytes
   * SECURITY: Replaced Math.random() with crypto.randomBytes()
   */
  private generateChildSessionId(parentSessionId: string): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${parentSessionId}-child-${timestamp}-${random}`;
  }
  
  /**
   * Build specialized vision for child agent
   */
  private buildChildVision(
    originalVision: string, 
    specialization: AgentSpecialization,
    specializationContext: any,
  ): string {
    const prefix = `You are a specialized ${specialization} agent with focused expertise in: ${specializationContext.focus}.\n\n`;
    
    const responsibilities = `Your primary responsibilities:\n${specializationContext.responsibilities.map((r: string) => `- ${r}`).join('\n')}\n\n`;
    
    const tools = `Key tools and technologies for your specialization:\n${specializationContext.tools.map((t: string) => `- ${t}`).join('\n')}\n\n`;
    
    const focus = `**FOCUSED TASK:**\n${originalVision}\n\n`;
    
    const guidelines = `**EXECUTION GUIDELINES:**\n` +
      `- Stay focused on ${specialization} concerns only\n` +
      `- Use your specialized knowledge and tools\n` +
      `- Implement clean, maintainable solutions\n` +
      `- Test your work thoroughly\n` +
      `- Document your changes appropriately\n` +
      `- Report completion when your specialized task is done\n\n`;
    
    return prefix + responsibilities + tools + focus + guidelines + 
           `Remember: You are a **${specialization} specialist**. Focus only on your area of expertise.`;
  }
}
