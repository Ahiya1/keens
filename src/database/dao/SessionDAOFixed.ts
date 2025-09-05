/**
 * Fixed SessionDAO - Handles missing cost tracking columns gracefully
 * SECURITY: Fixes RLS test failures by making column usage optional
 * This version works with both old and new schema versions
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
  // OPTIONAL: Cost tracking fields (may not exist in schema)
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
  // OPTIONAL: Cost tracking fields
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
  apiCallCost?: number;
}

export class SessionDAOFixed {
  private costTrackingEnabled: boolean = false;
  
  constructor(private db: DatabaseManager) {
    this.detectCostTrackingSupport();
  }

  /**
   * Detect if cost tracking columns are available in the database
   */
  private async detectCostTrackingSupport(): Promise<void> {
    try {
      // Try to query the cost tracking columns
      await this.db.query(
        "SELECT api_calls_data FROM agent_sessions LIMIT 1",
        [],
      );
      this.costTrackingEnabled = true;
    } catch (error) {
      console.log('Cost tracking columns not available, using basic schema');
      this.costTrackingEnabled = false;
    }
  }

  /**
   * Create a new agent session with conditional cost tracking
   */
  async createSession(
    userId: string,
    request: CreateSessionRequest,
    context?: UserContext
  ): Promise<AgentSession> {
    const sessionId = uuidv4();
    const now = new Date();

    // Build query based on available columns
    let insertQuery: string;
    let insertValues: any[];

    if (this.costTrackingEnabled) {
      insertQuery = `
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
        )
        RETURNING *`;
      
      insertValues = [
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
      ];
    } else {
      // Basic schema without cost tracking columns
      insertQuery = `
        INSERT INTO agent_sessions (
          id, user_id, session_id, parent_session_id, session_depth, git_branch,
          vision, working_directory, current_phase, start_time, last_activity_at,
          phase_started_at, iteration_count, tool_calls_count, total_cost,
          tokens_used, context_window_size, files_modified, files_created,
          files_deleted, execution_status, streaming_enabled, websocket_connections,
          agent_options
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'EXPLORE', $9, $9, $9, 0, 0, 0.0,
          0, 1000000, '{}', '{}', '{}', 'running', true, '{}', $10
        )
        RETURNING *`;
      
      insertValues = [
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
      ];
    }

    const [session] = await this.db.query<AgentSession>(
      insertQuery,
      insertValues,
      context
    );

    return this.transformSession(session);
  }

  /**
   * Update session with conditional cost tracking support
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

    // OPTIONAL: Cost tracking fields (only if supported)
    if (this.costTrackingEnabled) {
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
   * Get session by ID
   */
  async getSession(
    sessionId: string,
    context?: UserContext
  ): Promise<AgentSession | null> {
    const sessions = await this.db.query<AgentSession>(
      "SELECT * FROM agent_sessions WHERE id = $1",
      [sessionId],
      context
    );

    return sessions.length > 0 ? this.transformSession(sessions[0]) : null;
  }

  /**
   * Get session by session_id string
   */
  async getSessionBySessionId(
    sessionId: string,
    context?: UserContext
  ): Promise<AgentSession | null> {
    const sessions = await this.db.query<AgentSession>(
      "SELECT * FROM agent_sessions WHERE session_id = $1",
      [sessionId],
      context
    );

    return sessions.length > 0 ? this.transformSession(sessions[0]) : null;
  }

  /**
   * Get sessions for user
   */
  async getUserSessions(
    userId: string,
    options: {
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
    );

    const total = parseInt(countResult[0]?.count?.toString() || "0", 10);

    // Get sessions
    const sessions = await this.db.query<AgentSession>(
      `
      SELECT * FROM agent_sessions
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      [...params, limit, offset],
      context
    );

    return {
      sessions: sessions.map(this.transformSession.bind(this)),
      total,
    };
  }

  /**
   * Transform database session record with optional cost data
   */
  private transformSession(session: any): AgentSession {
    const transformed: AgentSession = {
      ...session,
      files_modified: Array.isArray(session.files_modified)
        ? session.files_modified
        : typeof session.files_modified === "string"
          ? JSON.parse(session.files_modified)
          : [],
      files_created: Array.isArray(session.files_created)
        ? session.files_created
        : typeof session.files_created === "string"
          ? JSON.parse(session.files_created)
          : [],
      files_deleted: Array.isArray(session.files_deleted)
        ? session.files_deleted
        : typeof session.files_deleted === "string"
          ? JSON.parse(session.files_deleted)
          : [],
      websocket_connections: Array.isArray(session.websocket_connections)
        ? session.websocket_connections
        : typeof session.websocket_connections === "string"
          ? JSON.parse(session.websocket_connections)
          : [],
      agent_options:
        typeof session.agent_options === "object"
          ? session.agent_options
          : typeof session.agent_options === "string"
            ? JSON.parse(session.agent_options)
            : {},
      completion_report:
        typeof session.completion_report === "object"
          ? session.completion_report
          : typeof session.completion_report === "string"
            ? JSON.parse(session.completion_report)
            : null,
    };

    // Only add cost tracking fields if they exist in the database
    if (this.costTrackingEnabled && session.api_calls_data !== undefined) {
      transformed.api_calls_data = Array.isArray(session.api_calls_data)
        ? session.api_calls_data
        : typeof session.api_calls_data === "string"
          ? JSON.parse(session.api_calls_data)
          : [];
    }

    if (this.costTrackingEnabled && session.cost_breakdown !== undefined) {
      transformed.cost_breakdown =
        typeof session.cost_breakdown === "object"
          ? session.cost_breakdown
          : typeof session.cost_breakdown === "string"
            ? JSON.parse(session.cost_breakdown)
            : {};
    }

    if (this.costTrackingEnabled && session.total_api_cost !== undefined) {
      transformed.total_api_cost = parseFloat(session.total_api_cost || 0);
    }

    return transformed;
  }
}
