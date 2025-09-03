/**
 * SessionDAO Unit Tests
 * Tests session management with messages, thinking blocks, and conversation summaries
 */

import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { DatabaseManager, UserContext } from '../../src/database/DatabaseManager.js';
import { 
  SessionDAO, 
  CreateSessionRequest, 
  UpdateSessionRequest,
  AddMessageRequest,
  AddThinkingBlockRequest 
} from '../../src/database/dao/SessionDAO.js';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

// Mock DatabaseManager with comprehensive session support
class MockDatabaseManager {
  public sessions: any[] = [];
  public messages: any[] = [];
  public thinkingBlocks: any[] = [];
  public summaries: any[] = [];
  private uuidCounter = 1;

  generateUuid(): string {
    return `mock-uuid-${this.uuidCounter++}`;
  }

  async query<T = any>(text: string, params?: any[], context?: UserContext): Promise<T[]> {
    // Session creation
    if (text.includes('INSERT INTO agent_sessions')) {
      const session = {
        id: params?.[0] || this.generateUuid(),
        user_id: params?.[1],
        session_id: params?.[2],
        parent_session_id: params?.[3],
        session_depth: params?.[4] || 0,
        git_branch: params?.[5],
        vision: params?.[6],
        working_directory: params?.[7],
        current_phase: 'EXPLORE',
        start_time: new Date(),
        end_time: null as Date | null,
        last_activity_at: new Date(),
        phase_started_at: new Date(),
        iteration_count: 0,
        tool_calls_count: 0,
        total_cost: new Decimal(0),
        tokens_used: 0,
        context_window_size: 1000000,
        files_modified: [] as string[],
        files_created: [] as string[],
        files_deleted: [] as string[],
        execution_status: 'running',
        success: null as boolean | null,
        error_message: null as string | null,
        completion_report: null as Record<string, any> | null,
        streaming_enabled: true,
        streaming_time: null as number | null,
        websocket_connections: [] as string[],
        agent_options: params?.[8] || {},
        thinking_blocks: [] as any[],
        reasoning_chain: [] as string[],
        decision_points: {} as Record<string, any>,
        confidence_levels: { current: 0, trend: [] as number[], min: 0, max: 1 },
        created_at: new Date(),
        updated_at: new Date()
      };
      this.sessions.push(session);
      return [session] as T[];
    }

    // Session depth lookup for parent sessions - FIX: Return empty array if parent not found
    if (text.includes('SELECT session_depth FROM agent_sessions WHERE id')) {
      const parentId = params?.[0];
      const parent = this.sessions.find(s => s.id === parentId);
      if (parent) {
        return [{ session_depth: parent.session_depth }] as T[];
      } else {
        return [] as T[]; // No parent found, return empty array
      }
    }

    // Get session by ID
    if (text.includes('SELECT * FROM agent_sessions WHERE id')) {
      const sessionId = params?.[0];
      const session = this.sessions.find(s => s.id === sessionId);
      return session ? [session] as T[] : [] as T[];
    }

    // Update session
    if (text.includes('UPDATE agent_sessions')) {
      const sessionId = params?.[params.length - 1]; // Last parameter is usually the WHERE condition
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        // Parse the SET clause to understand which fields to update
        const setClause = text.match(/SET\s+(.*?)\s+WHERE/i)?.[1] || '';
        
        // Track parameter index for assignments
        let paramIdx = 0;
        
        // Update fields based on SET clause patterns
        if (setClause.includes('current_phase')) {
          session.current_phase = params?.[paramIdx++];
          session.phase_started_at = new Date(); // Handled by NOW()
        }
        
        if (setClause.includes('iteration_count')) {
          session.iteration_count = params?.[paramIdx++];
        }
        
        if (setClause.includes('tool_calls_count')) {
          session.tool_calls_count = params?.[paramIdx++];
        }
        
        if (setClause.includes('tokens_used')) {
          session.tokens_used = params?.[paramIdx++];
        }
        
        if (setClause.includes('files_modified')) {
          session.files_modified = params?.[paramIdx++];
        }
        
        if (setClause.includes('files_created')) {
          session.files_created = params?.[paramIdx++];
        }
        
        if (setClause.includes('files_deleted')) {
          session.files_deleted = params?.[paramIdx++];
        }
        
        if (setClause.includes('execution_status')) {
          session.execution_status = params?.[paramIdx++];
          if (['completed', 'failed'].includes(session.execution_status)) {
            session.end_time = new Date();
          }
        }
        
        if (setClause.includes('success')) {
          session.success = params?.[paramIdx++];
        }
        
        if (setClause.includes('error_message')) {
          session.error_message = params?.[paramIdx++];
        }
        
        if (setClause.includes('completion_report')) {
          session.completion_report = params?.[paramIdx++];
        }
        
        if (setClause.includes('streaming_time')) {
          session.streaming_time = params?.[paramIdx++];
        }
        
        if (setClause.includes('websocket_connections')) {
          session.websocket_connections = params?.[paramIdx++];
        }
        
        // Always update these if present in SET clause
        if (setClause.includes('last_activity_at')) {
          session.last_activity_at = new Date();
        }
        if (setClause.includes('updated_at')) {
          session.updated_at = new Date();
        }
        
        return [session] as T[];
      }
      return [] as T[];
    }

