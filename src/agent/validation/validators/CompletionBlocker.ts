/**
 * CompletionBlocker - Prevents agent completion when code doesn't compile
 * CRITICAL: This enforces the compilation requirement before allowing task completion
 * 
 * This validator is called by ReportCompleteTool to ensure no agent can complete
 * a task without having compilable code.
 */

import { CompilationValidator } from '../CompilationValidator.js';
import { ValidationEngine } from '../ValidationEngine.js';
import {
  CompletionValidationResult,
  ValidationIssue,
  CompilationResult,
  ValidationResult
} from '../types.js';
import chalk from 'chalk';

export class CompletionBlocker {
  private compilationValidator: CompilationValidator;
  private validationEngine: ValidationEngine;
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug || false;
    this.compilationValidator = new CompilationValidator({ 
      silentMode: true, 
      debug: this.debug ,
    });
    this.validationEngine = new ValidationEngine({ 
      silentMode: true,
      enableAutoFix: false // Don't auto-fix during completion validation,
    });
  }

  /**
   * CRITICAL: Validate if agent can complete the task
   * This MUST return canComplete: true before any agent reports completion
   */
  async validateCompletion(
    projectPath: string,
    options: {
      originalVision?: string;
      specialization?: string;
      sessionId?: string;
    } = {}
  ): Promise<CompletionValidationResult> {
    this.debugLog('COMPLETION_VALIDATION_START', 'Starting completion validation', {
      projectPath,
      specialization: options.specialization,
    });

    const result: CompletionValidationResult = {
      canComplete: false,
      blockers: [],
      warnings: [],
      recommendations: [],
      compilationResult: {
        success: false,
        errors: [],
        warnings: [],
        summary: 'Not validated',
        executionTime: 0,
        validationSteps: [],
      },
      summary: 'Completion validation not completed',
    };

    try {
      // STEP 1: CRITICAL - Check compilation
      this.debugLog('COMPILATION_CHECK', 'Performing compilation validation');
      const compilationResult = await this.compilationValidator.validateCompilation(projectPath);
      result.compilationResult = compilationResult;

      // CRITICAL: If compilation fails, block completion immediately
      if (!compilationResult.success) {
        result.blockers.push(...compilationResult.errors);
        result.canComplete = false;
        result.summary = `COMPLETION BLOCKED: Code does not compile (${compilationResult.errors.length} errors)`;
        
        this.debugLog('COMPILATION_BLOCKED', 'Completion blocked due to compilation errors', {
          errorCount: compilationResult.errors.length,
        });
        
        return result;
      }

      // STEP 2: Run comprehensive validation
      this.debugLog('COMPREHENSIVE_VALIDATION', 'Running comprehensive project validation');
      const validationResult = await this.validationEngine.validateProject(projectPath, {
        categories: ['syntax', 'style', 'tests'],
        fixIssues: false, // Don't fix during completion check
        silentMode: true,
      });

      // Check for critical validation issues that should block completion
      const criticalIssues = validationResult.issues.filter(
        issue => issue.severity === 'critical'
      );

      const highIssues = validationResult.issues.filter(
        issue => issue.severity === 'high'
      );

      // CRITICAL: Block completion if there are critical issues
      if (criticalIssues.length > 0) {
        result.blockers.push(...criticalIssues);
        result.canComplete = false;
        result.summary = `COMPLETION BLOCKED: ${criticalIssues.length} critical validation issues`;
        
        this.debugLog('CRITICAL_ISSUES_BLOCKED', 'Completion blocked due to critical issues', {
          criticalCount: criticalIssues.length,
        });
        
        return result;
      }

      // Add high-severity issues as warnings (don't block, but warn)
      if (highIssues.length > 0) {
        result.warnings.push(...highIssues);
        result.recommendations.push(`Consider fixing ${highIssues.length} high-severity issues`);
      }

      // STEP 3: Additional checks based on specialization
      const specializationChecks = await this.performSpecializationChecks(
        projectPath, 
        options.specialization || 'general'
      );

      result.blockers.push(...specializationChecks.blockers);
      result.warnings.push(...specializationChecks.warnings);
      result.recommendations.push(...specializationChecks.recommendations);

      // STEP 4: Final determination
      result.canComplete = result.blockers.length === 0;
      
      if (result.canComplete) {
        result.summary = `Completion validation passed - agent can complete task`;
        if (result.warnings.length > 0) {
          result.summary += ` (${result.warnings.length} warnings)`;
        }
        
        this.debugLog('COMPLETION_APPROVED', 'Agent completion approved', {
          warningCount: result.warnings.length,
          recommendationCount: result.recommendations.length,
        });
      } else {
        result.summary = `COMPLETION BLOCKED: ${result.blockers.length} blocking issues must be resolved`;
        
        this.debugLog('COMPLETION_BLOCKED', 'Agent completion blocked', {
          blockerCount: result.blockers.length,
        });
      }

      return result;

    } catch (error: any) {
      this.debugLog('COMPLETION_VALIDATION_ERROR', 'Completion validation failed', {
        error: error.message,
      });
      
      result.blockers.push({
        type: 'completion_validation_error',
        severity: 'critical',
        message: `Completion validation failed: ${error.message}`,
        file: '',
        line: 0,
        autoFixable: false,
      });
      
      result.canComplete = false;
      result.summary = 'Completion validation threw an exception';
      
      return result;
    }
  }

  /**
   * Perform specialization-specific completion checks
   */
  private async performSpecializationChecks(
    projectPath: string,
    specialization: string,
  ): Promise<{
    blockers: ValidationIssue[];
    warnings: ValidationIssue[];
    recommendations: string[];
  }> {
    const blockers: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const recommendations: string[] = [];

    switch (specialization) {
      case 'frontend':
        // Frontend-specific checks
        recommendations.push('Ensure UI components render correctly');
        recommendations.push('Verify responsive design and accessibility');
        break;
        
      case 'backend':
        // Backend-specific checks 
        recommendations.push('Verify API endpoints respond correctly');
        recommendations.push('Check authentication and error handling');
        break;
        
      case 'database':
        // Database-specific checks
        recommendations.push('Verify database schema is valid');
        recommendations.push('Test all database migrations');
        break;
        
      case 'testing':
        // Testing-specific checks
        try {
          // Could run actual tests here
          recommendations.push('Ensure all test suites pass');
          recommendations.push('Verify test coverage meets requirements');
        } catch (testError: any) {
          warnings.push({
            type: 'test_execution_warning',
            severity: 'high',
            message: `Test execution concern: ${testError.message}`,
            file: '',
            line: 0,
            autoFixable: false,
          });
        }
        break;
        
      case 'security':
        // Security-specific checks
        recommendations.push('Verify no security vulnerabilities introduced');
        recommendations.push('Check authentication and authorization');
        break;
        
      case 'devops':
        // DevOps-specific checks
        recommendations.push('Verify deployment configurations are valid');
        recommendations.push('Check CI/CD pipeline compatibility');
        break;
        
      case 'general':
      default:
        // General checks
        recommendations.push('Ensure overall system coherence');
        recommendations.push('Verify integration between components');
        break;
    }

    return { blockers, warnings, recommendations };
  }

  /**
   * Generate completion blocker report
   */
  generateBlockerReport(result: CompletionValidationResult): string {
    const lines = [];
    
    lines.push('🚫 COMPLETION BLOCKED - CODE COMPILATION FAILED');
    lines.push('=' .repeat(60));
    
    if (!result.compilationResult.success) {
      lines.push('\n📋 COMPILATION ERRORS:');
      result.compilationResult.errors.forEach((error, index) => {
        const location = error.file ? ` (${error.file}:${error.line})` : '';
        lines.push(`  ${index + 1}. ${error.message}${location}`);
      });
    }
    
    if (result.blockers.length > 0) {
      lines.push('\n🔴 BLOCKING ISSUES:');
      result.blockers.forEach((blocker, index) => {
        const location = blocker.file ? ` (${blocker.file}:${blocker.line})` : '';
        lines.push(`  ${index + 1}. [${blocker.severity.toUpperCase()}] ${blocker.message}${location}`);
      });
    }
    
    lines.push('\n🔧 REQUIRED ACTIONS:');
    lines.push('  1. Fix all compilation errors listed above');
    lines.push('  2. Use validate_project tool to verify fixes');
    lines.push('  3. Only report completion when validation passes');
    
    if (result.recommendations.length > 0) {
      lines.push('\n💡 RECOMMENDATIONS:');
      result.recommendations.forEach((rec, index) => {
        lines.push(`  ${index + 1}. ${rec}`);
      });
    }
    
    lines.push('\n' + '='.repeat(60));
    lines.push('❌ TASK CANNOT BE MARKED COMPLETE UNTIL ALL ISSUES ARE RESOLVED');
    
    return lines.join('\n');
  }

  /**
   * Generate success report
   */
  generateSuccessReport(result: CompletionValidationResult): string {
    const lines = [];
    
    lines.push('✅ COMPLETION VALIDATION PASSED');
    lines.push('=' .repeat(40));
    
    lines.push(`\n✓ Compilation: SUCCESS`);
    lines.push(`✓ Validation Steps: ${result.compilationResult.validationSteps.length}`);

    if (result.warnings.length > 0) {
      lines.push(`\n⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.slice(0, 3).forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning.message}`);
      });
      if (result.warnings.length > 3) {
        lines.push(`  ... and ${result.warnings.length - 3} more warnings`);
      }
    }
    
    lines.push('\n🎉 TASK CAN BE MARKED AS COMPLETE');
    
    return lines.join('\n');
  }

  /**
   * Debug logging helper
   */
  private debugLog(category: string, message: string, data?: any): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] [${category}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] [${category}] ${message}`);
      }
    }
  }
}
