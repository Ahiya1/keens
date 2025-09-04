/**
 * Enhanced validation types with compilation checking support
 * UPDATED: Added compilation-specific types and interfaces
 * FIXED: Added missing properties for TestExecutionResult and all missing exports
 * FIXED: Corrected interfaces to match actual usage in QualityGateManager and validators
 */

export interface ValidationIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
  column?: number;
  autoFixable: boolean;
  suggestion?: string;
  code?: string;
}

export interface ValidationFix {
  issueType: string;
  file: string;
  line: number;
  before: string;
  after: string;
  applied: boolean;
}

export interface CategoryValidation {
  category: string;
  passed: boolean;
  score?: number;
  issues: ValidationIssue[];
  executionTime: number;
  testsRun?: string[];
  suggestions?: string[];
}

export interface ValidationResult {
  overall: 'pass' | 'fail' | 'warning';
  score: number;
  categories: { [category: string]: CategoryValidation };
  issues: ValidationIssue[];
  suggestions: string[];
  autoFixApplied: ValidationFix[];
  executionTime: number;
  timestamp?: string;
}

export interface ValidationOptions {
  validationType?: 'full' | 'incremental' | 'quick';
  scope?: string[];
  categories?: string[];
  fixIssues?: boolean;
  silentMode?: boolean;
  projectPath?: string;
}

export interface ValidationEngineOptions {
  enableAutoFix?: boolean;
  qualityThreshold?: number;
  maxExecutionTime?: number;
  silentMode?: boolean;
  debug?: boolean;
}

// NEW: Quality gate evaluation result  
export interface GateResult {
  gate: string;
  passed: boolean;
  overallScore: number;
  threshold: number;
  evaluations: CriteriaEvaluation[];
  recommendations: string[];
  executionTime?: number;
}

// ADDED: Missing quality gate types - FIXED interfaces
export interface QualityGate {
  name: string;
  description?: string;
  phase?: AgentPhase;
  threshold: number;
  criteria: QualityCriteria[];
  enabled?: boolean;
}

// Context for validation functions
interface ValidationContext {
  sessionId: string;
  workspacePath: string;
  filesCreated?: string[];
  filesModified?: string[];
  testsRun?: string[];
}

export interface QualityCriteria {
  name: string;
  description?: string;
  weight: number;
  threshold?: number;
  validator: (context: ValidationContext) => Promise<{,
    score: number;
    issues?: ValidationIssue[];
    suggestions?: string[];
  }>;
  config?: any;
}

export interface CriteriaEvaluation {
  criteria: string; // Changed from criteriaName to criteria to match actual usage,
  passed: boolean;
  score: number;
  weight: number;
  threshold?: number;
  message?: string;
  details?: any;
  issues?: ValidationIssue[];
  suggestions?: string[];
}

// Agent phases (needed by QualityGateManager) - FIXED: Use consistent phase names
export type AgentPhase = 'EXPLORE' | 'PLAN' | 'FOUND' | 'SUMMON' | 'COMPLETE';

// NEW: Compilation-specific types
export interface CompilationError {
  type: 'error' | 'warning';
  file: string;
  line: number;
  column?: number;
  message: string;
  code?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface CompilationResult {
  success: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: string;
  executionTime: number;
  validationSteps: string[];
  
  // Additional compilation-specific data
  tsCompilationResult?: {
    success: boolean;
    errors: CompilationError[];
    warnings: CompilationError[];
  };
  
  buildScriptResult?: {
    success: boolean;
    errors: string[];
  };
  
  dependencyResult?: {
    success: boolean;
    missingDependencies: string[];
    criticalMissing: string[];
  };
}

export interface CompilationValidatorOptions {
  silentMode?: boolean;
  includeWarnings?: boolean;
  checkDependencies?: boolean;
  validateBuildScripts?: boolean;
  timeout?: number;
  debug?: boolean;
}

// Test execution types (enhanced) - FIXED: Added missing properties
export interface TestExecutionResult {
  passed: boolean;
  total: number;
  failed: number;
  skipped?: number;
  duration?: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  failedTests?: Array<{
    name: string;
    error: string;
    file?: string;
    line?: number;
  }>;
  // ADDED: Missing properties used by TestValidator
  output?: string;
  errors?: string[];
}

// Security scan types (enhanced) - FIXED: Added severity property
export interface SecurityVulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low'; // FIXED: Removed 'info' type,
  description: string;
  file?: string;
  line?: number;
  cwe?: string;
  recommendation: string;
}

export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  autoFixesAvailable: string[];
  recommendations: string[];
  scanDuration: number;
  // ADDED: Missing severity property
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

// Performance analysis types (enhanced) - FIXED: Updated to match actual usage
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  passed?: boolean;
  // ADDED: Missing status property used by PerformanceValidator
  status?: 'critical' | 'warning' | 'good';
}

export interface PerformanceBottleneck {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file?: string;
  recommendation: string;
  impact?: string;
}

export interface PerformanceAnalysis {
  score: number;
  bottlenecks: PerformanceBottleneck[];
  optimizations: string[];
  // FIXED: Changed from object to array to match PerformanceValidator usage
  metrics: PerformanceMetric[];
}

// Documentation validation types (enhanced)
export interface DocumentationIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export interface DocumentationValidationResult {
  score: number;
  issues: DocumentationIssue[];
  suggestions: string[];
  coverage?: {
    functions: number;
    classes: number;
    interfaces: number;
    overall: number;
  };
}

// NEW: Agent completion validation result
export interface CompletionValidationResult {
  canComplete: boolean;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  recommendations: string[];
  
  compilationResult: CompilationResult;
  testResult?: TestExecutionResult;
  qualityScore?: number;
  
  summary: string;
  nextSteps?: string[];
}

// NEW: Agent revival context
export interface AgentRevivalContext {
  originalVision: string;
  previousAttempt: string;
  compilationErrors: CompilationError[];
  failureReason: string;
  attemptCount: number;
  maxAttempts: number;
}
