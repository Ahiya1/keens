/**
 * ValidationDAO Tests - Phase 3.2
 * Tests for validation result storage and retrieval
 * FIXED: Updated to match actual ValidationDAO interface
 */

import { ValidationDAO } from '../../../src/database/dao/ValidationDAO.js';
import { DatabaseManager } from '../../../src/database/DatabaseManager.js';
import { ValidationResult, ValidationIssue, CategoryValidation } from '../../../src/agent/validation/types.js';

// Mock database manager
jest.mock('../../../src/database/DatabaseManager.js', () => {
  return {
    DatabaseManager: jest.fn().mockImplementation(() => ({
      query: jest.fn().mockImplementation((sql, params) => {
        // Mock different query responses based on SQL
        if (sql.includes('INSERT INTO validation_results')) {
          return Promise.resolve({ rows: [{ id: 'validation-123' }] });
        }
        if (sql.includes('SELECT * FROM validation_results')) {
          return Promise.resolve({ rows: mockValidationResults });
        }
        if (sql.includes('UPDATE agent_sessions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      })
    }))
  };
});

const mockValidationResults = [
  {
    id: 'validation-123',
    session_id: 'session-123',
    validation_type: 'full',
    overall_status: 'pass',
    score: 85.5,
    categories: JSON.stringify({ syntax: 'pass', style: 'warning' }),
    issues: JSON.stringify([]),
    auto_fixes_applied: JSON.stringify([]),
    suggestions: JSON.stringify(['Use consistent indentation']),
    execution_time_ms: 1500,
    created_at: new Date().toISOString()
  }
];

describe('ValidationDAO', () => {
  let validationDAO: ValidationDAO;
  let mockDb: DatabaseManager;

  beforeEach(() => {
    mockDb = new DatabaseManager();
    validationDAO = new ValidationDAO(mockDb);
  });

  describe('storeValidationResult', () => {
    test('should store validation result successfully', async () => {
      const syntaxCategory: CategoryValidation = {
        category: 'syntax',
        passed: true,
        score: 95,
        issues: [],
        executionTime: 500
      };
      
      const styleCategory: CategoryValidation = {
        category: 'style',
        passed: false,
        score: 76,
        issues: [],
        executionTime: 300
      };

      const validationResult: ValidationResult = {
        overall: 'pass',
        score: 85.5,
        categories: { 
          syntax: syntaxCategory,
          style: styleCategory
        },
        issues: [],
        autoFixApplied: [],
        suggestions: ['Use consistent indentation'],
        executionTime: 1500
      };

      const result = await validationDAO.storeValidationResult('session-123', validationResult);
      expect(result).toBe('validation-123');
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should handle validation result with issues', async () => {
      const issues: ValidationIssue[] = [
        {
          type: 'syntax_error',
          severity: 'critical',
          message: 'Missing semicolon',
          file: 'test.js',
          line: 10,
          column: 15,
          autoFixable: true,
          suggestion: 'Add semicolon at end of line'
        }
      ];

      const failedCategory: CategoryValidation = {
        category: 'syntax',
        passed: false,
        score: 45,
        issues: issues,
        executionTime: 2000
      };

      const validationResult: ValidationResult = {
        overall: 'fail',
        score: 45.0,
        categories: { syntax: failedCategory },
        issues: issues,
        autoFixApplied: [],
        suggestions: [],
        executionTime: 2000
      };

      const result = await validationDAO.storeValidationResult('session-123', validationResult);
      expect(result).toBe('validation-123');
    });
  });

  describe('getValidationResults', () => {
    test('should retrieve validation results for session', async () => {
      const results = await validationDAO.getValidationResults('session-123');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('session_id');
      expect(results[0]).toHaveProperty('overall_status');
    });

    test('should return empty array for non-existent session', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const results = await validationDAO.getValidationResults('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('getLatestValidationResult', () => {
    test('should retrieve latest validation result', async () => {
      const result = await validationDAO.getLatestValidationResult('session-123');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('validation-123');
      expect(result?.session_id).toBe('session-123');
    });

    test('should return null for session with no validation results', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await validationDAO.getLatestValidationResult('empty-session');
      expect(result).toBeNull();
    });
  });

  describe('getValidationStatistics', () => {
    test('should calculate validation statistics', async () => {
      const stats = await validationDAO.getValidationStatistics('session-123');
      expect(stats).toHaveProperty('totalValidations');
      expect(stats).toHaveProperty('passedValidations');
      expect(stats).toHaveProperty('latestScore');
      expect(stats).toHaveProperty('totalIssues');
      expect(stats).toHaveProperty('criticalIssues');
      expect(stats).toHaveProperty('autoFixesApplied');
      expect(typeof stats.totalValidations).toBe('number');
      expect(typeof stats.latestScore).toBe('number');
    });

    test('should handle empty validation results', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const stats = await validationDAO.getValidationStatistics('empty-session');
      expect(stats.totalValidations).toBe(0);
      expect(stats.latestScore).toBe(0);
    });
  });

  describe('quality gate operations', () => {
    test('should store quality gate evaluation', async () => {
      const gateResult = {
        gate: 'compilation',
        passed: true,
        overallScore: 95.0,
        threshold: 80.0,
        evaluations: [],
        recommendations: ['Keep up the good work']
      };

      const result = await validationDAO.storeQualityGateEvaluation(
        'session-123',
        'COMPLETE',
        gateResult
      );
      expect(result).toBeDefined();
    });

    test('should retrieve quality gate evaluations', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{
          id: 'gate-123',
          session_id: 'session-123',
          phase: 'COMPLETE',
          gate_name: 'compilation',
          passed: true,
          overall_score: 95.0,
          threshold: 80.0,
          criteria_evaluations: JSON.stringify([]),
          recommendations: JSON.stringify(['Keep up the good work']),
          created_at: new Date().toISOString()
        }] 
      });

      const gates = await validationDAO.getQualityGateEvaluations('session-123');
      expect(gates).toBeInstanceOf(Array);
      expect(gates.length).toBeGreaterThan(0);
    });

    test('should retrieve quality gate for specific phase', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{
          id: 'gate-123',
          session_id: 'session-123',
          phase: 'COMPLETE',
          gate_name: 'compilation',
          passed: true,
          overall_score: 95.0,
          threshold: 80.0,
          criteria_evaluations: JSON.stringify([]),
          recommendations: JSON.stringify([]),
          created_at: new Date().toISOString()
        }] 
      });

      const gate = await validationDAO.getQualityGateForPhase('session-123', 'COMPLETE');
      expect(gate).toBeTruthy();
      expect(gate?.phase).toBe('COMPLETE');
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));
      
      await expect(validationDAO.getValidationResults('session-123'))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle malformed validation results', async () => {
      const invalidResult = {
        // Missing required fields
        score: 'not-a-number',
      } as any;

      await expect(validationDAO.storeValidationResult('session-123', invalidResult))
        .rejects.toThrow();
    });
  });
});