    // Update session activity
    if (text.includes('UPDATE agent_sessions SET last_activity_at')) {
      const sessionId = params?.[0];
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        session.last_activity_at = new Date();
        return [session] as T[];
      }
      return [] as T[];
    }

    // Get user sessions with count
    if (text.includes('SELECT COUNT(*) as count FROM agent_sessions WHERE user_id')) {
      const userId = params?.[0];
      const count = this.sessions.filter(s => s.user_id === userId).length;
      return [{ count: count.toString() }] as T[];
    }

    // Get user sessions with pagination - FIX: Proper parameter handling with null checks
    if (text.includes('SELECT * FROM agent_sessions') && text.includes('WHERE user_id') && text.includes('ORDER BY last_activity_at DESC')) {
      const userId = params?.[0];
      const limit = params?.[1] || 50;
      const offset = params?.[2] || 0;
      const userSessions = this.sessions
        .filter(s => s.user_id === userId)
        .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
        .slice(offset, offset + limit);
      return userSessions as T[];
    }

    // Message operations
    if (text.includes('SELECT COALESCE(MAX(message_index), -1) + 1 as max_index FROM agent_messages')) {
      const sessionId = params?.[0];
      const sessionMessages = this.messages.filter(m => m.session_id === sessionId);
      const maxIndex = sessionMessages.length > 0 ? Math.max(...sessionMessages.map(m => m.message_index)) : -1;
      return [{ max_index: maxIndex + 1 }] as T[];
    }

    if (text.includes('INSERT INTO agent_messages')) {
      const message = {
        id: params?.[0] || this.generateUuid(),
        session_id: params?.[1],
        user_id: params?.[2],
        message_index: params?.[3] || 0,
        message_type: params?.[4],
        content: params?.[5],
        thinking_content: params?.[6],
        phase: params?.[7],
        iteration: params?.[8] || 0,
        tool_calls: params?.[9] || '[]', // Keep as string to test JSON parsing
        tool_results: params?.[10] || '[]', // Keep as string to test JSON parsing
        confidence_level: params?.[11],
        reasoning: params?.[12],
        alternatives_considered: params?.[13] || [],
        decision_made: params?.[14],
        tokens_used: params?.[15] || 0,
        processing_time_ms: params?.[16],
        message_status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      this.messages.push(message);
      return [message] as T[];
    }

    // Get session messages - FIX: Added proper null checks for params
    if (text.includes('SELECT * FROM agent_messages') && text.includes('session_id = $1')) {
      const sessionId = params?.[0];
      let messages = this.messages.filter(m => m.session_id === sessionId && m.message_status === 'active');
      
      // Apply filters
      if (text.includes('AND message_type =')) {
        const messageType = params?.[1];
        messages = messages.filter(m => m.message_type === messageType);
      }
      if (text.includes('AND phase =')) {
        const phaseIndex = text.includes('AND message_type =') ? 2 : 1;
        const phase = params?.[phaseIndex];
        messages = messages.filter(m => m.phase === phase);
      }
      
      // Apply limit and offset with proper null checks
      if (text.includes('LIMIT') && params) {
        const limitIndex = params.findIndex(p => !isNaN(parseInt(p)) && parseInt(p) < 1000);
        if (limitIndex !== -1 && params[limitIndex]) {
          const limit = parseInt(params[limitIndex]);
          const offset = text.includes('OFFSET') && params[limitIndex + 1] ? parseInt(params[limitIndex + 1]) : 0;
          messages = messages.slice(offset, offset + limit);
        }
      }
      
      return messages.sort((a, b) => a.message_index - b.message_index) as T[];
    }

    // Thinking block operations
    if (text.includes('SELECT COALESCE(MAX(sequence_number), -1) + 1 as max_seq FROM thinking_blocks')) {
      const sessionId = params?.[0];
      const sessionBlocks = this.thinkingBlocks.filter(tb => tb.session_id === sessionId);
      const maxSeq = sessionBlocks.length > 0 ? Math.max(...sessionBlocks.map(tb => tb.sequence_number)) : -1;
      return [{ max_seq: maxSeq + 1 }] as T[];
    }

    if (text.includes('INSERT INTO thinking_blocks')) {
      const thinkingBlock = {
        id: params?.[0] || this.generateUuid(),
        session_id: params?.[1],
        message_id: params?.[2],
        user_id: params?.[3],
        sequence_number: params?.[4] || 0,
        thinking_type: params?.[5],
        thinking_content: params?.[6],
        context_snapshot: params?.[7] || '{}', // Keep as string to test JSON parsing
        problem_identified: params?.[8],
        options_considered: params?.[9] || [],
        decision_made: params?.[10],
        reasoning: params?.[11],
        confidence_level: params?.[12],
        predicted_outcome: params?.[13],
        thinking_start_time: new Date(),
        thinking_duration_ms: params?.[14],
        phase: params?.[15],
        iteration: params?.[16] || 0,
        created_at: new Date()
      };
      this.thinkingBlocks.push(thinkingBlock);
      return [thinkingBlock] as T[];
    }

    // Get thinking blocks
    if (text.includes('SELECT * FROM thinking_blocks') && text.includes('session_id = $1')) {
      const sessionId = params?.[0];
      let blocks = this.thinkingBlocks.filter(tb => tb.session_id === sessionId);
      
      // Apply filters
      if (text.includes('AND thinking_type =')) {
        const thinkingType = params?.[1];
        blocks = blocks.filter(tb => tb.thinking_type === thinkingType);
      }
      if (text.includes('AND phase =')) {
        const phaseIndex = text.includes('AND thinking_type =') ? 2 : 1;
        const phase = params?.[phaseIndex];
        blocks = blocks.filter(tb => tb.phase === phase);
      }
      
      return blocks.sort((a, b) => a.sequence_number - b.sequence_number) as T[];
    }

    // Conversation summary operations
    if (text.includes('SELECT generate_conversation_summary')) {
      const sessionId = params?.[0];
      const phase = params?.[1];
      const summaryId = this.generateUuid();
      
      const summary = {
        id: summaryId,
        session_id: sessionId,
        user_id: 'user-123', // Mock user
        phase,
        summary_text: `Summary for ${phase} phase`,
        key_decisions: [`Decision 1 for ${phase}`, `Decision 2 for ${phase}`],
        major_outcomes: [`Outcome 1 for ${phase}`],
        messages_count: this.messages.filter(m => m.session_id === sessionId && m.phase === phase).length,
        thinking_blocks_count: this.thinkingBlocks.filter(tb => tb.session_id === sessionId && tb.phase === phase).length,
        avg_confidence: 0.8,
        start_time: new Date(),
        end_time: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      this.summaries.push(summary);
      return [{ id: summaryId }] as T[];
    }

    if (text.includes('SELECT * FROM conversation_summaries WHERE id')) {
      const summaryId = params?.[0];
      const summary = this.summaries.find(s => s.id === summaryId);
      return summary ? [summary] as T[] : [] as T[];
    }

    if (text.includes('SELECT * FROM conversation_summaries WHERE session_id')) {
      const sessionId = params?.[0];
      return this.summaries.filter(s => s.session_id === sessionId).sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ) as T[];
    }

    return [] as T[];
  }

  async transaction<T>(callback: any, context?: UserContext): Promise<T> {
    return await callback(this);
  }
}

