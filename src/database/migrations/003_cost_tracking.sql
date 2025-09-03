-- Migration: Add comprehensive cost tracking to agent_sessions table
-- This migration adds detailed API cost tracking columns to support real-time cost monitoring

-- Add cost tracking columns to agent_sessions table
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS api_calls_data JSONB DEFAULT '[]';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_api_cost DECIMAL(12,6) DEFAULT 0.000000;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_api_calls INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_input_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_output_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_thinking_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS extended_pricing_calls INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS average_cost_per_call DECIMAL(10,6) DEFAULT 0.000000;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_by_phase JSONB DEFAULT '{}';

-- Create indexes for cost-related queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_total_api_cost ON agent_sessions(total_api_cost);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_total_api_calls ON agent_sessions(total_api_calls);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_breakdown ON agent_sessions USING GIN (cost_breakdown);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_api_calls_data ON agent_sessions USING GIN (api_calls_data);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_by_phase ON agent_sessions USING GIN (cost_by_phase);

-- Create composite index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_analysis ON agent_sessions(user_id, total_api_cost, total_api_calls, execution_status);

-- Add cost tracking to session messages (for detailed per-message cost tracking)
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS api_cost DECIMAL(10,6) DEFAULT 0.000000;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS thinking_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS is_extended_pricing BOOLEAN DEFAULT FALSE;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS api_call_duration INTEGER DEFAULT 0; -- milliseconds

-- Create indexes for message-level cost queries
CREATE INDEX IF NOT EXISTS idx_session_messages_api_cost ON session_messages(api_cost);
CREATE INDEX IF NOT EXISTS idx_session_messages_tokens ON session_messages(input_tokens, output_tokens, thinking_tokens);

-- Create function to automatically calculate cost breakdown when session is updated
CREATE OR REPLACE FUNCTION update_session_cost_breakdown()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average cost per call
    IF NEW.total_api_calls > 0 THEN
        NEW.average_cost_per_call = NEW.total_api_cost / NEW.total_api_calls;
    ELSE
        NEW.average_cost_per_call = 0;
    END IF;
    
    -- Update cost breakdown JSON with calculated values
    NEW.cost_breakdown = jsonb_build_object(
        'totalCost', NEW.total_api_cost,
        'totalCalls', NEW.total_api_calls,
        'totalTokens', (NEW.total_input_tokens + NEW.total_output_tokens + NEW.total_thinking_tokens),
        'averageCostPerCall', NEW.average_cost_per_call,
        'inputTokens', NEW.total_input_tokens,
        'outputTokens', NEW.total_output_tokens,
        'thinkingTokens', NEW.total_thinking_tokens,
        'extendedPricingCalls', NEW.extended_pricing_calls,
        'lastUpdated', NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update cost breakdown
DROP TRIGGER IF EXISTS update_session_cost_breakdown_trigger ON agent_sessions;
CREATE TRIGGER update_session_cost_breakdown_trigger
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW 
    WHEN (OLD.total_api_cost IS DISTINCT FROM NEW.total_api_cost OR 
          OLD.total_api_calls IS DISTINCT FROM NEW.total_api_calls)
    EXECUTE FUNCTION update_session_cost_breakdown();

-- Create function to get session cost summary
CREATE OR REPLACE FUNCTION get_session_cost_summary(session_uuid UUID)
RETURNS TABLE (
    session_id VARCHAR,
    total_cost DECIMAL(12,6),
    total_calls INTEGER,
    total_tokens BIGINT,
    average_cost_per_call DECIMAL(10,6),
    cost_breakdown JSONB,
    cost_by_phase JSONB,
    extended_pricing_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id,
        s.total_api_cost,
        s.total_api_calls,
        (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens)::BIGINT,
        s.average_cost_per_call,
        s.cost_breakdown,
        s.cost_by_phase,
        CASE 
            WHEN s.total_api_calls > 0 THEN (s.extended_pricing_calls::DECIMAL / s.total_api_calls) * 100
            ELSE 0
        END
    FROM agent_sessions s
    WHERE s.id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user cost analytics
CREATE OR REPLACE FUNCTION get_user_cost_analytics(
    user_uuid UUID,
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_cost DECIMAL(12,6),
    total_sessions INTEGER,
    total_api_calls INTEGER,
    total_tokens BIGINT,
    average_cost_per_session DECIMAL(10,6),
    most_expensive_session DECIMAL(12,6),
    cost_trend_data JSONB
) AS $$
DECLARE
    date_filter_start TIMESTAMP;
    date_filter_end TIMESTAMP;
BEGIN
    -- Set default date range if not provided (last 30 days)
    date_filter_start := COALESCE(start_date, NOW() - INTERVAL '30 days');
    date_filter_end := COALESCE(end_date, NOW());
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.total_api_cost), 0)::DECIMAL(12,6) as total_cost,
        COUNT(*)::INTEGER as total_sessions,
        COALESCE(SUM(s.total_api_calls), 0)::INTEGER as total_api_calls,
        COALESCE(SUM(s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens), 0)::BIGINT as total_tokens,
        CASE 
            WHEN COUNT(*) > 0 THEN (COALESCE(SUM(s.total_api_cost), 0) / COUNT(*))::DECIMAL(10,6)
            ELSE 0::DECIMAL(10,6)
        END as average_cost_per_session,
        COALESCE(MAX(s.total_api_cost), 0)::DECIMAL(12,6) as most_expensive_session,
        jsonb_build_object(
            'dailyCosts', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', date_trunc('day', s2.created_at)::DATE,
                        'cost', COALESCE(SUM(s2.total_api_cost), 0),
                        'sessions', COUNT(*)
                    ) ORDER BY date_trunc('day', s2.created_at)
                )
                FROM agent_sessions s2 
                WHERE s2.user_id = user_uuid 
                AND s2.created_at BETWEEN date_filter_start AND date_filter_end
                GROUP BY date_trunc('day', s2.created_at)
            ),
            'phaseDistribution', (
                SELECT jsonb_object_agg(phase_data.phase, phase_data.cost)
                FROM (
                    SELECT 
                        s3.current_phase as phase,
                        COALESCE(SUM(s3.total_api_cost), 0) as cost
                    FROM agent_sessions s3
                    WHERE s3.user_id = user_uuid 
                    AND s3.created_at BETWEEN date_filter_start AND date_filter_end
                    GROUP BY s3.current_phase
                ) phase_data
            )
        ) as cost_trend_data
    FROM agent_sessions s
    WHERE s.user_id = user_uuid 
    AND s.created_at BETWEEN date_filter_start AND date_filter_end;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for cost analytics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS session_cost_analytics AS
