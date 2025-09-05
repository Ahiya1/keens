# Missing Database Schema - Manual Application Required

The following SQL needs to be executed in the Supabase SQL Editor to add the missing cost tracking columns:

**Go to:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

**Execute the following SQL:**

```sql
-- Add missing cost tracking columns to agent_sessions table
ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS api_calls_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_api_cost DECIMAL(12,6) DEFAULT 0.000000;

-- Add indexes for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_total_api_cost ON agent_sessions(total_api_cost);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_api_calls_data_gin ON agent_sessions USING gin(api_calls_data);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_breakdown_gin ON agent_sessions USING gin(cost_breakdown);

-- Update daily_analytics to include API cost metrics  
ALTER TABLE daily_analytics 
ADD COLUMN IF NOT EXISTS total_api_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_cost_breakdown JSONB DEFAULT '{}';

-- Create session_messages table if it doesn't exist (referenced by SessionDAO)
CREATE TABLE IF NOT EXISTS session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system', 'thinking')),
    content TEXT NOT NULL,
    thinking_content TEXT,
    phase VARCHAR(20) NOT NULL,
    iteration INTEGER NOT NULL DEFAULT 0,
    tool_calls JSONB DEFAULT '[]',
    tool_results JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    api_call_cost DECIMAL(12,6) DEFAULT 0.000000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create session_thinking_blocks table if it doesn't exist (referenced by SessionDAO)
CREATE TABLE IF NOT EXISTS session_thinking_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    thinking_type VARCHAR(50) NOT NULL CHECK (thinking_type IN ('analysis', 'planning', 'decision', 'reflection', 'error_recovery')),
    thinking_content TEXT NOT NULL,
    context_snapshot JSONB DEFAULT '{}',
    confidence_level DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_level BETWEEN 0 AND 1),
    phase VARCHAR(20) NOT NULL,
    iteration INTEGER NOT NULL DEFAULT 0,
    associated_cost DECIMAL(12,6) DEFAULT 0.000000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for session_messages
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_message_type ON session_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_session_messages_phase ON session_messages(phase);
CREATE INDEX IF NOT EXISTS idx_session_messages_created_at ON session_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_session_messages_api_call_cost ON session_messages(api_call_cost);

-- Create indexes for session_thinking_blocks
CREATE INDEX IF NOT EXISTS idx_session_thinking_blocks_session_id ON session_thinking_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_thinking_blocks_thinking_type ON session_thinking_blocks(thinking_type);
CREATE INDEX IF NOT EXISTS idx_session_thinking_blocks_phase ON session_thinking_blocks(phase);
CREATE INDEX IF NOT EXISTS idx_session_thinking_blocks_created_at ON session_thinking_blocks(created_at);
CREATE INDEX IF NOT EXISTS idx_session_thinking_blocks_associated_cost ON session_thinking_blocks(associated_cost);

-- Enable Row Level Security for new tables
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_thinking_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY user_isolation_policy_session_messages ON session_messages
    FOR ALL TO application_user
    USING (
        EXISTS (
            SELECT 1 FROM agent_sessions 
            WHERE agent_sessions.id = session_messages.session_id 
            AND (
                agent_sessions.user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
                COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
            )
        )
    );

CREATE POLICY user_isolation_policy_thinking_blocks ON session_thinking_blocks
    FOR ALL TO application_user
    USING (
        EXISTS (
            SELECT 1 FROM agent_sessions 
            WHERE agent_sessions.id = session_thinking_blocks.session_id 
            AND (
                agent_sessions.user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
                COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
            )
        )
    );

-- Grant permissions to application_user
GRANT ALL PRIVILEGES ON session_messages TO application_user;
GRANT ALL PRIVILEGES ON session_thinking_blocks TO application_user;
```

**After executing the SQL:**
1. Verify the columns exist by running a test query
2. Run the security tests again to confirm the RLS tests pass
3. Continue with the rest of the database fixes

**Test Query to Verify:**
```sql
SELECT api_calls_data, cost_breakdown, total_api_cost 
FROM agent_sessions 
LIMIT 1;
```

This should return without errors once the columns are added.
