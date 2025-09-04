/**
 * ValidationDAO - Phase 3.2
 * Data Access Object for validation results, quality gates, and metrics
 */

import { DatabaseManager } from '../DatabaseManager.js';
import { ValidationResult, GateResult, ValidationIssue, ValidationFix } from '../../agent/validation/types.js';

interface ValidationResultRecord {
  id: string;
  session_id: string;
  validation_type: string;
  overall_status: string;
  score: number;
  categories: any;
  issues: ValidationIssue[];
  auto_fixes_applied: ValidationFix[];
  suggestions: string[];
  execution_time_ms: number;
  created_at: Date;
}

interface QualityGateRecord {
  id: string;
  session_id: string;
  phase: string;
  gate_name: string;
  passed: boolean;
  overall_score: number;
  threshold: number;
  criteria_evaluations: any[];
  recommendations: string[];
  created_at: Date;
}

export class ValidationDAO {
  private db: DatabaseManager;
  
  constructor(db: DatabaseManager) {
    this.db = db;
  }
  
  /**
   * Store validation result
   */
  async storeValidationResult(
    sessionId: string, 
    validationResult: ValidationResult,
  ): Promise<string> {
    const query = `
      INSERT INTO validation_results (
        session_id, validation_type, overall_status, score,
        categories, issues, auto_fixes_applied, suggestions,
        execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    
    const values = [
      sessionId,
      'full', // Default validation type
      validationResult.overall,
      validationResult.score,
      JSON.stringify(validationResult.categories),
      JSON.stringify(validationResult.issues),
      JSON.stringify(validationResult.autoFixApplied),
      JSON.stringify(validationResult.suggestions),
      validationResult.executionTime
    ];
    
    const result = await this.db.query(query, values);
    const validationId = (result as any).rows?.[0]?.id;
    
    if (!validationId) {
      throw new Error('Failed to create validation result');
    }
    
    // Store individual issues
    if (validationResult.issues && validationResult.issues.length > 0) {
      await this.storeValidationIssues(validationId, validationResult.issues);
    }
    
    // Store individual fixes
    if (validationResult.autoFixApplied && validationResult.autoFixApplied.length > 0) {
      await this.storeAutoFixes(sessionId, validationId, validationResult.autoFixApplied);
    }
    
    // Update session validation status
    await this.updateSessionValidationStatus(sessionId, validationResult);
    
    return validationId;
  }
  
  /**
   * Store quality gate evaluation
   */
  async storeQualityGateEvaluation(
    sessionId: string,
    phase: string,
    gateResult: GateResult,
  ): Promise<string> {
    const query = `
      INSERT INTO quality_gate_evaluations (
        session_id, phase, gate_name, passed, overall_score,
        threshold, criteria_evaluations, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const values = [
      sessionId,
      phase,
      gateResult.gate,
      gateResult.passed,
      gateResult.overallScore,
      gateResult.threshold,
      JSON.stringify(gateResult.evaluations),
      JSON.stringify(gateResult.recommendations)
    ];
    
    const result = await this.db.query(query, values);
    return (result as any).rows?.[0]?.id || '';
  }
  
  /**
   * Get validation results for a session
   */
  async getValidationResults(sessionId: string): Promise<ValidationResultRecord[]> {
    const query = `
      SELECT * FROM validation_results 
      WHERE session_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [sessionId]);
    return ((result as any).rows || []).map((row: any) => this.mapValidationResultRecord(row));
  }
  
  /**
   * Get latest validation result for a session
   */
  async getLatestValidationResult(sessionId: string): Promise<ValidationResultRecord | null> {
    const query = `
      SELECT * FROM validation_results 
      WHERE session_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [sessionId]);
    const rows = (result as any).rows || [];
    return rows.length > 0 ? this.mapValidationResultRecord(rows[0]) : null;
  }
  
  /**
   * Get quality gate evaluations for a session
   */
  async getQualityGateEvaluations(sessionId: string): Promise<QualityGateRecord[]> {
    const query = `
      SELECT * FROM quality_gate_evaluations 
      WHERE session_id = $1 
      ORDER BY created_at ASC
    `;
    
    const result = await this.db.query(query, [sessionId]);
    return ((result as any).rows || []).map((row: any) => this.mapQualityGateRecord(row));
  }
  
