/**
 * SessionDAO - Enhanced with Cost Tracking and API Call Monitoring
 * Database operations for agent sessions with comprehensive cost tracking capabilities
 * UPDATED: Added Phase 3.3 support with PLAN and FOUND phases
 */

import { v4 as uuidv4 } from "uuid";
import {
  DatabaseManager,
  UserContext,
  DatabaseTransaction,
} from "../DatabaseManager.js";

export interface AgentSession {
  id: string;
  user_id: string;
  session_id: string;
  parent_session_id?: string;
  session_depth: number;
  git_branch: string;
  vision: string;
  working_directory: string;
  current_phase: "EXPLORE" | "PLAN" | "FOUND" | "SUMMON" | "COMPLETE";
  start_time: Date;
  end_time?: Date;
  last_activity_at: Date;
  phase_started_at: Date;
  iteration_count: number;
  tool_calls_count: number;
  total_cost: number;
  tokens_used: number;
  context_window_size: number;
  files_modified: string[];
  files_created: string[];
  files_deleted: string[];
  execution_status: "running" | "completed" | "failed" | "cancelled";
  success?: boolean;
  error_message?: string;
  completion_report?: any;
  streaming_enabled: boolean;
  streaming_time?: number;
  websocket_connections: string[];
  agent_options?: any;
  // NEW: Cost tracking fields
  api_calls_data?: any[];
  cost_breakdown?: any;
  total_api_cost?: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  message_type: "user" | "assistant" | "system" | "thinking";
  content: string;
  thinking_content?: string;
  phase: string;
  iteration: number;
  tool_calls: any[];
  tool_results: any[];
  tokens_used: number;
  processing_time_ms?: number;
  // NEW: Cost tracking fields
  api_call_cost?: number;
  created_at: Date;
}

export interface CreateSessionRequest {
  sessionId: string;
  parentSessionId?: string;
  sessionDepth?: number;
  gitBranch: string;
  vision: string;
  workingDirectory: string;
  agentOptions?: any;
}

export interface UpdateSessionRequest {
  currentPhase?: "EXPLORE" | "PLAN" | "FOUND" | "SUMMON" | "COMPLETE";
  iterationCount?: number;
  toolCallsCount?: number;
  totalCost?: number;
  tokensUsed?: number;
  contextWindowSize?: number;
  filesModified?: string[];
  filesCreated?: string[];
  filesDeleted?: string[];
  executionStatus?: "running" | "completed" | "failed" | "cancelled";
  success?: boolean;
  errorMessage?: string;
  completionReport?: any;
  streamingTime?: number;
  websocketConnections?: string[];
  endTime?: Date;
  // NEW: Cost tracking fields
  apiCallsData?: any[];
  costBreakdown?: any;
  totalApiCost?: number;
  apiCallsCount?: number;
}

export interface AddMessageRequest {
  messageType: "user" | "assistant" | "system" | "thinking";
  content: string;
  thinkingContent?: string;
  phase: string;
  iteration: number;
  toolCalls?: any[];
  toolResults?: any[];
  tokensUsed?: number;
  processingTimeMs?: number;
  // NEW: Cost tracking fields
  apiCallCost?: number;
}

export interface AddThinkingBlockRequest {
  thinkingType:,
    | "analysis"
    | "planning"
    | "decision"
    | "reflection"
    | "error_recovery";
  thinkingContent: string;
  contextSnapshot?: any;
  confidenceLevel?: number;
  phase: string;
  iteration: number;
  // NEW: Cost tracking fields
  associatedCost?: number;
}

