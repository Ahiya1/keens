/**
 * ValidationDAO Comprehensive Tests
 * Tests validation result storage, retrieval, and analytics
 */

import { ValidationDAO } from '../../../src/database/dao/ValidationDAO.js';
import { DatabaseManager, UserContext } from '../../../src/database/DatabaseManager.js';

// Mock DatabaseManager
class MockDatabaseManager {
  private validationResults: any[] = [];

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (sql.includes('INSERT INTO validation_results')) {
      const id = 'validation-' + Date.now();
      const result = {
        id,
        session_id: params?.[1] || 'test-session',
        validation_type: params?.[2] || 'syntax',
        category: params?.[3] || 'general',
        status: params?.[4] || 'pass',
        score: params?.[5] || 85,
        issues_found: params?.[6] || [],
        fixes_applied: params?.[7] || [],
        metadata: params?.[8] || {},
        created_at: new Date().toISOString()
      };
      this.validationResults.push(result);
      return [result] as T[];
    }
    
    if (sql.includes('SELECT') && sql.includes('validation_results')) {
      return this.validationResults as T[];
    }
    
    return [] as T[];
  }

  async transaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
    return await callback(this);
  }

  async testConnection(): Promise<boolean> { return true; }
  async close(): Promise<void> {}
  subscribeToRealtime() { return { unsubscribe: jest.fn() }; }
}

