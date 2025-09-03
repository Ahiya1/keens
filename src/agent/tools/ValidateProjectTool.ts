/**
 * validate_project Tool - Phase 3.2
 * Execute comprehensive project validation and quality checks
 */

import { ValidationEngine } from '../validation/ValidationEngine.js';
import { ValidationOptions, ValidationResult } from '../validation/types.js';
import chalk from 'chalk';

export class ValidateProjectTool {
  private validationEngine: ValidationEngine;
  
  constructor() {
    this.validationEngine = new ValidationEngine({
      enableAutoFix: true,
      qualityThreshold: 0.8
    });
  }
  
  getDescription(): string {
    return 'Execute comprehensive project validation and quality checks';
  }
  
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        validationType: {
          type: 'string',
          enum: ['full', 'incremental', 'quick'],
          description: 'Type of validation to perform (default: full)',
          default: 'full'
        },
        scope: {
          type: 'array',
          items: { type: 'string' },
          description: 'File patterns to validate (default: all project files)'
        },
        categories: {
          type: 'array',
          items: { 
            type: 'string',
            enum: ['syntax', 'style', 'tests', 'security', 'performance', 'documentation']
          },
          description: 'Validation categories to include (default: all)'
        },
        fixIssues: {
          type: 'boolean',
          description: 'Attempt automatic fixes for identified issues (default: true)',
          default: true
        },
        silentMode: {
          type: 'boolean',
          description: 'Run tests and validations in silent mode (default: true)',
          default: true
        }
      },
      required: []
    };
  }
  
  async execute(parameters: any, context: any): Promise<ValidationResult> {
    const {
      validationType = 'full',
      scope = [],
      categories = ['syntax', 'style', 'tests', 'security', 'performance', 'documentation'],
      fixIssues = true,
      silentMode = true
    } = parameters;
    
    const projectPath = context.workingDirectory || process.cwd();
    
    if (context.verbose) {
      console.log(chalk.blue('🔍 Starting project validation...'));
      console.log(chalk.gray(`   Type: ${validationType}`));
      console.log(chalk.gray(`   Categories: ${categories.join(', ')}`));
      console.log(chalk.gray(`   Auto-fix: ${fixIssues ? 'enabled' : 'disabled'}`));
      console.log(chalk.gray(`   Silent mode: ${silentMode ? 'enabled' : 'disabled'}`));
    }
    
    try {
      const validationOptions: ValidationOptions = {
        validationType,
        scope,
        categories,
        fixIssues,
        silentMode,
        projectPath
      };
      
      // Execute validation
      const result = await this.validationEngine.validateProject(projectPath, validationOptions);
      
      // Display results
      if (!context.dryRun) {
        this.displayValidationResults(result);
      }
      
      return result;
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Validation failed: ${error.message}`));
      return {
        overall: 'fail',
        score: 0,
        categories: {},
        issues: [{
          type: 'validation_error',
          severity: 'critical',
          message: error.message,
          file: '',
          line: 0,
          autoFixable: false
        }],
        suggestions: ['Check project structure and try again'],
        autoFixApplied: [],
        executionTime: 0
      };
    }
  }
  
  /**
   * Display validation results in a formatted way
   */
  private displayValidationResults(result: ValidationResult): void {
    const scoreColor = result.score >= 80 ? chalk.green : result.score >= 60 ? chalk.yellow : chalk.red;
    const overallEmoji = result.overall === 'pass' ? '✅' : result.overall === 'warning' ? '⚠️' : '❌';
    
    console.log('\n' + chalk.bold('🔍 VALIDATION RESULTS'));
    console.log('='.repeat(40));
    
    // Overall status
    console.log(`${overallEmoji} Overall Status: ${result.overall.toUpperCase()}`);
    console.log(scoreColor(`📊 Quality Score: ${result.score}/100`));
    
    // Category results
    if (Object.keys(result.categories).length > 0) {
      console.log('\n📋 Category Results:');
      for (const [category, categoryResult] of Object.entries(result.categories)) {
        const categoryEmoji = categoryResult.passed ? '✅' : '❌';
        const categoryScore = categoryResult.score?.toFixed(1) || 'N/A';
        console.log(`   ${categoryEmoji} ${category}: ${categoryScore}/100 (${categoryResult.issues.length} issues)`);
      }
    }
    
    // Issues summary
    if (result.issues.length > 0) {
      console.log(`\n⚠️  Issues Found: ${result.issues.length}`);
      
      // Group issues by severity
      const issuesBySeverity = result.issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [severity, count] of Object.entries(issuesBySeverity)) {
        const severityColor = severity === 'critical' ? chalk.red : 
                              severity === 'high' ? chalk.red :
                              severity === 'medium' ? chalk.yellow : chalk.gray;
        console.log(`   ${severityColor(`${severity}: ${count}`)}`);
      }
      
      // Show first few issues
      const displayIssues = result.issues.slice(0, 5);
      console.log('\n📝 Top Issues:');
      displayIssues.forEach((issue, index) => {
        const issueColor = issue.severity === 'critical' ? chalk.red :
                          issue.severity === 'high' ? chalk.red :
                          issue.severity === 'medium' ? chalk.yellow : chalk.gray;
        console.log(issueColor(`   ${index + 1}. [${issue.type}] ${issue.message}`));
        if (issue.file) {
          console.log(chalk.gray(`      📁 ${issue.file}${issue.line > 0 ? `:${issue.line}` : ''}`));
        }
      });
      
      if (result.issues.length > 5) {
        console.log(chalk.gray(`   ... and ${result.issues.length - 5} more issues`));
      }
    }
    
    // Auto-fixes applied
    if (result.autoFixApplied.length > 0) {
      console.log(`\n🔧 Auto-fixes Applied: ${result.autoFixApplied.length}`);
      result.autoFixApplied.slice(0, 3).forEach((fix, index) => {
        console.log(chalk.green(`   ${index + 1}. Fixed ${fix.issueType} in ${fix.file}`));
      });
      if (result.autoFixApplied.length > 3) {
        console.log(chalk.gray(`   ... and ${result.autoFixApplied.length - 3} more fixes`));
      }
    }
    
    // Suggestions
    if (result.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      result.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(chalk.blue(`   ${index + 1}. ${suggestion}`));
      });
    }
    
    console.log(`\n⏱️  Execution Time: ${result.executionTime}ms`);
    console.log('='.repeat(40));
  }
}
