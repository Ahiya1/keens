/**
 * PromptValidator - Ensures prompt quality and completeness
 * Validates that prompts contain all necessary components for reliable agent operation
 * FIXED: Resolved duplicate method implementations
 */

import {
  PromptConfiguration,
  SystemPromptComponents,
  ValidationResult,
  PromptType
} from './types.js';

export class PromptValidator {
  /**
   * Validate assembled prompt components
   */
  validatePrompt(
    components: SystemPromptComponents, 
    config: PromptConfiguration
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const missingComponents: string[] = [];

    // Check required components based on prompt type
    const requiredComponents = this.getRequiredComponents(config.type);
    
    for (const component of requiredComponents) {
      if (!components[component] || components[component].trim().length === 0) {
        missingComponents.push(component);
        errors.push(`Missing required component: ${component}`);
      }
    }

    // Validate component content
    this.validateComponentContent(components, errors, warnings, recommendations);

    // Validate configuration consistency
    this.validateConfigurationConsistency(config, errors, warnings);

    // Calculate score
    const score = this.calculateValidationScore(
      errors.length,
      warnings.length,
      missingComponents.length,
      Object.keys(components).length
    );

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      missingComponents,
      score
    };
  }

  /**
   * Validate prompt configuration (standalone method)
   */
  validateConfiguration(config: PromptConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Required context validation
    if (!config.context.vision || config.context.vision.trim().length === 0) {
      errors.push('Vision/task description is required');
    }

    if (!config.context.workingDirectory) {
      errors.push('Working directory is required');
    }

    if (!config.context.sessionId) {
      errors.push('Session ID is required');
    }

    // Specialization validation
    const validSpecializations = ['frontend', 'backend', 'database', 'testing', 'security', 'devops', 'general'];
    if (!validSpecializations.includes(config.specialization)) {
      errors.push(`Invalid specialization: ${config.specialization}`);
    }

    // Phase validation - UPDATED: Include all valid phases
    const validPhases = ['EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'];
    if (!validPhases.includes(config.phase)) {
      errors.push(`Invalid phase: ${config.phase}`);
    }

    // Type-specific validation
    if (config.type === 'child_agent' && !config.context.parentSessionId) {
      errors.push('Child agent requires parent session ID');
    }

    if (config.type === 'error_recovery' && (!config.errors || config.errors.length === 0)) {
      errors.push('Error recovery prompt requires error list');
    }

    // Warning for missing optional but recommended context
    if (config.type === 'system' && !config.context.userContext) {
      warnings.push('User context not provided - some features may be limited');
    }

    if (!config.context.availableTools || config.context.availableTools.length === 0) {
      warnings.push('No available tools specified - agent may be limited');
    }

    // Recommendations
    if (config.context.vision && config.context.vision.length < 50) {
      recommendations.push('Consider providing a more detailed vision/task description');
    }

    if (config.specialization === 'general' && config.type === 'child_agent') {
      recommendations.push('Consider using a more specific specialization for child agents');
    }

    const score = this.calculateValidationScore(errors.length, warnings.length, 0, 1);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      missingComponents: [],
      score
    };
  }

  /**
   * Get required components for each prompt type
   */
  private getRequiredComponents(type: PromptType): (keyof SystemPromptComponents)[] {
    switch (type) {
      case 'system':
        return ['header', 'toolInstructions', 'autonomousOperation', 'sessionInfo'];
      
      case 'conversation':
        return ['header', 'autonomousOperation', 'toolInstructions', 'sessionInfo'];
      
      case 'child_agent':
        return ['header', 'task', 'toolInstructions', 'autonomousOperation', 'sessionInfo'];
      
      case 'error_recovery':
        return ['header', 'task', 'context', 'autonomousOperation', 'sessionInfo'];
      
      default:
        return ['header', 'sessionInfo'];
    }
  }

  /**
   * Validate individual component content
   */
  private validateComponentContent(
    components: SystemPromptComponents,
    errors: string[],
    warnings: string[],
    recommendations: string[]
  ): void {
    // Check header content
    if (components.header) {
      if (!components.header.includes('autonomous') && !components.header.includes('conversation')) {
        warnings.push('Header should clearly identify the agent type');
      }
      
      if (!components.header.includes('{{') && !components.header.includes('TASK:')) {
        warnings.push('Header should include task information or template variables');
      }
    }

    // Check tool instructions
    if (components.toolInstructions) {
      if (!components.toolInstructions.includes('write_files')) {
        warnings.push('Tool instructions should include write_files format requirements');
      }
      
      if (!components.toolInstructions.includes('"files"')) {
        recommendations.push('Consider including specific format examples in tool instructions');
      }
    }

    // Check compilation requirements
    if (components.compilationRequirements) {
      if (!components.compilationRequirements.includes('MUST compile')) {
        warnings.push('Compilation requirements should emphasize mandatory nature');
      }
      
      if (!components.compilationRequirements.includes('validate_project')) {
        recommendations.push('Compilation requirements should mention validation tools');
      }
    }

    // Check autonomous operation protocol
    if (components.autonomousOperation) {
      if (!components.autonomousOperation.includes('report_complete')) {
        warnings.push('Autonomous protocol should mention completion reporting');
      }
      
      if (!components.autonomousOperation.includes('tools')) {
        warnings.push('Autonomous protocol should emphasize tool usage');
      }
    }

    // Check session info
    if (components.sessionInfo) {
      if (!components.sessionInfo.includes('Session ID') && !components.sessionInfo.includes('{{sessionId}}')) {
        warnings.push('Session info should include session identifier');
      }
    }

    // Check for proper template variable usage
    for (const [componentName, content] of Object.entries(components)) {
      if (content && content.includes('{{') && !content.includes('}}')) {
        errors.push(`Malformed template variable in ${componentName}`);
      }
      
      if (content && content.includes('undefined') || content?.includes('null')) {
        errors.push(`Invalid content in ${componentName}: contains undefined/null values`);
      }
    }
  }

  /**
   * Validate configuration consistency (private helper for validatePrompt)
   */
  private validateConfigurationConsistency(
    config: PromptConfiguration,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for conflicting options
    if (config.type === 'conversation' && config.includeRecursiveSpawning) {
      warnings.push('Recursive spawning is typically not used in conversation mode');
    }

    if (config.type === 'error_recovery' && !config.includeCompilationChecking) {
      errors.push('Error recovery prompts must include compilation checking');
    }

    if (config.specialization === 'general' && config.type === 'child_agent') {
      warnings.push('General specialization may not be optimal for child agents');
    }

    // Check context consistency
    if (config.context.parentSessionId && config.type !== 'child_agent') {
      warnings.push('Parent session ID provided but prompt type is not child_agent');
    }

    if (config.includeRecursiveSpawning && !config.context.hasRecursiveSpawning) {
      warnings.push('Recursive spawning included but context indicates it\'s not available');
    }
  }

  /**
   * Calculate validation score (0-100)
   */
  private calculateValidationScore(
    errorCount: number,
    warningCount: number,
    missingCount: number,
    componentCount: number
  ): number {
    let score = 100;
    
    // Deduct for errors (critical)
    score -= errorCount * 25;
    
    // Deduct for warnings (moderate)
    score -= warningCount * 10;
    
    // Deduct for missing components (severe)
    score -= missingCount * 20;
    
    // Bonus for having more components (completeness)
    score += Math.min(componentCount * 2, 20);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get validation summary for debugging
   */
  getValidationSummary(result: ValidationResult): string {
    const lines = [];
    
    lines.push(`Validation Score: ${result.score}/100`);
    lines.push(`Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
    
    if (result.errors.length > 0) {
      lines.push(`\nErrors (${result.errors.length}):`);
      result.errors.forEach(error => lines.push(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      lines.push(`\nWarnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => lines.push(`  - ${warning}`));
    }
    
    if (result.recommendations.length > 0) {
      lines.push(`\nRecommendations (${result.recommendations.length}):`);
      result.recommendations.forEach(rec => lines.push(`  - ${rec}`));
    }
    
    return lines.join('\n');
  }
}
