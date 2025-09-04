/**
 * Enhanced Progress Reporter for keen Agent Framework
 * Provides real-time progress updates with detailed execution state
 */

import chalk from "chalk";
import { Logger, getLogger } from "./Logger.js";
import { AgentPhase } from "../agent/types.js";

export interface ProgressState {
  phase: AgentPhase;
  currentIteration: number;
  totalIterations: number;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
  currentActivity: string;
  tokensUsed: number;
  toolsExecuted: string[];
  errorsEncountered: number;
  lastUpdate: number;
}

export interface ProgressUpdate {
  message: string;
  category: "agent" | "tool" | "api" | "streaming" | "error";
  progress?: number; // 0-100
  data?: any;
}

export class ProgressReporter {
  private state: ProgressState;
  private logger: Logger;
  private updateInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(update: ProgressUpdate) => void> = [];
  private startTime: number;
  private lastProgressTime: number = 0;

  constructor(
    private sessionId: string,
    private maxIterations: number,
    private verbose: boolean = false,
    private debug: boolean = false
  ) {
    this.startTime = Date.now();
    this.logger = getLogger();

    this.state = {
      phase: "EXPLORE",
      currentIteration: 0,
      totalIterations: maxIterations,
      elapsedTime: 0,
      currentActivity: "Starting agent execution...",
      tokensUsed: 0,
      toolsExecuted: [],
      errorsEncountered: 0,
      lastUpdate: Date.now(),
    };

    this.startPeriodicUpdates();
  }

  private startPeriodicUpdates(): void {
    if (this.verbose || this.debug) {
      this.updateInterval = setInterval(() => {
        this.updateElapsedTime();
        this.emitPeriodicUpdate();
      }, 5000); // Every 5 seconds
    }
  }

  private updateElapsedTime(): void {
    this.state.elapsedTime = Date.now() - this.startTime;
  }

  private estimateTimeRemaining(): number | undefined {
    if (this.state.currentIteration === 0) return undefined;

    const avgTimePerIteration =
      this.state.elapsedTime / this.state.currentIteration;
    const remainingIterations =
      this.state.totalIterations - this.state.currentIteration;
    return avgTimePerIteration * remainingIterations;
  }

  private emitPeriodicUpdate(): void {
    const now = Date.now();
    if (now - this.lastProgressTime < 4000) return; // Don't spam updates

    this.lastProgressTime = now;

    const progress = Math.round(
      (this.state.currentIteration / this.state.totalIterations) * 100
    );

    const elapsed = Math.round(this.state.elapsedTime / 1000);
    const estimated = this.estimateTimeRemaining();

    this.emitUpdate({
      message: `Progress: ${progress}% (${this.state.currentIteration}/${this.state.totalIterations}) - ${elapsed}s elapsed${estimated ? `, ~${Math.round(estimated / 1000)}s remaining` : ""}`,
      category: "agent",
      progress,
      data: {,
        phase: this.state.phase,
        currentActivity: this.state.currentActivity,
        tokensUsed: this.state.tokensUsed,
        toolsExecuted: this.state.toolsExecuted.length,
        errorsEncountered: this.state.errorsEncountered,
      },
    });
  }

  private emitUpdate(update: ProgressUpdate): void {
    this.listeners.forEach((listener) => {
      try {
        listener(update);
      } catch (error) {
        console.error("Error in progress listener:", error);
      }
    });
  }

  // Public methods
  updatePhase(phase: AgentPhase, reason?: string): void {
    const oldPhase = this.state.phase;
    this.state.phase = phase;
    this.state.lastUpdate = Date.now();

    this.logger.logPhaseTransition(oldPhase, phase, reason);

    this.emitUpdate({
      message: `Phase transition: ${oldPhase} → ${phase}${reason ? ` (${reason})` : ""}`,
      category: "agent",
      data: { from: oldPhase, to: phase, reason },
    });
  }

  updateIteration(iteration: number, activity: string): void {
    this.state.currentIteration = iteration;
    this.state.currentActivity = activity;
    this.state.lastUpdate = Date.now();
    this.updateElapsedTime();

    const progress = Math.round((iteration / this.state.totalIterations) * 100);

    this.logger.logAgentProgress(
      this.state.phase,
      iteration,
      this.state.totalIterations,
      activity
    );

    this.emitUpdate({
      message: `[${this.state.phase}] Iteration ${iteration}: ${activity}`,
      category: "agent",
      progress,
      data: { iteration, activity, phase: this.state.phase },
    });
  }

  reportToolExecution(
    toolName: string,
    startTime: number,
    success: boolean,
    error?: string
  ): void {
    const duration = Date.now() - startTime;

    if (success) {
      this.state.toolsExecuted.push(toolName);
    } else {
      this.state.errorsEncountered++;
    }

    this.state.currentActivity = success
      ? `✅ Completed ${toolName} (${duration}ms)`
      : `❌ Failed ${toolName} (${duration}ms)`;

    this.state.lastUpdate = Date.now();

    this.emitUpdate({
      message: `${success ? "✅" : "❌"} Tool ${toolName} ${success ? "completed" : "failed"} in ${duration}ms${error ? `: ${error}` : ""}`,
      category: "tool",
      data: { toolName, duration, success, error },
    });
  }

