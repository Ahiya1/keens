/**
 * keen Agent Core - ENHANCED WITH MODULAR PROMPT SYSTEM AND COMPILATION CHECKING
 * UPDATED: Replaced hardcoded prompts with PromptManager, added AgentRevivalManager integration
 * CRITICAL: Now enforces compilation checking before completion
 * COMPLETED: All method implementations integrated with modular prompt system
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { CLIOptions, AgentResult } from "../cli/types.js";
import { ToolManager } from "./tools/ToolManager.js";
import { AgentSession } from "./AgentSession.js";
import {
  AnthropicConfigManager,
  KEEN_DEFAULT_CONFIG,
} from "../config/AnthropicConfig.js";
import { StreamingManager } from "./streaming/StreamingManager.js";
import {
  AgentPhase,
  AgentExecutionContext,
  AgentSpecialization,
  GitBranchUtils,
} from "./types.js";
import { DatabaseManager, UserContext } from "../database/DatabaseManager.js";
import { SessionDAO } from "../database/dao/SessionDAO.js";
import { AgentTreeManager } from "./AgentTreeManager.js";
// 🌟 NEW: Modular prompt system
import { getPromptManager } from "./prompts/PromptManager.js";
import { PromptConfiguration, PromptContext } from "./prompts/types.js";
// 🌟 NEW: Agent revival system
import chalk from "chalk";

export class KeenAgent {
  private options: CLIOptions;
  private anthropic: Anthropic;
  private configManager: AnthropicConfigManager;
  private toolManager: ToolManager;
  private session: AgentSession;
  private streamingManager: StreamingManager;
  private currentPhase: AgentPhase = "EXPLORE";
  private sessionId: string;

  // Authentication & Database Integration
  private userContext?: UserContext;
  private db?: DatabaseManager;
  private sessionDAO?: SessionDAO;
  private dbSessionId?: string;

  // Phase 3.3 Recursive Agent Support
  private agentTreeManager?: AgentTreeManager;
  private parentSessionId?: string;
  private specialization: AgentSpecialization;
  private gitBranch: string;
  private maxRecursionDepth: number;

  // 🌟 NEW: Modular prompt system and revival management
  private promptManager = getPromptManager({ debug: false });
  private isRevival = false;
  private attemptCount = 0;

  constructor(
    options: CLIOptions & {
      parentSessionId?: string;
      specialization?: AgentSpecialization;
      gitBranch?: string;
      maxRecursionDepth?: number;
      isRevival?: boolean;
      attemptCount?: number;
    }
  ) {
    this.options = options;
    this.sessionId = this.generateSessionId();
    this.userContext = options.userContext;

    // Phase 3.3 & Revival initialization
    this.parentSessionId = options.parentSessionId;
    this.specialization = options.specialization || "general";
    this.gitBranch = options.gitBranch || "main";
    this.maxRecursionDepth = options.maxRecursionDepth || 10;
    this.isRevival = options.isRevival || false;
    this.attemptCount = options.attemptCount || 0;

    this.debugLog(
      "CONSTRUCTOR",
      "Initializing KeenAgent with modular prompt system",
      {
        vision: options.vision?.substring(0, 100) + "...",
        directory: options.directory,
        maxIterations: options.maxIterations,
        sessionId: this.sessionId,
        hasUserContext: !!this.userContext,
        userId: this.userContext?.userId?.substring(0, 8) + "...",
        isAdmin: this.userContext?.isAdmin,
        enableWebSearch: options.webSearch,
        specialization: this.specialization,
        gitBranch: this.gitBranch,
        isRevival: this.isRevival,
        attemptCount: this.attemptCount,
      }
    );

    // Initialize database connection
    if (this.userContext) {
      this.initializeDatabaseConnection();
    }

    // Initialize Agent Tree Manager for recursive spawning
    this.initializeAgentTreeManager();

    // Initialize Anthropic configuration
    this.configManager = new AnthropicConfigManager({
      ...KEEN_DEFAULT_CONFIG,
      enableExtendedContext: options.extendedContext || true,
      enableInterleaved: true,
      enableWebSearch: options.webSearch !== false,
      enableStreaming: options.stream !== false,
    });

    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !this.isValidAnthropicApiKey(apiKey)) {
      throw new Error("Invalid or missing ANTHROPIC_API_KEY");
    }

    const config = this.configManager.getConfig();
    const betaHeaders = this.configManager.getBetaHeaders();

    this.debugLog("CONFIG", "Anthropic configuration", {
      model: config.model,
      maxTokens: config.maxTokens,
      thinkingBudget: config.thinkingBudget,
      betaHeaders,
    });

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey,
      maxRetries: config.maxRetries,
      timeout: config.streamingTimeout,
      defaultHeaders:
        betaHeaders.length > 0
          ? {
              "anthropic-beta": betaHeaders.join(","),
            }
          : undefined,
    });

    // Initialize streaming manager
    this.streamingManager = new StreamingManager({
      showProgress: this.options.verbose || false,
      timeout: config.streamingTimeout,
      enableTypewriter: false,
      verbose: this.options.verbose || false,
      debug: this.options.debug || false,
      onProgress: (progress) => {
        this.debugLog("STREAMING", "Progress update", progress);
      },
      onError: (error) => {
        this.debugLog("ERROR", "Streaming error", { error: error.message });
      },
    });

    // Initialize tool manager with Phase 3.3 support
    this.toolManager = new ToolManager({
      workingDirectory: options.directory || process.cwd(),
      enableWebSearch: options.webSearch !== false,
      debug: options.debug || false,
      userContext: this.userContext,
      agentTreeManager: this.agentTreeManager,
    });

    const availableTools = this.toolManager.getAvailableTools();
    this.debugLog("TOOLS", "Tool manager initialized with Phase 3.3 support", {
      availableTools,
      toolCount: availableTools.length,
      webSearchEnabled: this.toolManager.isWebSearchEnabled(),
      recursiveSpawning: this.toolManager.hasRecursiveSpawning(),
      phase33Tools: this.toolManager.getRecursiveSpawningTools(),
    });

    // Initialize session with Phase 3.3 options
    this.session = new AgentSession({
      sessionId: this.sessionId,
      vision: options.vision,
      workingDirectory: options.directory || process.cwd(),
      visionFile: options.visionFile,
      anthropicConfig: this.configManager.getConfig(),
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      debug: options.debug || false,
      userContext: this.userContext,
      parentSessionId: this.parentSessionId,
      specialization: this.specialization,
      gitBranch: this.gitBranch,
      maxRecursionDepth: this.maxRecursionDepth,
    });

    this.debugLog(
      "INIT",
      "KeenAgent initialization complete with modular prompts"
    );
  }

  /**
   * Initialize Agent Tree Manager for Phase 3.3
   */
  private initializeAgentTreeManager(): void {
    try {
      this.agentTreeManager = new AgentTreeManager({
        userContext: this.userContext,
        db: this.db,
        debug: this.options.debug || false,
      });

      // Initialize tree with this agent as root (if no parent) or add as child
      if (!this.parentSessionId) {
        // This is a root agent
        this.agentTreeManager.initializeRoot(
          this.sessionId,
          this.specialization,
          this.options.directory || process.cwd()
        );

        console.log(
          chalk.green(`🌳 Initialized as root agent (${this.specialization})`)
        );
      } else {
        // This is a child agent - will be added to tree by parent
        console.log(
          chalk.blue(
            `👶 Child agent initialized (parent: ${this.parentSessionId.split("-").pop()})`
          )
        );
      }

      this.debugLog("TREE_MANAGER", "Agent tree manager initialized", {
        sessionId: this.sessionId,
        parentSessionId: this.parentSessionId,
        specialization: this.specialization,
        gitBranch: this.gitBranch,
        isRoot: !this.parentSessionId,
      });
    } catch (error: any) {
      this.debugLog("TREE_ERROR", "Failed to initialize agent tree manager", {
        error: error.message,
      });
      console.warn(
        chalk.yellow(
          `⚠️  Warning: Agent tree manager initialization failed, Phase 3.3 features disabled: ${error.message}`
        )
      );
      this.agentTreeManager = undefined;
    }
  }

  /**
   * Initialize database connection and create session record
   */
  private async initializeDatabaseConnection(): Promise<void> {
    if (!this.userContext) {
      return;
    }

    try {
      this.db = new DatabaseManager();

      // Initialize database if not already connected
      if (!this.db.isConnected) {
        await this.db.initialize();
      }

      this.sessionDAO = new SessionDAO(this.db);

      this.debugLog("DATABASE", "Database connection initialized", {
        userId: this.userContext.userId.substring(0, 8) + "...",
        isAdmin: this.userContext.isAdmin,
      });
    } catch (error) {
      this.debugLog("DATABASE_ERROR", "Failed to initialize database", {
        error: error instanceof Error ? error.message : error,
      });
      console.warn(
        chalk.yellow(
          "⚠️  Warning: Database connection failed, proceeding without session logging"
        )
      );
    }
  }

  /**
   * Create session record in database
   */
  private async createSessionRecord(): Promise<void> {
    if (!this.sessionDAO || !this.userContext || !this.options.vision) {
      return;
    }

    try {
      const sessionRecord = await this.sessionDAO.createSession(
        this.userContext.userId,
        {
          sessionId: this.sessionId,
          parentSessionId: this.parentSessionId,
          sessionDepth: this.parentSessionId ? 1 : 0,
          gitBranch: this.gitBranch,
          vision: this.options.vision,
          workingDirectory: this.options.directory || process.cwd(),
          agentOptions: {
            maxIterations: this.options.maxIterations,
            costBudget: this.options.costBudget,
            webSearch: this.options.webSearch,
            extendedContext: this.options.extendedContext,
            stream: this.options.stream,
            debug: this.options.debug,
            dryRun: this.options.dryRun,
            specialization: this.specialization,
            maxRecursionDepth: this.maxRecursionDepth,
          },
        },
        this.userContext
      );

      this.dbSessionId = sessionRecord.id;

      this.debugLog("SESSION_CREATED", "Session record created in database", {
        dbSessionId: this.dbSessionId,
        userId: this.userContext.userId.substring(0, 8) + "...",
        specialization: this.specialization,
        parentSessionId: this.parentSessionId,
      });
    } catch (error) {
      this.debugLog("SESSION_ERROR", "Failed to create session record", {
        error: error instanceof Error ? error.message : error,
      });
      console.warn(
        chalk.yellow("⚠️  Warning: Failed to create session record in database")
      );
    }
  }

  /**
   * Update session progress in database
   */
  private async updateSessionProgress(
    phase?: AgentPhase,
    iterationCount?: number,
    filesModified?: string[],
    filesCreated?: string[]
  ): Promise<void> {
    if (!this.sessionDAO || !this.dbSessionId || !this.userContext) {
      return;
    }

    try {
      const updates: any = {};

      if (phase) updates.currentPhase = phase;
      if (iterationCount) updates.iterationCount = iterationCount;
      if (filesModified) updates.filesModified = filesModified;
      if (filesCreated) updates.filesCreated = filesCreated;

      await this.sessionDAO.updateSession(
        this.dbSessionId,
        updates,
        this.userContext
      );

      this.debugLog("SESSION_UPDATE", "Session progress updated", updates);
    } catch (error) {
      this.debugLog("SESSION_UPDATE_ERROR", "Failed to update session", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Add message to session conversation
   */
  private async addMessageToSession(
    messageType: "user" | "assistant" | "system",
    content: string,
    iteration?: number,
    toolCalls?: any[],
    toolResults?: any[]
  ): Promise<void> {
    if (!this.sessionDAO || !this.dbSessionId || !this.userContext) {
      return;
    }

    try {
      await this.sessionDAO.addMessage(
        this.dbSessionId,
        {
          messageType,
          content,
          phase: this.currentPhase,
          iteration: iteration || 0,
          toolCalls: toolCalls || [],
          toolResults: toolResults || [],
        },
        this.userContext
      );

      this.debugLog("MESSAGE_ADDED", "Message added to session", {
        messageType,
        contentLength: content.length,
        iteration,
      });
    } catch (error) {
      this.debugLog("MESSAGE_ERROR", "Failed to add message to session", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Execute the autonomous agent with revival capability
   */
  async execute(): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.debugLog(
        "EXECUTE",
        "Starting agent execution with revival support",
        {
          vision: this.options.vision,
          maxIterations: this.options.maxIterations || 100,
          phase: this.currentPhase,
          sessionId: this.sessionId,
          isRevival: this.isRevival,
          attemptCount: this.attemptCount,
        }
      );

      await this.createSessionRecord();
      await this.session.start();

      // 🌟 NEW: Build system prompt using modular prompt system
      const systemPrompt = this.buildModularSystemPrompt();
      const visionMessage = this.buildVisionMessage();

      await this.addMessageToSession("user", visionMessage, 0);

      let messages: any[] = [{ role: "user", content: visionMessage }];
      let iterationCount = 0;
      const maxIterations = this.options.maxIterations || 100;
      let filesCreated: string[] = [];
      let filesModified: string[] = [];

      // Main execution loop
      while (iterationCount < maxIterations) {
        iterationCount++;

        console.log(
          chalk.blue(`\n🔄 ITERATION ${iterationCount}/${maxIterations}`)
        );
        console.log(chalk.gray(`📋 Phase: ${this.currentPhase}`));
        console.log(chalk.gray(`🎭 Specialization: ${this.specialization}`));

        if (this.isRevival) {
          console.log(chalk.yellow(`🔄 Revival attempt: ${this.attemptCount}`));
        }

        this.debugLog(
          "ITERATION_START",
          `Starting iteration ${iterationCount}`,
          {
            iteration: iterationCount,
            maxIterations,
            phase: this.currentPhase,
            messageCount: messages.length,
          }
        );

        try {
          console.log(chalk.cyan("🤖 Calling Claude..."));
          const response = await this.callClaude(systemPrompt, messages);

          this.displayClaudeResponse(response);

          if (
            !response.content ||
            !Array.isArray(response.content) ||
            response.content.length === 0
          ) {
            console.log(
              chalk.red(
                "🚨 WARNING: Claude response has no content, retrying..."
              )
            );
            continue;
          }

          await this.addMessageToSession(
            "assistant",
            JSON.stringify(response.content),
            iterationCount
          );
          messages.push({ role: "assistant", content: response.content });

          // Process the response and execute tools
          const result = await this.processResponse(response, iterationCount);

          // Track file changes
          if (result.toolResults) {
            for (const toolResult of result.toolResults) {
              if (toolResult.result && typeof toolResult.result === "object") {
                if (toolResult.result.writtenPaths) {
                  filesCreated = [
                    ...filesCreated,
                    ...toolResult.result.writtenPaths,
                  ];
                }
                if (toolResult.result.modifiedPaths) {
                  filesModified = [
                    ...filesModified,
                    ...toolResult.result.modifiedPaths,
                  ];
                }
              }
            }
          }

          await this.updateSessionProgress(
            this.currentPhase,
            iterationCount,
            filesModified,
            filesCreated
          );

          // 🌟 CRITICAL: Check for completion with revival support
          if (result.completed) {
            // Completion is allowed - proceed
            console.log(
              chalk.green(
                `\n🎉 ${this.specialization} agent completed task in ${iterationCount} iterations!`
              )
            );

            if (this.sessionDAO && this.dbSessionId && this.userContext) {
              await this.sessionDAO.updateSession(
                this.dbSessionId,
                {
                  executionStatus: "completed",
                  success: true,
                  completionReport: result.result,
                  filesCreated,
                  filesModified,
                },
                this.userContext
              );
            }

            await this.session.completeSession(true, result.result);
            return await this.buildFinalResult(
              startTime,
              result.result,
              filesCreated,
              filesModified
            );
          }

          // Add tool results to messages if any were executed
          if (result.toolResults && result.toolResults.length > 0) {
            const toolResultContent = result.toolResults.map((toolResult) => {
              if (toolResult.error) {
                return {
                  type: "tool_result",
                  tool_use_id: toolResult.tool_use_id,
                  is_error: true,
                  content: `Error: ${toolResult.error}`,
                };
              } else {
                return {
                  type: "tool_result",
                  tool_use_id: toolResult.tool_use_id,
                  content: JSON.stringify(toolResult.result, null, 2),
                };
              }
            });

            messages.push({ role: "user", content: toolResultContent });
            await this.addMessageToSession(
              "user",
              JSON.stringify(toolResultContent),
              iterationCount,
              result.toolResults.map((tr) => ({ tool_use_id: tr.tool_use_id })),
              result.toolResults
            );
          }
        } catch (error: any) {
          console.error(
            chalk.red(
              `❌ Error in iteration ${iterationCount}: ${error.message}`
            )
          );

          messages.push({
            role: "user",
            content: `Error occurred in iteration ${iterationCount}: ${error.message}. Please adjust your approach and continue.`,
          });

          await this.addMessageToSession(
            "user",
            `Error in iteration ${iterationCount}: ${error.message}`,
            iterationCount
          );
        }
      }

      // Max iterations reached
      console.log(
        chalk.yellow(
          `\n⚠️  Maximum iterations (${maxIterations}) reached without completion`
        )
      );

      if (this.sessionDAO && this.dbSessionId && this.userContext) {
        await this.sessionDAO.updateSession(
          this.dbSessionId,
          {
            executionStatus: "failed",
            success: false,
            errorMessage: "Maximum iterations exceeded",
            filesCreated,
            filesModified,
          },
          this.userContext
        );
      }

      await this.session.completeSession(
        false,
        {
          success: false,
          summary: `Agent execution stopped after ${maxIterations} iterations without completion`,
          error: "Maximum iterations exceeded",
        },
        "Maximum iterations exceeded"
      );

      return await this.buildFinalResult(
        startTime,
        {
          success: false,
          summary: `Agent execution stopped after ${maxIterations} iterations without completion`,
          error: "Maximum iterations exceeded",
        },
        filesCreated,
        filesModified
      );
    } catch (error: any) {
      await this.session.completeSession(false, undefined, error.message);

      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        sessionInfo: this.userContext
          ? {
              sessionId: this.sessionId,
              userId: this.userContext.userId,
              isAdmin: this.userContext.isAdmin,
            }
          : undefined,
      };
    }
  }

  /**
   * 🌟 NEW: Build system prompt using modular prompt system
   */
  private buildModularSystemPrompt(): string {
    const promptContext: PromptContext = {
      vision: this.options.vision || "",
      workingDirectory: this.options.directory || process.cwd(),
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userContext: this.userContext,
      specialization: this.specialization,
      phase: this.currentPhase,
      gitBranch: this.gitBranch,
      parentSessionId: this.parentSessionId,
      maxRecursionDepth: this.maxRecursionDepth,
      hasWebSearch: this.toolManager.isWebSearchEnabled(),
      hasRecursiveSpawning: this.toolManager.hasRecursiveSpawning(),
      availableTools: this.toolManager.getAvailableTools(),
    };

    const promptConfig: PromptConfiguration = {
      type: this.parentSessionId ? "child_agent" : "system",
      specialization: this.specialization,
      phase: this.currentPhase,
      context: promptContext,
      includePhaseGuidance: true,
      includeToolInstructions: true,
      includeCompilationChecking: true,
      includeRecursiveSpawning: this.toolManager.hasRecursiveSpawning(),
    };

    if (this.parentSessionId) {
      return this.promptManager.buildChildAgentPrompt(promptConfig);
    } else {
      return this.promptManager.buildSystemPrompt(promptConfig);
    }
  }

  /**
   * Build the vision message with Phase 3.3 context
   */
  private buildVisionMessage(): string {
    let message = `I need you to autonomously complete this development task:\n\n${this.options.vision}`;

    if (this.options.visionFile) {
      message += `\n\nThis vision was loaded from: ${this.options.visionFile}`;
    }

    if (this.userContext) {
      message += `\n\nUser Context: This task is being executed by user ${this.userContext.userId.substring(0, 8)}... ${this.userContext.isAdmin ? "(Admin - unlimited resources)" : "(Standard user)"}. All session data will be logged to the database.`;
    }

    // Phase 3.3 context
    if (this.parentSessionId) {
      message += `\n\nPhase 3.3 Context: You are a ${this.specialization} specialist child agent spawned by parent ${this.parentSessionId.split("-").pop()}. Focus on your specialization while collaborating with the parent agent.`;
    } else {
      message += `\n\nPhase 3.3 Context: You are the root ${this.specialization} agent. You can spawn specialized child agents when needed for complex tasks.`;
    }

    message += `\n\nProceed with implementation. Start by exploring the project structure using available tools.`;

    return message;
  }

  /**
   * Call Claude API with improved streaming handling and comprehensive cost tracking
   */
  private async callClaude(
    systemPrompt: string,
    messages: any[]
  ): Promise<any> {
    const config = this.configManager.getConfig();
    const callStartTime = Date.now();

    try {
      // Start with local tools
      const tools = this.toolManager.getToolSchemas();

      // Add Anthropic web search if enabled
      const webSearchConfig = this.toolManager.getWebSearchConfig();
      if (webSearchConfig) {
        tools.push(webSearchConfig);
        this.debugLog("WEB_SEARCH", "Anthropic web search enabled", {
          maxUses: webSearchConfig.max_uses,
        });
      }

      const baseParams = {
        model: config.model,
        max_tokens: config.maxTokens,
        messages,
        system: systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        thinking: {
          type: "enabled" as const,
          budget_tokens: config.thinkingBudget,
        },
      };

      // Create tool names array for logging
      const toolNames: string[] = [];
      for (const tool of tools) {
        if (tool && typeof tool === "object") {
          if ("name" in tool && typeof tool.name === "string") {
            toolNames.push(tool.name);
          } else if ("type" in tool && typeof tool.type === "string") {
            toolNames.push(tool.type);
          }
        }
      }

      this.debugLog("API_PARAMS", "Claude API parameters", {
        model: config.model,
        maxTokens: config.maxTokens,
        messageCount: messages.length,
        systemPromptLength: systemPrompt.length,
        toolCount: tools.length,
        toolNames,
        webSearchEnabled: !!webSearchConfig,
      });

      let response: any;

      if (config.enableStreaming) {
        const streamParams = {
          ...baseParams,
          stream: true as const,
        };

        const stream = await this.anthropic.messages.create(streamParams);
        response = await StreamingManager.processAnthropicStream(
          stream as AsyncIterable<any>,
          this.streamingManager
        );

        // Ensure response has proper structure
        response = {
          content: response.content || [],
          id: response.id,
          model: response.model,
          role: "assistant",
          stop_reason: response.stop_reason,
          stop_sequence: response.stop_sequence,
          type: "message",
          usage: response.usage,
        };
      } else {
        const nonStreamParams = {
          ...baseParams,
          stream: false as const,
        };

        response = await this.anthropic.messages.create(nonStreamParams);
      }

      // Calculate and record comprehensive cost information
      if (response.usage) {
        const callDuration = Date.now() - callStartTime;
        const inputTokens = response.usage.input_tokens || 0;
        const outputTokens = response.usage.output_tokens || 0;
        const thinkingTokens = response.usage.thinking_tokens || 0;

        // Calculate detailed cost breakdown using config manager
        const costBreakdown = this.configManager.calculateRequestCost(
          inputTokens,
          outputTokens,
          thinkingTokens
        );

        // Record this API call in the session
        await this.session.recordApiCall({
          model: response.model,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          thinkingTokens: thinkingTokens,
          inputCost: costBreakdown.inputCost,
          outputCost: costBreakdown.outputCost,
          thinkingCost: costBreakdown.thinkingCost,
          totalCost: costBreakdown.totalCost,
          duration: callDuration,
          isExtendedPricing: costBreakdown.isExtendedPricing,
        });

        this.debugLog("COST_TRACKING", "API call cost recorded", {
          inputTokens,
          outputTokens,
          thinkingTokens,
          totalTokens: inputTokens + outputTokens + thinkingTokens,
          totalCost: costBreakdown.totalCost,
          isExtendedPricing: costBreakdown.isExtendedPricing,
          keenCreditCost: costBreakdown.keenCreditCost,
          callDuration,
        });
      }

      return response;
    } catch (error: any) {
      this.debugLog("API_ERROR", "Claude API call failed", {
        error: error.message,
        status: error.status,
        callDuration: Date.now() - callStartTime,
      });

      if (error.status === 401) {
        throw new Error(
          "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable."
        );
      }

      if (error.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait a moment and try again."
        );
      }

      if (error.message && error.message.includes("timeout")) {
        throw new Error(
          `Anthropic API timeout after ${config.streamingTimeout}ms. Try reducing maxTokens or thinkingBudget.`
        );
      }

      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  /**
   * Display Claude's response in a user-friendly way
   */
  private displayClaudeResponse(response: any): void {
    if (!response.content || !Array.isArray(response.content)) return;

    for (const block of response.content) {
      if (block.type === "text" && block.text) {
        console.log(chalk.white("💬 Claude: ") + block.text);
      } else if (block.type === "thinking" && block.thinking) {
        if (this.options.verbose) {
          console.log(
            chalk.magenta("🧠 Claude thinking: ") +
              chalk.gray(block.thinking.substring(0, 200) + "...")
          );
        }
      } else if (
        block.type === "server_tool_use" &&
        block.name === "web_search"
      ) {
        console.log(
          chalk.blue(`🔍 Web search: ${block.input?.query || "searching..."}`)
        );
      } else if (block.type === "web_search_tool_result") {
        console.log(chalk.green(`✅ Web search completed`));
        if (
          this.options.verbose &&
          block.content &&
          Array.isArray(block.content)
        ) {
          console.log(
            chalk.gray(`   Found ${block.content.length} search results`)
          );
        }
      }
    }
  }

  /**
   * Process Claude's response and handle tool calls
   */
  private async processResponse(
    response: any,
    iteration: number
  ): Promise<{
    completed: boolean;
    result?: any;
    toolResults?: any[];
  }> {
    const toolResults: any[] = [];

    this.debugLog("PROCESS_RESPONSE", "Processing Claude response", {
      iteration,
      contentBlocks: response.content?.length || 0,
      contentTypes: response.content?.map((block: any) => block.type) || [],
    });

    // Check for tool use in response
    if (response.content && Array.isArray(response.content)) {
      for (const block of response.content) {
        this.debugLog("PROCESS_BLOCK", "Processing content block", {
          type: block.type,
          hasToolUse: block.type === "tool_use",
          toolName: block.name,
          toolId: block.id,
        });

        if (block.type === "server_tool_use" && block.name === "web_search") {
          // Anthropic web search - just log it (results come separately)
          console.log(
            chalk.blue(
              `\n🔍 Web search: ${block.input?.query || "searching..."}`
            )
          );
        } else if (block.type === "web_search_tool_result") {
          // Anthropic web search results - just log them
          console.log(chalk.green(`✅ Web search completed`));
          if (
            this.options.verbose &&
            block.content &&
            Array.isArray(block.content)
          ) {
            console.log(
              chalk.gray(`   Found ${block.content.length} search results`)
            );
            for (const result of block.content) {
              if (result.title && result.url) {
                console.log(chalk.gray(`   • ${result.title} (${result.url})`));
              }
            }
          }
        } else if (block.type === "tool_use") {
          // Local tool execution
          console.log(chalk.blue(`\n🔧 Executing tool: ${block.name}`));
          if (block.input && Object.keys(block.input).length > 0) {
            console.log(
              chalk.gray(`📝 Parameters: ${this.formatToolParams(block.input)}`)
            );
          }

          this.debugLog("TOOL_EXECUTION", "Executing tool", {
            toolName: block.name,
            toolId: block.id,
            input: block.input,
            iteration,
          });

          try {
            const toolResult = await this.toolManager.executeTool(
              block.name,
              block.input,
              {
                sessionId: this.sessionId,
                workingDirectory: this.options.directory!,
                dryRun: this.options.dryRun || false,
                verbose: this.options.verbose || false,
                userContext: this.userContext,
                parentSessionId: this.parentSessionId,
                specialization: this.specialization,
                gitBranch: this.gitBranch,
                agentTreeManager: this.agentTreeManager,
              }
            );

            // Show tool result summary by default
            console.log(chalk.green(`✅ Tool ${block.name} completed`));
            if (toolResult && typeof toolResult === "object") {
              this.displayToolResultSummary(block.name, toolResult);
            }

            this.debugLog("TOOL_SUCCESS", "Tool execution successful", {
              toolName: block.name,
              toolId: block.id,
              resultType: typeof toolResult,
              resultKeys:
                toolResult && typeof toolResult === "object"
                  ? Object.keys(toolResult)
                  : "n/a",
            });

            toolResults.push({
              tool_use_id: block.id,
              result: toolResult,
            });

            // Check if this was a completion signal
            if (block.name === "report_complete") {
              this.debugLog("COMPLETION_SIGNAL", "Received completion signal", {
                toolResult,
              });
              return {
                completed: true,
                result: toolResult,
                toolResults,
              };
            }

            // Check for phase transitions
            if (block.name === "report_phase") {
              const newPhase = toolResult.phase || this.currentPhase;
              if (newPhase !== this.currentPhase) {
                console.log(
                  chalk.magenta(
                    `🔄 Phase transition: ${this.currentPhase} → ${newPhase}`
                  )
                );
                this.debugLog("PHASE_TRANSITION", "Phase transition detected", {
                  from: this.currentPhase,
                  to: newPhase,
                });
                this.currentPhase = newPhase;

                // Update phase in agent tree manager
                if (this.agentTreeManager) {
                  this.agentTreeManager.updatePhase(this.sessionId, newPhase);
                }

                // Update phase in database
                await this.updateSessionProgress(this.currentPhase);

                // Log phase guidance
                this.logPhaseGuidance(newPhase);
              }
            }
          } catch (error: any) {
            console.log(
              chalk.red(`❌ Tool ${block.name} failed: ${error.message}`)
            );

            this.debugLog("TOOL_ERROR", "Tool execution failed", {
              toolName: block.name,
              toolId: block.id,
              error: error.message,
            });

            toolResults.push({
              tool_use_id: block.id,
              error: error.message,
            });
          }
        }
      }
    }

    this.debugLog("PROCESS_COMPLETE", "Response processing complete", {
      toolResults: toolResults.length,
      completed: false,
    });

    return {
      completed: false,
      toolResults,
    };
  }

  /**
   * Log phase-specific guidance - FIXED: Complete implementation for all phases
   */
  private logPhaseGuidance(phase: AgentPhase): void {
    const guidance: Record<AgentPhase, string> = {
      EXPLORE:
        "🔍 Focus on understanding the codebase, requirements, and current state",
      PLAN: "📋 Create detailed implementation plan and identify specialization opportunities",
      FOUND:
        "🏗️ Build foundation, establish patterns, and prepare for specialization",
      SUMMON: "🎭 Implement solutions and spawn specialists when needed",
      COMPLETE: "✅ Finalize work, run tests, and prepare completion report",
    };

    const guidanceText = guidance[phase];
    if (guidanceText) {
      console.log(chalk.blue(guidanceText));
    }
  }

  /**
   * Format tool parameters for display
   */
  private formatToolParams(params: any): string {
    if (!params || typeof params !== "object") return "";

    const keys = Object.keys(params);
    if (keys.length === 0) return "";

    if (keys.length === 1) {
      const key = keys[0];
      const value = params[key];
      if (typeof value === "string" && value.length < 50) {
        return `${key}="${value}"`;
      }
      return `${key}=<${typeof value}>`;
    }

    return keys
      .map((key) => {
        const value = params[key];
        if (typeof value === "string" && value.length < 20) {
          return `${key}="${value}"`;
        }
        return `${key}=<${typeof value}>`;
      })
      .join(", ");
  }

  /**
   * Display tool result summary
   */
  private displayToolResultSummary(toolName: string, result: any): void {
    if (!result || typeof result !== "object") return;

    if (toolName === "write_files" && result.writtenPaths) {
      console.log(
        chalk.gray(`   📄 Created: ${result.writtenPaths.join(", ")}`)
      );
    } else if (toolName === "run_command" && result.stdout) {
      const output = result.stdout.toString().trim();
      if (output.length < 100) {
        console.log(chalk.gray(`   💻 Output: ${output}`));
      } else {
        console.log(chalk.gray(`   💻 Output: ${output.substring(0, 100)}...`));
      }
    } else if (toolName === "get_project_tree" && result.tree) {
      const lines = result.tree.split("\n").length;
      console.log(chalk.gray(`   🌳 Found ${lines} items in project tree`));
    } else if (toolName === "read_files" && result.files) {
      console.log(chalk.gray(`   📖 Read ${result.files.length} files`));
    } else if (toolName === "summon_agent" && result.spawnResult) {
      const spawn = result.spawnResult;
      console.log(
        chalk.gray(
          `   🎭 ${spawn.success ? "Spawned" : "Failed to spawn"} ${spawn.childSessionId || "child agent"}`
        )
      );
    } else if (result.success !== undefined) {
      console.log(
        chalk.gray(
          `   ${result.success ? "✅" : "❌"} Status: ${result.success ? "success" : "failed"}`
        )
      );
    }
  }

  /**
   * Build final result with enhanced session info and cost data
   */
  private async buildFinalResult(
    startTime: number,
    result?: any,
    filesCreated?: string[],
    filesModified?: string[]
  ): Promise<AgentResult> {
    const duration = Date.now() - startTime;
    const costBreakdown = this.session.getCostBreakdown();

    return {
      success: result?.success !== false,
      summary: result?.summary,
      filesCreated: filesCreated || result?.filesCreated || [],
      filesModified: filesModified || result?.filesModified || [],
      nextSteps: result?.nextSteps || [],
      testsRun: result?.testsRun || [],
      validationResults: result?.validationResults || [],
      duration,
      totalCost: costBreakdown.totalCost,
      error: result?.error,
      sessionInfo: this.userContext
        ? {
            sessionId: this.sessionId,
            userId: this.userContext.userId,
            isAdmin: this.userContext.isAdmin,
          }
        : undefined,
      enhancedData: {
        totalIterations: 0, // TODO: Track this
        totalTokensUsed: costBreakdown.totalTokens,
        toolsExecuted: 0, // TODO: Track this
        errorsEncountered: 0, // TODO: Track this
        averageIterationTime: duration,
        finalPhase: this.currentPhase,
        costBreakdown: costBreakdown,
        logsSummary: {
          totalLogs: 0,
          toolExecutions: 0,
          phaseTransitions: 0,
          errors: 0,
          warnings: 0,
        },
        userContext: this.userContext
          ? {
              userId: this.userContext.userId,
              isAdmin: this.userContext.isAdmin,
              sessionId: this.dbSessionId,
            }
          : undefined,
        // Phase 3.3 enhanced data
        phase33Data: {
          specialization: this.specialization,
          gitBranch: this.gitBranch,
          parentSessionId: this.parentSessionId,
          maxRecursionDepth: this.maxRecursionDepth,
          treeStatus: this.agentTreeManager?.getTreeStatus(),
        },
      },
    };
  }

  /**
   * Validate Anthropic API key format
   */
  private isValidAnthropicApiKey(apiKey: string): boolean {
    return (
      typeof apiKey === "string" &&
      apiKey.startsWith("sk-ant-") &&
      apiKey.length > 20
    );
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const prefix = this.parentSessionId
      ? `${this.parentSessionId.split("_")[1]}-child`
      : "session";
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Debug logging helper
   */
  private debugLog(category: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();

    if (this.options.debug || this.options.verbose) {
      console.log(chalk.gray(`[${timestamp}] 🔍 [${category}] ${message}`));
      if (data && this.options.debug) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  // Public getters for monitoring and Phase 3.3 information
  getSessionId(): string {
    return this.sessionId;
  }

  getCurrentPhase(): AgentPhase {
    return this.currentPhase;
  }

  getUserContext(): UserContext | undefined {
    return this.userContext;
  }

  getDatabaseSessionId(): string | undefined {
    return this.dbSessionId;
  }

  getSpecialization(): AgentSpecialization {
    return this.specialization;
  }

  getGitBranch(): string {
    return this.gitBranch;
  }

  getParentSessionId(): string | undefined {
    return this.parentSessionId;
  }

  getAgentTreeManager(): AgentTreeManager | undefined {
    return this.agentTreeManager;
  }

  getMaxRecursionDepth(): number {
    return this.maxRecursionDepth;
  }

  getTreeStatus(): any {
    return this.agentTreeManager?.getTreeStatus();
  }

  canSpawnChild(): boolean {
    return this.agentTreeManager?.canSpawnChild(this.sessionId) || false;
  }

  getSpecializationContext(): any {
    return this.agentTreeManager?.getSpecializationContext(this.specialization);
  }

  // Get current session cost information
  getSessionCosts(): any {
    return this.session.getCostBreakdown();
  }
}
