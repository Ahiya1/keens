/**
 * Enhanced Logging System for keen Agent Framework with Cost Tracking
 * Provides comprehensive logging with multiple levels, formatting, debug capabilities, and detailed cost monitoring
 */

import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  sessionId?: string;
  phase?: string;
  toolName?: string;
  duration?: number;
  cost?: number;
  tokens?: {
    input?: number;
    output?: number;
    thinking?: number;
    total?: number;
  };
}

export interface LoggerOptions {
  level: LogLevel;
  writeToFile: boolean;
  filePath?: string;
  showTimestamp: boolean;
  showCategory: boolean;
  enableColors: boolean;
  sessionId?: string;
  verbose: boolean;
  debug: boolean;
  trackCosts: boolean;
}

export interface CostLogSummary {
  totalCost: number;
  totalApiCalls: number;
  totalTokens: number;
  averageCostPerCall: number;
  costByCategory: Record<string, number>;
  tokensByCategory: Record<string, number>;
  callsByCategory: Record<string, number>;
}

export class Logger {
  private options: LoggerOptions;
  private logBuffer: LogEntry[] = [];
  private stats = {
    totalLogs: 0,
    errors: 0,
    warnings: 0,
    toolExecutions: 0,
    phaseTransitions: 0,
    apiCalls: 0,
    totalCost: 0,
    totalTokens: 0,
  };

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      writeToFile: false,
      showTimestamp: true,
      showCategory: true,
      enableColors: true,
      verbose: false,
      debug: false,
      trackCosts: true,
      ...options,
    };

    if (this.options.writeToFile && !this.options.filePath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      this.options.filePath = `keen-agent-${timestamp}.log`;
    }
  }

  /**
   * Safe JSON serialization that handles circular references
   */
  private safeStringify(
    obj: any,
    maxDepth: number = 5,
    prettyPrint: boolean = false,
  ): string {
    const seen = new WeakSet();
    let currentDepth = 0;

    return JSON.stringify(
      obj,
      function (key, val) {
        if (currentDepth > maxDepth) {
          return "[Max Depth Reached]";
        }

        if (val != null && typeof val === "object") {
          if (seen.has(val)) {
            return "[Circular Reference]";
          }
          seen.add(val);
          currentDepth++;
        }

        return val;
      },
      prettyPrint ? 2 : undefined
    );
  }

  /**
   * Main logging method with cost tracking
   */
  private async log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (level < this.options.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      sessionId: this.options.sessionId,
    };

    this.logBuffer.push(entry);
    this.updateStats(entry);

    // Console output
    this.outputToConsole(entry);

    // File output
    if (this.options.writeToFile) {
      await this.outputToFile(entry);
    }
  }

  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++;

    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        this.stats.errors++;
        break;
      case LogLevel.WARN:
        this.stats.warnings++;
        break;
    }

    if (entry.category === "tool") {
      this.stats.toolExecutions++;
    }

    if (entry.category === "api" && entry.cost) {
      this.stats.apiCalls++;
      this.stats.totalCost += entry.cost;
      this.stats.totalTokens += entry.tokens?.total || 0;
    }

    if (
      entry.category === "agent" &&
      entry.message.includes("Phase transition")
    ) {
      this.stats.phaseTransitions++;
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = this.options.showTimestamp
      ? chalk.gray(`[${entry.timestamp.split("T")[1].split(".")[0]}] `)
      : "";
    const category = this.options.showCategory
      ? chalk.blue(`[${entry.category.toUpperCase()}] `)
      : "";

    let levelColor = chalk.white;
    let levelIcon = "ℹ️";

    switch (entry.level) {
      case LogLevel.TRACE:
        levelColor = chalk.gray;
        levelIcon = "🔍";
        break;
      case LogLevel.DEBUG:
        levelColor = chalk.cyan;
        levelIcon = "🐛";
        break;
      case LogLevel.INFO:
        levelColor = chalk.blue;
        levelIcon = "ℹ️";
        break;
      case LogLevel.WARN:
        levelColor = chalk.yellow;
        levelIcon = "⚠️";
        break;
      case LogLevel.ERROR:
        levelColor = chalk.red;
        levelIcon = "❌";
        break;
      case LogLevel.CRITICAL:
        levelColor = chalk.bgRed.white;
        levelIcon = "🚨";
        break;
    }

    let output = `${timestamp}${levelIcon} ${category}${levelColor(entry.message)}`;

    // Add session ID if available
    if (entry.sessionId && this.options.debug) {
      output += chalk.gray(` [${entry.sessionId.split("_")[1]}]`);
    }

    // Add cost information if available and tracking is enabled
    if (this.options.trackCosts && entry.cost && entry.cost > 0) {
      output += chalk.green(` ($${entry.cost.toFixed(4)})`);
    }

    console.log(output);

    // Show data in debug mode
    if (entry.data && (this.options.debug || this.options.verbose)) {
      if (typeof entry.data === "object") {
        console.log(
          chalk.gray("   Data:"),
          this.safeStringify(entry.data, 5, true)
        );
      } else {
        console.log(chalk.gray("   Data:"), entry.data);
      }
    }

    // Show token information for API calls
    if (this.options.trackCosts && entry.tokens && entry.category === "api") {
      console.log(
        chalk.gray(
          `   Tokens: ${entry.tokens.input || 0}in + ${entry.tokens.output || 0}out + ${entry.tokens.thinking || 0}think = ${entry.tokens.total || 0} total`
        )
      );
    }
  }

  private async outputToFile(entry: LogEntry): Promise<void> {
    if (!this.options.filePath) return;

    try {
      const logLine = this.safeStringify(entry, 5, false) + "\n";
      await fs.appendFile(this.options.filePath, logLine);
    } catch (error) {
      // Don't log file write errors to avoid infinite recursion
      console.error("Failed to write to log file:", error);
    }
  }

  // Public logging methods
  async trace(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.TRACE, category, message, data);
  }

  async debug(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.DEBUG, category, message, data);
  }

  async info(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.INFO, category, message, data);
  }

  async warn(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.WARN, category, message, data);
  }

  async error(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.ERROR, category, message, data);
  }

  async critical(category: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.CRITICAL, category, message, data);
  }

  // Specialized logging methods
  async logToolExecution(
    toolName: string,
    parameters: any,
    startTime: number,
    result?: any,
    error?: Error
  ): Promise<void> {
    const duration = Date.now() - startTime;
    const success = !error;

    await this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      "tool",
      `${success ? "✅" : "❌"} Tool ${toolName} ${success ? "completed" : "failed"} in ${duration}ms`,
      {
        toolName,
        parameters: this.options.debug ? parameters : Object.keys(parameters),
        duration,
        success,
        result: success && this.options.debug ? result : undefined,
        error: error?.message,
      }
    );
  }

  async logPhaseTransition(
    from: string,
    to: string,
    reason?: string
  ): Promise<void> {
    await this.log(
      LogLevel.INFO,
      "agent",
      `🔄 Phase transition: ${from} → ${to}${reason ? ` (${reason})` : ""}`,
      { from, to, reason }
    );
  }

  async logAgentProgress(
    phase: string,
    iteration: number,
    totalIterations: number,
    message: string,
  ): Promise<void> {
    const percentage = Math.round((iteration / totalIterations) * 100);
    await this.log(
      LogLevel.INFO,
      "progress",
      `📊 [${phase}] ${percentage}% (${iteration}/${totalIterations}) - ${message}`,
      { phase, iteration, totalIterations, percentage }
    );
  }

  async logStreamingProgress(
    phase: string,
    tokensReceived: number,
    elapsedTime: number,
    message?: string
  ): Promise<void> {
    const elapsed = Math.round(elapsedTime / 1000);
    await this.log(
      LogLevel.DEBUG,
      "streaming",
      `🌊 Streaming ${phase} - ${tokensReceived} tokens in ${elapsed}s${message ? ` - ${message}` : ""}`,
      { phase, tokensReceived, elapsedTime }
    );
  }

  /**
   * NEW: Enhanced API call logging with comprehensive cost tracking
   */
  async logApiCall(
    model: string,
    inputTokens: number,
    outputTokens: number,
    thinkingTokens: number,
    duration: number,
    cost?: number
  ): Promise<void> {
    const totalTokens = inputTokens + outputTokens + thinkingTokens;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      category: "api",
      message: `🤖 Claude API call completed - ${totalTokens.toLocaleString()} tokens in ${duration}ms${cost ? ` ($${cost.toFixed(4)})` : ""}`,
      data: {,
        model,
        duration,
        cost,
      },
      sessionId: this.options.sessionId,
      cost: cost,
      tokens: {,
        input: inputTokens,
        output: outputTokens,
        thinking: thinkingTokens,
        total: totalTokens,
      },
    };

    this.logBuffer.push(entry);
    this.updateStats(entry);
    this.outputToConsole(entry);

    if (this.options.writeToFile) {
      await this.outputToFile(entry);
    }
  }

  /**
   * NEW: Log detailed cost breakdown
   */
  async logCostBreakdown(
    sessionId: string,
    totalCost: number,
    totalTokens: number,
    totalCalls: number,
    breakdown?: {
      inputCost: number;
      outputCost: number;
      thinkingCost: number;
      extendedPricingCalls: number;
    }
  ): Promise<void> {
    const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    await this.log(
      LogLevel.INFO,
      "cost",
      `💰 Session cost summary - $${totalCost.toFixed(4)} total (${totalCalls} calls, ${totalTokens.toLocaleString()} tokens)`,
      {
        sessionId,
        totalCost,
        totalTokens,
        totalCalls,
        averageCostPerCall,
        breakdown,
      }
    );
  }

  /**
   * NEW: Log cost warning when thresholds are exceeded
   */
  async logCostWarning(
    sessionId: string,
    currentCost: number,
    threshold: number,
    message: string,
  ): Promise<void> {
    await this.log(
      LogLevel.WARN,
      "cost",
      `⚠️ Cost warning: ${message} - Current: $${currentCost.toFixed(4)}, Threshold: $${threshold.toFixed(4)}`,
      {
        sessionId,
        currentCost,
        threshold,
        percentageOfThreshold: (currentCost / threshold) * 100,
      }
    );
  }

  /**
   * NEW: Log session cost milestone
   */
  async logCostMilestone(
    sessionId: string,
    milestone: number,
    currentCost: number,
    apiCalls: number,
  ): Promise<void> {
    await this.log(
      LogLevel.INFO,
      "cost",
      `🎯 Cost milestone reached: $${milestone.toFixed(2)} (Current: $${currentCost.toFixed(4)} across ${apiCalls} API calls)`,
      {
        sessionId,
        milestone,
        currentCost,
        apiCalls,
      }
    );
  }

  // Utility methods
  setSessionId(sessionId: string): void {
    this.options.sessionId = sessionId;
  }

  setLogLevel(level: LogLevel): void {
    this.options.level = level;
  }

  enableCostTracking(enabled: boolean = true): void {
    this.options.trackCosts = enabled;
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * NEW: Get cost-specific statistics
   */
  getCostStats(): CostLogSummary {
    const apiLogs = this.logBuffer.filter(
      (entry) => entry.category === "api" && entry.cost
    );

    if (apiLogs.length === 0) {
      return {
        totalCost: 0,
        totalApiCalls: 0,
        totalTokens: 0,
        averageCostPerCall: 0,
        costByCategory: {},
        tokensByCategory: {},
        callsByCategory: {},
      };
    }

    const totalCost = apiLogs.reduce(
      (sum, entry) => sum + (entry.cost || 0),
      0
    );
    const totalTokens = apiLogs.reduce(
      (sum, entry) => sum + (entry.tokens?.total || 0),
      0
    );
    const totalApiCalls = apiLogs.length;
    const averageCostPerCall = totalCost / totalApiCalls;

    // Group by categories (could be enhanced to group by different criteria)
    const costByCategory: Record<string, number> = {};
    const tokensByCategory: Record<string, number> = {};
    const callsByCategory: Record<string, number> = {};

    apiLogs.forEach((entry) => {
      const category = entry.data?.model || "unknown";
      costByCategory[category] =
        (costByCategory[category] || 0) + (entry.cost || 0);
      tokensByCategory[category] =
        (tokensByCategory[category] || 0) + (entry.tokens?.total || 0);
      callsByCategory[category] = (callsByCategory[category] || 0) + 1;
    });

    return {
      totalCost,
      totalApiCalls,
      totalTokens,
      averageCostPerCall,
      costByCategory,
      tokensByCategory,
      callsByCategory,
    };
  }

  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearBuffer(): void {
    // FIXED: Only clear buffer, preserve stats
    this.logBuffer = [];
    // Stats are preserved - they represent cumulative counts
  }

  async exportLogs(filePath: string): Promise<void> {
    const exportLogCount = this.logBuffer.length;
    const costStats = this.getCostStats();

    await this.info(
      "logger",
      `Exported ${exportLogCount} log entries with cost data ($${costStats.totalCost.toFixed(4)}) to ${filePath}`
    );

    // FIXED: Export as simple array for easier consumption by tests
    const logsArray = [...this.logBuffer];
    const logsJson = this.safeStringify(logsArray, 5, true);
    await fs.writeFile(filePath, logsJson);
  }

  /**
   * NEW: Export only cost-related logs
   */
  async exportCostLogs(filePath: string): Promise<void> {
    const costLogs = this.logBuffer.filter(
      (entry) =>
        entry.category === "api" || entry.category === "cost" || entry.cost
    );

    const costStats = this.getCostStats();

    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: costStats,
      costLogs: costLogs,
    };

    await fs.writeFile(filePath, this.safeStringify(exportData, 5, true));

    await this.info(
      "logger",
      `Exported ${costLogs.length} cost-related log entries to ${filePath}`
    );
  }

  // Progress reporting helper
  createProgressReporter(category: string, totalSteps: number) {
    let currentStep = 0;

    return {
      step: async (message: string, data?: any) => {
        currentStep++;
        const percentage = Math.round((currentStep / totalSteps) * 100);
        await this.log(
          LogLevel.INFO,
          category,
          `📈 Step ${currentStep}/${totalSteps} (${percentage}%): ${message}`,
          data
        );
      },
      complete: async (message: string, cost?: number) => {
        await this.log(
          LogLevel.INFO,
          category,
          `✅ Completed ${totalSteps} steps: ${message}${cost ? ` ($${cost.toFixed(4)})` : ""}`,
          { cost }
        );
      },
    };
  }

  /**
   * NEW: Create cost-aware progress reporter
   */
  createCostAwareProgressReporter(
    category: string,
    totalSteps: number,
    budgetLimit?: number
  ) {
    let currentStep = 0;
    let totalCost = 0;

    return {
      step: async (message: string, stepCost: number = 0, data?: any) => {
        currentStep++;
        totalCost += stepCost;
        const percentage = Math.round((currentStep / totalSteps) * 100);

        let costWarning = "";
        if (budgetLimit && totalCost > budgetLimit * 0.8) {
          costWarning = ` ⚠️ Approaching budget limit`;
        }

        await this.log(
          LogLevel.INFO,
          category,
          `📈 Step ${currentStep}/${totalSteps} (${percentage}%): ${message} - $${totalCost.toFixed(4)}${costWarning}`,
          { ...data, stepCost, totalCost, percentage }
        );
      },
      complete: async (message: string) => {,
        const budgetStatus = budgetLimit
          ? ` (${((totalCost / budgetLimit) * 100).toFixed(1)}% of budget)`
          : "";

        await this.log(
          LogLevel.INFO,
          category,
          `✅ Completed ${totalSteps} steps: ${message} - Total cost: $${totalCost.toFixed(4)}${budgetStatus}`,
          {
            totalCost,
            budgetLimit,
            budgetUsed: budgetLimit ? (totalCost / budgetLimit) * 100 : null,
          }
        );
      },
      getCurrentCost: () => totalCost,
      isOverBudget: () => (budgetLimit ? totalCost > budgetLimit : false),
    };
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({
      level: process.env.NODE_ENV === "test" ? LogLevel.ERROR : LogLevel.INFO,
      verbose: process.env.KEEN_VERBOSE === "true",
      debug: process.env.KEEN_DEBUG === "true",
      writeToFile: process.env.KEEN_LOG_FILE === "true",
      trackCosts: process.env.KEEN_TRACK_COSTS !== "false", // Default to true
    });
  }
  return globalLogger;
}

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

export function createLogger(options: Partial<LoggerOptions> = {}): Logger {
  return new Logger(options);
}