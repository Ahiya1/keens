/**
 * Agent Session Comprehensive Tests
 * Tests session lifecycle, state management, and coordination
 */

import { AgentSession } from '../../../src/agent/AgentSession.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { ProgressReporter } from '../../../src/utils/ProgressReporter.js';
import { DatabaseService } from '../../../src/database/index.js';

// Mock dependencies
jest.mock('../../../src/database/index.js', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    sessions: {
      createSession: jest.fn().mockResolvedValue({
        id: 'db-session-123',
        session_id: 'test_session_123',
        execution_status: 'running'
      }),
      updateSession: jest.fn().mockResolvedValue({ success: true }),
      getSessionById: jest.fn().mockResolvedValue({
        id: 'db-session-123',
        user_id: 'user-123',
        execution_status: 'running'
      })
    },
    credits: {
      deductCredits: jest.fn().mockResolvedValue({ success: true })
    },
    close: jest.fn()
  }))
}));

describe('AgentSession', () => {
  let agentSession: AgentSession;
  let mockLogger: Logger;
  let mockProgress: ProgressReporter;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    mockProgress = new ProgressReporter('test_session', 10, false, false);
    mockDb = new DatabaseService();
    
    agentSession = new AgentSession({
      sessionId: 'test_session_123',
      userId: 'user-123',
      vision: 'Test agent session',
      workingDirectory: '/tmp/test',
      phase: 'EXPLORE',
      maxIterations: 10,
      costBudget: 25.0,
      logger: mockLogger,
      progressReporter: mockProgress,
      database: mockDb
    });
  });

  afterEach(() => {
    mockProgress.destroy();
  });

  describe('Session Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(agentSession.sessionId).toBe('test_session_123');
      expect(agentSession.userId).toBe('user-123');
      expect(agentSession.vision).toBe('Test agent session');
      expect(agentSession.currentPhase).toBe('EXPLORE');
      expect(agentSession.maxIterations).toBe(10);
      expect(agentSession.costBudget).toBe(25.0);
    });

    test('should generate unique session ID if not provided', () => {
      const session = new AgentSession({
        userId: 'user-123',
        vision: 'Test',
        workingDirectory: '/tmp',
        logger: mockLogger,
        progressReporter: mockProgress,
        database: mockDb
      });
      
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toContain('session_');
    });

    test('should validate required parameters', () => {
      expect(() => new AgentSession({
        // Missing userId
        vision: 'Test',
        workingDirectory: '/tmp',
        logger: mockLogger,
        progressReporter: mockProgress,
        database: mockDb
      } as any)).toThrow('userId is required');
    });

    test('should validate vision parameter', () => {
      expect(() => new AgentSession({
        userId: 'user-123',
        vision: '', // Empty vision
        workingDirectory: '/tmp',
        logger: mockLogger,
        progressReporter: mockProgress,
        database: mockDb
      })).toThrow('vision cannot be empty');
    });
  });

  describe('Phase Management', () => {
    test('should transition between phases', async () => {
      expect(agentSession.currentPhase).toBe('EXPLORE');
      
      await agentSession.transitionToPhase('PLAN', 'Analysis complete');
      expect(agentSession.currentPhase).toBe('PLAN');
      
      await agentSession.transitionToPhase('COMPLETE', 'Task finished');
      expect(agentSession.currentPhase).toBe('COMPLETE');
    });

    test('should validate phase transitions', async () => {
      await expect(
        agentSession.transitionToPhase('INVALID_PHASE' as any, 'Invalid')
      ).rejects.toThrow('Invalid phase');
    });

    test('should track phase history', async () => {
      await agentSession.transitionToPhase('PLAN', 'Moving to plan');
      await agentSession.transitionToPhase('FOUND', 'Ready to build');
      
      const history = agentSession.getPhaseHistory();
      expect(history.length).toBe(3); // EXPLORE (initial) + PLAN + FOUND
      expect(history[0].phase).toBe('EXPLORE');
      expect(history[1].phase).toBe('PLAN');
      expect(history[2].phase).toBe('FOUND');
    });

    test('should calculate phase durations', async () => {
      const startTime = Date.now();
      
      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await agentSession.transitionToPhase('PLAN', 'Test transition');
      
      const history = agentSession.getPhaseHistory();
      const explorePhase = history[0];
      
      expect(explorePhase.duration).toBeGreaterThan(0);
      expect(explorePhase.endTime).toBeDefined();
    });
  });

  describe('Iteration Tracking', () => {
    test('should track iteration count', async () => {
      expect(agentSession.currentIteration).toBe(0);
      
      await agentSession.incrementIteration('Tool execution');
      expect(agentSession.currentIteration).toBe(1);
      
      await agentSession.incrementIteration('Another tool');
      expect(agentSession.currentIteration).toBe(2);
    });

    test('should enforce max iterations', async () => {
      // Set to near max
      for (let i = 0; i < 9; i++) {
        await agentSession.incrementIteration(`Iteration ${i + 1}`);
      }
      
      expect(agentSession.currentIteration).toBe(9);
      expect(agentSession.isAtMaxIterations()).toBe(false);
      
      await agentSession.incrementIteration('Final iteration');
      expect(agentSession.currentIteration).toBe(10);
      expect(agentSession.isAtMaxIterations()).toBe(true);
    });

    test('should prevent exceeding max iterations', async () => {
      // Reach max iterations
      for (let i = 0; i < 10; i++) {
        await agentSession.incrementIteration(`Iteration ${i + 1}`);
      }
      
      await expect(
        agentSession.incrementIteration('Should fail')
      ).rejects.toThrow('Maximum iterations reached');
    });

    test('should track iteration activities', async () => {
      await agentSession.incrementIteration('First activity');
      await agentSession.incrementIteration('Second activity');
      
      const activities = agentSession.getIterationHistory();
      expect(activities.length).toBe(2);
      expect(activities[0].activity).toBe('First activity');
      expect(activities[1].activity).toBe('Second activity');
    });
  });

  describe('Cost Tracking', () => {
    test('should track cost accumulation', async () => {
      expect(agentSession.totalCost).toBe(0);
      
      await agentSession.addCost(5.25, 'Tool execution');
      expect(agentSession.totalCost).toBe(5.25);
      
      await agentSession.addCost(3.75, 'API call');
      expect(agentSession.totalCost).toBe(9.0);
    });

    test('should enforce cost budget', async () => {
      // Approach budget limit
      await agentSession.addCost(20.0, 'Large operation');
      expect(agentSession.isNearBudgetLimit()).toBe(true);
      
      // Exceed budget
      await expect(
        agentSession.addCost(10.0, 'Would exceed budget')
      ).rejects.toThrow('Cost budget exceeded');
    });

    test('should warn when approaching budget limit', async () => {
      const warningSpy = jest.spyOn(mockLogger, 'warn');
      
      await agentSession.addCost(22.0, 'Near limit'); // 88% of 25.0 budget
      
      expect(warningSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('budget'),
        expect.any(Object)
      );
    });

    test('should provide cost breakdown', async () => {
      await agentSession.addCost(5.0, 'API call', { type: 'claude-api' });
      await agentSession.addCost(2.0, 'Tool execution', { type: 'command' });
      await agentSession.addCost(3.0, 'File processing', { type: 'claude-api' });
      
      const breakdown = agentSession.getCostBreakdown();
      expect(breakdown.total).toBe(10.0);
      expect(breakdown.byCategory['claude-api']).toBe(8.0);
      expect(breakdown.byCategory['command']).toBe(2.0);
    });
  });

  describe('State Persistence', () => {
    test('should save session state to database', async () => {
      await agentSession.saveState();
      
      expect(mockDb.sessions.updateSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          current_phase: 'EXPLORE',
          iteration_count: 0,
          total_cost: 0
        }),
        expect.any(Object)
      );
    });

    test('should auto-save state on significant changes', async () => {
      const saveSpy = jest.spyOn(agentSession, 'saveState');
      
      await agentSession.transitionToPhase('PLAN', 'Test');
      
      expect(saveSpy).toHaveBeenCalled();
    });

    test('should handle save errors gracefully', async () => {
      (mockDb.sessions.updateSession as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      
      // Should not throw, but log error
      const errorSpy = jest.spyOn(mockLogger, 'error');
      
      await agentSession.saveState();
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Failed to save'),
        expect.any(Object)
      );
    });
  });

  describe('Tool Integration', () => {
    test('should track tool executions', async () => {
      await agentSession.recordToolExecution('get_project_tree', 1500, true);
      await agentSession.recordToolExecution('write_files', 800, true);
      await agentSession.recordToolExecution('run_command', 2000, false, 'Command failed');
      
      const toolStats = agentSession.getToolStatistics();
      expect(toolStats.totalExecutions).toBe(3);
      expect(toolStats.successfulExecutions).toBe(2);
      expect(toolStats.failedExecutions).toBe(1);
      expect(toolStats.averageDuration).toBe((1500 + 800 + 2000) / 3);
    });

    test('should provide tool performance metrics', async () => {
      await agentSession.recordToolExecution('get_project_tree', 1000, true);
      await agentSession.recordToolExecution('get_project_tree', 1200, true);
      await agentSession.recordToolExecution('write_files', 500, true);
      
      const metrics = agentSession.getToolPerformanceMetrics();
      expect(metrics['get_project_tree'].averageDuration).toBe(1100);
      expect(metrics['get_project_tree'].executions).toBe(2);
      expect(metrics['write_files'].averageDuration).toBe(500);
      expect(metrics['write_files'].executions).toBe(1);
    });
  });

  describe('Session Status', () => {
    test('should provide comprehensive session status', () => {
      const status = agentSession.getSessionStatus();
      
      expect(status.sessionId).toBe('test_session_123');
      expect(status.phase).toBe('EXPLORE');
      expect(status.iteration).toBe(0);
      expect(status.cost).toBe(0);
      expect(status.progress).toBe(0);
      expect(status.isActive).toBe(true);
      expect(status.startTime).toBeDefined();
    });

    test('should calculate accurate progress percentage', async () => {
      await agentSession.incrementIteration('Test 1');
      await agentSession.incrementIteration('Test 2');
      await agentSession.incrementIteration('Test 3');
      
      const status = agentSession.getSessionStatus();
      expect(status.progress).toBe(30); // 3/10 * 100
    });

    test('should detect stuck sessions', async () => {
      // Simulate old last activity
      (agentSession as any).lastActivity = Date.now() - (61 * 60 * 1000); // 61 minutes ago
      
      expect(agentSession.isStuck()).toBe(true);
    });
  });

  describe('Cleanup and Termination', () => {
    test('should cleanup resources on session end', async () => {
      const destroySpy = jest.spyOn(mockProgress, 'destroy');
      
      await agentSession.endSession('completed', 'Task finished successfully');
      
      expect(agentSession.isActive).toBe(false);
      expect(agentSession.currentPhase).toBe('COMPLETE');
      expect(destroySpy).toHaveBeenCalled();
    });

    test('should save final state on session end', async () => {
      const saveSpy = jest.spyOn(agentSession, 'saveState');
      
      await agentSession.endSession('completed', 'Success');
      
      expect(saveSpy).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      const errorSpy = jest.spyOn(mockLogger, 'error');
      jest.spyOn(mockProgress, 'destroy').mockImplementation(() => {
        throw new Error('Cleanup error');
      });
      
      await agentSession.endSession('completed', 'Success');
      
      expect(errorSpy).toHaveBeenCalled();
      expect(agentSession.isActive).toBe(false); // Should still mark as inactive
    });
  });

  describe('Error Handling', () => {
    test('should handle database initialization failures', async () => {
      (mockDb.sessions.createSession as jest.Mock).mockRejectedValue(
        new Error('DB connection failed')
      );
      
      await expect(
        agentSession.initializeInDatabase()
      ).rejects.toThrow('DB connection failed');
    });

    test('should validate cost values', async () => {
      await expect(
        agentSession.addCost(-5.0, 'Invalid negative cost')
      ).rejects.toThrow('Cost must be positive');
      
      await expect(
        agentSession.addCost(Number.NaN, 'Invalid NaN cost')
      ).rejects.toThrow('Cost must be a valid number');
    });

    test('should handle concurrent modifications safely', async () => {
      // Simulate concurrent cost additions
      const promises = [
        agentSession.addCost(5.0, 'Concurrent 1'),
        agentSession.addCost(3.0, 'Concurrent 2'),
        agentSession.addCost(2.0, 'Concurrent 3')
      ];
      
      await Promise.all(promises);
      
      expect(agentSession.totalCost).toBe(10.0);
    });
  });

  describe('Integration with Progress Reporter', () => {
    test('should sync with progress reporter on updates', async () => {
      const updateSpy = jest.spyOn(mockProgress, 'updateIteration');
      
      await agentSession.incrementIteration('Test activity');
      
      expect(updateSpy).toHaveBeenCalledWith(1, 'Test activity');
    });

    test('should sync phase transitions with progress reporter', async () => {
      const phaseSpy = jest.spyOn(mockProgress, 'updatePhase');
      
      await agentSession.transitionToPhase('PLAN', 'Moving to planning');
      
      expect(phaseSpy).toHaveBeenCalledWith('PLAN', 'Moving to planning');
    });
  });
});