  reportStreamingProgress(
    phase: string,
    tokensReceived: number,
    elapsedTime: number,
    message?: string
  ): void {
    this.state.tokensUsed = tokensReceived;
    this.state.currentActivity = `🌊 Streaming ${phase}${message ? `: ${message}` : ""}`;
    this.state.lastUpdate = Date.now();

    this.logger.logStreamingProgress(
      phase,
      tokensReceived,
      elapsedTime,
      message
    );

    this.emitUpdate({
      message: `Streaming ${phase} - ${tokensReceived} tokens in ${Math.round(elapsedTime / 1000)}s`,
      category: "streaming",
      data: { phase, tokensReceived, elapsedTime, message },
    });
  }

  reportApiCall(
    model: string,
    inputTokens: number,
    outputTokens: number,
    thinkingTokens: number,
    duration: number,
  ): void {
    const totalTokens = inputTokens + outputTokens + thinkingTokens;
    this.state.tokensUsed += totalTokens;
    this.state.currentActivity = `🤖 API call completed - ${totalTokens} tokens`;
    this.state.lastUpdate = Date.now();

    this.logger.logApiCall(
      model,
      inputTokens,
      outputTokens,
      thinkingTokens,
      duration
    );

    this.emitUpdate({
      message: `Claude API call: ${totalTokens} tokens in ${duration}ms`,
      category: "api",
      data: {,
        model,
        tokens: {,
          input: inputTokens,
          output: outputTokens,
          thinking: thinkingTokens,
          total: totalTokens,
        },
        duration,
      },
    });
  }

  reportError(error: Error, context?: string): void {
    this.state.errorsEncountered++;
    this.state.currentActivity = `❌ Error: ${error.message}`;
    this.state.lastUpdate = Date.now();

    this.logger.error(
      "agent",
      `Error${context ? ` in ${context}` : ""}: ${error.message}`,
      { error: error.stack }
    );

    this.emitUpdate({
      message: `Error${context ? ` in ${context}` : ""}: ${error.message}`,
      category: "error",
      data: { error: error.message, context, stack: error.stack },
    });
  }

  // Status display methods
  displayCurrentStatus(): void {
    this.updateElapsedTime();
    const progress = Math.round(
      (this.state.currentIteration / this.state.totalIterations) * 100
    );

    const elapsed = Math.round(this.state.elapsedTime / 1000);
    const estimated = this.estimateTimeRemaining();

    console.log(chalk.blue("\n📊 Agent Status Report"));
    console.log(chalk.gray("━".repeat(50)));
    console.log(chalk.cyan(`🔄 Phase: ${this.state.phase}`));
    console.log(
      chalk.cyan(
        `📈 Progress: ${progress}% (${this.state.currentIteration}/${this.state.totalIterations})`
      )
    );
    console.log(
      chalk.cyan(
        `⏱️  Time: ${elapsed}s elapsed${estimated ? `, ~${Math.round(estimated / 1000)}s remaining` : ""}`
      )
    );
    console.log(chalk.cyan(`🎯 Activity: ${this.state.currentActivity}`));
    console.log(chalk.cyan(`🪙 Tokens: ${this.state.tokensUsed.toLocaleString()}`));
    console.log(chalk.cyan(`🔧 Tools: ${this.state.toolsExecuted.length} executed`));

    if (this.state.errorsEncountered > 0) {
      console.log(chalk.red(`❌ Errors: ${this.state.errorsEncountered}`));
    }
    console.log(chalk.gray("━".repeat(50)));
  }

  displayDetailedStatus(): void {
    this.displayCurrentStatus();

    if (this.state.toolsExecuted.length > 0) {
      console.log(chalk.yellow("\n🔧 Tools Executed:"));
      const toolCounts = this.state.toolsExecuted.reduce(
        (acc, tool) => {
          acc[tool] = (acc[tool] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(toolCounts).forEach(([tool, count]) => {
        console.log(chalk.gray(`   • ${tool}: ${count}x`));
      });
    }
  }

  // Event subscription
  onUpdate(listener: (update: ProgressUpdate) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Getters
  getCurrentState(): ProgressState {
    this.updateElapsedTime();
    return { ...this.state };
  }

  getProgress(): number {
    return Math.round(
      (this.state.currentIteration / this.state.totalIterations) * 100
    );
  }

  getElapsedTime(): number {
    this.updateElapsedTime();
    return this.state.elapsedTime;
  }

  isStuck(): boolean {
    const timeSinceLastUpdate = Date.now() - this.state.lastUpdate;
    return timeSinceLastUpdate > 60000; // 1 minute without updates
  }

  // Cleanup
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.listeners = [];
  }

  // Summary methods
  getFinalSummary(): {
    totalTime: number;
    totalIterations: number;
    totalTokens: number;
    toolsExecuted: number;
    errorsEncountered: number;
    averageIterationTime: number;
    phase: AgentPhase;
  } {
    this.updateElapsedTime();

    return {
      totalTime: this.state.elapsedTime,
      totalIterations: this.state.currentIteration,
      totalTokens: this.state.tokensUsed,
      toolsExecuted: this.state.toolsExecuted.length,
      errorsEncountered: this.state.errorsEncountered,
      averageIterationTime:,
        this.state.currentIteration > 0
          ? Math.round(this.state.elapsedTime / this.state.currentIteration)
          : 0,
      phase: this.state.phase,
    };
  }
}
