/**
 * keen CLI Types - Enhanced with Authentication and Phase 3.3 Support
 * Type definitions for CLI options, agent results, user context, and enhanced features
 * UPDATED: Added Phase 3.3 recursive agent support to types
 */

import { AgentPhase, AgentSpecialization } from "../agent/types.js";
import { UserContext } from "../database/DatabaseManager.js";

export interface CLIOptions {
  vision: string;
  directory?: string;
  phase?: AgentPhase;
  maxIterations?: number;
  costBudget?: number;
  webSearch?: boolean;
  extendedContext?: boolean;
  stream?: boolean;
  verbose?: boolean;
  debug?: boolean;
  dryRun?: boolean;
  visionFile?: string;

  // Enhanced options
  logLevel?: string;
  exportLogs?: boolean;
  enhanced?: boolean;

  // 🎯 NEW: Authentication context
  userContext?: UserContext;

  // 🌟 NEW: Phase 3.3 recursive agent options
  parentSessionId?: string;
  specialization?: AgentSpecialization;
  gitBranch?: string;
  maxRecursionDepth?: number;
}

export interface LoopPreventionData {
  totalActions: number;
  phaseTransitions: number;
  iterationsInFinalPhase: number;
  preventionTriggered: boolean;
}

export interface EnhancedExecutionData {
  totalIterations: number;
  totalTokensUsed: number;
  toolsExecuted: number;
  errorsEncountered: number;
  averageIterationTime: number;
  finalPhase: AgentPhase;
  costBreakdown?: any;
  logsSummary: {,
    totalLogs: number;
    toolExecutions: number;
    phaseTransitions: number;
    errors: number;
    warnings: number;
  };
  loopPrevention?: LoopPreventionData;
  // 🎯 NEW: User context data
  userContext?: {
    userId: string;
    isAdmin: boolean;
    sessionId?: string;
  };
  // 🌟 NEW: Phase 3.3 recursive agent data
  phase33Data?: {
    specialization: AgentSpecialization;
    gitBranch: string;
    parentSessionId?: string;
    maxRecursionDepth: number;
    treeStatus?: any;
  };
}

export interface AgentResult {
  success: boolean;
  summary?: string;
  filesCreated?: string[];
  filesModified?: string[];
  nextSteps?: string[];
  testsRun?: string[];
  validationResults?: string[];
  duration: number;
  totalCost?: number;
  error?: string;

  // Enhanced result data with authentication
  enhancedData?: EnhancedExecutionData;
  // 🎯 NEW: Session information
  sessionInfo?: {
    sessionId: string;
    userId: string;
    isAdmin: boolean;
  };
}

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
}

export interface SessionSummary {
  sessionId: string;
  vision: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  phase: AgentPhase;
  iterationsCompleted: number;
  totalCost?: number;
  filesCreated: string[];
  filesModified: string[];
  toolsExecuted: string[];
  errors: string[];
  result?: AgentResult;
  loopPreventionStats?: LoopPreventionData;
  // 🎯 NEW: User information
  userId?: string;
  isAdmin?: boolean;
  // 🌟 NEW: Phase 3.3 information
  specialization?: AgentSpecialization;
  parentSessionId?: string;
  gitBranch?: string;
}

export interface ConversationOptions {
  sessionId?: string;
  maxIterations?: number;
  costBudget?: number;
  workingDirectory?: string;
  verbose?: boolean;
  debug?: boolean;
  logLevel?: string;
  exportLogs?: boolean;
  enableLoopPrevention?: boolean;
  loopPreventionThreshold?: number;
  // 🎯 NEW: User context for conversations
  userContext?: UserContext;
  // 🌟 NEW: Phase 3.3 options
  parentSessionId?: string;
  specialization?: AgentSpecialization;
  gitBranch?: string;
  maxRecursionDepth?: number;
}

export interface VisionFileOptions {
  file: string;
  validate?: boolean;
  preview?: boolean;
}