describe('ValidationDAO', () => {
  let validationDAO: ValidationDAO;
  let mockDb: MockDatabaseManager;
  let userContext: UserContext;
  let adminContext: UserContext;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    validationDAO = new ValidationDAO(mockDb as any);
    
    userContext = {
      userId: 'user-123',
      isAdmin: false
    };
    
    adminContext = {
      userId: 'admin-123',
      isAdmin: true,
      adminPrivileges: {
        view_all_analytics: true,
        system_diagnostics: true
      }
    };
  });

  describe('Validation Result Storage', () => {
    test('should store syntax validation results', async () => {
      const validationData = {
        sessionId: 'session-123',
        validationType: 'syntax' as const,
        category: 'typescript',
        status: 'pass' as const,
        score: 95,
        issuesFound: [
          {
            file: 'src/test.ts',
            line: 10,
            column: 5,
            message: 'Missing semicolon',
            severity: 'warning'
          }
        ],
        fixesApplied: [
          {
            file: 'src/test.ts',
            line: 10,
            column: 5,
            fix: 'Added semicolon',
            type: 'auto'
          }
        ],
        metadata: {
          duration: 1500,
          filesChecked: 25,
          toolsUsed: ['typescript', 'eslint']
        }
      };
      
      const result = await validationDAO.storeValidationResult(
        validationData,
        userContext
      );
      
      expect(result.success).toBe(true);
      expect(result.validationId).toBeDefined();
      expect(result.validationId).toContain('validation-');
    });

    test('should store security validation results', async () => {
      const validationData = {
        sessionId: 'session-456',
        validationType: 'security' as const,
        category: 'vulnerability-scan',
        status: 'warning' as const,
        score: 78,
        issuesFound: [
          {
            type: 'dependency',
            package: 'lodash',
            version: '4.17.10',
            vulnerability: 'CVE-2021-23337',
            severity: 'high'
          }
        ],
        fixesApplied: [
          {
            type: 'dependency-update',
            package: 'lodash',
            oldVersion: '4.17.10',
            newVersion: '4.17.21',
            status: 'applied'
          }
        ],
        metadata: {
          scanner: 'npm-audit',
          scanDate: new Date().toISOString(),
          totalDependencies: 150
        }
      };
      
      const result = await validationDAO.storeValidationResult(
        validationData,
        userContext
      );
      
      expect(result.success).toBe(true);
    });

    test('should store performance validation results', async () => {
      const validationData = {
        sessionId: 'session-789',
        validationType: 'performance' as const,
        category: 'load-testing',
        status: 'fail' as const,
        score: 45,
        issuesFound: [
          {
            metric: 'response_time',
            threshold: 200,
            actual: 850,
            endpoint: '/api/users',
            severity: 'critical'
          }
        ],
        fixesApplied: [],
        metadata: {
          testDuration: 300000,
          concurrentUsers: 100,
          requestsPerSecond: 50
        }
      };
      
      const result = await validationDAO.storeValidationResult(
        validationData,
        userContext
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Result Retrieval', () => {
    beforeEach(async () => {
      // Store some test validation results
      await validationDAO.storeValidationResult({
        sessionId: 'session-123',
        validationType: 'syntax',
        category: 'javascript',
        status: 'pass',
        score: 90,
        issuesFound: [],
        fixesApplied: [],
        metadata: {}
      }, userContext);
      
      await validationDAO.storeValidationResult({
        sessionId: 'session-123',
        validationType: 'security',
        category: 'audit',
        status: 'warning',
        score: 75,
        issuesFound: [{ type: 'test-issue' }],
        fixesApplied: [],
        metadata: {}
      }, userContext);
    });

    test('should get validation results by session', async () => {
      const results = await validationDAO.getValidationResultsBySession(
        'session-123',
        userContext
      );
      
      expect(results.success).toBe(true);
      expect(results.results.length).toBe(2);
      expect(results.results[0].session_id).toBe('session-123');
      expect(results.results[1].session_id).toBe('session-123');
    });

    test('should get validation results by type', async () => {
      const results = await validationDAO.getValidationResultsByType(
        'syntax',
        { limit: 10, offset: 0 },
        userContext
      );
      
      expect(results.success).toBe(true);
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0].validation_type).toBe('syntax');
    });

    test('should get latest validation results', async () => {
      const results = await validationDAO.getLatestValidationResults(
        10,
        userContext
      );
      
      expect(results.success).toBe(true);
      expect(results.results.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Analytics', () => {
    beforeEach(async () => {
      // Create a variety of validation results for analytics
      const validationTypes = ['syntax', 'security', 'performance', 'style'];
      const statuses = ['pass', 'warning', 'fail'];
      
      for (let i = 0; i < 20; i++) {
        await validationDAO.storeValidationResult({
          sessionId: `session-${i}`,
          validationType: validationTypes[i % validationTypes.length],
          category: 'test-category',
          status: statuses[i % statuses.length],
          score: 50 + (i * 2), // Scores from 50 to 88
          issuesFound: Array(i % 5).fill({ type: 'test-issue' }),
          fixesApplied: Array(i % 3).fill({ type: 'test-fix' }),
          metadata: { testIndex: i }
        }, userContext);
      }
    });

    test('should get validation score trends', async () => {
      const trends = await validationDAO.getValidationScoreTrends(
        'syntax',
        30, // last 30 days
        adminContext
      );
      
      expect(trends.success).toBe(true);
      expect(trends.trends).toBeDefined();
      expect(trends.trends.averageScore).toBeDefined();
      expect(trends.trends.scoreHistory).toBeDefined();
      expect(Array.isArray(trends.trends.scoreHistory)).toBe(true);
    });

    test('should get validation summary by category', async () => {
      const summary = await validationDAO.getValidationSummaryByCategory(
        userContext.userId,
        adminContext
      );
      
      expect(summary.success).toBe(true);
      expect(summary.summary).toBeDefined();
      expect(summary.summary.totalValidations).toBeGreaterThan(0);
      expect(summary.summary.byCategory).toBeDefined();
    });

    test('should get issue frequency analysis', async () => {
      const analysis = await validationDAO.getIssueFrequencyAnalysis(
        'security',
        adminContext
      );
      
      expect(analysis.success).toBe(true);
      expect(analysis.analysis).toBeDefined();
      expect(analysis.analysis.topIssues).toBeDefined();
      expect(Array.isArray(analysis.analysis.topIssues)).toBe(true);
    });

    test('should get fix effectiveness metrics', async () => {
      const metrics = await validationDAO.getFixEffectivenessMetrics(
        adminContext
      );
      
      expect(metrics.success).toBe(true);
      expect(metrics.metrics).toBeDefined();
      expect(metrics.metrics.totalFixes).toBeDefined();
      expect(metrics.metrics.autoFixRate).toBeDefined();
      expect(metrics.metrics.fixSuccessRate).toBeDefined();
    });
  });

  describe('Access Control', () => {
    test('should restrict analytics to admin users', async () => {
      await expect(
        validationDAO.getValidationScoreTrends('syntax', 30, userContext)
      ).rejects.toThrow('Admin privileges required');
    });

    test('should allow users to access their own validation results', async () => {
      const results = await validationDAO.getValidationResultsBySession(
        'session-123',
        userContext
      );
      
      expect(results.success).toBe(true);
    });

    test('should allow admin to access all validation results', async () => {
      const results = await validationDAO.getValidationResultsBySession(
        'any-session',
        adminContext
      );
      
      expect(results.success).toBe(true);
    });
  });

  describe('Data Validation', () => {
    test('should validate required fields', async () => {
      await expect(
        validationDAO.storeValidationResult({
          // Missing sessionId
          validationType: 'syntax',
          category: 'test',
          status: 'pass',
          score: 90,
          issuesFound: [],
          fixesApplied: [],
          metadata: {}
        } as any, userContext)
      ).rejects.toThrow('sessionId is required');
    });

    test('should validate validation type enum', async () => {
      await expect(
        validationDAO.storeValidationResult({
          sessionId: 'session-123',
          validationType: 'invalid-type' as any,
          category: 'test',
          status: 'pass',
          score: 90,
          issuesFound: [],
          fixesApplied: [],
          metadata: {}
        }, userContext)
      ).rejects.toThrow('Invalid validation type');
    });

    test('should validate score range', async () => {
      await expect(
        validationDAO.storeValidationResult({
          sessionId: 'session-123',
          validationType: 'syntax',
          category: 'test',
          status: 'pass',
          score: 150, // Invalid score > 100
          issuesFound: [],
          fixesApplied: [],
          metadata: {}
        }, userContext)
      ).rejects.toThrow('Score must be between 0 and 100');
    });

    test('should validate status enum', async () => {
      await expect(
        validationDAO.storeValidationResult({
          sessionId: 'session-123',
          validationType: 'syntax',
          category: 'test',
          status: 'invalid-status' as any,
          score: 90,
          issuesFound: [],
          fixesApplied: [],
          metadata: {}
        }, userContext)
      ).rejects.toThrow('Invalid status');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large validation result sets', async () => {
      // Create many validation results
      const promises = Array.from({ length: 100 }, (_, i) => 
        validationDAO.storeValidationResult({
          sessionId: `bulk-session-${i}`,
          validationType: 'syntax',
          category: 'bulk-test',
          status: 'pass',
          score: 80 + (i % 20),
          issuesFound: [],
          fixesApplied: [],
          metadata: { bulkIndex: i }
        }, userContext)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle pagination efficiently', async () => {
      const page1 = await validationDAO.getValidationResultsByType(
        'syntax',
        { limit: 10, offset: 0 },
        adminContext
      );
      
      const page2 = await validationDAO.getValidationResultsByType(
        'syntax',
        { limit: 10, offset: 10 },
        adminContext
      );
      
      expect(page1.success).toBe(true);
      expect(page2.success).toBe(true);
      expect(page1.results).not.toEqual(page2.results);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const brokenDb = {
        ...mockDb,
        query: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };
      
      const brokenDAO = new ValidationDAO(brokenDb as any);
      
      await expect(
        brokenDAO.storeValidationResult({
          sessionId: 'session-123',
          validationType: 'syntax',
          category: 'test',
          status: 'pass',
          score: 90,
          issuesFound: [],
          fixesApplied: [],
          metadata: {}
        }, userContext)
      ).rejects.toThrow('Connection failed');
    });

    test('should handle malformed JSON in metadata', async () => {
      // The DAO should handle this gracefully or validate JSON structure
      const result = await validationDAO.storeValidationResult({
        sessionId: 'session-123',
        validationType: 'syntax',
        category: 'test',
        status: 'pass',
        score: 90,
        issuesFound: [],
        fixesApplied: [],
        metadata: null as any // Invalid metadata
      }, userContext);
      
      expect(result.success).toBe(true); // Should handle gracefully
    });
  });
});
