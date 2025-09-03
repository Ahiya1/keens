/**
 * keen Agent Session - Enhanced with Database Persistence and Cost Tracking
 * Session management with user context, file backup, PostgreSQL database integration, and comprehensive API cost tracking
 * UPDATED: Added Phase 3.3 support with PLAN and FOUND phases
 */

import { promises as fs } from "fs";
import path from "path";
import { AgentSessionOptions, ThinkingBlock, AgentPhase } from "./types.js";
import { UserContext, DatabaseManager } from "../database/DatabaseManager.js";
import {
  SessionDAO,
  CreateSessionRequest,
  UpdateSessionRequest,
  AddThinkingBlockRequest,
} from "../database/dao/SessionDAO.js";
import { getLogger } from "../utils/Logger.js";
import chalk from "chalk";

export interface ApiCallRecord {
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  totalCost: number;
  duration: number;
  requestId: string;
  isExtendedPricing: boolean;
  iteration?: number;
  phase?: AgentPhase;
}

export interface CostBreakdown {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  averageCostPerCall: number;
  averageTokensPerCall: number;
  extendedPricingCalls: number;
  costByPhase: Record<AgentPhase, number>;
}

export class AgentSession {
  private options: AgentSessionOptions;
  private thinkingBlocks: ThinkingBlock[] = [];
  private startTime: Date;
  private currentPhase: AgentPhase = "EXPLORE";
  private executionLog: any[] = [];
  private userContext?: UserContext;
  private logger = getLogger();

  // Database persistence integration
  private sessionDAO?: SessionDAO;
  private databaseSessionId?: string;
  private iterationCount: number = 0;
  private toolCallsCount: number = 0;
  private tokensUsed: number = 0;
  private filesModified: string[] = [];
  private filesCreated: string[] = [];
  private filesDeleted: string[] = [];
  private databaseInitialized: boolean = false;

  // NEW: Cost tracking with Phase 3.3 support
  private apiCalls: ApiCallRecord[] = [];
  private totalCost: number = 0;
  private totalApiCalls: number = 0;
  private costByPhase: Record<AgentPhase, number> = {
    EXPLORE: 0,
    PLAN: 0,
    FOUND: 0,
    SUMMON: 0,
    COMPLETE: 0,
  };

  constructor(options: AgentSessionOptions) {
    this.options = options;
    this.userContext = options.userContext;
    this.startTime = new Date();

    // Initialize database integration if user context is available
    if (this.userContext) {
      this.initializeDatabaseIntegration();
    }
  }

  /**
   * Initialize database integration
   */
  private async initializeDatabaseIntegration(): Promise<void> {
    try {
      if (!this.userContext) {
        console.warn(
          chalk.yellow("⚠️  No user context - database persistence disabled")
        );
        return;
      }

      const dbManager = new DatabaseManager();
      this.sessionDAO = new SessionDAO(dbManager);
      this.databaseInitialized = true;

      if (this.options.debug) {
        console.log(
          chalk.green(
            `✅ Database integration initialized for user ${this.userContext.userId.substring(0, 8)}...`
          )
        );
      }
    } catch (error: any) {
      console.warn(
        chalk.yellow(`⚠️  Database integration failed: ${error.message}`)
      );
      console.warn(chalk.yellow(`📁 Falling back to file-based storage only`));
      this.databaseInitialized = false;
    }
  }

