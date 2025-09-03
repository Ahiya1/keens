/**
 * keen Agent Types - Enhanced with Phase 3.3 Recursive Agent Support
 * Core type definitions with user context support and recursive agent spawning
 * UPDATED: Added PLAN and FOUND phases, recursive agent types, and sub-vision specialization
 */

import { AnthropicConfig } from '../config/AnthropicConfig.js';
import { UserContext } from '../database/DatabaseManager.js';

// Agent execution phases - UPDATED for Phase 3.3
export type AgentPhase = 'EXPLORE' | 'PLAN' | 'FOUND' | 'SUMMON' | 'COMPLETE';

// NEW: Sub-vision specialization types
export type AgentSpecialization = 
  | 'frontend' // UI, React/Vue, accessibility, styling
  | 'backend' // APIs, authentication, server logic
  | 'database' // Schema design, query optimization
  | 'testing' // Unit, integration, E2E
  | 'security' // Auth, data protection, audits
  | 'devops' // Deployment, CI/CD, scaling
  | 'general'; // Default, no specific specialization

// NEW: Agent spawn request for recursive spawning
export interface AgentSpawnRequest {
  vision: string; // Sub-vision for the child agent
  specialization: AgentSpecialization;
  parentSessionId: string;
  workingDirectory: string;
  gitBranch: string; // Branch name for this child
  maxIterations?: number;
  costBudget?: number;
  context?: any; // Filtered context from parent
}

// NEW: Agent spawn result
export interface AgentSpawnResult {
  success: boolean;
  childSessionId?: string;
  gitBranch?: string;
  error?: string;
  result?: any; // Result from child agent completion
}

// NEW: Agent tree node for hierarchy management
export interface AgentTreeNode {
  sessionId: string;
  parentId?: string;
  children: string[];
  specialization: AgentSpecialization;
  phase: AgentPhase;
  gitBranch: string;
  depth: number;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
}

// NEW: Agent tree status for get_agent_status tool
export interface AgentTreeStatus {
  rootSessionId: string;
  totalNodes: number;
  activeNodes: number;
  completedNodes: number;
  failedNodes: number;
  maxDepth: number;
  tree: Record<string, AgentTreeNode>;
  executionOrder: string[]; // Sequential execution order
}

// Agent execution context with user authentication - UPDATED for Phase 3.3
export interface AgentExecutionContext {
  sessionId: string;
  workingDirectory: string;
  dryRun: boolean;
  verbose: boolean;
  toolManagerOptions?: ToolManagerOptions;
  // 🎯 NEW: User context for authenticated operations
  userContext?: UserContext;
  // 🎯 NEW: Parent context for recursive spawning
  parentSessionId?: string;
  specialization?: AgentSpecialization;
  gitBranch?: string;
  agentTreeManager?: any; // Will be typed properly when implemented
}

// Tool manager options with authentication
export interface ToolManagerOptions {
  workingDirectory: string;
  enableWebSearch: boolean;
  debug: boolean;
  // 🎯 NEW: User context for tools that need database access
  userContext?: UserContext;
  // 🎯 NEW: Agent tree manager for recursive operations
  agentTreeManager?: any;
}

// Agent session options with user context - UPDATED for Phase 3.3
export interface AgentSessionOptions {
  sessionId: string;
  vision: string;
  workingDirectory: string;
  visionFile?: string;
  anthropicConfig: AnthropicConfig;
  dryRun: boolean;
  verbose: boolean;
  debug: boolean;
  // 🎯 NEW: User context for session tracking
  userContext?: UserContext;
  // 🎯 NEW: Recursive agent support
  parentSessionId?: string;
  specialization?: AgentSpecialization;
  gitBranch?: string;
  maxRecursionDepth?: number;
}

// Tool schema for Claude
export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tool execution result - UPDATED for Phase 3.3
export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
  // 🎯 NEW: User context info in tool results
  userContext?: {
    userId: string;
    isAdmin: boolean;
  };
  // 🎯 NEW: Recursive spawning results
  spawnResult?: AgentSpawnResult;
}

// Thinking block with user context
export interface ThinkingBlock {
  id: string;
  type: 'analysis' | 'planning' | 'decision' | 'reflection' | 'error';
  phase: AgentPhase;
  content: string;
  timestamp: Date;
  iteration?: number;
  confidence?: number;
  // 🎯 NEW: User context for thinking attribution
  userContext?: {
    userId: string;
    isAdmin: boolean;
  };
}

// Phase transition tracking - UPDATED for Phase 3.3
export interface PhaseTransition {
  from: AgentPhase;
  to: AgentPhase;
  timestamp: Date;
  reason?: string;
  iteration: number;
  // 🎯 NEW: User context for phase transitions
  userContext?: {
    userId: string;
    isAdmin: boolean;
  };
  // 🎯 NEW: Tree context for recursive agents
  treeDepth?: number;
  parentSessionId?: string;
}