  /**
   * Get quality gate evaluation for specific phase
   */
  async getQualityGateForPhase(sessionId: string, phase: string): Promise<QualityGateRecord | null> {
    const query = `
      SELECT * FROM quality_gate_evaluations 
      WHERE session_id = $1 AND phase = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [sessionId, phase]);
    const rows = (result as any).rows || [];
    return rows.length > 0 ? this.mapQualityGateRecord(rows[0]) : null;
  }
  
  /**
   * Get validation statistics for a session
   */
  async getValidationStatistics(sessionId: string): Promise<{
    totalValidations: number;
    passedValidations: number;
    latestScore: number;
    totalIssues: number;
    criticalIssues: number;
    autoFixesApplied: number;
  }> {
    // Simplified implementation to avoid complex queries
    const validationResults = await this.getValidationResults(sessionId);
    
    const totalValidations = validationResults.length;
    const passedValidations = validationResults.filter(r => r.overall_status === 'pass').length;
    const latestScore = validationResults.length > 0 ? validationResults[0].score : 0;
    
    // Count issues
    let totalIssues = 0;
    let criticalIssues = 0;
    let autoFixesApplied = 0;
    
    for (const result of validationResults) {
      totalIssues += result.issues?.length || 0;
      criticalIssues += result.issues?.filter((i: any) => i.severity === 'critical')?.length || 0;
      autoFixesApplied += result.auto_fixes_applied?.length || 0;
    }
    
    return {
      totalValidations,
      passedValidations,
      latestScore,
      totalIssues,
      criticalIssues,
      autoFixesApplied
    };
  }
  
  /**
   * Store individual validation issues
   */
  private async storeValidationIssues(validationResultId: string, issues: ValidationIssue[]): Promise<void> {
    if (!issues || issues.length === 0) return;
    
    const query = `
      INSERT INTO validation_issues (
        validation_result_id, issue_type, severity, category,
        message, file_path, line_number, column_number,
        auto_fixable, suggestion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    for (const issue of issues) {
      const values = [
        validationResultId,
        issue.type,
        issue.severity,
        this.inferCategoryFromType(issue.type),
        issue.message,
        issue.file || null,
        issue.line || 0,
        issue.column || 0,
        issue.autoFixable || false,
        issue.suggestion || null
      ];
      
      await this.db.query(query, values);
    }
  }
  
  /**
   * Store auto-fixes
   */
  private async storeAutoFixes(
    sessionId: string, 
    validationResultId: string, 
    fixes: ValidationFix[],
  ): Promise<void> {
    if (!fixes || fixes.length === 0) return;
    
    const query = `
      INSERT INTO auto_fixes (
        session_id, validation_result_id, issue_type, file_path,
        line_number, fix_description, before_snippet, after_snippet,
        success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    for (const fix of fixes) {
      const values = [
        sessionId,
        validationResultId,
        fix.issueType,
        fix.file || null,
        fix.line || 0,
        `Fixed ${fix.issueType}`,
        fix.before || null,
        fix.after || null,
        fix.applied || false
      ];
      
      await this.db.query(query, values);
    }
  }
  
  /**
   * Update session validation status
   */
  private async updateSessionValidationStatus(
    sessionId: string, 
    validationResult: ValidationResult,
  ): Promise<void> {
    const query = `
      UPDATE agent_sessions 
      SET 
        validation_status = $2,
        quality_score = $3,
        validation_count = COALESCE(validation_count, 0) + 1,
        last_validation_at = NOW()
      WHERE id = $1
    `;
    
    await this.db.query(query, [
      sessionId,
      validationResult.overall,
      validationResult.score
    ]);
  }
  
  /**
   * Map database row to ValidationResultRecord
   */
  private mapValidationResultRecord(row: any): ValidationResultRecord {
    return {
      id: row.id,
      session_id: row.session_id,
      validation_type: row.validation_type,
      overall_status: row.overall_status,
      score: parseFloat(row.score) || 0,
      categories: row.categories || {},
      issues: row.issues || [],
      auto_fixes_applied: row.auto_fixes_applied || [],
      suggestions: row.suggestions || [],
      execution_time_ms: parseInt(row.execution_time_ms) || 0,
      created_at: new Date(row.created_at),
    };
  }
  
  /**
   * Map database row to QualityGateRecord
   */
  private mapQualityGateRecord(row: any): QualityGateRecord {
    return {
      id: row.id,
      session_id: row.session_id,
      phase: row.phase,
      gate_name: row.gate_name,
      passed: row.passed,
      overall_score: parseFloat(row.overall_score) || 0,
      threshold: parseFloat(row.threshold) || 0,
      criteria_evaluations: row.criteria_evaluations || [],
      recommendations: row.recommendations || [],
      created_at: new Date(row.created_at),
    };
  }
  
  /**
   * Infer validation category from issue type
   */
  private inferCategoryFromType(issueType: string): string {
    if (issueType.includes('syntax') || issueType.includes('compile')) return 'syntax';
    if (issueType.includes('style') || issueType.includes('lint')) return 'style';
    if (issueType.includes('test') || issueType.includes('coverage')) return 'tests';
    if (issueType.includes('security') || issueType.includes('vulnerability')) return 'security';
    if (issueType.includes('performance') || issueType.includes('slow')) return 'performance';
    if (issueType.includes('documentation') || issueType.includes('doc')) return 'documentation';
    return 'general';
  }
}
