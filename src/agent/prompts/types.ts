/**
 * Type definitions for the modular prompt system
 * UPDATED: Synchronized AgentPhase with main types
 */

import { UserContext } from '../../database/DatabaseManager.js';

export type AgentSpecialization = 'frontend' | 'backend' | 'database' | 'testing' | 'security' | 'devops' | 'general';
// UPDATED: Synchronized with main agent types (src/agent/types.ts)
export type AgentPhase = 'EXPLORE' | 'PLAN' | 'FOUND' | 'SUMMON' | 'COMPLETE';
export type PromptType = 'system' | 'conversation' | 'child_agent' | 'error_recovery';

export interface PromptContext {
  // Basic context
  vision: string;
  workingDirectory: string;
  sessionId: string;
  timestamp: string;
  
  // User information
  userContext?: UserContext;
  
  // Agent information
  specialization?: AgentSpecialization;
  phase?: AgentPhase;
  gitBranch?: string;
  
  // Recursive agent context
  parentSessionId?: string;
  maxRecursionDepth?: number;
  
  // Capabilities
  hasWebSearch?: boolean;
  hasRecursiveSpawning?: boolean;
  availableTools?: string[];
  
  // Error recovery context
  errors?: string[];
  previousAttempt?: string;
  compilationErrors?: CompilationError[];
}

export interface CompilationError {
  file: string;
  line: number;
  column?: number;
  message: string;
  type: 'error' | 'warning';
  code?: string;
}

export interface PromptConfiguration {
  type: PromptType;
  specialization: AgentSpecialization;
  phase: AgentPhase;
  context: PromptContext;
  
  // Customization options
  includePhaseGuidance?: boolean;
  includeToolInstructions?: boolean;
  includeCompilationChecking?: boolean;
  includeRecursiveSpawning?: boolean;
  
  // Error recovery specific
  errors?: string[];
  previousAttempt?: string;
}

export interface SystemPromptComponents {
  // Core sections
  header?: string;
  task?: string;
  context?: string;
  capabilities?: string;
  
  // Guidelines and instructions
  autonomousOperation?: string;
  phaseLifecycle?: string;
  toolInstructions?: string;
  compilationRequirements?: string;
  
  // Specialization content
  specializationGuidance?: string;
  recursiveSpawning?: string;
  
  // Footer
  sessionInfo?: string;
  footer?: string;
}

export interface PromptTemplate {
  name: string;
  type: PromptType;
  content: string;
  requiredContext: string[];
  optional?: boolean;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
  missingComponents: string[];
  recommendations: string[];
}

export interface PromptCustomization {
  templateName: string;
  customContent: string;
  reason?: string;
  author?: string;
  timestamp?: string;
}

export interface PromptMetrics {
  buildTime: number;
  validationTime: number;
  renderTime: number;
  totalLength: number;
  componentCount: number;
  cacheHits?: number;
}

// Template categories for organization
export type TemplateCategory = 
  | 'core'
  | 'specialization'
  | 'capabilities'
  | 'instructions'
  | 'error_handling'
  | 'customization';

export interface TemplateMetadata {
  category: TemplateCategory;
  priority: number;
  dependencies?: string[];
  compatibility: PromptType[];
  version: string;
}