  /**
   * Start the agent session with user context and database persistence
   */
  async start(): Promise<void> {
    if (this.options.verbose) {
      console.log(
        chalk.blue(`🚀 Starting agent session: ${this.options.sessionId}`)
      );

      if (this.userContext) {
        console.log(
          chalk.gray(
            `👤 User: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }
    }

    // Create session in database if available
    if (this.databaseInitialized && this.sessionDAO && this.userContext) {
      try {
        const createRequest: CreateSessionRequest = {
          sessionId: this.options.sessionId,
          gitBranch: this.options.gitBranch || "main",
          vision: this.options.vision || "Agent session vision",
          workingDirectory: this.options.workingDirectory,
          agentOptions: {
            verbose: this.options.verbose,
            debug: this.options.debug,
            anthropicConfig: this.options.anthropicConfig,
            specialization: this.options.specialization,
            parentSessionId: this.options.parentSessionId,
            maxRecursionDepth: this.options.maxRecursionDepth,
          },
        };

        const dbSession = await this.sessionDAO.createSession(
          this.userContext.userId,
          createRequest,
          this.userContext
        );

        this.databaseSessionId = dbSession.id;

        if (this.options.verbose) {
          console.log(
            chalk.green(
              `💾 Session created in database: ${this.databaseSessionId.substring(0, 8)}...`
            )
          );
        }
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to create database session: ${error.message}`
          )
        );
        console.warn(
          chalk.yellow(`📁 Continuing with file-based storage only`)
        );
      }
    }

    // Log session start with user context
    this.logExecution("session_start", {
      sessionId: this.options.sessionId,
      databaseSessionId: this.databaseSessionId,
      vision: this.options.vision?.substring(0, 200),
      workingDirectory: this.options.workingDirectory,
      startTime: this.startTime.toISOString(),
      userContext: this.userContext
        ? {
            userId: this.userContext.userId.substring(0, 8) + "...",
            isAdmin: this.userContext.isAdmin,
          }
        : null,
      databaseEnabled: this.databaseInitialized,
      specialization: this.options.specialization,
      parentSessionId: this.options.parentSessionId,
      gitBranch: this.options.gitBranch,
    });
  }