// Agent metrics with authentication info - UPDATED for Phase 3.3
export interface AgentMetrics {
  sessionId: string;
  totalIterations: number;
  phaseTransitions: number;
  toolExecutions: number;
  totalDuration: number;
  tokensUsed: number;
  costEstimate: number;
  successRate: number;
  // 🎯 NEW: Authentication metrics
  authenticationMetrics: {
    authenticated: boolean;
    userId?: string;
    isAdmin: boolean;
    sessionDuration: number;
  };
  // 🎯 NEW: Recursive agent metrics
  recursiveMetrics?: {
    totalChildren: number;
    maxDepth: number;
    totalTreeNodes: number;
    treeExecutionTime: number;
  };
}

// Error types - UPDATED for Phase 3.3
export interface AgentError {
  type: 'tool_error' | 'api_error' | 'validation_error' | 'system_error' | 'auth_error' | 'spawn_error' | 'git_error';
  message: string;
  details?: any;
  iteration?: number;
  phase?: AgentPhase;
  timestamp: Date;
  // 🎯 NEW: User context for error attribution
  userContext?: {
    userId: string;
    isAdmin: boolean;
  };
  // 🎯 NEW: Tree context for recursive errors
  sessionId?: string;
  parentSessionId?: string;
  specialization?: AgentSpecialization;
}

// Validation types
export interface ValidationRequest {
  categories?: string[];
  scope?: string[];
  fixIssues?: boolean;
  silentMode?: boolean;
  validationType?: 'full' | 'incremental' | 'quick';
  // 🎯 NEW: User context for validation permissions
  userContext?: UserContext;
}

export interface ValidationResult {
  overall: 'pass' | 'fail' | 'warning';
  score: number;
  categories: Record<string, any>;
  issues: any[];
  autoFixesApplied: any[];
  // 🎯 NEW: User context info
  validatedBy?: {
    userId: string;
    isAdmin: boolean;
    timestamp: Date;
  };
}

// Quality metrics with user attribution
export interface QualityMetrics {
  overallQualityScore: number;
  codeQualityScore: number;
  testCoverage: number;
  documentationScore: number;
  securityScore: number;
  performanceScore: number;
  // 🎯 NEW: Assessment attribution
  assessedBy?: {
    userId: string;
    isAdmin: boolean;
    timestamp: Date;
  };
}

// Session summary with authentication - UPDATED for Phase 3.3
export interface SessionSummary {
  sessionId: string;
  phase: AgentPhase;
  duration: number;
  iterations: number;
  filesModified: string[];
  filesCreated: string[];
  toolsUsed: string[];
  errors: AgentError[];
  metrics: AgentMetrics;
  qualityMetrics?: QualityMetrics;
  // 🎯 NEW: User session info
  userInfo: {
    userId: string;
    isAdmin: boolean;
    authenticationDuration: number;
  };
  // 🎯 NEW: Recursive session info
  recursiveInfo?: {
    parentSessionId?: string;
    childSessions: string[];
    specialization: AgentSpecialization;
    treeDepth: number;
    totalTreeTime: number;
  };
}

// Export commonly used type unions - UPDATED for Phase 3.3
export type ToolName = 
  | 'get_project_tree'
  | 'read_files'
  | 'write_files'
  | 'run_command'
  | 'web_search'
  | 'git'
  | 'validate_project'
  | 'report_phase'
  | 'continue_work'
  | 'report_complete'
  // 🎯 NEW: Phase 3.3 recursive spawning tools
  | 'summon_agent'
  | 'coordinate_agents'
  | 'get_agent_status';

export type ValidationCategory = 
  | 'syntax'
  | 'style'
  | 'tests'
  | 'security'
  | 'performance'
  | 'documentation';

export type ValidationType = 'full' | 'incremental' | 'quick';

// NEW: Git branch naming utilities
export const GitBranchUtils = {
  /**
   * Generate next child branch name in sequence (summon-A, summon-B, etc.)
   */
  nextChildBranch(parentBranch: string, existingChildren: string[] = []): string {
    const basePrefix = parentBranch === 'main' ? 'summon' : `${parentBranch}-summon`;
    
    // Find the next available letter
    const usedLetters = existingChildren
      .filter(branch => branch.startsWith(basePrefix))
      .map(branch => {
        const parts = branch.split('-');
        return parts[parts.length - 1]; // Get last part (letter)
      })
      .filter(letter => /^[A-Z]$/.test(letter));
    
    let nextLetter = 'A';
    while (usedLetters.includes(nextLetter)) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }
    
    return `${basePrefix}-${nextLetter}`;
  },
  
  /**
   * Validate branch name format
   */
  isValidChildBranch(branchName: string): boolean {
    return /^(main|summon(-[A-Z])+)$/.test(branchName) || /^summon-[A-Z]$/.test(branchName);
  },
  
  /**
   * Get parent branch from child branch name
   */
  getParentBranch(childBranch: string): string {
    if (childBranch === 'main') return '';
    if (childBranch.startsWith('summon-') && childBranch.split('-').length === 2) {
      return 'main';
    }
    
    const parts = childBranch.split('-');
    return parts.slice(0, -2).join('-'); // Remove last two parts (-summon-X)
  },
  
  /**
   * Get branch depth
   */
  getBranchDepth(branchName: string): number {
    if (branchName === 'main') return 0;
    return (branchName.match(/summon/g) || []).length;
  }
};
