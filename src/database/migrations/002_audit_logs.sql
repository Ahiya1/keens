-- Phase 2 API Gateway - Audit Logging Table
-- Comprehensive security and compliance audit logging

-- Audit Logs Table for API Gateway
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL, 
    
    -- Context and references
    user_id UUID,
    agent_session_id UUID,
    request_id VARCHAR(100),
    
    -- Event timing
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Client information
    ip_address INET,
    user_agent TEXT,
    
    -- Event data (flexible JSON storage)
    event_data JSONB NOT NULL DEFAULT '{}',
    
    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    
    -- Admin activity tracking
    is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Retention and compliance
    retention_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit timestamp
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_session_id ON audit_logs(agent_session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_admin_action ON audit_logs(is_admin_action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_timestamp ON audit_logs(event_type, timestamp DESC);

-- GIN index for searching within event_data JSON
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_data_gin ON audit_logs USING GIN(event_data);

-- Enable Row Level Security for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Only admin users can access audit logs
CREATE POLICY audit_logs_admin_policy ON audit_logs
    FOR ALL TO application_user
    USING (COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true);

-- Create function to set user context for RLS
CREATE OR REPLACE FUNCTION set_user_context(p_user_id UUID, p_is_admin BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
BEGIN
    -- Set user context for Row Level Security
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.is_admin_user', p_is_admin::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear user context
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS VOID AS $$
BEGIN
    -- Clear user context
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.is_admin_user', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on context functions
GRANT EXECUTE ON FUNCTION set_user_context(UUID, BOOLEAN) TO application_user;
GRANT EXECUTE ON FUNCTION clear_user_context() TO application_user;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for API Gateway security and compliance';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event: api_request, authentication, admin_action, security_event, etc.';
COMMENT ON COLUMN audit_logs.event_data IS 'Flexible JSON storage for event-specific data and metadata';
COMMENT ON COLUMN audit_logs.risk_level IS 'Risk assessment: low, medium, high, critical for security monitoring';
COMMENT ON COLUMN audit_logs.is_admin_action IS 'Flag indicating this event was performed by an admin user';
COMMENT ON COLUMN audit_logs.retention_date IS 'Date after which this log can be archived (default 2 years)';