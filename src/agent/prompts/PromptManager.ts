/**
 * PromptManager - Core orchestrator for the modular prompt system
 * Replaces hardcoded prompt building with flexible, maintainable architecture
 *
 * Features:
 * - Modular prompt components
 * - Template-based system
 * - Validation and versioning
 * - Specialization-specific prompts
 * - Easy customization without touching core code
 */

import { PromptBuilder } from './PromptBuilder.js';
import { PromptTemplates } from './PromptTemplates.js';
import { PromptValidator } from './PromptValidator.js';
import { PromptRenderer } from './PromptRenderer.js';
import {
  AgentSpecialization,
  AgentPhase,
  PromptType,
  PromptContext,
  PromptConfiguration,
  SystemPromptComponents,
  ValidationResult as PromptValidationResult
} from './types.js';
import { UserContext } from '../../database/DatabaseManager.js';
import chalk from 'chalk';

export class PromptManager {
  private templates: PromptTemplates;
  private builder: PromptBuilder;
  private validator: PromptValidator;
  private renderer: PromptRenderer;
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug || false;
    this.templates = new PromptTemplates();
    this.builder = new PromptBuilder(this.templates);
    this.validator = new PromptValidator();
    this.renderer = new PromptRenderer();

    this.debugLog('INIT', 'PromptManager initialized');
  }

  /**
   * Build a system prompt for an autonomous agent
   */
  buildSystemPrompt(config: PromptConfiguration): string {
    this.debugLog('BUILD_SYSTEM', 'Building system prompt', {
      type: config.type,
      specialization: config.specialization,
      phase: config.phase,
    });

    try {
      // Build prompt components
      const components = this.builder.buildSystemPrompt(config);

      // Validate completeness
      const validation = this.validator.validatePrompt(components, config);
      if (!validation.isValid) {
        throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
      }

      // Render final prompt
      const prompt = this.renderer.renderSystemPrompt(components, config.context);

      this.debugLog('BUILD_SUCCESS', 'System prompt built successfully', {
        length: prompt.length,
        componentsUsed: Object.keys(components).filter(key => components[key as keyof SystemPromptComponents]).length,
        validationScore: validation.score,
      });

      return prompt;
    } catch (error) {
      this.debugLog('BUILD_ERROR', 'Failed to build system prompt', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Build a conversation prompt
   */
  buildConversationPrompt(config: PromptConfiguration): string {
    this.debugLog('BUILD_CONV', 'Building conversation prompt', {
      hasUserContext: !!config.context.userContext,
    });

    try {
      const components = this.builder.buildConversationPrompt(config);
      const validation = this.validator.validatePrompt(components, config);

      if (!validation.isValid) {
        throw new Error(`Conversation prompt validation failed: ${validation.errors.join(', ')}`);
      }

      const prompt = this.renderer.renderConversationPrompt(components, config.context);

      this.debugLog('CONV_SUCCESS', 'Conversation prompt built successfully', {
        length: prompt.length,
        validationScore: validation.score,
      });

      return prompt;
    } catch (error) {
      this.debugLog('CONV_ERROR', 'Failed to build conversation prompt', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Build a specialized prompt for child agents
   */
  buildChildAgentPrompt(config: PromptConfiguration): string {
    this.debugLog('BUILD_CHILD', 'Building child agent prompt', {
      specialization: config.specialization,
      parentSessionId: config.context.parentSessionId,
    });

    try {
      const components = this.builder.buildChildAgentPrompt(config);
      const validation = this.validator.validatePrompt(components, config);

      if (!validation.isValid) {
        throw new Error(`Child agent prompt validation failed: ${validation.errors.join(', ')}`);
      }

      const prompt = this.renderer.renderChildAgentPrompt(components, config.context);

      this.debugLog('CHILD_SUCCESS', 'Child agent prompt built successfully', {
        length: prompt.length,
        specialization: config.specialization,
        validationScore: validation.score,
      });

      return prompt;
    } catch (error) {
      this.debugLog('CHILD_ERROR', 'Failed to build child agent prompt', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Build error recovery prompt (for compilation failures)
   */
  buildErrorRecoveryPrompt(config: PromptConfiguration & {
    errors: string[];
    previousAttempt?: string;
  }): string {
    this.debugLog('BUILD_ERROR_RECOVERY', 'Building error recovery prompt', {
      errorCount: config.errors.length,
      hasPreviousAttempt: !!config.previousAttempt,
    });

    try {
      const components = this.builder.buildErrorRecoveryPrompt(config);
      const validation = this.validator.validatePrompt(components, config);

      if (!validation.isValid) {
        throw new Error(`Error recovery prompt validation failed: ${validation.errors.join(', ')}`);
      }

      const prompt = this.renderer.renderErrorRecoveryPrompt(components, {
        ...config.context,
        errors: config.errors,
        previousAttempt: config.previousAttempt,
      });

      this.debugLog('ERROR_RECOVERY_SUCCESS', 'Error recovery prompt built successfully', {
        length: prompt.length,
        validationScore: validation.score,
      });

      return prompt;
    } catch (error) {
      this.debugLog('ERROR_RECOVERY_ERROR', 'Failed to build error recovery prompt', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get available prompt templates for customization
   */
  getAvailableTemplates(): string[] {
    return this.templates.getTemplateNames();
  }

  /**
   * Customize a prompt template
   */
  customizeTemplate(templateName: string, customContent: string): void {
    this.debugLog('CUSTOMIZE', 'Customizing template', { templateName });
    this.templates.setCustomTemplate(templateName, customContent);
  }

  /**
   * Reset template to default
   */
  resetTemplate(templateName: string): void {
    this.debugLog('RESET', 'Resetting template to default', { templateName });
    this.templates.resetTemplate(templateName);
  }

  /**
   * Validate prompt configuration
   */
  validateConfiguration(config: PromptConfiguration): PromptValidationResult {
    return this.validator.validateConfiguration(config);
  }

  /**
   * Get prompt statistics
   */
  getPromptStats(prompt: string): {
    length: number;
    words: number;
    lines: number;
    sections: number;
    estimatedTokens: number;
  } {
    const lines = prompt.split('\n');
    const words = prompt.split(/\s+/).length;
    const sections = (prompt.match(/^[A-Z\s]{2,}:/gm) || []).length;
    const estimatedTokens = Math.ceil(prompt.length / 4); // Rough estimate

    return {
      length: prompt.length,
      words,
      lines: lines.length,
      sections,
      estimatedTokens
    };
  }

  /**
   * Debug logging helper
   */
  private debugLog(category: string, message: string, data?: any): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      // Use console.log with chalk for better production practicesif (data) {}
    }
  }
}

/**
 * Global prompt manager instance
 */
let globalPromptManager: PromptManager | null = null;

/**
 * Get or create global prompt manager
 */
export function getPromptManager(options?: { debug?: boolean }): PromptManager {
  if (!globalPromptManager) {
    globalPromptManager = new PromptManager(options);
  }
  return globalPromptManager;
}

/**
 * Reset global prompt manager (for testing)
 */
export function resetPromptManager(): void {
  globalPromptManager = null;
}
