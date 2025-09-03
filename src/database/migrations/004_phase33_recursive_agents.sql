-- keen Platform Database Schema - Phase 3.3 Recursive Agent Enhancements
-- Adds specialized tables and columns for recursive agent spawning, specialization, and sequential execution
-- Includes git operations tracking, phase transitions, and tool executions

-- Add Phase 3.3 columns to agent_sessions table
ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS specialization VARCHAR(20) NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS max_recursion_depth INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS execution_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spawn_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS merge_timestamp TIMESTAMP WITH TIME ZONE;

-- Add constraint for specialization values
ALTER TABLE agent_sessions 
ADD CONSTRAINT check_specialization 
CHECK (specialization IN ('frontend', 'backend', 'database', 'testing', 'security', 'devops', 'general'));

-- Update current_phase to include new Phase 3.3 phases
ALTER TABLE agent_sessions 
DROP CONSTRAINT IF EXISTS check_current_phase;

ALTER TABLE agent_sessions 
ADD CONSTRAINT check_current_phase 
CHECK (current_phase IN ('EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'));

-- Phase Transitions Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transition details
    from_phase VARCHAR(20) NOT NULL,
    to_phase VARCHAR(20) NOT NULL,
    transition_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms INTEGER, -- Duration spent in from_phase
    
    -- Phase report data
    summary TEXT NOT NULL,
    key_findings TEXT[] DEFAULT '{}',
    next_actions TEXT[] DEFAULT '{}',
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    estimated_time_remaining VARCHAR(255),
    
    -- Phase 3.3 specific fields
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_session_id UUID REFERENCES agent_sessions(id),
    
    -- Context and metadata
    phase_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tool Executions Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tool execution details
    tool_name VARCHAR(100) NOT NULL,
    tool_parameters JSONB NOT NULL DEFAULT '{}',
    execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Results and performance
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    result_data JSONB,
    error_message TEXT,
    
    -- Resource usage
    tokens_consumed INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.000000,
    
    -- Phase 3.3 specific fields
    phase VARCHAR(20),
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    is_recursive_spawn BOOLEAN DEFAULT false, -- True for summon_agent calls
    child_session_id UUID REFERENCES agent_sessions(id), -- If this spawned a child
    
    -- Context and metadata
    execution_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Git Operations Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS git_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Git operation details
    operation_type VARCHAR(20) NOT NULL, -- commit, branch, merge, push, pull, clone, checkout
    branch_name VARCHAR(255) NOT NULL,
    commit_hash VARCHAR(64),
    operation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Operation metadata
    commit_message TEXT,
    files_changed TEXT[] DEFAULT '{}',
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    merge_conflicts JSONB, -- Details of any merge conflicts
    
    -- Phase 3.3 specific fields
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_branch VARCHAR(255), -- Parent branch for child agents
    is_sequential_merge BOOLEAN DEFAULT false, -- True for Phase 3.3 sequential merges
    child_session_id UUID REFERENCES agent_sessions(id), -- If this was a child merge
    
    -- Results and status
    success BOOLEAN NOT NULL,
    error_message TEXT,
    operation_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Tree Relationships Table (Phase 3.3)
