/**
 * PromptBuilder - Assembles prompts from modular templates
 * Handles template selection, ordering, and component assembly
 */

import { PromptTemplates } from './PromptTemplates.js';
import {
  PromptConfiguration,
  SystemPromptComponents,
  AgentSpecialization,
  PromptType
} from './types.js';

export class PromptBuilder {
  private templates: PromptTemplates;

  constructor(templates: PromptTemplates) {
    this.templates = templates;
  }

  /**
   * Build system prompt components
   */
  buildSystemPrompt(config: PromptConfiguration): SystemPromptComponents {
    const components: SystemPromptComponents = {};

    // Core header (always required)
    components.header = this.templates.getTemplateContent('system_header');

    // Task context (from vision)
    components.task = config.context.vision;

    // User context (if authenticated)
    if (config.context.userContext) {
      components.context = this.templates.getTemplateContent('user_context');
    }

    // Capabilities based on configuration
    const capabilities = [];
    
    if (config.context.hasWebSearch) {
      capabilities.push(this.templates.getTemplateContent('web_search_capability'));
    }

    if (config.includeRecursiveSpawning && config.context.hasRecursiveSpawning) {
      capabilities.push(this.templates.getTemplateContent('recursive_spawning'));
    }

    if (capabilities.length > 0) {
      components.capabilities = capabilities.join('');
    }

    // Compilation requirements (critical)
    if (config.includeCompilationChecking !== false) {
      components.compilationRequirements = this.templates.getTemplateContent('compilation_requirements');
    }

    // Tool format instructions (critical)
    components.toolInstructions = this.templates.getTemplateContent('tool_format_critical');

    // Autonomous operation protocol
    components.autonomousOperation = this.templates.getTemplateContent('autonomous_protocol');

    // Phase lifecycle guidance
    if (config.includePhaseGuidance !== false) {
      components.phaseLifecycle = this.templates.getTemplateContent('phase_lifecycle');
    }

    // Specialization-specific guidance
    if (config.specialization !== 'general') {
      const specializationTemplate = `specialization_${config.specialization}`;
      components.specializationGuidance = this.templates.getTemplateContent(specializationTemplate);
    }

    // Available tools
    if (config.includeToolInstructions !== false && config.context.availableTools) {
      components.toolInstructions += this.templates.getTemplateContent('available_tools');
    }

    // Session information
    components.sessionInfo = this.templates.getTemplateContent('session_info');

    return components;
  }

  /**
   * Build conversation prompt components
   */
  buildConversationPrompt(config: PromptConfiguration): SystemPromptComponents {
    const components: SystemPromptComponents = {};

    // Conversation header
    components.header = this.templates.getTemplateContent('conversation_header');

    // User context if available
    if (config.context.userContext) {
      components.context = this.templates.getTemplateContent('user_context');
    }

    // Web search capability
    if (config.context.hasWebSearch) {
      components.capabilities = this.templates.getTemplateContent('web_search_capability');
    }

    // Database persistence information
    components.capabilities += this.buildDatabasePersistenceNote(config);

    // Cost tracking information
    components.capabilities += this.buildCostTrackingNote(config);

    // Conversation guidelines
    components.autonomousOperation = this.templates.getTemplateContent('conversation_guidelines');

    // Important limitations
    components.toolInstructions = this.templates.getTemplateContent('conversation_limitations');

    // Available read-only tools
    components.toolInstructions += this.templates.getTemplateContent('conversation_tools');

    // Session info
    components.sessionInfo = this.templates.getTemplateContent('session_info');

    return components;
  }

  /**
   * Build child agent prompt components
   */
  buildChildAgentPrompt(config: PromptConfiguration): SystemPromptComponents {
    const components: SystemPromptComponents = {};

    // Start with system prompt base
    const baseComponents = this.buildSystemPrompt(config);
    
    // Modify header for child agent
    components.header = baseComponents.header?.replace(
      'You are a keen autonomous development agent',
      `You are a specialized ${config.specialization} agent spawned as a child of ${config.context.parentSessionId}`
    );

    // Add child-specific context
    components.context = baseComponents.context;
    if (config.context.parentSessionId) {
      components.context += `\n\nCHILD AGENT CONTEXT:\n- Parent Session: ${config.context.parentSessionId}\n- Specialization: ${config.specialization}\n- Focus: Stay within your area of expertise\n- Report back: Use report_complete when your specialized task is done`;
    }

    // Keep all other components but emphasize specialization
    components.capabilities = baseComponents.capabilities;
    components.compilationRequirements = baseComponents.compilationRequirements;
    components.toolInstructions = baseComponents.toolInstructions;
    components.autonomousOperation = baseComponents.autonomousOperation;
    components.phaseLifecycle = baseComponents.phaseLifecycle;
    components.specializationGuidance = baseComponents.specializationGuidance;
    components.sessionInfo = baseComponents.sessionInfo;

    return components;
  }

  /**
   * Build error recovery prompt components
   */
  buildErrorRecoveryPrompt(config: PromptConfiguration & {
    errors: string[];
    previousAttempt?: string;
  }): SystemPromptComponents {
    const components: SystemPromptComponents = {};

    // Error recovery header (critical)
    components.header = this.templates.getTemplateContent('error_recovery_header');

    // Original task context
    components.task = `\n\nORIGINAL TASK: ${config.context.vision}`;

    // Compilation errors (formatted)
    const errorList = config.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    components.context = this.templates.getTemplateContent('compilation_errors');

    // Previous attempt context if available
    if (config.previousAttempt) {
      components.context += this.templates.getTemplateContent('previous_attempt_context');
    }

    // Critical tool format requirements
    components.toolInstructions = this.templates.getTemplateContent('tool_format_critical');

    // Error recovery instructions
    components.autonomousOperation = this.templates.getTemplateContent('error_recovery_instructions');

    // Available tools for fixing
    if (config.context.availableTools) {
      components.toolInstructions += this.templates.getTemplateContent('available_tools');
    }

    // Session info
    components.sessionInfo = this.templates.getTemplateContent('session_info');

    return components;
  }

  /**
   * Build database persistence note
   */
  private buildDatabasePersistenceNote(config: PromptConfiguration): string {
    if (!config.context.userContext) {
      return '\n\nFILE STORAGE: This conversation is using in-memory storage only. Session data will not be persisted beyond this session.';
    }

    return `\n\nDATABASE PERSISTENCE: This conversation is being persisted to PostgreSQL database (Session: ${config.context.sessionId.substring(0, 8)}...). All messages and context are automatically saved.`;
  }

  /**
   * Build cost tracking note
   */
  private buildCostTrackingNote(config: PromptConfiguration): string {
    return '\n\nCOST TRACKING: API costs are being monitored and will be displayed for each interaction.';
  }

  /**
   * Get component ordering for rendering
   */
  getComponentOrder(type: PromptType): (keyof SystemPromptComponents)[] {
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
          'task',
          'context',
          'capabilities',
          'toolInstructions',
          'autonomousOperation',
          'sessionInfo'
        ];
    }
  }
}