export class SessionDAO {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new agent session with cost tracking initialization
   */
  async createSession(
    userId: string,
    request: CreateSessionRequest,
    context?: UserContext
  ): Promise<AgentSession> {
    const sessionId = uuidv4();
    const now = new Date();

    const [session] = await this.db.query<AgentSession>(
      `
      INSERT INTO agent_sessions (
        id, user_id, session_id, parent_session_id, session_depth, git_branch,
        vision, working_directory, current_phase, start_time, last_activity_at,
        phase_started_at, iteration_count, tool_calls_count, total_cost,
        tokens_used, context_window_size, files_modified, files_created,
        files_deleted, execution_status, streaming_enabled, websocket_connections,
        agent_options, api_calls_data, cost_breakdown, total_api_cost
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'EXPLORE', $9, $9, $9, 0, 0, 0.0,
        0, 1000000, '{}', '{}', '{}', 'running', true, '{}', $10, '[]', '{}', 0.0

      RETURNING *
      `,
      [
        sessionId,
        userId,
        request.sessionId,
        request.parentSessionId || null,
        request.sessionDepth || 0,
        request.gitBranch,
        request.vision,
        request.workingDirectory,
        now,
        request.agentOptions || {},
      ],
      context

    return this.transformSession(session);
  }

  /**
   * Update session with cost tracking support
   */
  async updateSession(
    sessionId: string,
    updates: UpdateSessionRequest,
    context?: UserContext
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.currentPhase !== undefined) {
      setClauses.push(`current_phase = $${paramIndex++}`);
      values.push(updates.currentPhase);

      setClauses.push(`phase_started_at = $${paramIndex++}`);
      values.push(new Date());
    }

    if (updates.iterationCount !== undefined) {
      setClauses.push(`iteration_count = $${paramIndex++}`);
      values.push(updates.iterationCount);
    }

    if (updates.toolCallsCount !== undefined) {
      setClauses.push(`tool_calls_count = $${paramIndex++}`);
      values.push(updates.toolCallsCount);
    }

    if (updates.totalCost !== undefined) {
      setClauses.push(`total_cost = $${paramIndex++}`);
      values.push(updates.totalCost);
    }

    if (updates.tokensUsed !== undefined) {
      setClauses.push(`tokens_used = $${paramIndex++}`);
      values.push(updates.tokensUsed);
    }

    if (updates.contextWindowSize !== undefined) {
      setClauses.push(`context_window_size = $${paramIndex++}`);
      values.push(updates.contextWindowSize);
    }

    if (updates.filesModified !== undefined) {
      setClauses.push(`files_modified = $${paramIndex++}`);
      values.push(JSON.stringify(updates.filesModified));
    }

    if (updates.filesCreated !== undefined) {
      setClauses.push(`files_created = $${paramIndex++}`);
      values.push(JSON.stringify(updates.filesCreated));
    }

    if (updates.filesDeleted !== undefined) {
      setClauses.push(`files_deleted = $${paramIndex++}`);
      values.push(JSON.stringify(updates.filesDeleted));
    }

    if (updates.executionStatus !== undefined) {
      setClauses.push(`execution_status = $${paramIndex++}`);
      values.push(updates.executionStatus);

      if (
        updates.executionStatus === "completed" ||
        updates.executionStatus === "failed"
      ) {
        setClauses.push(`end_time = $${paramIndex++}`);
        values.push(new Date());
      }
    }

    if (updates.endTime !== undefined) {
      setClauses.push(`end_time = $${paramIndex++}`);
      values.push(updates.endTime);
    }

    if (updates.success !== undefined) {
      setClauses.push(`success = $${paramIndex++}`);
      values.push(updates.success);
    }

    if (updates.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (updates.completionReport !== undefined) {
      setClauses.push(`completion_report = $${paramIndex++}`);
      values.push(JSON.stringify(updates.completionReport));
    }

    if (updates.streamingTime !== undefined) {
      setClauses.push(`streaming_time = $${paramIndex++}`);
      values.push(updates.streamingTime);
    }

    if (updates.websocketConnections !== undefined) {
      setClauses.push(`websocket_connections = $${paramIndex++}`);
      values.push(JSON.stringify(updates.websocketConnections));
    }

    // NEW: Cost tracking fields
    if (updates.apiCallsData !== undefined) {
      setClauses.push(`api_calls_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.apiCallsData));
    }

    if (updates.costBreakdown !== undefined) {
      setClauses.push(`cost_breakdown = $${paramIndex++}`);
      values.push(JSON.stringify(updates.costBreakdown));
    }

    if (updates.totalApiCost !== undefined) {
      setClauses.push(`total_api_cost = $${paramIndex++}`);
      values.push(updates.totalApiCost);
    }

    // Always update last_activity_at and updated_at
    setClauses.push(`last_activity_at = $${paramIndex++}`);
    values.push(new Date());

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    if (setClauses.length === 0) {
      return; // No updates to make
    }

    // Add session ID parameter
    values.push(sessionId);

    const query = `
      UPDATE agent_sessions 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
    `;

    await this.db.query(query, values, context);
  }

  /**
   * NEW: Update session costs specifically (optimized for frequent cost updates)
   */
  async updateSessionCosts(
    sessionId: string,
    costData: {,
      totalCost: number;
      totalApiCost: number;
      tokensUsed: number;
      apiCallsData: any[];
      costBreakdown: any;
    },
    context?: UserContext
  ): Promise<void> {
    await this.db.query(
      `
      UPDATE agent_sessions 
      SET total_cost = $1,
          total_api_cost = $2,
          tokens_used = $3,
          api_calls_data = $4,
          cost_breakdown = $5,
          last_activity_at = NOW(),
          updated_at = NOW()
      WHERE id = $6
      `,
      [
        costData.totalCost,
        costData.totalApiCost,
        costData.tokensUsed,
        JSON.stringify(costData.apiCallsData),
        JSON.stringify(costData.costBreakdown),
        sessionId,
      ],
      context

  }

  /**
   * Get session by ID with cost tracking data
   */
  async getSession(
    sessionId: string,
    context?: UserContext
  ): Promise<AgentSession | null> {
    const sessions = await this.db.query<AgentSession>(
      "SELECT * FROM agent_sessions WHERE id = $1",
      [sessionId],
      context

    return sessions.length > 0 ? this.transformSession(sessions[0]) : null;
  }

  /**
   * Get session by session_id string with cost tracking data
   */
  async getSessionBySessionId(
    sessionId: string,
    context?: UserContext
  ): Promise<AgentSession | null> {
    const sessions = await this.db.query<AgentSession>(
      "SELECT * FROM agent_sessions WHERE session_id = $1",
      [sessionId],
      context

    return sessions.length > 0 ? this.transformSession(sessions[0]) : null;
  }

  /**
   * Get sessions for user with cost tracking data
   */
  async getUserSessions(
    userId: string,
    options: {,
      limit?: number;
      offset?: number;
      status?: "running" | "completed" | "failed" | "cancelled";
      phase?: "EXPLORE" | "PLAN" | "FOUND" | "SUMMON" | "COMPLETE";
      orderBy?: string;
    } = {},
    context?: UserContext
  ): Promise<{ sessions: AgentSession[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    let whereClause = "WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND execution_status = $${paramIndex++}`;
      params.push(options.status);
    }

    if (options.phase) {
      whereClause += ` AND current_phase = $${paramIndex++}`;
      params.push(options.phase);
    }

    const orderBy = options.orderBy || "start_time DESC";

    // Get total count
    const countResult = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM agent_sessions ${whereClause}`,
      params,
      context

    const total = parseInt(countResult[0]?.count?.toString() || "0", 10);

    // Get sessions with cost data
    const sessions = await this.db.query<AgentSession>(
      `
      SELECT * FROM agent_sessions 
      ${whereClause} 
      ORDER BY ${orderBy} 
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      [...params, limit, offset],
      context

    return {
      sessions: sessions.map(this.transformSession),
      total,
    };
  }

  /**
   * Add message to session with cost tracking
   */
  async addMessage(
    sessionId: string,
    request: AddMessageRequest,
    context?: UserContext
  ): Promise<SessionMessage> {
    const messageId = uuidv4();

    const [message] = await this.db.query<SessionMessage>(
      `
      INSERT INTO session_messages (
        id, session_id, message_type, content, thinking_content, phase,
        iteration, tool_calls, tool_results, tokens_used, processing_time_ms,
        api_call_cost
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12

      RETURNING *
      `,
      [
        messageId,
        sessionId,
        request.messageType,
        request.content,
        request.thinkingContent || null,
        request.phase,
        request.iteration,
        JSON.stringify(request.toolCalls || []),
        JSON.stringify(request.toolResults || []),
        request.tokensUsed || 0,
        request.processingTimeMs || null,
        request.apiCallCost || 0,
      ],
      context

    return this.transformMessage(message);
  }

  /**
   * Get session messages with cost information
   */
  async getSessionMessages(
    sessionId: string,
    options: {,
      limit?: number;
      offset?: number;
      messageType?: "user" | "assistant" | "system" | "thinking";
    } = {},
    context?: UserContext
  ): Promise<SessionMessage[]> {
    const { limit = 50, offset = 0 } = options;

    let whereClause = "WHERE session_id = $1";
    const params: any[] = [sessionId];
    let paramIndex = 2;

    if (options.messageType) {
      whereClause += ` AND message_type = $${paramIndex++}`;
      params.push(options.messageType);
    }

    const messages = await this.db.query<SessionMessage>(
      `
      SELECT * FROM session_messages 
      ${whereClause} 
      ORDER BY created_at ASC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      [...params, limit, offset],
      context

    return messages.map(this.transformMessage);
  }

  /**
   * Add thinking block to session with cost tracking
   */
  async addThinkingBlock(
    sessionId: string,
    request: AddThinkingBlockRequest,
    context?: UserContext
  ): Promise<void> {
    const thinkingId = uuidv4();

    await this.db.query(
      `
      INSERT INTO session_thinking_blocks (
        id, session_id, thinking_type, thinking_content, context_snapshot,
        confidence_level, phase, iteration, associated_cost
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9

      `,
      [
        thinkingId,
        sessionId,
        request.thinkingType,
        request.thinkingContent,
        JSON.stringify(request.contextSnapshot || {}),
        request.confidenceLevel || 0.5,
        request.phase,
        request.iteration,
        request.associatedCost || 0,
      ],
      context

  }

  /**
   * NEW: Get session cost analytics
   */
  async getSessionCostAnalytics(
    sessionId: string,
    context?: UserContext
  ): Promise<{
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
    costByPhase: Record<string, number>;
    costOverTime: Array<{,
      timestamp: Date;
      cost: number;
      cumulativeCost: number;
    }>;
    expensiveOperations: Array<{,
      operation: string;
      cost: number;
      timestamp: Date;
    }>;
  } | null> {
    const session = await this.getSession(sessionId, context);

    if (!session || !session.api_calls_data) {
      return null;
    }

    const apiCalls = Array.isArray(session.api_calls_data)
      ? session.api_calls_data
      : [];
    const totalCost = apiCalls.reduce(
      (sum, call) => sum + (call.totalCost || 0),
      0

    const totalTokens = apiCalls.reduce(
      (sum, call) => sum + (call.totalTokens || 0),
      0

    // Cost by phase
    const costByPhase: Record<string, number> = {};
    apiCalls.forEach((call) => {
      const phase = call.phase || "UNKNOWN";
      costByPhase[phase] = (costByPhase[phase] || 0) + (call.totalCost || 0);
    });

    // Cost over time
    let cumulativeCost = 0;
    const costOverTime = apiCalls.map((call) => {
      cumulativeCost += call.totalCost || 0;
      return {
        timestamp: new Date(call.timestamp),
        cost: call.totalCost || 0,
        cumulativeCost,
      };
    });

    // Expensive operations (top 10)
    const expensiveOperations = apiCalls
      .map((call) => ({
        operation: `API Call (${call.inputTokens}+${call.outputTokens}+${call.thinkingTokens} tokens)`,
        cost: call.totalCost || 0,
        timestamp: new Date(call.timestamp),
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      totalCost,
      totalApiCalls: apiCalls.length,
      totalTokens,
      costByPhase,
      costOverTime,
      expensiveOperations,
    };
  }

  /**
   * NEW: Get cost summary for multiple sessions (admin analytics)
   */
  async getUserCostSummary(
    userId: string,
    options: {,
      startDate?: Date;
      endDate?: Date;
    } = {},
    context?: UserContext
  ): Promise<{
    totalCost: number;
    totalSessions: number;
    totalTokens: number;
    averageCostPerSession: number;
    costTrend: Array<{ date: Date; cost: number; sessions: number }>;
    topExpensiveSessions: Array<{,
      sessionId: string;
      vision: string;
      cost: number;
      startTime: Date;
    }>;
  }> {
    let whereClause = "WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (options.startDate) {
      whereClause += ` AND start_time >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      whereClause += ` AND start_time <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    const sessions = await this.db.query<AgentSession>(
      `SELECT * FROM agent_sessions ${whereClause} ORDER BY start_time DESC`,
      params,
      context

    const totalCost = sessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
    const totalTokens = sessions.reduce(
      (sum, s) => sum + (s.tokens_used || 0),
      0

    const averageCostPerSession =
      sessions.length > 0 ? totalCost / sessions.length : 0;

    // Top expensive sessions
    const topExpensiveSessions = sessions
      .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0))
      .slice(0, 10)
      .map((s) => ({
        sessionId: s.session_id,
        vision:,
          s.vision.substring(0, 100) + (s.vision.length > 100 ? "..." : ""),
        cost: s.total_cost || 0,
        startTime: s.start_time,
      }));

    // Cost trend (grouped by day)
    const costTrend: Array<{ date: Date; cost: number; sessions: number }> = [];
    const dailyData = new Map<string, { cost: number; sessions: number }>();

    sessions.forEach((session) => {
      const dateKey = session.start_time.toISOString().split("T")[0];
      const existing = dailyData.get(dateKey) || { cost: 0, sessions: 0 };
      existing.cost += session.total_cost || 0;
      existing.sessions += 1;
      dailyData.set(dateKey, existing);
    });

    dailyData.forEach((data, dateKey) => {
      costTrend.push({
        date: new Date(dateKey),
        cost: data.cost,
        sessions: data.sessions,
      });
    });

    costTrend.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalCost,
      totalSessions: sessions.length,
      totalTokens,
      averageCostPerSession,
      costTrend,
      topExpensiveSessions,
    };
  }

  /**
   * Transform database session record including cost data
   */
  private transformSession(session: any): AgentSession {
    return {
      ...session,
      files_modified: Array.isArray(session.files_modified),
        ? session.files_modified
        : typeof session.files_modified === "string"
          ? JSON.parse(session.files_modified)
          : [],
      files_created: Array.isArray(session.files_created),
        ? session.files_created
        : typeof session.files_created === "string"
          ? JSON.parse(session.files_created)
          : [],
      files_deleted: Array.isArray(session.files_deleted),
        ? session.files_deleted
        : typeof session.files_deleted === "string"
          ? JSON.parse(session.files_deleted)
          : [],
      websocket_connections: Array.isArray(session.websocket_connections),
        ? session.websocket_connections
        : typeof session.websocket_connections === "string"
          ? JSON.parse(session.websocket_connections)
          : [],
      agent_options:,
        typeof session.agent_options === "object"
          ? session.agent_options
          : typeof session.agent_options === "string"
            ? JSON.parse(session.agent_options)
            : {},
      completion_report:,
        typeof session.completion_report === "object"
          ? session.completion_report
          : typeof session.completion_report === "string"
            ? JSON.parse(session.completion_report)
            : null,
      // NEW: Transform cost tracking fields
      api_calls_data: Array.isArray(session.api_calls_data),
        ? session.api_calls_data
        : typeof session.api_calls_data === "string"
          ? JSON.parse(session.api_calls_data)
          : [],
      cost_breakdown:,
        typeof session.cost_breakdown === "object"
          ? session.cost_breakdown
          : typeof session.cost_breakdown === "string"
            ? JSON.parse(session.cost_breakdown)
            : {},
      total_api_cost: parseFloat(session.total_api_cost || 0),
    };
  }

  /**
   * Transform database message record including cost data
   */
  private transformMessage(message: any): SessionMessage {
    return {
      ...message,
      tool_calls: Array.isArray(message.tool_calls),
        ? message.tool_calls
        : typeof message.tool_calls === "string"
          ? JSON.parse(message.tool_calls)
          : [],
      tool_results: Array.isArray(message.tool_results),
        ? message.tool_results
        : typeof message.tool_results === "string"
          ? JSON.parse(message.tool_results)
          : [],
      api_call_cost: parseFloat(message.api_call_cost || 0),
    };
  }
}
