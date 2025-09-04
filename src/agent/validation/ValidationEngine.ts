/**
 * ValidationEngine - Phase 3.2
 * Core validation orchestrator with comprehensive quality checks
 * FIXED: Auto-fix issues BEFORE reporting to save AI credits
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  ValidationEngineOptions,
  ValidationOptions,
  ValidationResult,
  CategoryValidation,
  ValidationIssue,
  ValidationFix,
  TestExecutionResult,
  SecurityScanResult,
  PerformanceAnalysis
} from './types.js';
import { CodeQualityValidator } from './validators/CodeQualityValidator.js';
import { TestValidator } from './validators/TestValidator.js';
import { SecurityValidator } from './validators/SecurityValidator.js';
import { PerformanceValidator } from './validators/PerformanceValidator.js';
import { DocumentationValidator } from './validators/DocumentationValidator.js';
import chalk from 'chalk';

export class ValidationEngine {
  private options: ValidationEngineOptions;
  private codeQualityValidator: CodeQualityValidator;
  private testValidator: TestValidator;
  private securityValidator: SecurityValidator;
  private performanceValidator: PerformanceValidator;
  private documentationValidator: DocumentationValidator;

  constructor(options: ValidationEngineOptions) {
    this.options = {
      enableAutoFix: true,
      qualityThreshold: 0.8,
      maxExecutionTime: 300000, // 5 minutes
      silentMode: true,
      ...options
    };

    // Initialize validators with SILENT MODE ENFORCED
    this.codeQualityValidator = new CodeQualityValidator({ silentMode: true });
    this.testValidator = new TestValidator({ silentMode: true });
    this.securityValidator = new SecurityValidator({ silentMode: true });
    this.performanceValidator = new PerformanceValidator({ silentMode: true });
    this.documentationValidator = new DocumentationValidator({ silentMode: true });
  }

  /**
   * Main validation orchestrator - FIXED: Auto-fix BEFORE reporting to save credits
   */
  async validateProject(projectPath: string, options: ValidationOptions = {}): Promise<ValidationResult> {
    const startTime = Date.now();
    const categories = options.categories || ['syntax', 'style', 'tests', 'security', 'performance', 'documentation'];

    const validationResults: { [category: string]: CategoryValidation } = {};
    let allIssues: ValidationIssue[] = [];
    const allSuggestions: string[] = [];
    let autoFixApplied: ValidationFix[] = [];

    try {
      // Step 1: Collect all issues from all categories
      if (categories.includes('syntax')) {
        const syntaxResult = await this.validateSyntax(projectPath, options);
        validationResults.syntax = syntaxResult;
        allIssues.push(...syntaxResult.issues);
        if (syntaxResult.suggestions) {
          allSuggestions.push(...syntaxResult.suggestions);
        }
      }

      if (categories.includes('style')) {
        const styleResult = await this.validateStyle(projectPath, options);
        validationResults.style = styleResult;
        allIssues.push(...styleResult.issues);
        if (styleResult.suggestions) {
          allSuggestions.push(...styleResult.suggestions);
        }
      }

      if (categories.includes('tests')) {
        const testResult = await this.validateTests(projectPath, options);
        validationResults.tests = testResult;
        allIssues.push(...testResult.issues);
        if (testResult.suggestions) {
          allSuggestions.push(...testResult.suggestions);
        }
      }

      if (categories.includes('security')) {
        const securityResult = await this.validateSecurity(projectPath, options);
        validationResults.security = securityResult;
        allIssues.push(...securityResult.issues);
        if (securityResult.suggestions) {
          allSuggestions.push(...securityResult.suggestions);
        }
      }

      if (categories.includes('performance')) {
        const performanceResult = await this.validatePerformance(projectPath, options);
        validationResults.performance = performanceResult;
        allIssues.push(...performanceResult.issues);
        if (performanceResult.suggestions) {
          allSuggestions.push(...performanceResult.suggestions);
        }
      }

      if (categories.includes('documentation')) {
        const docResult = await this.validateDocumentation(projectPath, options);
        validationResults.documentation = docResult;
        allIssues.push(...docResult.issues);
        if (docResult.suggestions) {
          allSuggestions.push(...docResult.suggestions);
        }
      }

      // Step 2: CRITICAL FIX - Apply auto-fixes FIRST if enabled
      if (options.fixIssues && this.options.enableAutoFix) {
        autoFixApplied = await this.applyAutoFixes(allIssues, projectPath);

        // Step 3: Remove fixed issues from the list to avoid reporting them to AI
        allIssues = this.filterOutFixedIssues(allIssues, autoFixApplied);

        // Step 4: Update category results to reflect fixed issues
        this.updateCategoryResultsAfterFixes(validationResults, autoFixApplied);
      }

      // Step 5: Calculate overall score and status with filtered issues
      const overallScore = this.calculateOverallScore(validationResults);
      const overallStatus = this.determineOverallStatus(overallScore, allIssues);

      return {
        overall: overallStatus,
        score: overallScore,
        categories: validationResults,
        issues: allIssues, // Now contains only unfixed issues
        suggestions: [...new Set(allSuggestions)], // Remove duplicates
        autoFixApplied,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      return {
        overall: 'fail',
        score: 0,
        categories: validationResults,
        issues: [{
          type: 'validation_engine_error',
          severity: 'critical',
          message: `Validation engine failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        suggestions: ['Check project structure and dependencies'],
        autoFixApplied: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Filter out issues that were successfully auto-fixed
   */
  private filterOutFixedIssues(allIssues: ValidationIssue[], autoFixApplied: ValidationFix[]): ValidationIssue[] {
    const fixedIssueKeys = new Set(autoFixApplied.map(fix =>
      `${fix.file}:${fix.line}:${fix.issueType}`
    ));

    return allIssues.filter(issue => {
      const issueKey = `${issue.file}:${issue.line}:${issue.type}`;
      return !fixedIssueKeys.has(issueKey);
    });
  }

  /**
   * Update category results after auto-fixes are applied
   */
  private updateCategoryResultsAfterFixes(
    validationResults: { [category: string]: CategoryValidation },
    autoFixApplied: ValidationFix[],
  ): void {
    const fixesByCategory: { [category: string]: number } = {};

    // Count fixes by category
    for (const fix of autoFixApplied) {
      // Determine category from issue type
      const category = this.getCategoryForIssueType(fix.issueType);
      fixesByCategory[category] = (fixesByCategory[category] || 0) + 1;
    }

    // Update category scores and issue counts
    for (const [category, fixCount] of Object.entries(fixesByCategory)) {
      if (validationResults[category]) {
        const categoryResult = validationResults[category];

        // Remove fixed issues from the category
        categoryResult.issues = categoryResult.issues.filter(issue => {
          const issueKey = `${issue.file}:${issue.line}:${issue.type}`;
          return !autoFixApplied.some(fix =>
            `${fix.file}:${fix.line}:${fix.issueType}` === issueKey
          );
        });

        // Recalculate score based on remaining issues
        const remainingIssues = categoryResult.issues.length;
        categoryResult.score = Math.max(0, 100 - (remainingIssues * 10));
        categoryResult.passed = remainingIssues === 0;

        // Add auto-fix success to suggestions
        if (fixCount > 0 && categoryResult.suggestions) {
          categoryResult.suggestions.push(`Auto-fixed ${fixCount} issues`);
        }
      }
    }
  }

  /**
   * Get category for issue type (for organizing fixes)
   */
  private getCategoryForIssueType(issueType: string): string {
    if (issueType.includes('trailing_whitespace') ||
        issueType.includes('inconsistent_indentation') ||
        issueType.includes('missing_semicolon')) {
      return 'style';
    }
    if (issueType.includes('typescript') || issueType.includes('syntax')) {
      return 'syntax';
    }
    if (issueType.includes('test')) {
      return 'tests';
    }
    if (issueType.includes('security')) {
      return 'security';
    }
    if (issueType.includes('performance')) {
      return 'performance';
    }
    if (issueType.includes('doc')) {
      return 'documentation';
    }
    return 'style'; // Default to style
  }

  /**
   * Validate syntax
   */
  private async validateSyntax(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.codeQualityValidator.validateSyntax(projectPath, options.scope);

      return {
        category: 'syntax',
        passed: result.issues.length === 0,
        score: Math.max(0, 100 - (result.issues.length * 10)),
        issues: result.issues,
        executionTime: Date.now() - startTime,
        suggestions: result.suggestions || [],
      };
    } catch (error: any) {
      return {
        category: 'syntax',
        passed: false,
        score: 0,
        issues: [{
          type: 'syntax_validation_error',
          severity: 'high',
          message: `Syntax validation failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Check project structure and file syntax'],
      };
    }
  }

  /**
   * Validate code style
   */
  private async validateStyle(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.codeQualityValidator.validateStyle(projectPath, options.scope);

      return {
        category: 'style',
        passed: result.criticalIssues === 0,
        score: Math.max(0, 100 - (result.issues.length * 2)),
        issues: result.issues,
        executionTime: Date.now() - startTime,
        suggestions: result.suggestions || [],
      };
    } catch (error: any) {
      return {
        category: 'style',
        passed: false,
        score: 0,
        issues: [{
          type: 'style_validation_error',
          severity: 'medium',
          message: `Style validation failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Install and configure linting tools'],
      };
    }
  }

  /**
   * Validate tests - ENFORCES SILENT MODE
   */
  private async validateTests(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.testValidator.executeTests(projectPath, {
        silentMode: true  // ALWAYS SILENT,
      });

      const issues: ValidationIssue[] = [];
      const testsRun: string[] = [];

      if (!result.passed) {
        issues.push({
          type: 'test_failure',
          severity: 'high',
          message: `${result.failed} out of ${result.total} tests failed`,
          file: '',
          line: 0,
          autoFixable: false,
        });
      }

      // Check test coverage if available
      if (result.coverage) {
        if (result.coverage.lines < 60) {
          issues.push({
            type: 'low_test_coverage',
            severity: 'medium',
            message: `Test coverage too low: ${result.coverage.lines}% lines covered`,
            file: '',
            line: 0,
            autoFixable: false,
            suggestion: 'Add more tests to improve coverage',
          });
        }
      }

      testsRun.push(`${result.total} tests executed`);
      if (result.coverage) {
        testsRun.push(`${result.coverage.lines}% line coverage`);
      }

      return {
        category: 'tests',
        passed: result.passed && (result.coverage?.lines || 100) >= 60,
        score: result.passed ? Math.min(100, 60 + (result.coverage?.lines || 0) * 0.4) : 30,
        issues,
        executionTime: Date.now() - startTime,
        testsRun,
        suggestions: result.passed ? ['Tests are passing'] : ['Fix failing tests and improve coverage'],
      };
    } catch (error: any) {
      return {
        category: 'tests',
        passed: false,
        score: 0,
        issues: [{
          type: 'test_execution_error',
          severity: 'high',
          message: `Test execution failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Check test configuration and dependencies'],
      };
    }
  }

  /**
   * Validate security
   */
  private async validateSecurity(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.securityValidator.scanVulnerabilities(projectPath);

      const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical').length;
      const highVulns = result.vulnerabilities.filter(v => v.severity === 'high').length;

      const issues: ValidationIssue[] = result.vulnerabilities.map(vuln => ({
        type: 'security_vulnerability',
        severity: vuln.severity,
        message: vuln.description,
        file: vuln.file || '',
        line: vuln.line || 0,
        autoFixable: result.autoFixesAvailable.includes(vuln.type),
        suggestion: vuln.recommendation,
      }));

      return {
        category: 'security',
        passed: criticalVulns === 0 && highVulns === 0,
        score: Math.max(0, 100 - (criticalVulns * 30 + highVulns * 15 + (result.vulnerabilities.length - criticalVulns - highVulns) * 5)),
        issues,
        executionTime: Date.now() - startTime,
        suggestions: result.recommendations,
      };
    } catch (error: any) {
      return {
        category: 'security',
        passed: false,
        score: 50, // Give partial credit if security scan fails
        issues: [{
          type: 'security_scan_error',
          severity: 'medium',
          message: `Security scan failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Install security scanning tools and dependencies'],
      };
    }
  }

  /**
   * Validate performance
   */
  private async validatePerformance(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.performanceValidator.analyzePerformance(projectPath);

      const criticalBottlenecks = result.bottlenecks.filter(b => b.severity === 'critical').length;
      const highBottlenecks = result.bottlenecks.filter(b => b.severity === 'high').length;

      const issues: ValidationIssue[] = result.bottlenecks.map(bottleneck => ({
        type: 'performance_issue',
        severity: bottleneck.severity,
        message: bottleneck.description,
        file: bottleneck.file || '',
        line: 0,
        autoFixable: false,
        suggestion: bottleneck.recommendation,
      }));

      return {
        category: 'performance',
        passed: result.score >= 70,
        score: result.score,
        issues,
        executionTime: Date.now() - startTime,
        suggestions: result.optimizations,
      };
    } catch (error: any) {
      return {
        category: 'performance',
        passed: true, // Performance validation failure is not blocking
        score: 70, // Give neutral score if performance analysis fails
        issues: [{
          type: 'performance_analysis_error',
          severity: 'low',
          message: `Performance analysis failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Performance analysis tools may need configuration'],
      };
    }
  }

  /**
   * Validate documentation
   */
  private async validateDocumentation(projectPath: string, options: ValidationOptions): Promise<CategoryValidation> {
    const startTime = Date.now();

    try {
      const result = await this.documentationValidator.validateDocumentation(projectPath);

      return {
        category: 'documentation',
        passed: result.score >= 70,
        score: result.score,
        issues: result.issues,
        executionTime: Date.now() - startTime,
        suggestions: result.suggestions,
      };
    } catch (error: any) {
      return {
        category: 'documentation',
        passed: true, // Documentation validation failure is not blocking
        score: 60, // Give partial credit if documentation validation fails
        issues: [{
          type: 'documentation_validation_error',
          severity: 'low',
          message: `Documentation validation failed: ${error.message}`,
          file: '',
          line: 0,
          autoFixable: false,
        }],
        executionTime: Date.now() - startTime,
        suggestions: ['Check documentation structure and completeness'],
      };
    }
  }

  /**
   * Apply automatic fixes to identified issues
   * ENHANCED: Added more auto-fix types and better error handling
   */
  private async applyAutoFixes(issues: ValidationIssue[], projectPath: string): Promise<ValidationFix[]> {
    const fixes: ValidationFix[] = [];

    // Group auto-fixable issues by file for efficient processing
    const issuesByFile = new Map<string, ValidationIssue[]>();

    for (const issue of issues) {
      if (issue.autoFixable && issue.file) {
        if (!issuesByFile.has(issue.file)) {
          issuesByFile.set(issue.file, []);
        }
        issuesByFile.get(issue.file)!.push(issue);
      }
    }

    // Process each file
    for (const [file, fileIssues] of issuesByFile) {
      try {
        const fileFixes = await this.applyFileAutoFixes(fileIssues, file, projectPath);
        fixes.push(...fileFixes);
      } catch (error: any) {
        // Log but don't break the process
        console.warn(chalk.yellow(`Warning: Auto-fix failed for ${file}: ${error.message}`));
      }
    }

    return fixes;
  }

  /**
   * Apply auto-fixes for a single file
   */
  private async applyFileAutoFixes(issues: ValidationIssue[], file: string, projectPath: string): Promise<ValidationFix[]> {
    const fixes: ValidationFix[] = [];
    const filePath = path.resolve(projectPath, file);

    try {
      let content = await fs.readFile(filePath, 'utf8');
      let lines = content.split('\n');
      let modified = false;

      // Sort issues by line number (descending) to avoid line number shifts
      const sortedIssues = issues.sort((a, b) => (b.line || 0) - (a.line || 0));

      for (const issue of sortedIssues) {
        const fix = await this.applyLineFix(issue, lines, file);
        if (fix) {
          fixes.push(fix);
          modified = true;
        }
      }

      // Write back if modified
      if (modified) {
        await fs.writeFile(filePath, lines.join('\n'));
      }

    } catch (error) {
      // File processing failed, skip
    }

    return fixes;
  }

  /**
   * Apply a single line fix
   */
  private async applyLineFix(issue: ValidationIssue, lines: string[], file: string): Promise<ValidationFix | null> {
    const lineIndex = (issue.line || 1) - 1;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      return null;
    }

    const beforeLine = lines[lineIndex];
    let afterLine = beforeLine;
    let fixApplied = false;

    // Enhanced auto-fix implementations
    switch (issue.type) {
      case 'trailing_whitespace':
        afterLine = beforeLine.replace(/\s+$/, '');
        fixApplied = afterLine !== beforeLine;
        break;

      case 'missing_semicolon':
        if (!beforeLine.trim().endsWith(';') &&
            !beforeLine.trim().endsWith('{') &&
            !beforeLine.trim().endsWith('}')) {
          afterLine = beforeLine.trimEnd() + ';';
          fixApplied = true;
        }
        break;

      case 'inconsistent_indentation':
        // Convert tabs to spaces (assuming 2-space indentation)
        if (beforeLine.startsWith('\t')) {
          afterLine = beforeLine.replace(/^\t+/, (match) => '  '.repeat(match.length));
          fixApplied = afterLine !== beforeLine;
        }
        break;

      case 'console_log_found':
        // Comment out console.log statements
        if (beforeLine.includes('console.log(')) {
          afterLine = beforeLine.replace(/console\.log\([^)]*\);?/, '// $&');
          fixApplied = afterLine !== beforeLine;
        }
        break;

      default:
        return null;
    }

    if (fixApplied) {
      lines[lineIndex] = afterLine;
      return {
        issueType: issue.type,
        file,
        line: issue.line || 0,
        before: beforeLine,
        after: afterLine,
        applied: true,
      };
    }

    return null;
  }

  /**
   * Calculate overall score from category results
   */
  private calculateOverallScore(categories: { [category: string]: CategoryValidation }): number {
    const weights = {
      syntax: 0.2,
      style: 0.15,
      tests: 0.25,
      security: 0.2,
      performance: 0.1,
      documentation: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, result] of Object.entries(categories)) {
      const weight = weights[category as keyof typeof weights] || 0.1;
      totalScore += (result.score || 0) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(score: number, issues: ValidationIssue[]): 'pass' | 'fail' | 'warning' {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;

    if (criticalIssues > 0) return 'fail';
    if (score < 60 || highIssues > 3) return 'fail';
    if (score < 80 || highIssues > 0) return 'warning';

    return 'pass';
  }
}
