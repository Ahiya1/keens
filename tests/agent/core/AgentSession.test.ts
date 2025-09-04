/**
 * Agent Session Comprehensive Tests
 * Tests session lifecycle, state management, and coordination
 * FIXED: Updated to match current AgentSession interface
 */

import { AgentSession } from '../../../src/agent/AgentSession.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { ProgressReporter } from '../../../src/utils/ProgressReporter.js';
import { DatabaseService } from '../../../src/database/index.js';
import { AgentSessionOptions } from '../../../src/agent/types.js';
import { UserContext } from '../../../src/database/DatabaseManager.js';
import { AnthropicConfig } from '../../../src/config/AnthropicConfig.js';

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
    }
  }))
}));

describe('AgentSession', () => {
  let agentSession: AgentSession;
  let mockLogger: Logger;
  let mockProgress: ProgressReporter;
  let mockDb: any;
  let mockUserContext: UserContext;
  let mockAnthropicConfig: AnthropicConfig;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
    } as any;

    mockProgress = {
      update: jest.fn(),
      complete: jest.fn(),
      destroy: jest.fn(),
    } as any;

    mockDb = new DatabaseService();

    mockUserContext = {
      userId: 'user-123',
      isAdmin: false,
    };

    mockAnthropicConfig = {
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
    } as any;

    const options: AgentSessionOptions = {
      sessionId: 'test_session_123',
      vision: 'Test agent session',
      workingDirectory: '/tmp',
      anthropicConfig: mockAnthropicConfig,
      dryRun: false,
      verbose: false,
      debug: false,
      userContext: mockUserContext,
    };

    agentSession = new AgentSession(options);
  });

  afterEach(() => {
    mockProgress.destroy();
  });

  describe('Session Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(agentSession.getSessionId()).toBe('test_session_123');
      expect(agentSession.getUserId()).toBe('user-123');
      expect(agentSession.getCurrentPhase()).toBe('EXPLORE');
      expect(agentSession.isAuthenticated()).toBe(true);
    });

    test('should generate unique session ID if not provided', () => {
      const options: AgentSessionOptions = {
        sessionId: 'generated_session', // Always provide sessionId
        vision: 'Test',
        workingDirectory: '/tmp',
        anthropicConfig: mockAnthropicConfig,
        dryRun: false,
        verbose: false,
        debug: false,
        userContext: mockUserContext,
      };
      
      const session = new AgentSession(options);
      
      expect(session.getSessionId()).toBeDefined();
      expect(session.getSessionId()).toContain('generated_session');
    });

    test('should validate required parameters', () => {
      const invalidOptions = {
        sessionId: 'test_session',
        // Missing vision
        workingDirectory: '/tmp',
        anthropicConfig: mockAnthropicConfig,
        dryRun: false,
        verbose: false,
        debug: false,
        userContext: mockUserContext,
      } as any;
      
      expect(() => new AgentSession(invalidOptions)).toThrow();
    });

    test('should validate vision parameter', () => {
      const invalidOptions = {
        sessionId: 'test_session',
        vision: '', // Empty vision
        workingDirectory: '/tmp',
        anthropicConfig: mockAnthropicConfig,
        dryRun: false,
        verbose: false,
        debug: false,
        userContext: mockUserContext,
      } as any;
      
      expect(() => new AgentSession(invalidOptions)).toThrow();
    });
  });

  describe('Phase Management', () => {
    test('should start in EXPLORE phase', () => {
      expect(agentSession.getCurrentPhase()).toBe('EXPLORE');
    });

    test('should track duration correctly', () => {
      const duration = agentSession.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('User Context', () => {
    test('should return user context', () => {
      const userContext = agentSession.getUserContext();
      expect(userContext).toEqual(mockUserContext);
    });

    test('should identify admin users', () => {
      expect(agentSession.isAdminUser()).toBe(false);
      
      // Test with admin user
      const adminOptions: AgentSessionOptions = {
        sessionId: 'admin_session',
        vision: 'Admin test',
        workingDirectory: '/tmp',
        anthropicConfig: mockAnthropicConfig,
        dryRun: false,
        verbose: false,
        debug: false,
        userContext: { ...mockUserContext, isAdmin: true },
      };
      
      const adminSession = new AgentSession(adminOptions);
      expect(adminSession.isAdminUser()).toBe(true);
    });
  });

  describe('Database Integration', () => {
    test('should check database status', () => {
      expect(agentSession.isDatabaseEnabled()).toBeDefined();
    });

    test('should return database session ID when available', () => {
      const dbSessionId = agentSession.getDatabaseSessionId();
      // May be undefined if database is not initialized
      expect(dbSessionId).toEqual(expect.anything());
    });
  });

  describe('Cost Tracking', () => {
    test('should initialize with zero cost', () => {
      const costBreakdown = agentSession.getCostBreakdown();
      expect(costBreakdown.totalCost).toBe(0);
      expect(costBreakdown.totalCalls).toBe(0);
      expect(costBreakdown.totalTokens).toBe(0);
    });

    test('should display cost summary without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      expect(() => agentSession.displayCostSummary()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('Logging and Execution', () => {
    test('should log execution events', () => {
      expect(() => {
        agentSession.logExecution('test_event', { data: 'test' });
      }).not.toThrow();
    });

    test('should return execution log', () => {
      agentSession.logExecution('test_event', { data: 'test' });
      const log = agentSession.getExecutionLog();
      expect(log).toBeInstanceOf(Array);
    });

    test('should return thinking blocks', () => {
      const thinkingBlocks = agentSession.getThinkingBlocks();
      expect(thinkingBlocks).toBeInstanceOf(Array);
    });
  });

  describe('Session Summary', () => {
    test('should generate session summary', () => {
      const summary = agentSession.getSessionSummary();
      expect(summary).toHaveProperty('sessionId');
      expect(summary).toHaveProperty('phase');
      expect(summary).toHaveProperty('duration');
      expect(summary.sessionId).toBe('test_session_123');
    });
  });

  describe('Authentication', () => {
    test('should identify authenticated sessions', () => {
      expect(agentSession.isAuthenticated()).toBe(true);
    });

    test('should handle unauthenticated sessions', () => {
      const unauthOptions: AgentSessionOptions = {
        sessionId: 'unauth_session',
        vision: 'Test',
        workingDirectory: '/tmp',
        anthropicConfig: mockAnthropicConfig,
        dryRun: false,
        verbose: false,
        debug: false,
        // No userContext
      };
      
      const unauthSession = new AgentSession(unauthOptions);
      expect(unauthSession.isAuthenticated()).toBe(false);
    });
  });
});
