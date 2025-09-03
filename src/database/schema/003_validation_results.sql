-- Phase 3.2 Database Schema Extensions
-- Validation results storage and quality gates

-- Validation results for each agent session
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'quick'
    overall_status VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'warning'
    score DECIMAL(5,2), -- 0-100 score
    categories JSONB DEFAULT '{}'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    auto_fixes_applied JSONB DEFAULT '[]'::jsonb,
    suggestions JSONB DEFAULT '[]'::jsonb,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality gate evaluations
CREATE TABLE IF NOT EXISTS quality_gate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    phase VARCHAR(20) NOT NULL, -- 'EXPLORE', 'SUMMON', 'COMPLETE'
    gate_name VARCHAR(100) NOT NULL,
    passed BOOLEAN NOT NULL,
    overall_score DECIMAL(5,2),
    threshold DECIMAL(5,2),
    criteria_evaluations JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-fix tracking
CREATE TABLE IF NOT EXISTS auto_fixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_result_id UUID REFERENCES validation_results(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    file_path TEXT,
    line_number INTEGER DEFAULT 0,
    fix_description TEXT,
    before_snippet TEXT,
    after_snippet TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation issues tracking
CREATE TABLE IF NOT EXISTS validation_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_result_id UUID NOT NULL REFERENCES validation_results(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
    category VARCHAR(50) NOT NULL, -- 'syntax', 'style', 'tests', 'security', 'performance', 'documentation'
    message TEXT NOT NULL,
    file_path TEXT,
    line_number INTEGER DEFAULT 0,
    column_number INTEGER DEFAULT 0,
    auto_fixable BOOLEAN DEFAULT FALSE,
    suggestion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality metrics tracking
CREATE TABLE IF NOT EXISTS quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_result_id UUID REFERENCES validation_results(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metric_unit VARCHAR(20),
    threshold_value DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'unknown', -- 'good', 'warning', 'critical'
    category VARCHAR(50),
    measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_results_session ON validation_results (session_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_status ON validation_results (overall_status);
CREATE INDEX IF NOT EXISTS idx_validation_results_created_at ON validation_results (created_at);

CREATE INDEX IF NOT EXISTS idx_quality_gate_evaluations_session ON quality_gate_evaluations (session_id, phase);
CREATE INDEX IF NOT EXISTS idx_quality_gate_evaluations_passed ON quality_gate_evaluations (passed);

CREATE INDEX IF NOT EXISTS idx_auto_fixes_session ON auto_fixes (session_id, success);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_validation_result ON auto_fixes (validation_result_id);

CREATE INDEX IF NOT EXISTS idx_validation_issues_validation_result ON validation_issues (validation_result_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_severity ON validation_issues (severity);
CREATE INDEX IF NOT EXISTS idx_validation_issues_category ON validation_issues (category);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_session ON quality_metrics (session_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_validation_result ON quality_metrics (validation_result_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_status ON quality_metrics (status);

-- Update existing agent_sessions table to include validation status
ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0;

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS last_validation_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON TABLE validation_results IS 'Stores comprehensive validation results for agent sessions';
COMMENT ON TABLE quality_gate_evaluations IS 'Tracks quality gate evaluations for each phase';
COMMENT ON TABLE auto_fixes IS 'Records automatic fixes applied during validation';
COMMENT ON TABLE validation_issues IS 'Detailed validation issues found during analysis';
COMMENT ON TABLE quality_metrics IS 'Quality metrics and performance indicators';

COMMENT ON COLUMN validation_results.session_id IS 'Reference to the agent session';
COMMENT ON COLUMN validation_results.validation_type IS 'Type of validation performed';
COMMENT ON COLUMN validation_results.overall_status IS 'Overall validation result status';
COMMENT ON COLUMN validation_results.score IS 'Overall quality score from 0-100';
COMMENT ON COLUMN validation_results.categories IS 'JSON object containing results by validation category';
COMMENT ON COLUMN validation_results.issues IS 'JSON array of validation issues found';
COMMENT ON COLUMN validation_results.auto_fixes_applied IS 'JSON array of automatic fixes applied';
COMMENT ON COLUMN validation_results.suggestions IS 'JSON array of improvement suggestions';

COMMENT ON COLUMN quality_gate_evaluations.phase IS 'Agent phase when gate was evaluated';
COMMENT ON COLUMN quality_gate_evaluations.gate_name IS 'Name of the quality gate';
COMMENT ON COLUMN quality_gate_evaluations.passed IS 'Whether the quality gate passed';
COMMENT ON COLUMN quality_gate_evaluations.overall_score IS 'Overall score for the gate evaluation';
COMMENT ON COLUMN quality_gate_evaluations.criteria_evaluations IS 'JSON array of individual criteria evaluations';

COMMENT ON COLUMN auto_fixes.issue_type IS 'Type of issue that was fixed';
COMMENT ON COLUMN auto_fixes.success IS 'Whether the auto-fix was successful';
COMMENT ON COLUMN auto_fixes.before_snippet IS 'Code before the fix was applied';
COMMENT ON COLUMN auto_fixes.after_snippet IS 'Code after the fix was applied';

COMMENT ON COLUMN validation_issues.severity IS 'Severity level of the validation issue';
COMMENT ON COLUMN validation_issues.category IS 'Validation category the issue belongs to';
COMMENT ON COLUMN validation_issues.auto_fixable IS 'Whether the issue can be automatically fixed';

COMMENT ON COLUMN quality_metrics.metric_name IS 'Name of the quality metric being tracked';
COMMENT ON COLUMN quality_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN quality_metrics.threshold_value IS 'Threshold value for determining status';
COMMENT ON COLUMN quality_metrics.status IS 'Status based on threshold comparison';
