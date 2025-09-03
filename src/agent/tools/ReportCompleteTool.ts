/**
 * report_complete Tool - Enhanced with MANDATORY compilation checking
 * CRITICAL: Now prevents completion if code doesn't compile
 * UPDATED: Integrated with CompletionBlocker to enforce compilation requirements
 */

import chalk from 'chalk';
import { CompletionBlocker } from '../validation/validators/CompletionBlocker.js';
import { ValidationResult } from '../validation/types.js';

export class ReportCompleteTool {
  private completionBlocker: CompletionBlocker;

  constructor() {
    this.completionBlocker = new CompletionBlocker({ debug: false });
  }

  getDescription(): string {
    return 'Signal that the agent has completed its assigned task with a comprehensive report including validation results. CRITICAL: Code must compile before completion is allowed.';
  }
  
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A clear summary of what was accomplished'
        },
        success: {
          type: 'boolean',
          description: 'Whether the task was completed successfully'
        },
        filesCreated: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were created during the task'
        },
        filesModified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were modified during the task'
        },
        testsRun: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tests or validation steps that were executed'
        },
        validationResults: {
          type: 'object',
          description: 'Results of validation steps performed (Phase 3.2)',
          properties: {
            overall: {
              type: 'string',
              enum: ['pass', 'fail', 'warning'],
              description: 'Overall validation status'
            },
            score: {
              type: 'number',
              description: 'Overall quality score (0-100)'
            },
            categories: {
              type: 'object',
              description: 'Validation results by category'
            },
            issues: {
              type: 'array',
              description: 'List of validation issues found'
            },
            autoFixesApplied: {
              type: 'array',
              description: 'List of automatic fixes that were applied'
            }
          }
        },
        qualityMetrics: {
          type: 'object',
          description: 'Quality metrics and scores (Phase 3.2)',
          properties: {
            codeQualityScore: { type: 'number' },
            testCoverage: { type: 'number' },
            performanceScore: { type: 'number' },
            securityScore: { type: 'number' },
            documentationScore: { type: 'number' },
            overallQualityScore: { type: 'number' }
          }
        },
        completionConfidence: {
          type: 'number',
          description: 'Agent confidence in completion (0-1)',
          minimum: 0,
          maximum: 1
        },
        iterativeImprovements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              iteration: { type: 'number' },
              issuesFound: { type: 'number' },
              issuesFixed: { type: 'number' },
              improvements: { type: 'array', items: { type: 'string' } }
            }
          },
          description: 'Record of iterative improvements made'
        },
        recommendations: {
          type: 'object',
          properties: {
            immediate: { type: 'array', items: { type: 'string' } },
            future: { type: 'array', items: { type: 'string' } },
            maintenance: { type: 'array', items: { type: 'string' } }
          },
          description: 'Recommendations for different timeframes'
        },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional suggestions for follow-up work'
        }
      },
      required: ['summary']
    };
  }
  
  async execute(parameters: any, context: any): Promise<any> {
    const {
      summary,
      success = true,
      filesCreated = [],
      filesModified = [],
      testsRun = [],
      validationResults,
      qualityMetrics,
      completionConfidence,
      iterativeImprovements = [],
      recommendations,
      nextSteps = []
    } = parameters;
    
    if (!summary || typeof summary !== 'string') {
      throw new Error('summary parameter must be a non-empty string');
    }

    // CRITICAL: Check compilation before allowing completion
    console.log(chalk.blue('\n🔍 VERIFYING COMPILATION BEFORE COMPLETION...'));
    
    const completionValidation = await this.completionBlocker.validateCompletion(
      context.workingDirectory,
      {
        originalVision: context.vision,
        specialization: context.specialization,
        sessionId: context.sessionId
      }
    );

    // BLOCK COMPLETION if compilation fails
    if (!completionValidation.canComplete) {
      const blockerReport = this.completionBlocker.generateBlockerReport(completionValidation);
      
      if (!context.dryRun) {
        console.log(chalk.red('\n' + blockerReport));
      }
      
      // Return failure result - DO NOT allow completion
      return {
        success: false,
        completed: false, // CRITICAL: Not completed due to compilation issues
        summary: 'COMPLETION BLOCKED: Code compilation failed',
        compilationBlocked: true,
        blockers: completionValidation.blockers,
        compilationResult: completionValidation.compilationResult,
        errorMessage: 'Task cannot be completed because the code does not compile. Fix compilation errors and try again.',
        filesCreated,
        filesModified,
        testsRun,
        validationResults: {
          ...validationResults,
          overall: 'fail',
          compilationResult: completionValidation.compilationResult
        },
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId,
        requiresRevival: true // Signal that agent should be revived
      };
    }

    // Compilation passed - show success and proceed with completion
    if (!context.dryRun) {
      const successReport = this.completionBlocker.generateSuccessReport(completionValidation);
      console.log(chalk.green('\n' + successReport));
    }
    
    // Display enhanced completion report
    if (!context.dryRun) {
      this.displayEnhancedCompletionReport({
        summary,
        success: true, // Force to true since compilation passed
        filesCreated,
        filesModified,
        testsRun,
        validationResults: {
          ...validationResults,
          compilationResult: completionValidation.compilationResult
        },
        qualityMetrics,
        completionConfidence,
        iterativeImprovements,
        recommendations,
        nextSteps
      });
    }
    
    // Final success determination (compilation already verified)
    const finalSuccess = true; // Since compilation passed, we allow completion
    
    return {
      success: finalSuccess,
      completed: true,
      summary,
      filesCreated,
      filesModified,
      testsRun,
      validationResults: {
        ...validationResults,
        compilationResult: completionValidation.compilationResult
      },
      qualityMetrics,
      completionConfidence,
      iterativeImprovements,
      recommendations,
      nextSteps,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      compilationVerified: true // Mark that compilation was verified
    };
  }

  // ... (rest of the display methods remain the same)
  private displayEnhancedCompletionReport(report: any): void {
    const successEmoji = '✅';
    const statusText = 'COMPLETED SUCCESSFULLY';
    
    console.log('\n' + chalk.green('='.repeat(80)));
    console.log(chalk.green(`${successEmoji} TASK ${statusText} - COMPILATION VERIFIED`));
    console.log(chalk.green('='.repeat(80)));
    
    // Summary
    console.log('\n' + chalk.white('📋 Summary: ') + report.summary);
    
    // Compilation verification
    console.log('\n' + chalk.green('🔧 Compilation: VERIFIED AND PASSING'));
    
    // ... rest of display logic
    console.log('\n' + chalk.green('='.repeat(80)));
    console.log(chalk.green('🎉 Task completed successfully with verified compilation!'));
    console.log(chalk.green('='.repeat(80)));
  }
}