describe('SessionDAO', () => {
  let sessionDAO: SessionDAO;
  let mockDb: MockDatabaseManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new MockDatabaseManager();
    sessionDAO = new SessionDAO(mockDb as any);
    mockUuid.mockReturnValue('mock-uuid-1234');
  });

  describe('createSession', () => {
    it('should create new session successfully', async () => {
      const userId = 'user-123';
      const request: CreateSessionRequest = {
        sessionId: 'session-456',
        gitBranch: 'main',
        vision: 'Test project vision',
        workingDirectory: '/test/dir',
        agentOptions: { debug: true }
      };

      const session = await sessionDAO.createSession(userId, request);

      expect(session.user_id).toBe(userId);
      expect(session.session_id).toBe(request.sessionId);
      expect(session.git_branch).toBe(request.gitBranch);
      expect(session.vision).toBe(request.vision);
      expect(session.working_directory).toBe(request.workingDirectory);
      expect(session.agent_options).toEqual(request.agentOptions);
      expect(session.session_depth).toBe(0);
      expect(session.current_phase).toBe('EXPLORE');
      expect(session.execution_status).toBe('running');
    });
  });

  describe('updateSession', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionDAO.createSession('user-123', {
        sessionId: 'test-session',
        gitBranch: 'main',
        vision: 'Test vision',
        workingDirectory: '/test/dir'
      });
      sessionId = session.id;
    });

    it('should update session phase', async () => {
      const updates: UpdateSessionRequest = {
        currentPhase: 'PLAN'
      };

      const updatedSession = await sessionDAO.updateSession(sessionId, updates);

      expect(updatedSession.current_phase).toBe('PLAN');
    });
  });
});