  /**
   * NEW: Record API call with comprehensive cost tracking
   */
  async recordApiCall(apiCallData: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    inputCost: number;
    outputCost: number;
    thinkingCost: number;
    totalCost: number;
    duration: number;
    isExtendedPricing: boolean;
  }): Promise<void> {
    const thinkingTokens = apiCallData.thinkingTokens || 0;
    const totalTokens =
      apiCallData.inputTokens + apiCallData.outputTokens + thinkingTokens;

    const apiCall: ApiCallRecord = {
      timestamp: new Date(),
      model: apiCallData.model,
      inputTokens: apiCallData.inputTokens,
      outputTokens: apiCallData.outputTokens,
      thinkingTokens: thinkingTokens,
      totalTokens: totalTokens,
      inputCost: apiCallData.inputCost,
      outputCost: apiCallData.outputCost,
      thinkingCost: apiCallData.thinkingCost,
      totalCost: apiCallData.totalCost,
      duration: apiCallData.duration,
      isExtendedPricing: apiCallData.isExtendedPricing,
      requestId: `api_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      iteration: this.iterationCount,
      phase: this.currentPhase,
    };

    // Store the API call
    this.apiCalls.push(apiCall);
    this.totalCost += apiCallData.totalCost;
    this.totalApiCalls += 1;
    this.tokensUsed += totalTokens;
    this.costByPhase[this.currentPhase] += apiCallData.totalCost;

    // Log detailed cost information
    await this.logger.logApiCall(
      apiCallData.model,
      apiCallData.inputTokens,
      apiCallData.outputTokens,
      thinkingTokens,
      apiCallData.duration,
      apiCallData.totalCost
    );

    // Enhanced console output for cost tracking
    console.log(
      chalk.green(`💰 API Call Cost: $${apiCallData.totalCost.toFixed(4)}`)
    );
    console.log(
      chalk.gray(
        `   📊 Tokens: ${apiCallData.inputTokens.toLocaleString()}in + ${apiCallData.outputTokens.toLocaleString()}out + ${thinkingTokens.toLocaleString()}think = ${totalTokens.toLocaleString()} total`
      )
    );
    console.log(
      chalk.gray(
        `   💵 Breakdown: $${apiCallData.inputCost.toFixed(4)} + $${apiCallData.outputCost.toFixed(4)} + $${apiCallData.thinkingCost.toFixed(4)}`
      )
    );
    console.log(chalk.gray(`   ⏱️  Duration: ${apiCallData.duration}ms`));
    console.log(
      chalk.gray(
        `   🏷️  Pricing: ${apiCallData.isExtendedPricing ? "Extended (>200K)" : "Standard"}`
      )
    );
    console.log(
      chalk.cyan(
        `   📈 Session Total: $${this.totalCost.toFixed(4)} (${this.totalApiCalls} calls)`
      )
    );

    // Update database session with cost data
    await this.updateDatabaseSession({
      totalCost: this.totalCost,
      apiCallsCount: this.totalApiCalls,
      tokensUsed: this.tokensUsed,
    });

    // Log execution event
    this.logExecution("api_call", {
      requestId: apiCall.requestId,
      model: apiCallData.model,
      tokens: {
        input: apiCallData.inputTokens,
        output: apiCallData.outputTokens,
        thinking: thinkingTokens,
        total: totalTokens,
      },
      cost: {
        input: apiCallData.inputCost,
        output: apiCallData.outputCost,
        thinking: apiCallData.thinkingCost,
        total: apiCallData.totalCost,
      },
      duration: apiCallData.duration,
      isExtendedPricing: apiCallData.isExtendedPricing,
      phase: this.currentPhase,
      iteration: this.iterationCount,
      sessionTotalCost: this.totalCost,
      sessionTotalCalls: this.totalApiCalls,
    });
  }

  /**
   * NEW: Get comprehensive cost breakdown with Phase 3.3 support
   */
  getCostBreakdown(): CostBreakdown {
    if (this.apiCalls.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        inputCost: 0,
        outputCost: 0,
        thinkingCost: 0,
        averageCostPerCall: 0,
        averageTokensPerCall: 0,
        extendedPricingCalls: 0,
        costByPhase: { EXPLORE: 0, PLAN: 0, FOUND: 0, SUMMON: 0, COMPLETE: 0 },
      };
    }

    const totalInputTokens = this.apiCalls.reduce(
      (sum, call) => sum + call.inputTokens,
      0
    );
    const totalOutputTokens = this.apiCalls.reduce(
      (sum, call) => sum + call.outputTokens,
      0
    );
    const totalThinkingTokens = this.apiCalls.reduce(
      (sum, call) => sum + call.thinkingTokens,
      0
    );
    const totalTokens =
      totalInputTokens + totalOutputTokens + totalThinkingTokens;
    const totalInputCost = this.apiCalls.reduce(
      (sum, call) => sum + call.inputCost,
      0
    );
    const totalOutputCost = this.apiCalls.reduce(
      (sum, call) => sum + call.outputCost,
      0
    );
    const totalThinkingCost = this.apiCalls.reduce(
      (sum, call) => sum + call.thinkingCost,
      0
    );
    const extendedPricingCalls = this.apiCalls.filter(
      (call) => call.isExtendedPricing
    ).length;

    return {
      totalCost: this.totalCost,
      totalTokens: totalTokens,
      totalCalls: this.totalApiCalls,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      thinkingTokens: totalThinkingTokens,
      inputCost: totalInputCost,
      outputCost: totalOutputCost,
      thinkingCost: totalThinkingCost,
      averageCostPerCall: this.totalCost / this.totalApiCalls,
      averageTokensPerCall: totalTokens / this.totalApiCalls,
      extendedPricingCalls: extendedPricingCalls,
      costByPhase: { ...this.costByPhase },
    };
  }

  /**
   * NEW: Display cost summary with Phase 3.3 phases
   */
  displayCostSummary(): void {
    const breakdown = this.getCostBreakdown();

    console.log(chalk.blue("\n💰 Session Cost Summary"));
    console.log(chalk.gray("━".repeat(50)));
    console.log(
      chalk.cyan(`💵 Total Cost: $${breakdown.totalCost.toFixed(4)}`)
    );
    console.log(chalk.cyan(`📞 API Calls: ${breakdown.totalCalls}`));
    console.log(
      chalk.cyan(`🪙 Total Tokens: ${breakdown.totalTokens.toLocaleString()}`)
    );
    console.log(
      chalk.cyan(
        `📊 Average per call: $${breakdown.averageCostPerCall.toFixed(4)} (${Math.round(breakdown.averageTokensPerCall).toLocaleString()} tokens)`
      )
    );

    if (breakdown.extendedPricingCalls > 0) {
      console.log(
        chalk.yellow(
          `⚠️  Extended pricing calls: ${breakdown.extendedPricingCalls}/${breakdown.totalCalls}`
        )
      );
    }

    console.log(chalk.cyan("\n📈 Cost by Phase:"));
    Object.entries(breakdown.costByPhase).forEach(([phase, cost]) => {
      if (cost > 0) {
        const percentage = ((cost / breakdown.totalCost) * 100).toFixed(1);
        console.log(
          chalk.gray(`   ${phase}: $${cost.toFixed(4)} (${percentage}%)`)
        );
      }
    });

    console.log(chalk.cyan("\n🧮 Token Breakdown:"));
    console.log(
      chalk.gray(
        `   Input: ${breakdown.inputTokens.toLocaleString()} tokens ($${breakdown.inputCost.toFixed(4)})`
      )
    );
    console.log(
      chalk.gray(
        `   Output: ${breakdown.outputTokens.toLocaleString()} tokens ($${breakdown.outputCost.toFixed(4)})`
      )
    );
    if (breakdown.thinkingTokens > 0) {
      console.log(
        chalk.gray(
          `   Thinking: ${breakdown.thinkingTokens.toLocaleString()} tokens ($${breakdown.thinkingCost.toFixed(4)})`
        )
      );
    }
    console.log(chalk.gray("━".repeat(50)));
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.options.sessionId;
  }

  /**
   * Get database session ID
   */
  getDatabaseSessionId(): string | undefined {
    return this.databaseSessionId;
  }

  /**
   * Log execution event with user context and database update
   */
  logExecution(eventType: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.options.sessionId,
      databaseSessionId: this.databaseSessionId,
      eventType,
      data,
      userContext: this.userContext
        ? {
            userId: this.userContext.userId.substring(0, 8) + "...",
            isAdmin: this.userContext.isAdmin,
          }
        : null,
    };

    this.executionLog.push(logEntry);

    if (eventType !== "session_start") {
      this.updateDatabaseSession({ iterationCount: this.iterationCount + 1 });
    }

    if (this.options.debug) {
      console.log(chalk.gray(`[DEBUG] ${eventType}: ${JSON.stringify(data)}`));
      if (this.userContext && this.options.debug) {
        console.log(
          chalk.gray(
            `[USER] ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }
    }
  }

  /**
   * Store thinking block with user context and database persistence
   */
  async storeThinkingBlock(block: ThinkingBlock): Promise<void> {
    const enhancedBlock: ThinkingBlock = {
      ...block,
      userContext: this.userContext
        ? {
            userId: this.userContext.userId,
            isAdmin: this.userContext.isAdmin,
          }
        : undefined,
    };

    this.thinkingBlocks.push(enhancedBlock);

    // Store thinking block in database
    if (
      this.databaseInitialized &&
      this.sessionDAO &&
      this.databaseSessionId &&
      this.userContext
    ) {
      try {
        const addThinkingRequest: AddThinkingBlockRequest = {
          thinkingType: this.mapThinkingType(block.type || "analysis"),
          thinkingContent: block.content,
          contextSnapshot: {
            phase: this.currentPhase,
            iteration: this.iterationCount,
            timestamp: new Date().toISOString(),
          },
          confidenceLevel: block.confidence || 0.5,
          phase: this.currentPhase,
          iteration: this.iterationCount,
        };

        await this.sessionDAO.addThinkingBlock(
          this.databaseSessionId,
          addThinkingRequest,
          this.userContext
        );

        if (this.options.debug) {
          console.log(chalk.green(`💾 Thinking block stored in database`));
        }
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to store thinking block in database: ${error.message}`
          )
        );
      }
    }

    if (this.options.verbose) {
      console.log(
        chalk.magenta(`🧠 Thinking: ${block.content.substring(0, 100)}...`)
      );

      if (this.userContext && this.options.debug) {
        console.log(
          chalk.gray(
            `👤 User: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }
    }
  }

  /**
   * Map thinking block type to database enum
   */
  private mapThinkingType(
    type: string
  ): "analysis" | "planning" | "decision" | "reflection" | "error_recovery" {
    const typeMap: Record<
      string,
      "analysis" | "planning" | "decision" | "reflection" | "error_recovery"
    > = {
      analysis: "analysis",
      planning: "planning",
      plan: "planning",
      decision: "decision",
      decide: "decision",
      reflection: "reflection",
      reflect: "reflection",
      error: "error_recovery",
      error_recovery: "error_recovery",
    };

    return typeMap[type.toLowerCase()] || "analysis";
  }

  /**
   * Update current phase with user context logging and database persistence
   */
  async updatePhase(phase: AgentPhase): Promise<void> {
    const previousPhase = this.currentPhase;
    this.currentPhase = phase;

    this.logExecution("phase_transition", {
      from: previousPhase,
      to: phase,
      timestamp: new Date().toISOString(),
      userContext: this.userContext
        ? {
            userId: this.userContext.userId.substring(0, 8) + "...",
            isAdmin: this.userContext.isAdmin,
          }
        : null,
    });

    // Update phase in database
    await this.updateDatabaseSession({ currentPhase: phase });

    if (this.options.verbose) {
      console.log(
        chalk.blue(`🔄 Phase transition: ${previousPhase} → ${phase}`)
      );

      if (this.userContext) {
        console.log(
          chalk.gray(
            `👤 By user: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }
    }
  }

  /**
   * Update session metrics
   */
  async updateMetrics(updates: {
    toolCallsCount?: number;
    tokensUsed?: number;
    filesModified?: string[];
    filesCreated?: string[];
    filesDeleted?: string[];
  }): Promise<void> {
    if (updates.toolCallsCount !== undefined) {
      this.toolCallsCount = updates.toolCallsCount;
    }
    if (updates.tokensUsed !== undefined) {
      this.tokensUsed = updates.tokensUsed;
    }
    if (updates.filesModified !== undefined) {
      this.filesModified = updates.filesModified;
    }
    if (updates.filesCreated !== undefined) {
      this.filesCreated = updates.filesCreated;
    }
    if (updates.filesDeleted !== undefined) {
      this.filesDeleted = updates.filesDeleted;
    }

    // Update database
    await this.updateDatabaseSession({
      toolCallsCount: this.toolCallsCount,
      tokensUsed: this.tokensUsed,
      filesModified: this.filesModified,
      filesCreated: this.filesCreated,
      filesDeleted: this.filesDeleted,
    });
  }

  /**
   * Update session in database
   */
  private async updateDatabaseSession(
    updates: UpdateSessionRequest
  ): Promise<void> {
    if (
      !this.databaseInitialized ||
      !this.sessionDAO ||
      !this.databaseSessionId ||
      !this.userContext
    ) {
      return;
    }

    try {
      // Include cost data in updates
      const enhancedUpdates = {
        ...updates,
        iterationCount: this.iterationCount++,
        totalCost: this.totalCost,
        apiCallsData: this.apiCalls,
        costBreakdown: this.getCostBreakdown(),
      };

      await this.sessionDAO.updateSession(
        this.databaseSessionId,
        enhancedUpdates,
        this.userContext
      );

      if (this.options.debug) {
        console.log(
          chalk.green(
            `💾 Session updated in database (cost: $${this.totalCost.toFixed(4)})`
          )
        );
      }
    } catch (error: any) {
      console.warn(
        chalk.yellow(
          `⚠️  Failed to update session in database: ${error.message}`
        )
      );
    }
  }

  /**
   * Complete session with final status
   */
  async completeSession(
    success: boolean,
    completionReport?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    // Display final cost summary
    this.displayCostSummary();

    await this.updateDatabaseSession({
      executionStatus: success ? "completed" : "failed",
      success,
      completionReport: {
        ...completionReport,
        finalCost: this.totalCost,
        costBreakdown: this.getCostBreakdown(),
      },
      errorMessage,
      totalCost: this.totalCost,
    });

    this.logExecution("session_complete", {
      success,
      duration: this.getDuration(),
      completionReport,
      errorMessage,
      finalCost: this.totalCost,
      totalApiCalls: this.totalApiCalls,
    });
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): AgentPhase {
    return this.currentPhase;
  }

  /**
   * Get session duration
   */
  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get thinking blocks
   */
  getThinkingBlocks(): ThinkingBlock[] {
    return [...this.thinkingBlocks];
  }

  /**
   * Get execution log
   */
  getExecutionLog(): any[] {
    return [...this.executionLog];
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext | undefined {
    return this.userContext;
  }

  /**
   * Check if user is admin
   */
  isAdminUser(): boolean {
    return this.userContext?.isAdmin || false;
  }

  /**
   * Get user ID (safely)
   */
  getUserId(): string | undefined {
    return this.userContext?.userId;
  }

  /**
   * Check authentication status
   */
  isAuthenticated(): boolean {
    return !!this.userContext?.userId;
  }

  /**
   * Check if database persistence is enabled
   */
  isDatabaseEnabled(): boolean {
    return this.databaseInitialized && !!this.databaseSessionId;
  }

  /**
   * Save session to disk with enhanced cost data
   */
  async saveSession(outputDir?: string): Promise<string> {
    const sessionData = {
      sessionId: this.options.sessionId,
      databaseSessionId: this.databaseSessionId,
      vision: this.options.vision,
      visionFile: this.options.visionFile,
      workingDirectory: this.options.workingDirectory,
      startTime: this.startTime.toISOString(),
      currentPhase: this.currentPhase,
      duration: this.getDuration(),
      thinkingBlocks: this.thinkingBlocks,
      executionLog: this.executionLog,
      anthropicConfig: this.options.anthropicConfig,

      // Enhanced user context in saved session
      userContext: this.userContext
        ? {
            userId: this.userContext.userId,
            isAdmin: this.userContext.isAdmin,
            adminPrivileges: this.userContext.adminPrivileges,
          }
        : null,

      authenticationInfo: {
        authenticated: this.isAuthenticated(),
        isAdmin: this.isAdminUser(),
        savedAt: new Date().toISOString(),
      },

      // Database integration info
      databaseIntegration: {
        enabled: this.databaseInitialized,
        sessionId: this.databaseSessionId,
        persistedToDatabase: this.isDatabaseEnabled(),
      },

      // Session metrics
      metrics: {
        iterationCount: this.iterationCount,
        toolCallsCount: this.toolCallsCount,
        tokensUsed: this.tokensUsed,
        filesModified: this.filesModified,
        filesCreated: this.filesCreated,
        filesDeleted: this.filesDeleted,
      },

      // NEW: Complete cost tracking data
      costTracking: {
        totalCost: this.totalCost,
        totalApiCalls: this.totalApiCalls,
        apiCalls: this.apiCalls,
        costBreakdown: this.getCostBreakdown(),
        costByPhase: this.costByPhase,
      },

      // Phase 3.3 information
      phase33Info: {
        specialization: this.options.specialization,
        parentSessionId: this.options.parentSessionId,
        gitBranch: this.options.gitBranch,
        maxRecursionDepth: this.options.maxRecursionDepth,
      },
    };

    const saveDir =
      outputDir || path.join(this.options.workingDirectory, ".keen-sessions");
    const fileName = `${this.options.sessionId}.json`;
    const filePath = path.join(saveDir, fileName);

    try {
      await fs.mkdir(saveDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));

      if (this.options.verbose) {
        console.log(chalk.green(`💾 Session saved: ${filePath}`));
        console.log(
          chalk.green(
            `💰 Final cost: $${this.totalCost.toFixed(4)} (${this.totalApiCalls} API calls)`
          )
        );

        if (this.isDatabaseEnabled()) {
          console.log(
            chalk.green(
              `💾 Also persisted in database: ${this.databaseSessionId?.substring(0, 8)}...`
            )
          );
        }

        if (this.userContext) {
          console.log(
            chalk.gray(
              `👤 Saved by user: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
            )
          );
        }
      }

      return filePath;
    } catch (error: any) {
      console.error(chalk.red(`Failed to save session: ${error.message}`));

      if (this.userContext && this.options.debug) {
        console.error(
          chalk.gray(
            `User context: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }

      throw error;
    }
  }

  /**
   * Load session from disk with user context validation
   */
  static async loadSession(sessionFile: string): Promise<any> {
    try {
      const sessionData = JSON.parse(await fs.readFile(sessionFile, "utf-8"));

      // Log user context from loaded session if available
      if (sessionData.userContext) {
        console.log(
          chalk.blue(
            `👤 Loaded session for user: ${sessionData.userContext.userId.substring(0, 8)}...${sessionData.userContext.isAdmin ? " (Admin)" : ""}`
          )
        );
      }

      // Log database integration status
      if (sessionData.databaseIntegration) {
        const dbInfo = sessionData.databaseIntegration;
        console.log(
          chalk.blue(
            `💾 Database integration: ${dbInfo.enabled ? "Enabled" : "Disabled"} ${dbInfo.persistedToDatabase ? "(Persisted)" : "(File only)"}`
          )
        );
      }

      // NEW: Log cost information from saved session
      if (sessionData.costTracking) {
        const cost = sessionData.costTracking;
        console.log(
          chalk.blue(
            `💰 Session cost: $${cost.totalCost.toFixed(4)} (${cost.totalApiCalls} API calls)`
          )
        );
      }

      // Phase 3.3 info
      if (sessionData.phase33Info) {
        const p33 = sessionData.phase33Info;
        console.log(
          chalk.blue(
            `🌟 Phase 3.3: ${p33.specialization} specialist${p33.parentSessionId ? " (child)" : " (root)"}`
          )
        );
      }

      return sessionData;
    } catch (error: any) {
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  /**
   * Get session summary with authentication info, database status, and cost data
   */
  getSessionSummary(): {
    sessionId: string;
    databaseSessionId?: string;
    phase: AgentPhase;
    duration: number;
    authenticated: boolean;
    isAdmin: boolean;
    userId?: string;
    thinkingBlocksCount: number;
    executionEventsCount: number;
    databaseEnabled: boolean;
    costSummary: {
      totalCost: number;
      totalApiCalls: number;
      totalTokens: number;
      averageCostPerCall: number;
      costByPhase: Record<AgentPhase, number>;
    };
    metrics: {
      iterationCount: number;
      toolCallsCount: number;
      tokensUsed: number;
      filesModified: number;
      filesCreated: number;
      filesDeleted: number;
    };
    phase33Info: {
      specialization: string;
      parentSessionId?: string;
      gitBranch: string;
      maxRecursionDepth: number;
    };
  } {
    const costBreakdown = this.getCostBreakdown();

    return {
      sessionId: this.options.sessionId,
      databaseSessionId: this.databaseSessionId,
      phase: this.currentPhase,
      duration: this.getDuration(),
      authenticated: this.isAuthenticated(),
      isAdmin: this.isAdminUser(),
      userId: this.userContext?.userId?.substring(0, 8) + "...",
      thinkingBlocksCount: this.thinkingBlocks.length,
      executionEventsCount: this.executionLog.length,
      databaseEnabled: this.isDatabaseEnabled(),
      costSummary: {
        totalCost: this.totalCost,
        totalApiCalls: this.totalApiCalls,
        totalTokens: costBreakdown.totalTokens,
        averageCostPerCall: costBreakdown.averageCostPerCall,
        costByPhase: this.costByPhase,
      },
      metrics: {
        iterationCount: this.iterationCount,
        toolCallsCount: this.toolCallsCount,
        tokensUsed: this.tokensUsed,
        filesModified: this.filesModified.length,
        filesCreated: this.filesCreated.length,
        filesDeleted: this.filesDeleted.length,
      },
      phase33Info: {
        specialization: this.options.specialization || "general",
        parentSessionId: this.options.parentSessionId,
        gitBranch: this.options.gitBranch || "main",
        maxRecursionDepth: this.options.maxRecursionDepth || 10,
      },
    };
  }
}