// Enhanced logging types
export interface LoggingOptions {
  level: "trace" | "debug" | "info" | "warn" | "error" | "critical";
  writeToFile: boolean;
  filePath?: string;
  verbose: boolean;
  debug: boolean;
  sessionId?: string;
  // 🎯 NEW: User context for logging
  userId?: string;
  // 🌟 NEW: Phase 3.3 context
  specialization?: AgentSpecialization;
  parentSessionId?: string;
}

// Enhanced progress tracking types
export interface ProgressOptions {
  showProgress: boolean;
  updateInterval: number;
  verbose: boolean;
  debug: boolean;
}

// CLI command types
export interface CommandContext {
  options: CLIOptions;
  verbose: boolean;
  debug: boolean;
  startTime: number;
  // 🎯 NEW: User context
  userContext?: UserContext;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  duration: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// Enhanced CLI response types
export interface EnhancedCommandResponse {
  success: boolean;
  result?: AgentResult;
  logs?: any[];
  progressData?: any;
  executionMetrics?: {
    startTime: number;
    endTime: number;
    duration: number;
    peakMemoryUsage: number;
    averageIterationTime: number;
  };
  loopPreventionMetrics?: {
    enabled: boolean;
    triggered: boolean;
    totalActions: number;
    repetitiveActions: number;
    phaseTransitions: number;
  };
  // 🎯 NEW: Authentication metrics
  authenticationMetrics?: {
    userId: string;
    isAdmin: boolean;
    sessionDuration: number;
    creditsUsed?: number;
    rateLimitStatus?: string;
  };
  // 🌟 NEW: Phase 3.3 metrics
  phase33Metrics?: {
    specialization: AgentSpecialization;
    totalChildren: number;
    maxDepth: number;
    totalTreeNodes: number;
    treeExecutionTime: number;
  };
}

// Export utility type helpers
export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";
export type CommandName =
  | "login"
  | "logout"
  | "status"
  | "breathe"
  | "converse"
  | "version"
  | "help";
export type ExecutionMode =
  | "normal"
  | "dry-run"
  | "debug"
  | "verbose"
  | "loop-prevention";

// Loop prevention specific types
export type LoopPreventionReason =
  | "max_iterations"
  | "repetitive_behavior"
  | "stuck_in_phase"
  | "user_stop";
export type LoopPreventionAction =
  | "continue"
  | "force_completion"
  | "phase_transition"
  | "terminate";

export interface LoopPreventionState {
  enabled: boolean;
  currentIteration: number;
  maxIterations: number;
  consecutiveNoProgress: number;
  repetitiveActionCount: number;
  lastActions: string[];
  phaseStartIteration: number;
  reason?: LoopPreventionReason;
  suggestedAction?: LoopPreventionAction;
}

// 🎯 NEW: Authentication specific types
export interface CLIAuthOptions {
  email: string;
  password?: string;
  remember?: boolean;
  force?: boolean;
}

export interface CLIAuthResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    role: string;
    isAdmin: boolean;
  };
  sessionInfo?: {
    expiresAt: number;
    lastActivity: number;
  };
}

export interface CLIStatusInfo {
  authenticated: boolean;
  user?: CLIAuthResult["user"];
  session?: {
    activeFor: number;
    expiresIn: number;
  };
  system?: {
    version: string;
    nodeVersion: string;
    platform: string;
    databaseConnected: boolean;
  };
}

// 🌟 NEW: Phase 3.3 specific types
export interface RecursiveAgentOptions {
  parentSessionId?: string;
  specialization: AgentSpecialization;
  gitBranch: string;
  maxRecursionDepth: number;
  vision: string;
  workingDirectory: string;
  costBudget?: number;
  maxIterations?: number;
}

export interface AgentTreeStatus {
  rootSessionId: string;
  totalNodes: number;
  activeNodes: number;
  completedNodes: number;
  failedNodes: number;
  maxDepth: number;
  executionOrder: string[];
}

export interface ChildAgentResult {
  success: boolean;
  childSessionId?: string;
  gitBranch?: string;
  specialization: AgentSpecialization;
  result?: any;
  error?: string;
  duration?: number;
  cost?: number;
}
