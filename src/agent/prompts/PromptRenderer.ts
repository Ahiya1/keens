/**
 * PromptRenderer - Renders final prompts with variable substitution
 * Handles template variable replacement and final prompt assembly
 */

import {
  SystemPromptComponents,
  PromptContext,
  PromptType,
  CompilationError
} from './types.js';
import { UserContext } from '../../database/DatabaseManager.js';

export class PromptRenderer {
  /**
   * Render system prompt from components
   */
  renderSystemPrompt(
    components: SystemPromptComponents, 
    context: PromptContext
  ): string {
    const renderedComponents: SystemPromptComponents = {};

    // Render each component with variable substitution
    for (const [key, content] of Object.entries(components)) {
      if (content) {
        renderedComponents[key as keyof SystemPromptComponents] = 
          this.substituteVariables(content, context);
      }
    }

    // Assemble in proper order
    return this.assemblePrompt(renderedComponents, 'system');
  }

  /**
   * Render conversation prompt from components
   */
  renderConversationPrompt(
    components: SystemPromptComponents,
    context: PromptContext
  ): string {
    const renderedComponents: SystemPromptComponents = {};

    for (const [key, content] of Object.entries(components)) {
      if (content) {
        renderedComponents[key as keyof SystemPromptComponents] = 
          this.substituteVariables(content, context);
      }
    }

    return this.assemblePrompt(renderedComponents, 'conversation');
  }

  /**
   * Render child agent prompt from components
   */
  renderChildAgentPrompt(
    components: SystemPromptComponents,
    context: PromptContext
  ): string {
    const renderedComponents: SystemPromptComponents = {};

    for (const [key, content] of Object.entries(components)) {
      if (content) {
        renderedComponents[key as keyof SystemPromptComponents] = 
          this.substituteVariables(content, context);
      }
    }

    return this.assemblePrompt(renderedComponents, 'child_agent');
  }

  /**
   * Render error recovery prompt from components
   */
  renderErrorRecoveryPrompt(
    components: SystemPromptComponents,
    context: PromptContext & {
      errors: string[];
      previousAttempt?: string;
    }
  ): string {
    const renderedComponents: SystemPromptComponents = {};

    for (const [key, content] of Object.entries(components)) {
      if (content) {
        // Special handling for error-specific content
        let renderedContent = content;
        
        if (content.includes('{{errorList}}')) {
          const errorList = context.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
          renderedContent = renderedContent.replace('{{errorList}}', errorList);
        }
        
        if (content.includes('{{previousAttempt}}') && context.previousAttempt) {
          renderedContent = renderedContent.replace('{{previousAttempt}}', context.previousAttempt);
        }
        
        renderedComponents[key as keyof SystemPromptComponents] = 
          this.substituteVariables(renderedContent, context);
      }
    }

    return this.assemblePrompt(renderedComponents, 'error_recovery');
  }

  /**
   * Substitute template variables with actual values
   */
  private substituteVariables(content: string, context: PromptContext): string {
    let result = content;

    // Basic context variables
    result = result.replace(/{{vision}}/g, context.vision || '');
    result = result.replace(/{{workingDirectory}}/g, context.workingDirectory || '');
    result = result.replace(/{{sessionId}}/g, context.sessionId || '');
    result = result.replace(/{{timestamp}}/g, context.timestamp || new Date().toISOString());
    result = result.replace(/{{specialization}}/g, context.specialization || 'general');
    result = result.replace(/{{phase}}/g, context.phase || 'EXPLORE');
    result = result.replace(/{{gitBranch}}/g, context.gitBranch || 'main');

    // User context variables
    if (context.userContext) {
      result = result.replace(/{{userId}}/g, context.userContext.userId || '');
      result = result.replace(/{{isAdmin}}/g, context.userContext.isAdmin ? 'Yes' : 'No');
      result = result.replace(/{{privileges}}/g, 
        context.userContext.isAdmin ? 'Unlimited resources, priority execution' : 'Standard user limits'
      );
    }

    // Recursive spawning variables
    if (context.parentSessionId) {
      const parentInfo = ` (child of ${context.parentSessionId.split('-').pop()})`;
      result = result.replace(/{{parentInfo}}/g, parentInfo);
    } else {
      result = result.replace(/{{parentInfo}}/g, ' (root)');
    }

    result = result.replace(/{{canSpawnChild}}/g, 
      context.hasRecursiveSpawning ? 'Yes' : 'No (wait for current child to complete)'
    );

    // Tool descriptions
    if (context.availableTools) {
      const toolDescriptions = context.availableTools
        .map(tool => `${tool}: ${this.getToolDescription(tool)}`)
        .join('\n');
      result = result.replace(/{{toolDescriptions}}/g, toolDescriptions);
    }

    // Clean up any remaining template variables that couldn't be resolved
    result = this.cleanUnresolvedVariables(result);

    return result;
  }