SELECT 
    DATE(s.created_at) as date,
    s.user_id,
    COUNT(*) as sessions_count,
    SUM(s.total_api_cost) as total_cost,
    AVG(s.total_api_cost) as avg_cost_per_session,
    SUM(s.total_api_calls) as total_api_calls,
    SUM(s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) as total_tokens,
    SUM(s.extended_pricing_calls) as extended_pricing_calls,
    s.current_phase,
    COUNT(*) FILTER (WHERE s.execution_status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE s.execution_status = 'failed') as failed_sessions
FROM agent_sessions s
WHERE s.total_api_cost > 0
GROUP BY DATE(s.created_at), s.user_id, s.current_phase;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_cost_analytics_unique 
ON session_cost_analytics (date, user_id, current_phase);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_session_cost_analytics_date_user 
ON session_cost_analytics (date, user_id);

-- Function to refresh cost analytics (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_cost_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY session_cost_analytics;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN agent_sessions.api_calls_data IS 'JSON array of individual API call records with detailed cost and token information';
COMMENT ON COLUMN agent_sessions.cost_breakdown IS 'JSON object containing comprehensive cost analysis and breakdown';
COMMENT ON COLUMN agent_sessions.total_api_cost IS 'Total cost in USD for all API calls in this session (6 decimal precision)';
COMMENT ON COLUMN agent_sessions.total_api_calls IS 'Total number of API calls made during this session';
COMMENT ON COLUMN agent_sessions.total_input_tokens IS 'Total input tokens consumed across all API calls';
COMMENT ON COLUMN agent_sessions.total_output_tokens IS 'Total output tokens generated across all API calls';
COMMENT ON COLUMN agent_sessions.total_thinking_tokens IS 'Total thinking tokens used across all API calls';
COMMENT ON COLUMN agent_sessions.extended_pricing_calls IS 'Number of API calls that used extended context pricing (>200K tokens)';
COMMENT ON COLUMN agent_sessions.average_cost_per_call IS 'Average cost per API call for this session';
COMMENT ON COLUMN agent_sessions.cost_by_phase IS 'JSON object showing cost breakdown by agent execution phase';

COMMENT ON COLUMN session_messages.api_cost IS 'Cost in USD for the API call that generated this message';
COMMENT ON COLUMN session_messages.input_tokens IS 'Number of input tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.output_tokens IS 'Number of output tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.thinking_tokens IS 'Number of thinking tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.is_extended_pricing IS 'Whether this API call used extended context pricing';
COMMENT ON COLUMN session_messages.api_call_duration IS 'Duration of the API call in milliseconds';

COMMENT ON FUNCTION get_session_cost_summary IS 'Get comprehensive cost summary for a specific session';
COMMENT ON FUNCTION get_user_cost_analytics IS 'Get detailed cost analytics for a user within a date range';
COMMENT ON MATERIALIZED VIEW session_cost_analytics IS 'Aggregated daily cost analytics for efficient reporting and dashboards';

-- Create a view for easy cost monitoring queries
CREATE OR REPLACE VIEW session_cost_overview AS
SELECT 
    s.id,
    s.session_id,
    s.user_id,
    u.email as user_email,
    s.total_api_cost,
    s.total_api_calls,
    (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) as total_tokens,
    s.average_cost_per_call,
    s.extended_pricing_calls,
    CASE 
        WHEN s.total_api_calls > 0 THEN (s.extended_pricing_calls::DECIMAL / s.total_api_calls) * 100
        ELSE 0
    END as extended_pricing_percentage,
    s.execution_status,
    s.current_phase,
    s.created_at,
    s.updated_at,
    (s.updated_at - s.created_at) as session_duration,
    s.cost_breakdown,
    -- Cost efficiency metrics
    CASE 
        WHEN (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) > 0 
        THEN s.total_api_cost / ((s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) / 1000000.0)
        ELSE 0
    END as cost_per_million_tokens
FROM agent_sessions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.total_api_cost > 0
ORDER BY s.total_api_cost DESC;

COMMENT ON VIEW session_cost_overview IS 'Comprehensive view for cost monitoring and analysis with user information and efficiency metrics';