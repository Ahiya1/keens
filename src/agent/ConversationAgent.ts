/**
 * ConversationAgent - Claude Agent for Human Interaction with Database Persistence and Cost Tracking
 * ENHANCED: Added database integration for conversation history, session tracking, and comprehensive cost monitoring
 * FEATURES: Proper conversational context, database persistence, simple streaming, clear role boundaries, detailed cost tracking
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { CLIOptions } from "../cli/types.js";
import { ToolManager } from "./tools/ToolManager.js";
import {
  AnthropicConfigManager,
  KEEN_DEFAULT_CONFIG,
} from "../config/AnthropicConfig.js";
import { StreamingManager } from "./streaming/StreamingManager.js";
import { UserContext, DatabaseManager } from "../database/DatabaseManager.js";
import {
  SessionDAO,
  CreateSessionRequest,
  AddMessageRequest,
} from "../database/dao/SessionDAO.js";
import { getLogger } from "../utils/Logger.js";
import chalk from "chalk";

export interface ConversationOptions {
  workingDirectory: string;
  userContext?: UserContext;
  verbose?: boolean;
  debug?: boolean;
  enableWebSearch?: boolean;
}

export interface ConversationResponse {
  response: string;
  toolResults?: any[];
  thinking?: string;
  error?: string;
  costInfo?: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    isExtendedPricing: boolean;
    duration: number;
  };
}

export interface ProjectContext {
  directory: string;
  structure?: string;
  keyFiles: string[];
  techStack: string[];
  hasPackageJson?: boolean;
  hasGit?: boolean;
  language?: string;
}

export interface ConversationCostBreakdown {
  totalCost: number;
  totalTokens: number;
  totalApiCalls: number;
  averageCostPerCall: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  extendedPricingCalls: number;
}

export class ConversationAgent {
  private anthropic: Anthropic;
  private configManager: AnthropicConfigManager;
  private toolManager: ToolManager;
  private streamingManager: StreamingManager;
  private conversationHistory: any[] = [];
  private sessionId: string;
  private options: ConversationOptions;
  private projectContext?: ProjectContext;
  private messageCount: number = 0;
  private logger = getLogger();

  // Database persistence integration
  private sessionDAO?: SessionDAO;
  private databaseSessionId?: string;
  private databaseInitialized: boolean = false;
  private conversationStarted: boolean = false;

  // NEW: Cost tracking for conversations
  private totalCost: number = 0;
  private totalTokens: number = 0;
  private totalApiCalls: number = 0;
  private apiCallHistory: Array<{
    timestamp: Date;
    model: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    totalCost: number;
    duration: number;
    isExtendedPricing: boolean;
  }> = [];

  // Allowed tools for conversation agent (read-only)
  private readonly ALLOWED_TOOLS = [
    "get_project_tree",
    "read_files",
    "run_command",
  ];

  constructor(options: ConversationOptions) {
    this.options = options;
    this.sessionId = this.generateSessionId();

    this.debugLog("CONSTRUCTOR", "Initializing ConversationAgent", {
      workingDirectory: options.workingDirectory,
      hasUserContext: !!options.userContext,
      userId: options.userContext?.userId?.substring(0, 8) + "...",
      isAdmin: options.userContext?.isAdmin,
      enableWebSearch: options.enableWebSearch,
    });

    // Initialize database integration if user context is available
    if (options.userContext) {
      this.initializeDatabaseIntegration();
    }

    // Initialize Anthropic configuration
    this.configManager = new AnthropicConfigManager({
      ...KEEN_DEFAULT_CONFIG,
      enableExtendedContext: false, // Disabled for conversation
      enableInterleaved: true,
      enableWebSearch: options.enableWebSearch !== false,
      enableStreaming: true,
    });

    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !this.isValidAnthropicApiKey(apiKey)) {
      throw new Error("Invalid or missing ANTHROPIC_API_KEY");
    }

    const config = this.configManager.getConfig();
    const betaHeaders = this.configManager.getBetaHeaders();

    // Initialize Anthropic client
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

    // Initialize streaming manager with simplified options
    this.streamingManager = new StreamingManager({
      showProgress: false,
      timeout: config.streamingTimeout,
      enableTypewriter: true,
      verbose: this.options.verbose || false,
      debug: this.options.debug || false,
      onProgress: (progress) => {
        this.debugLog("STREAMING", "Progress update", progress);
      },
      onError: (error) => {
        this.debugLog("ERROR", "Streaming error", { error: error.message });
      },
    });

    // Initialize tool manager with user context
    this.toolManager = new ToolManager({
      workingDirectory: options.workingDirectory,
      enableWebSearch: options.enableWebSearch !== false,
      debug: options.debug || false,
      userContext: options.userContext,
    });

    this.debugLog("INIT", "ConversationAgent initialization complete");
  }

  /**
   * Initialize database integration
   */
  private async initializeDatabaseIntegration(): Promise<void> {
    try {
      if (!this.options.userContext) {
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
            `✅ Database integration initialized for user ${this.options.userContext.userId.substring(0, 8)}...`
          )
        );
      }
    } catch (error: any) {
      console.warn(
        chalk.yellow(`⚠️  Database integration failed: ${error.message}`)
      );
      console.warn(chalk.yellow(`📁 Falling back to in-memory storage only`));
      this.databaseInitialized = false;
    }
  }

  /**
   * Start conversation with database session creation
   */
  private async ensureConversationStarted(): Promise<void> {
    if (this.conversationStarted) {
      return;
    }

    if (
      this.databaseInitialized &&
      this.sessionDAO &&
      this.options.userContext
    ) {
      try {
        const createRequest: CreateSessionRequest = {
          sessionId: this.sessionId,
          gitBranch: "conversation",
          vision: "Interactive conversation with human user",
          workingDirectory: this.options.workingDirectory,
          agentOptions: {
            conversationMode: true,
            enableWebSearch: this.options.enableWebSearch,
            verbose: this.options.verbose,
            debug: this.options.debug,
          },
        };

        const dbSession = await this.sessionDAO.createSession(
          this.options.userContext.userId,
          createRequest,
          this.options.userContext
        );

        this.databaseSessionId = dbSession.id;

        if (this.options.verbose) {
          console.log(
            chalk.green(
              `💾 Conversation session created in database: ${this.databaseSessionId.substring(0, 8)}...`
            )
          );
        }
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to create database conversation session: ${error.message}`
          )
        );
        console.warn(chalk.yellow(`🧠 Continuing with in-memory storage only`));
      }
    }

    this.conversationStarted = true;
  }

  /**
   * NEW: Record API call cost for conversations
   */
  private async recordApiCallCost(costData: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    inputCost: number;
    outputCost: number;
    thinkingCost: number;
    totalCost: number;
    duration: number;
    isExtendedPricing: boolean;
  }): Promise<void> {
    const apiCallRecord = {
      timestamp: new Date(),
      model: costData.model,
      inputTokens: costData.inputTokens,
      outputTokens: costData.outputTokens,
      thinkingTokens: costData.thinkingTokens,
      totalCost: costData.totalCost,
      duration: costData.duration,
      isExtendedPricing: costData.isExtendedPricing,
    };

    // Update running totals
    this.apiCallHistory.push(apiCallRecord);
    this.totalCost += costData.totalCost;
    this.totalTokens +=
      costData.inputTokens + costData.outputTokens + costData.thinkingTokens;
    this.totalApiCalls += 1;

    // Log cost information
    await this.logger.logApiCall(
      costData.model,
      costData.inputTokens,
      costData.outputTokens,
      costData.thinkingTokens,
      costData.duration,
      costData.totalCost
    );

    // Console output for conversation cost tracking
    console.log(
      chalk.green(`💰 Conversation API Call: $${costData.totalCost.toFixed(4)}`)
    );
    console.log(
      chalk.gray(
        `   📊 Tokens: ${costData.inputTokens.toLocaleString()}in + ${costData.outputTokens.toLocaleString()}out + ${costData.thinkingTokens.toLocaleString()}think`
      )
    );
    console.log(
      chalk.gray(
        `   💵 Cost: $${costData.inputCost.toFixed(4)} + $${costData.outputCost.toFixed(4)} + $${costData.thinkingCost.toFixed(4)}`
      )
    );
    console.log(
      chalk.cyan(
        `   📈 Conversation Total: $${this.totalCost.toFixed(4)} (${this.totalApiCalls} calls)`
      )
    );
  }

  /**
   * NEW: Get conversation cost breakdown
   */
  getConversationCosts(): ConversationCostBreakdown {
    if (this.apiCallHistory.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalApiCalls: 0,
        averageCostPerCall: 0,
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        inputCost: 0,
        outputCost: 0,
        thinkingCost: 0,
        extendedPricingCalls: 0,
      };
    }

    const totalInputTokens = this.apiCallHistory.reduce(
      (sum, call) => sum + call.inputTokens,
      0
    );
    const totalOutputTokens = this.apiCallHistory.reduce(
      (sum, call) => sum + call.outputTokens,
      0
    );
    const totalThinkingTokens = this.apiCallHistory.reduce(
      (sum, call) => sum + call.thinkingTokens,
      0
    );
    const extendedPricingCalls = this.apiCallHistory.filter(
      (call) => call.isExtendedPricing
    ).length;

    // Calculate cost breakdown using current pricing
    const inputCost =
      totalInputTokens * (extendedPricingCalls > 0 ? 0.000006 : 0.000003);
    const outputCost =
      totalOutputTokens * (extendedPricingCalls > 0 ? 0.0000225 : 0.000015);
    const thinkingCost =
      totalThinkingTokens * (extendedPricingCalls > 0 ? 0.000006 : 0.000003);

    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens,
      totalApiCalls: this.totalApiCalls,
      averageCostPerCall: this.totalCost / this.totalApiCalls,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      thinkingTokens: totalThinkingTokens,
      inputCost: inputCost,
      outputCost: outputCost,
      thinkingCost: thinkingCost,
      extendedPricingCalls: extendedPricingCalls,
    };
  }

  /**
   * NEW: Display conversation cost summary
   */
  displayConversationCostSummary(): void {
    const costBreakdown = this.getConversationCosts();

    if (costBreakdown.totalApiCalls === 0) {
      console.log(chalk.yellow("💰 No API calls made yet"));
      return;
    }

    console.log(chalk.blue("\n💰 Conversation Cost Summary"));
    console.log(chalk.gray("━".repeat(40)));
    console.log(
      chalk.cyan(`💵 Total Cost: $${costBreakdown.totalCost.toFixed(4)}`)
    );
    console.log(chalk.cyan(`📞 API Calls: ${costBreakdown.totalApiCalls}`));
    console.log(
      chalk.cyan(
        `🪙 Total Tokens: ${costBreakdown.totalTokens.toLocaleString()}`
      )
    );
    console.log(
      chalk.cyan(
        `📊 Average per call: $${costBreakdown.averageCostPerCall.toFixed(4)}`
      )
    );

    if (costBreakdown.extendedPricingCalls > 0) {
      console.log(
        chalk.yellow(
          `⚠️  Extended pricing calls: ${costBreakdown.extendedPricingCalls}/${costBreakdown.totalApiCalls}`
        )
      );
    }

    console.log(
      chalk.cyan(
        `   Input: ${costBreakdown.inputTokens.toLocaleString()} tokens ($${costBreakdown.inputCost.toFixed(4)})`
      )
    );
    console.log(
      chalk.cyan(
        `   Output: ${costBreakdown.outputTokens.toLocaleString()} tokens ($${costBreakdown.outputCost.toFixed(4)})`
      )
    );
    if (costBreakdown.thinkingTokens > 0) {
      console.log(
        chalk.cyan(
          `   Thinking: ${costBreakdown.thinkingTokens.toLocaleString()} tokens ($${costBreakdown.thinkingCost.toFixed(4)})`
        )
      );
    }
    console.log(chalk.gray("━".repeat(40)));
  }

  /**
   * Store message in database and memory with cost tracking
   */
  private async storeMessage(
    messageType: "user" | "assistant" | "system" | "thinking",
    content: string,
    options: {
      thinking?: string;
      toolCalls?: any[];
      toolResults?: any[];
      tokensUsed?: number;
      processingTime?: number;
      cost?: number;
    } = {}
  ): Promise<void> {
    // Add to in-memory history (backward compatibility)
    const historyEntry = {
      role: messageType === "thinking" ? "assistant" : messageType,
      content,
      timestamp: new Date().toISOString(),
      thinking: options.thinking,
      toolCalls: options.toolCalls,
      toolResults: options.toolResults,
      cost: options.cost || 0,
    };
    this.conversationHistory.push(historyEntry);

    // Store in database
    if (
      this.databaseInitialized &&
      this.sessionDAO &&
      this.databaseSessionId &&
      this.options.userContext
    ) {
      try {
        const addMessageRequest: AddMessageRequest = {
          messageType,
          content,
          thinkingContent: options.thinking,
          phase: "EXPLORE",
          iteration: this.messageCount,
          toolCalls: options.toolCalls || [],
          toolResults: options.toolResults || [],
          tokensUsed: options.tokensUsed || 0,
          processingTimeMs: options.processingTime,
        };

        await this.sessionDAO.addMessage(
          this.databaseSessionId,
          addMessageRequest,
          this.options.userContext
        );

        if (this.options.debug) {
          console.log(
            chalk.green(
              `💾 Message stored in database (${messageType}) - Cost: $${(options.cost || 0).toFixed(4)}`
            )
          );
        }
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to store message in database: ${error.message}`
          )
        );
      }
    }

    this.messageCount++;
  }

  /**
   * Update session metrics in database with cost information
   */
  private async updateSessionMetrics(): Promise<void> {
    if (
      !this.databaseInitialized ||
      !this.sessionDAO ||
      !this.databaseSessionId ||
      !this.options.userContext
    ) {
      return;
    }

    try {
      await this.sessionDAO.updateSession(
        this.databaseSessionId,
        {
          iterationCount: this.messageCount,
          tokensUsed: this.totalTokens,
          totalCost: this.totalCost,
          executionStatus: "running",
        },
        this.options.userContext
      );

      if (this.options.debug) {
        console.log(
          chalk.green(
            `💾 Session metrics updated with cost: $${this.totalCost.toFixed(4)}`
          )
        );
      }
    } catch (error: any) {
      console.warn(
        chalk.yellow(`⚠️  Failed to update session metrics: ${error.message}`)
      );
    }
  }

  private isValidAnthropicApiKey(apiKey: string): boolean {
    return (
      typeof apiKey === "string" &&
      apiKey.startsWith("sk-ant-") &&
      apiKey.length > 20
    );
  }

  /**
   * Have a conversation turn with the agent including comprehensive cost tracking
   */
  async converse(userMessage: string): Promise<ConversationResponse> {
    try {
      // Ensure conversation is started and database session created
      await this.ensureConversationStarted();

      this.debugLog("CONVERSE", "Processing user message with cost tracking", {
        messageLength: userMessage.length,
        conversationLength: this.conversationHistory.length,
        databaseEnabled: this.databaseInitialized,
        currentCost: this.totalCost,
      });

      // Store user message in database
      await this.storeMessage("user", userMessage);

      // Initialize project context if not already done
      if (!this.projectContext) {
        this.projectContext = await this.analyzeProject();
      }

      // Build conversational context
      const conversationalContext =
        await this.buildConversationalContext(userMessage);

      // Process the conversation with cost tracking
      const result = await this.handleConversationMessage(
        conversationalContext
      );

      // Update session metrics in database
      await this.updateSessionMetrics();

      return result;
    } catch (error: any) {
      this.debugLog("ERROR", "Conversation error with cost tracking", {
        error: error.message,
        stack: error.stack,
        totalCost: this.totalCost,
      });

      return {
        response: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
        error: error.message,
        costInfo: {
          totalCost: this.totalCost,
          inputTokens: 0,
          outputTokens: 0,
          thinkingTokens: 0,
          isExtendedPricing: false,
          duration: 0,
        },
      };
    }
  }

  /**
   * Simplified message handling based on a2s2 pattern with comprehensive cost tracking
   */
  private async handleConversationMessage(
    conversationalContext: string
  ): Promise<ConversationResponse> {
    try {
      // Get limited tools for conversation
      const tools = this.getLimitedTools();

      // Simple conversation options
      const maxIterations = 5;
      let currentMessages: any[] = [
        {
          role: "user" as const,
          content: conversationalContext,
        },
      ];

      let finalResponse = "";
      let finalThinking = "";
      let lastResponseText = "";
      const allToolResults: any[] = [];
      let iterationCount = 0;
      const startTime = Date.now();

      // Cost tracking for this conversation turn
      let turnCost = 0;
      let turnTokens = 0;

      while (iterationCount < maxIterations) {
        iterationCount++;

        this.debugLog("ITERATION", `Conversation iteration ${iterationCount}`, {
          messageCount: currentMessages.length,
          currentTurnCost: turnCost,
        });

        // Call Claude with current messages and track costs
        const response = await this.callClaudeForConversation(
          currentMessages,
          tools
        );

        if (!response.content || !Array.isArray(response.content)) {
          throw new Error("Invalid response format from Claude API");
        }

        // Process response content
        let responseText = "";
        let thinking = "";
        let toolUseBlocks: any[] = [];
        let hasWebSearch = false;

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            responseText += block.text;
          } else if (block.type === "thinking" && block.thinking) {
            thinking = block.thinking;
          } else if (block.type === "tool_use") {
            toolUseBlocks.push(block);
          } else if (
            block.type === "server_tool_use" &&
            block.name === "web_search"
          ) {
            hasWebSearch = true;
            console.log(
              chalk.blue(
                `🌐 Web search: ${block.input?.query || "searching..."}`
              )
            );
          } else if (block.type === "web_search_tool_result") {
            console.log(chalk.green(`✅ Web search completed`));
          }
        }

        // Update last response text
        lastResponseText = responseText;

        // Add assistant response to messages
        currentMessages.push({
          role: "assistant" as const,
          content: response.content,
        });

        // If no tool use, we have our final response
        if (toolUseBlocks.length === 0) {
          finalResponse = responseText;
          finalThinking = thinking;

          // Add web search info if used
          if (hasWebSearch) {
            finalResponse +=
              "\n\n*Response includes information from web search.*";
          }

          break;
        }

        // Execute tools
        const toolResultBlocks = await this.executeLimitedTools(
          toolUseBlocks,
          allToolResults
        );

        if (toolResultBlocks.length > 0) {
          currentMessages.push({
            role: "user" as const,
            content: toolResultBlocks,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const assistantResponse =
        finalResponse ||
        lastResponseText ||
        "I understand. What else would you like to discuss?";

      // Get cost information for this conversation turn
      let costInfo = undefined;
      if (this.apiCallHistory.length > 0) {
        const lastCall = this.apiCallHistory[this.apiCallHistory.length - 1];
        costInfo = {
          totalCost: lastCall.totalCost,
          inputTokens: lastCall.inputTokens,
          outputTokens: lastCall.outputTokens,
          thinkingTokens: lastCall.thinkingTokens,
          isExtendedPricing: lastCall.isExtendedPricing,
          duration: lastCall.duration,
        };
      }

      // Store assistant response in database with cost information
      await this.storeMessage("assistant", assistantResponse, {
        thinking: this.options.verbose ? finalThinking : undefined,
        toolCalls:
          allToolResults.length > 0
            ? allToolResults.map((r) => r.tool_use_id)
            : [],
        toolResults: allToolResults,
        tokensUsed: costInfo?.inputTokens
          ? costInfo.inputTokens +
            costInfo.outputTokens +
            costInfo.thinkingTokens
          : 0,
        processingTime,
        cost: costInfo?.totalCost || 0,
      });

      return {
        response: assistantResponse,
        toolResults: allToolResults,
        thinking: this.options.verbose ? finalThinking : undefined,
        costInfo: costInfo,
      };
    } catch (error: any) {
      this.debugLog("HANDLE_ERROR", "Failed to handle conversation message", {
        error: error.message,
        totalCost: this.totalCost,
      });

      throw error;
    }
  }

  /**
   * Execute limited tools for conversation
   */
  private async executeLimitedTools(
    toolUseBlocks: any[],
    allToolResults: any[]
  ): Promise<any[]> {
    const toolResultBlocks: any[] = [];

    for (const toolUseBlock of toolUseBlocks) {
      try {
        console.log(
          chalk.blue(
            `🔍 ${toolUseBlock.name}: ${this.getToolDescription(toolUseBlock)}`
          )
        );

        const startTime = Date.now();
        const toolResult = await this.toolManager.executeTool(
          toolUseBlock.name,
          toolUseBlock.input,
          {
            sessionId: this.sessionId,
            workingDirectory: this.options.workingDirectory,
            dryRun: false,
            verbose: false,
            userContext: this.options.userContext,
          }
        );
        const duration = Date.now() - startTime;

        console.log(chalk.green(`✅ Complete (${duration}ms)`));

        // Create properly formatted tool result block
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(toolResult, null, 2),
        });

        allToolResults.push({
          tool_use_id: toolUseBlock.id,
          result: toolResult,
        });
      } catch (error: any) {
        console.log(chalk.red(`❌ Failed: ${error.message}`));

        // Create error tool result block
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          is_error: true,
          content: `Error: ${error.message}`,
        });

        allToolResults.push({
          tool_use_id: toolUseBlock.id,
          error: error.message,
        });
      }
    }

    return toolResultBlocks;
  }

  /**
   * Analyze project to build context
   */
  private async analyzeProject(): Promise<ProjectContext> {
    try {
      // Get basic project structure
      const treeResult = await this.toolManager.executeTool(
        "get_project_tree",
        { maxDepth: 2 },
        {
          sessionId: this.sessionId,
          workingDirectory: this.options.workingDirectory,
          dryRun: false,
          verbose: false,
        }
      );

      // Extract key information
      const structure = treeResult.tree || "";
      const keyFiles: string[] = [];
      const techStack: string[] = [];

      // Detect common files and tech stack
      if (structure.includes("package.json")) {
        keyFiles.push("package.json");
        techStack.push("Node.js");
      }
      if (structure.includes("tsconfig.json")) {
        keyFiles.push("tsconfig.json");
        techStack.push("TypeScript");
      }
      if (structure.includes(".git")) {
        techStack.push("Git");
      }
      if (structure.includes("src/")) {
        keyFiles.push("src/");
      }
      if (structure.includes("README.md")) {
        keyFiles.push("README.md");
      }

      return {
        directory: this.options.workingDirectory,
        structure,
        keyFiles,
        techStack,
        hasPackageJson: structure.includes("package.json"),
        hasGit: structure.includes(".git"),
        language: structure.includes(".ts")
          ? "TypeScript"
          : structure.includes(".js")
            ? "JavaScript"
            : "Unknown",
      };
    } catch (error) {
      this.debugLog("PROJECT_ANALYSIS_ERROR", "Failed to analyze project", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        directory: this.options.workingDirectory,
        keyFiles: [],
        techStack: [],
      };
    }
  }

  /**
   * Build conversational context from user input and retrieve conversation history from database
   */
  private async buildConversationalContext(userInput: string): Promise<string> {
    const projectSummary = this.buildProjectSummary();

    // Get conversation history from database or fallback to memory
    await this.getConversationFromDatabase();
    const recentConversation = this.conversationHistory
      .slice(-6) // Last 3 exchanges
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Include cost information in context if available
    const costSummary =
      this.totalCost > 0
        ? `\n\nConversation Cost So Far: $${this.totalCost.toFixed(4)} (${this.totalApiCalls} API calls)`
        : "";

    return `Project Context:
${projectSummary}

Recent Conversation:
${recentConversation}${costSummary}

Current User Message: "${userInput}"

Please respond conversationally to help the user with their project. Use tools if they would help answer their question or request.`;
  }

  /**
   * Retrieve conversation history from database
   */
  private async getConversationFromDatabase(): Promise<any[]> {
    if (
      !this.databaseInitialized ||
      !this.sessionDAO ||
      !this.databaseSessionId ||
      !this.options.userContext
    ) {
      return this.conversationHistory;
    }

    try {
      const messages = await this.sessionDAO.getSessionMessages(
        this.databaseSessionId,
        { limit: 50 },
        this.options.userContext
      );

      // Update in-memory cache with database data
      const historyFromDb = messages.map((msg) => ({
        role: msg.message_type === "thinking" ? "assistant" : msg.message_type,
        content: msg.content,
        timestamp: msg.created_at.toISOString(),
        thinking: msg.thinking_content,
        toolCalls: msg.tool_calls,
        toolResults: msg.tool_results,
      }));

      this.conversationHistory = historyFromDb;
      return historyFromDb;
    } catch (error: any) {
      console.warn(
        chalk.yellow(
          `⚠️  Failed to retrieve conversation from database: ${error.message}`
        )
      );
      return this.conversationHistory;
    }
  }

  /**
   * Build project summary for context
   */
  private buildProjectSummary(): string {
    if (!this.projectContext) {
      return "No project context available.";
    }

    return `
Directory: ${this.projectContext.directory}
Tech Stack: ${this.projectContext.techStack.join(", ") || "Unknown"}
Key Files: ${this.projectContext.keyFiles.slice(0, 5).join(", ") || "None identified"}
Language: ${this.projectContext.language || "Unknown"}
`;
  }

  /**
   * Get limited tools for conversation
   */
  private getLimitedTools(): any[] {
    return this.toolManager
      .getToolSchemas()
      .filter((tool) => this.ALLOWED_TOOLS.includes(tool.name));
  }

  /**
   * Call Claude API for conversation with comprehensive cost tracking
   */
  private async callClaudeForConversation(
    messages: any[],
    tools: any[]
  ): Promise<any> {
    const config = this.configManager.getConfig();
    const systemPrompt = this.buildConversationSystemPrompt();
    const callStartTime = Date.now();

    // Add Anthropic web search if enabled
    const conversationTools = [...tools];
    const webSearchConfig = this.toolManager.getWebSearchConfig();
    if (webSearchConfig) {
      conversationTools.push(webSearchConfig);
    }

    const baseParams = {
      model: config.model,
      max_tokens: 2000,
      messages,
      system: systemPrompt,
      tools: conversationTools.length > 0 ? conversationTools : undefined,
      thinking: {
        type: "enabled" as const,
        budget_tokens: 5000,
      },
    };

    this.debugLog(
      "API_CALL",
      "Making conversation API call with cost tracking",
      {
        model: config.model,
        messageCount: messages.length,
        toolCount: conversationTools.length,
        maxTokens: baseParams.max_tokens,
      }
    );

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

    // NEW: Calculate and record cost for this conversation API call
    if (response.usage) {
      const callDuration = Date.now() - callStartTime;
      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;
      const thinkingTokens = response.usage.thinking_tokens || 0;

      // Calculate detailed cost breakdown
      const costBreakdown = this.configManager.calculateRequestCost(
        inputTokens,
        outputTokens,
        thinkingTokens
      );

      // Record this conversation API call
      await this.recordApiCallCost({
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

      this.debugLog(
        "CONVERSATION_COST",
        "Conversation API call cost recorded",
        {
          inputTokens,
          outputTokens,
          thinkingTokens,
          totalCost: costBreakdown.totalCost,
          isExtendedPricing: costBreakdown.isExtendedPricing,
          conversationTotalCost: this.totalCost,
        }
      );
    }

    return response;
  }

  /**
   * Get human-readable description of tool execution
   */
  private getToolDescription(toolUseBlock: any): string {
    switch (toolUseBlock.name) {
      case "get_project_tree":
        return "exploring project structure";
      case "read_files":
        const paths = toolUseBlock.input?.paths || [];
        return `reading ${paths.length} file${paths.length === 1 ? "" : "s"}`;
      case "run_command":
        const cmd = toolUseBlock.input?.command || "unknown command";
        return `running "${cmd.substring(0, 30)}${cmd.length > 30 ? "..." : ""}"`;
      default:
        return "analyzing";
    }
  }

  /**
   * Get conversation history for synthesis (loads from database but maintains sync interface)
   */
  getConversationHistory(): any[] {
    // Load from database in background to keep cache updated
    this.getConversationFromDatabase().catch((error) => {
      if (this.options.debug) {
        console.warn(
          chalk.yellow(
            `Failed to refresh conversation from database: ${error.message}`
          )
        );
      }
    });

    return [...this.conversationHistory];
  }

  /**
   * Synthesize conversation into a vision statement with cost tracking
   */
  async synthesizeVision(): Promise<string> {
    // Ensure we have the latest conversation from database
    await this.getConversationFromDatabase();

    if (this.conversationHistory.length === 0) {
      return "No conversation to synthesize.";
    }

    try {
      const conversationSummary = this.buildConversationSummary();
      const projectSummary = this.buildProjectSummary();

      const synthesisPrompt = `Based on our conversation, synthesize a clear and comprehensive vision for autonomous execution.

Project Context:
${projectSummary}

Conversation Summary:
${conversationSummary}

Please create a detailed vision that captures:
1. The main goal/objective
2. Specific requirements discussed
3. Technical considerations
4. Any constraints or preferences mentioned

Provide a clear, actionable vision that an autonomous agent can execute:`;

      // Use limited tools for synthesis
      const tools = this.getLimitedTools();
      const webSearchConfig = this.toolManager.getWebSearchConfig();
      if (webSearchConfig) {
        tools.push(webSearchConfig);
      }

      const response = await this.anthropic.messages.create({
        model: this.configManager.getConfig().model,
        max_tokens: 1500,
        messages: [
          {
            role: "user" as const,
            content: synthesisPrompt,
          },
        ],
        system:
          "You are a vision synthesizer. Create clear, actionable visions from conversations.",
        tools: tools.length > 0 ? tools : undefined,
        thinking: {
          type: "enabled" as const,
          budget_tokens: 3000,
        },
      });

      // NEW: Track cost of vision synthesis
      if (response.usage) {
        const costBreakdown = this.configManager.calculateRequestCost(
          response.usage.input_tokens || 0,
          response.usage.output_tokens || 0,
          (response.usage as any).thinking_tokens || 0
        );

        await this.recordApiCallCost({
          model: response.model,
          inputTokens: response.usage.input_tokens || 0,
          outputTokens: response.usage.output_tokens || 0,
          thinkingTokens: (response.usage as any).thinking_tokens || 0,

          inputCost: costBreakdown.inputCost,
          outputCost: costBreakdown.outputCost,
          thinkingCost: costBreakdown.thinkingCost,
          totalCost: costBreakdown.totalCost,
          duration: 0, // We don't track duration for synthesis
          isExtendedPricing: costBreakdown.isExtendedPricing,
        });

        console.log(
          chalk.green(
            `💰 Vision Synthesis Cost: $${costBreakdown.totalCost.toFixed(4)}`
          )
        );
      }

      // Extract text response
      const textBlocks = response.content.filter(
        (block: any) => block.type === "text"
      );
      const visionText = textBlocks
        .map((block: any) => block.text)
        .join(" ")
        .trim();

      // Store vision synthesis as a system message in database
      await this.storeMessage("system", `Vision synthesized: ${visionText}`, {
        cost: response.usage
          ? this.configManager.calculateRequestCost(
              response.usage.input_tokens || 0,
              response.usage.output_tokens || 0
            ).totalCost
          : 0,
      });

      return visionText;
    } catch (error: any) {
      this.debugLog("SYNTHESIS_ERROR", "Failed to synthesize vision", {
        error: error.message,
        totalCost: this.totalCost,
      });

      // Fallback synthesis
      const userMessages = this.conversationHistory
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join(" ");

      return `Based on our conversation: ${userMessages.substring(0, 500)}${userMessages.length > 500 ? "..." : ""}`;
    }
  }

  /**
   * Build conversation summary for synthesis
   */
  private buildConversationSummary(): string {
    if (this.conversationHistory.length === 0) {
      return "No previous conversation.";
    }

    const recentMessages = this.conversationHistory.slice(-10);
    return recentMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");
  }

  /**
   * Clear conversation history (only clears in-memory cache)
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.projectContext = undefined;
    this.messageCount = 0;

    // Note: Database conversation history is preserved
    if (this.options.verbose) {
      console.log(
        chalk.yellow(
          "🧹 In-memory conversation cache cleared (database history preserved)"
        )
      );
    }
  }

  /**
   * Get conversation statistics with cost information
   */
  async getConversationStats(): Promise<{
    sessionId: string;
    databaseSessionId?: string;
    messageCount: number;
    tokensUsed: number;
    databaseEnabled: boolean;
    conversationStarted: boolean;
    costInfo: ConversationCostBreakdown;
  }> {
    return {
      sessionId: this.sessionId,
      databaseSessionId: this.databaseSessionId,
      messageCount: this.messageCount,
      tokensUsed: this.totalTokens,
      databaseEnabled: this.databaseInitialized,
      conversationStarted: this.conversationStarted,
      costInfo: this.getConversationCosts(),
    };
  }

  /**
   * End conversation with final status update and cost summary
   */
  async endConversation(): Promise<void> {
    // Display final cost summary
    this.displayConversationCostSummary();

    if (
      this.databaseInitialized &&
      this.sessionDAO &&
      this.databaseSessionId &&
      this.options.userContext
    ) {
      try {
        await this.sessionDAO.updateSession(
          this.databaseSessionId,
          {
            executionStatus: "completed",
            success: true,
            totalCost: this.totalCost,
            completionReport: {
              totalCost: this.totalCost,
              totalApiCalls: this.totalApiCalls,
              costBreakdown: this.getConversationCosts(),
            },
          },
          this.options.userContext
        );

        if (this.options.verbose) {
          console.log(
            chalk.green(
              `💾 Conversation session marked as completed with total cost: $${this.totalCost.toFixed(4)}`
            )
          );
        }
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to mark conversation as completed: ${error.message}`
          )
        );
      }
    }
  }

  /**
   * Build system prompt for conversation mode with cost awareness
   */
  private buildConversationSystemPrompt(): string {
    const userInfo = this.options.userContext
      ? `\nUSER CONTEXT:\n- User ID: ${this.options.userContext.userId}\n- Admin: ${this.options.userContext.isAdmin ? "Yes" : "No"}\n- Privileges: ${this.options.userContext.isAdmin ? "Unlimited resources" : "Standard user limits"}`
      : "";

    const webSearchNote = this.toolManager.isWebSearchEnabled()
      ? "\n\nWEB SEARCH: You have access to real-time web search through Anthropic's web search API. Use it when you need current information, documentation, or troubleshooting guidance."
      : "";

    const databaseNote = this.databaseInitialized
      ? `\n\nDATABASE PERSISTENCE: This conversation is being persisted to PostgreSQL database (Session: ${this.databaseSessionId?.substring(0, 8)}...). All messages and context are automatically saved.`
      : "\n\nFILE STORAGE: This conversation is using in-memory storage only. Session data will not be persisted beyond this session.";

    const costNote =
      this.totalCost > 0
        ? `\n\nCOST TRACKING: Current conversation cost is $${this.totalCost.toFixed(4)} across ${this.totalApiCalls} API calls. Cost information is being tracked and logged.`
        : "\n\nCOST TRACKING: API costs are being monitored and will be displayed for each interaction.";

    return `You are a helpful AI assistant having a conversation with a human developer about their project. You are in CONVERSATION MODE - your role is to discuss, analyze, and help plan, but NOT to implement or make changes.

WORKING DIRECTORY: ${this.options.workingDirectory}${userInfo}${webSearchNote}${databaseNote}${costNote}

CONVERSATION MODE GUIDELINES:
1. You are having a conversation - be helpful, engaging, and informative
2. You can use tools to explore and analyze their project when helpful
3. Help them understand their codebase and plan their development tasks
4. Ask clarifying questions when needed to better understand their needs
5. You CANNOT write files, modify code, or make changes - you're read-only
6. Focus on understanding, planning, and providing guidance

IMPORTANT LIMITATIONS:
- You can read files and analyze the project structure
- You can search the web for information if needed
- You can run read-only commands to understand the codebase
- You CANNOT write files, modify code, or execute destructive commands
- You are NOT autonomous - you are conversational

AVAILABLE TOOLS (READ-ONLY):
- get_project_tree: Analyze project structure and file organization
- read_files: Read and examine specific files to understand the codebase
- run_command: Execute read-only commands for project analysis (e.g., git status, package info)

Session ID: ${this.sessionId}
Timestamp: ${new Date().toISOString()}

Engage in helpful conversation about their development needs. Use tools strategically when they would help answer questions or provide better guidance.`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `conversation_${timestamp}_${random}`;
  }

  /**
   * Debug logging
   */
  private debugLog(category: string, message: string, data?: any): void {
    if (this.options.debug || this.options.verbose) {
      console.log(chalk.gray(`[CONVERSATION] [${category}] ${message}`));
      if (data && this.options.debug) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }
}