  /**
   * Get description for a tool
   */
  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      get_project_tree: 'Analyze project structure using tree command with intelligent exclusions',
      read_files: 'Read multiple files and return their contents with error handling',
      write_files: 'Write multiple files atomically with rollback protection',
      run_command: 'Execute shell commands with timeout and error handling',
      git: 'Execute git tool',
      validate_project: 'Execute comprehensive project validation and quality checks',
      report_phase: 'Report the current phase of agent execution and provide status updates',
      continue_work: 'Indicate that the agent will continue working on the current task with details about the next steps',
      report_complete: 'Signal that the agent has completed its assigned task with a comprehensive report including validation results',
      summon_agent: 'Spawn a specialized sub-agent with focused expertise. Sequential execution - parent waits until child completes fully before continuing.',
      coordinate_agents: 'Coordinate agent tree execution, enforce sequential order, and manage dependencies between parent and child agents.',
      get_agent_status: 'Report the status of the sequential agent tree, including hierarchy, execution metrics, and current state of all agents.',
      web_search: 'Search the web for current information, documentation, best practices, and troubleshooting guidance (handled by Anthropic API)'
    };

    return descriptions[toolName] || 'Tool description not available';
  }

  /**
   * Clean up unresolved template variables
   */
  private cleanUnresolvedVariables(content: string): string {
    // Remove any remaining {{variable}} patterns that couldn't be resolved
    return content.replace(/{{[^}]+}}/g, '[VARIABLE_NOT_RESOLVED]');
  }

  /**
   * Assemble final prompt from rendered components
   */
  private assemblePrompt(components: SystemPromptComponents, type: PromptType): string {
    const sections: string[] = [];

    // Get component order based on type
    const order = this.getComponentOrder(type);

    // Assemble components in order
    for (const componentKey of order) {
      const content = components[componentKey];
      if (content && content.trim().length > 0) {
        sections.push(content.trim());
      }
    }

    return sections.join('\n');
  }

  /**
   * Get component ordering for different prompt types
   */
  private getComponentOrder(type: PromptType): (keyof SystemPromptComponents)[] {
    switch (type) {
      case 'system':
        return [
          'header',
          'task',
          'context', 
          'capabilities',
          'compilationRequirements',
          'toolInstructions',
          'autonomousOperation',
          'phaseLifecycle',
          'specializationGuidance',
          'sessionInfo'
        ];
      
      case 'conversation':
        return [
          'header',
          'context',
          'capabilities',
          'autonomousOperation',
          'toolInstructions',
          'sessionInfo'
        ];
      
      case 'child_agent':
        return [
          'header',
          'task',
          'context',
          'capabilities',
          'compilationRequirements',
          'specializationGuidance',
          'toolInstructions',
          'autonomousOperation',
          'sessionInfo'
        ];
      
      case 'error_recovery':
        return [
          'header',
          'task',
          'context',
          'toolInstructions',
          'autonomousOperation',
          'sessionInfo'
        ];
      
      default:
        return [
          'header',
          'context',
          'toolInstructions',
          'sessionInfo'
        ];
    }
  }

  /**
   * Format compilation errors for display
   */
  private formatCompilationErrors(errors: CompilationError[]): string {
    return errors.map((error, index) => {
      const location = error.line > 0 ? ` (${error.file}:${error.line}${error.column ? ':' + error.column : ''})` : ` (${error.file})`;
      return `${index + 1}. [${error.type.toUpperCase()}]${location}: ${error.message}`;
    }).join('\n');
  }

  /**
   * Get rendered prompt statistics
   */
  getPromptStatistics(prompt: string): {
    totalLength: number;
    lineCount: number;
    wordCount: number;
    sectionCount: number;
    estimatedTokens: number;
  } {
    const lines = prompt.split('\n');
    const words = prompt.split(/\s+/).filter(word => word.length > 0);
    const sections = prompt.split(/\n\n/).filter(section => section.trim().length > 0);
    
    return {
      totalLength: prompt.length,
      lineCount: lines.length,
      wordCount: words.length,
      sectionCount: sections.length,
      estimatedTokens: Math.ceil(prompt.length / 4) // Rough token estimate
    };
  }
}