CREATE TABLE IF NOT EXISTS agent_tree_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    parent_session_id UUID REFERENCES agent_sessions(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tree structure
    tree_depth INTEGER NOT NULL DEFAULT 0,
    execution_order INTEGER NOT NULL DEFAULT 0,
    specialization VARCHAR(20) NOT NULL DEFAULT 'general',
    git_branch VARCHAR(255) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE',
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    spawn_duration_ms INTEGER, -- Time taken to spawn (for children)
    execution_duration_ms INTEGER, -- Total execution time
    
    -- Results
    completion_result JSONB,
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0.000000,
    
    -- Child tracking
    child_sessions UUID[] DEFAULT '{}', -- Array of child session IDs
    active_children INTEGER DEFAULT 0,
    completed_children INTEGER DEFAULT 0,
    
    -- Metadata
    spawn_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Coordination Events Table (Phase 3.3)
CREATE TABLE IF NOT EXISTS agent_coordination_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- spawn_child, child_completed, phase_sync, dependency_check
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Coordination context
    parent_session_id UUID REFERENCES agent_sessions(id),
    child_session_id UUID REFERENCES agent_sessions(id),
    target_specialization VARCHAR(20),
    coordination_action VARCHAR(50), -- summon_agent, coordinate_agents, get_agent_status
    
    -- Event data
    event_data JSONB NOT NULL DEFAULT '{}',
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Sequential execution tracking
    execution_sequence INTEGER,
    tree_depth INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update daily_analytics to include Phase 3.3 metrics
ALTER TABLE daily_analytics 
ADD COLUMN IF NOT EXISTS recursive_spawns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_tree_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequential_merges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS specialization_distribution JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phase_transition_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS git_operations_count INTEGER DEFAULT 0;

-- Create indexes for Phase 3.3 tables

-- Phase transitions indexes
CREATE INDEX idx_phase_transitions_session_id ON phase_transitions(session_id);
CREATE INDEX idx_phase_transitions_user_id ON phase_transitions(user_id);
CREATE INDEX idx_phase_transitions_timestamp ON phase_transitions(transition_timestamp);
CREATE INDEX idx_phase_transitions_from_to ON phase_transitions(from_phase, to_phase);
CREATE INDEX idx_phase_transitions_specialization ON phase_transitions(specialization);
CREATE INDEX idx_phase_transitions_parent ON phase_transitions(parent_session_id);

-- Tool executions indexes
CREATE INDEX idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX idx_tool_executions_timestamp ON tool_executions(execution_timestamp);
CREATE INDEX idx_tool_executions_success ON tool_executions(success);
CREATE INDEX idx_tool_executions_specialization ON tool_executions(specialization);
CREATE INDEX idx_tool_executions_recursive ON tool_executions(is_recursive_spawn);
CREATE INDEX idx_tool_executions_child ON tool_executions(child_session_id);

-- Git operations indexes
CREATE INDEX idx_git_operations_session_id ON git_operations(session_id);
CREATE INDEX idx_git_operations_user_id ON git_operations(user_id);
CREATE INDEX idx_git_operations_branch_name ON git_operations(branch_name);
CREATE INDEX idx_git_operations_operation_type ON git_operations(operation_type);
CREATE INDEX idx_git_operations_timestamp ON git_operations(operation_timestamp);
CREATE INDEX idx_git_operations_specialization ON git_operations(specialization);
CREATE INDEX idx_git_operations_sequential ON git_operations(is_sequential_merge);
CREATE INDEX idx_git_operations_parent_branch ON git_operations(parent_branch);

-- Agent tree nodes indexes
CREATE INDEX idx_agent_tree_nodes_session_id ON agent_tree_nodes(session_id);
CREATE INDEX idx_agent_tree_nodes_parent ON agent_tree_nodes(parent_session_id);
CREATE INDEX idx_agent_tree_nodes_user_id ON agent_tree_nodes(user_id);
CREATE INDEX idx_agent_tree_nodes_depth ON agent_tree_nodes(tree_depth);
CREATE INDEX idx_agent_tree_nodes_order ON agent_tree_nodes(execution_order);
CREATE INDEX idx_agent_tree_nodes_status ON agent_tree_nodes(status);
CREATE INDEX idx_agent_tree_nodes_specialization ON agent_tree_nodes(specialization);
CREATE INDEX idx_agent_tree_nodes_branch ON agent_tree_nodes(git_branch);

-- Agent coordination events indexes
CREATE INDEX idx_coordination_events_session_id ON agent_coordination_events(session_id);
CREATE INDEX idx_coordination_events_user_id ON agent_coordination_events(user_id);
CREATE INDEX idx_coordination_events_type ON agent_coordination_events(event_type);
CREATE INDEX idx_coordination_events_timestamp ON agent_coordination_events(event_timestamp);
CREATE INDEX idx_coordination_events_parent ON agent_coordination_events(parent_session_id);
CREATE INDEX idx_coordination_events_child ON agent_coordination_events(child_session_id);
CREATE INDEX idx_coordination_events_specialization ON agent_coordination_events(target_specialization);
CREATE INDEX idx_coordination_events_sequence ON agent_coordination_events(execution_sequence);

-- Enhanced agent_sessions indexes for Phase 3.3
CREATE INDEX idx_agent_sessions_specialization ON agent_sessions(specialization);
CREATE INDEX idx_agent_sessions_execution_order ON agent_sessions(execution_order);
CREATE INDEX idx_agent_sessions_spawn_timestamp ON agent_sessions(spawn_timestamp);

-- Enable Row Level Security for new Phase 3.3 tables
ALTER TABLE phase_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_coordination_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Phase 3.3 tables
CREATE POLICY user_isolation_policy_phase_transitions ON phase_transitions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_tool_executions ON tool_executions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_git_operations ON git_operations
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_agent_tree_nodes ON agent_tree_nodes
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_coordination_events ON agent_coordination_events
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_agent_tree_nodes_updated_at BEFORE UPDATE ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate sequential execution constraints
CREATE OR REPLACE FUNCTION validate_sequential_execution()
RETURNS TRIGGER AS $$
DECLARE
    active_siblings INTEGER;
BEGIN
    -- For new agent spawns, check if parent already has active children
    IF TG_OP = 'INSERT' AND NEW.parent_session_id IS NOT NULL THEN
        SELECT COUNT(*) INTO active_siblings
        FROM agent_tree_nodes
        WHERE parent_session_id = NEW.parent_session_id
          AND status = 'running'
          AND id != NEW.id;
        
        IF active_siblings > 0 THEN
            RAISE EXCEPTION 'Sequential execution violation: Parent % already has % active children. Sequential mode allows only one active child at a time.', 
                NEW.parent_session_id, active_siblings;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply sequential execution validation trigger
CREATE TRIGGER validate_sequential_execution_trigger
    BEFORE INSERT OR UPDATE ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION validate_sequential_execution();

-- Create function to update parent's child count
CREATE OR REPLACE FUNCTION update_parent_child_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent's child counts when child status changes
    IF NEW.parent_session_id IS NOT NULL THEN
        UPDATE agent_tree_nodes
        SET 
            active_children = (
                SELECT COUNT(*) FROM agent_tree_nodes 
                WHERE parent_session_id = NEW.parent_session_id AND status = 'running'
            ),
            completed_children = (
                SELECT COUNT(*) FROM agent_tree_nodes 
                WHERE parent_session_id = NEW.parent_session_id AND status = 'completed'
            ),
            updated_at = NOW()
        WHERE session_id = NEW.parent_session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply parent child count update trigger
CREATE TRIGGER update_parent_child_count_trigger
    AFTER INSERT OR UPDATE OF status ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_parent_child_count();

-- Create materialized view for agent tree analytics
CREATE MATERIALIZED VIEW agent_tree_analytics AS
SELECT 
    DATE_TRUNC('hour', atn.created_at) as hour_bucket,
    atn.user_id,
    COUNT(*) as total_agents,
    COUNT(*) FILTER (WHERE atn.status = 'completed') as completed_agents,
    COUNT(*) FILTER (WHERE atn.status = 'failed') as failed_agents,
    MAX(atn.tree_depth) as max_depth,
    AVG(atn.execution_duration_ms) as avg_execution_time,
    SUM(atn.total_cost) as total_cost,
    COUNT(DISTINCT atn.specialization) as unique_specializations,
    jsonb_object_agg(atn.specialization, COUNT(*)) as specialization_counts
FROM agent_tree_nodes atn
WHERE atn.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', atn.created_at), atn.user_id
ORDER BY hour_bucket DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_agent_tree_analytics_unique ON agent_tree_analytics(hour_bucket, user_id);

-- Grant permissions to application_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO application_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO application_user;
GRANT SELECT ON agent_tree_analytics TO application_user;

-- Comments for new Phase 3.3 tables
COMMENT ON TABLE phase_transitions IS 'Phase 3.3: Tracks agent phase transitions with specialization and tree context';
COMMENT ON TABLE tool_executions IS 'Phase 3.3: Detailed tool execution tracking with recursive spawn detection';
COMMENT ON TABLE git_operations IS 'Phase 3.3: Git operations tracking with sequential merge support';
COMMENT ON TABLE agent_tree_nodes IS 'Phase 3.3: Agent tree structure and hierarchy management';
COMMENT ON TABLE agent_coordination_events IS 'Phase 3.3: Events related to agent coordination and sequential execution';

COMMENT ON COLUMN agent_sessions.specialization IS 'Phase 3.3: Agent specialization (frontend, backend, database, testing, security, devops, general)';
COMMENT ON COLUMN agent_sessions.max_recursion_depth IS 'Phase 3.3: Maximum allowed recursion depth for this agent tree';
COMMENT ON COLUMN agent_sessions.execution_order IS 'Phase 3.3: Sequential execution order within the tree';
COMMENT ON COLUMN tool_executions.is_recursive_spawn IS 'Phase 3.3: True if this tool execution spawned a child agent';
COMMENT ON COLUMN git_operations.is_sequential_merge IS 'Phase 3.3: True if this was a sequential merge from child to parent';
COMMENT ON COLUMN agent_tree_nodes.execution_order IS 'Phase 3.3: Order of execution in sequential mode (depth-first)';

-- Create refresh function for materialized view (to be called by cron job)
CREATE OR REPLACE FUNCTION refresh_agent_tree_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_tree_analytics;
END;
$$ LANGUAGE plpgsql;
