-- keen-s-a Initial Schema Migration
-- Comprehensive migration from PostgreSQL to Supabase preserving all functionality
-- Enhanced with cloud-native features and real-time capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Management Table (Enhanced with Supabase Auth integration)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Optional: Supabase Auth can handle this
    display_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Admin and role management (preserved from keen-s)
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    admin_privileges JSONB DEFAULT '{}',
    
    -- Account status and verification
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Multi-factor authentication (preserved)
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    recovery_codes TEXT[],
    
    -- Preferences and configuration
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    
    -- Enhanced with Supabase features
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Accounts Table (Enhanced for cloud-native)
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Balance management (higher precision for cloud billing)
    balance DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    lifetime_purchased DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    lifetime_spent DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    
    -- Admin unlimited credits flag (preserved)
    unlimited_credits BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Spending limits and controls
    daily_limit DECIMAL(10,4),
    monthly_limit DECIMAL(10,4),
    auto_recharge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_recharge_threshold DECIMAL(10,4) DEFAULT 10.0000,
    auto_recharge_amount DECIMAL(10,4) DEFAULT 50.0000,
    
    -- Account status
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    suspended_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Credit Transactions Table (Immutable audit trail preserved)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(12,6) NOT NULL, -- Higher precision
    balance_after DECIMAL(12,6) NOT NULL,
    
    -- Claude API cost tracking (enhanced precision)
    claude_cost_usd DECIMAL(12,6),
    markup_multiplier DECIMAL(4,2) DEFAULT 5.00,
    
    -- Reference information
    session_id UUID,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Admin bypass tracking (preserved)
    is_admin_bypass BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit and security
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reconciliation_status VARCHAR(20) DEFAULT 'pending'
);

-- Agent Sessions Table (Enhanced for real-time)
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification and hierarchy (preserved)
    session_id VARCHAR(64) NOT NULL UNIQUE,
    parent_session_id UUID REFERENCES agent_sessions(id),
    session_depth INTEGER NOT NULL DEFAULT 0,
    git_branch VARCHAR(255) NOT NULL,
    
    -- Execution context
    vision TEXT NOT NULL,
    working_directory TEXT NOT NULL,
    current_phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE',
    
    -- Phase 3.3 recursive agent features (preserved)
    specialization VARCHAR(20) NOT NULL DEFAULT 'general',
    max_recursion_depth INTEGER NOT NULL DEFAULT 10,
    execution_order INTEGER DEFAULT 0,
    spawn_timestamp TIMESTAMP WITH TIME ZONE,
    merge_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Execution timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    phase_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Execution metrics (enhanced precision)
    iteration_count INTEGER NOT NULL DEFAULT 0,
    tool_calls_count INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    context_window_size INTEGER NOT NULL DEFAULT 1000000,
    
    -- File operations tracking
    files_modified TEXT[] DEFAULT '{}',
    files_created TEXT[] DEFAULT '{}',
    files_deleted TEXT[] DEFAULT '{}',
    
    -- Status and results
    execution_status VARCHAR(20) NOT NULL DEFAULT 'running',
    success BOOLEAN,
    error_message TEXT,
    completion_report JSONB,
    
    -- Real-time and streaming features (enhanced)
    streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    streaming_time INTEGER,
    real_time_subscriptions TEXT[] DEFAULT '{}', -- Supabase real-time channels
    
    -- Configuration and options
    agent_options JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Phase Transitions Table (Phase 3.3 preserved)
CREATE TABLE phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transition details
    from_phase VARCHAR(20) NOT NULL,
    to_phase VARCHAR(20) NOT NULL,
    transition_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    
    -- Phase report data
    summary TEXT NOT NULL,
    key_findings TEXT[] DEFAULT '{}',
    next_actions TEXT[] DEFAULT '{}',
    confidence DECIMAL(3,2),
    estimated_time_remaining VARCHAR(255),
    
    -- Phase 3.3 specific fields
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_session_id UUID REFERENCES agent_sessions(id),
    
    -- Context and metadata
    phase_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tool Executions Table (Enhanced for cloud-native)
CREATE TABLE tool_executions (
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
    
    -- Resource usage (enhanced precision)
    tokens_consumed INTEGER DEFAULT 0,
    cost DECIMAL(12,6) DEFAULT 0.000000,
    
    -- Phase 3.3 specific fields (preserved)
    phase VARCHAR(20),
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    is_recursive_spawn BOOLEAN DEFAULT false,
    child_session_id UUID REFERENCES agent_sessions(id),
    
    -- Context and metadata
    execution_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Git Operations Table (Enhanced)
CREATE TABLE git_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Git operation details
    operation_type VARCHAR(20) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    commit_hash VARCHAR(64),
    operation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Operation metadata
    commit_message TEXT,
    files_changed TEXT[] DEFAULT '{}',
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    merge_conflicts JSONB,
    
    -- Phase 3.3 specific fields (preserved)
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_branch VARCHAR(255),
    is_sequential_merge BOOLEAN DEFAULT false,
    child_session_id UUID REFERENCES agent_sessions(id),
    
    -- Results and status
    success BOOLEAN NOT NULL,
    error_message TEXT,
    operation_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Tree Nodes Table (Phase 3.3 preserved)
CREATE TABLE agent_tree_nodes (
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
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE',
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    spawn_duration_ms INTEGER,
    execution_duration_ms INTEGER,
    
    -- Results (enhanced precision)
    completion_result JSONB,
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    total_cost DECIMAL(12,6) DEFAULT 0.000000,
    
    -- Child tracking
    child_sessions UUID[] DEFAULT '{}',
    active_children INTEGER DEFAULT 0,
    completed_children INTEGER DEFAULT 0,
    
    -- Metadata
    spawn_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Real-time Subscriptions Table (keen-s-a specific)
CREATE TABLE real_time_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
    
    -- Subscription details
    channel_name VARCHAR(100) NOT NULL,
    event_types TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    
    -- Connection details
    connection_id VARCHAR(255),
    client_info JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_event_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Daily Analytics Table (Enhanced for cloud metrics)
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_bucket DATE NOT NULL,
    
    -- Session statistics (preserved)
    sessions_started INTEGER NOT NULL DEFAULT 0,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    sessions_failed INTEGER NOT NULL DEFAULT 0,
    total_session_time_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- Agent statistics (preserved)
    agents_spawned INTEGER NOT NULL DEFAULT 0,
    max_recursion_depth INTEGER NOT NULL DEFAULT 0,
    
    -- Tool usage
    tool_executions INTEGER NOT NULL DEFAULT 0,
    unique_tools_used TEXT[] DEFAULT '{}',
    
    -- Resource usage (enhanced precision)
    total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    claude_api_cost DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    files_modified INTEGER NOT NULL DEFAULT 0,
    files_created INTEGER NOT NULL DEFAULT 0,
    git_operations INTEGER NOT NULL DEFAULT 0,
    
    -- Phase 3.3 metrics (preserved)
    recursive_spawns INTEGER DEFAULT 0,
    max_tree_depth INTEGER DEFAULT 0,
    sequential_merges INTEGER DEFAULT 0,
    specialization_distribution JSONB DEFAULT '{}',
    phase_transition_count INTEGER DEFAULT 0,
    git_operations_count INTEGER DEFAULT 0,
    
    -- Real-time metrics (keen-s-a specific)
    real_time_events INTEGER DEFAULT 0,
    subscription_count INTEGER DEFAULT 0,
    
    -- Admin bypass tracking
    admin_bypass_usage DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal performance

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_seen ON users(last_seen);

-- Credits indexes
CREATE UNIQUE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_balance ON credits(balance);
CREATE INDEX idx_credits_unlimited_credits ON credits(unlimited_credits);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(account_id);
CREATE INDEX idx_credit_transactions_session_id ON credit_transactions(session_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_admin_bypass ON credit_transactions(is_admin_bypass);

-- Agent sessions indexes
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX idx_agent_sessions_parent_session_id ON agent_sessions(parent_session_id);
CREATE INDEX idx_agent_sessions_current_phase ON agent_sessions(current_phase);
CREATE INDEX idx_agent_sessions_execution_status ON agent_sessions(execution_status);
CREATE INDEX idx_agent_sessions_start_time ON agent_sessions(start_time);
CREATE INDEX idx_agent_sessions_specialization ON agent_sessions(specialization);
CREATE INDEX idx_agent_sessions_last_activity ON agent_sessions(last_activity_at);

-- Phase transitions indexes
CREATE INDEX idx_phase_transitions_session_id ON phase_transitions(session_id);
CREATE INDEX idx_phase_transitions_user_id ON phase_transitions(user_id);
CREATE INDEX idx_phase_transitions_timestamp ON phase_transitions(transition_timestamp);
CREATE INDEX idx_phase_transitions_from_to ON phase_transitions(from_phase, to_phase);

-- Tool executions indexes
CREATE INDEX idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX idx_tool_executions_timestamp ON tool_executions(execution_timestamp);
CREATE INDEX idx_tool_executions_success ON tool_executions(success);

-- Git operations indexes
CREATE INDEX idx_git_operations_session_id ON git_operations(session_id);
CREATE INDEX idx_git_operations_user_id ON git_operations(user_id);
CREATE INDEX idx_git_operations_branch_name ON git_operations(branch_name);
CREATE INDEX idx_git_operations_operation_type ON git_operations(operation_type);
CREATE INDEX idx_git_operations_timestamp ON git_operations(operation_timestamp);

-- Agent tree nodes indexes
CREATE INDEX idx_agent_tree_nodes_session_id ON agent_tree_nodes(session_id);
CREATE INDEX idx_agent_tree_nodes_parent ON agent_tree_nodes(parent_session_id);
CREATE INDEX idx_agent_tree_nodes_user_id ON agent_tree_nodes(user_id);
CREATE INDEX idx_agent_tree_nodes_depth ON agent_tree_nodes(tree_depth);
CREATE INDEX idx_agent_tree_nodes_status ON agent_tree_nodes(status);

-- Real-time subscriptions indexes
CREATE INDEX idx_real_time_subscriptions_user_id ON real_time_subscriptions(user_id);
CREATE INDEX idx_real_time_subscriptions_session_id ON real_time_subscriptions(session_id);
CREATE INDEX idx_real_time_subscriptions_channel ON real_time_subscriptions(channel_name);
CREATE INDEX idx_real_time_subscriptions_active ON real_time_subscriptions(is_active);

-- Daily analytics indexes
CREATE INDEX idx_daily_analytics_user_id ON daily_analytics(user_id);
CREATE INDEX idx_daily_analytics_date_bucket ON daily_analytics(date_bucket);
CREATE UNIQUE INDEX idx_daily_analytics_user_date ON daily_analytics(user_id, date_bucket);

-- Enable Row Level Security (RLS) for multi-tenant isolation
-- This preserves the security model from keen-s
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (using Supabase auth.uid() instead of custom parameters)

-- Users can only see their own data or admins can see all
CREATE POLICY "Users can view own data or admin can view all" ON users
    FOR ALL USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Credits isolation
CREATE POLICY "Credits isolation" ON credits
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Credit transactions isolation
CREATE POLICY "Credit transactions isolation" ON credit_transactions
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Agent sessions isolation
CREATE POLICY "Agent sessions isolation" ON agent_sessions
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Phase transitions isolation
CREATE POLICY "Phase transitions isolation" ON phase_transitions
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Tool executions isolation
CREATE POLICY "Tool executions isolation" ON tool_executions
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Git operations isolation
CREATE POLICY "Git operations isolation" ON git_operations
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Agent tree nodes isolation
CREATE POLICY "Agent tree nodes isolation" ON agent_tree_nodes
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Real-time subscriptions isolation
CREATE POLICY "Real-time subscriptions isolation" ON real_time_subscriptions
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tree_nodes_updated_at BEFORE UPDATE ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_real_time_subscriptions_updated_at BEFORE UPDATE ON real_time_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create credit balance management functions (preserved from keen-s)
CREATE OR REPLACE FUNCTION validate_credit_transaction()
RETURNS TRIGGER AS $$
DECLARE
    account_unlimited BOOLEAN;
    current_balance DECIMAL(12,6);
BEGIN
    -- Get account details
    SELECT c.unlimited_credits, c.balance 
    INTO account_unlimited, current_balance
    FROM credits c
    WHERE c.id = NEW.account_id;
    
    -- Skip validation for admin accounts with unlimited credits
    IF account_unlimited = true OR NEW.is_admin_bypass = true THEN
        RETURN NEW;
    END IF;
    
    -- Validate sufficient balance for usage transactions
    IF NEW.transaction_type = 'usage' AND NEW.amount < 0 THEN
        IF current_balance + NEW.amount < 0 THEN
            RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', 
                current_balance, ABS(NEW.amount);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_credit_transaction_trigger
    BEFORE INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_credit_transaction();

-- Create function to update credit balance
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE credits 
    SET balance = NEW.balance_after,
        lifetime_spent = CASE 
            WHEN NEW.transaction_type = 'usage' AND NEW.amount < 0 
            THEN lifetime_spent + ABS(NEW.amount) 
            ELSE lifetime_spent 
        END,
        lifetime_purchased = CASE 
            WHEN NEW.transaction_type = 'purchase' AND NEW.amount > 0 
            THEN lifetime_purchased + NEW.amount 
            ELSE lifetime_purchased 
        END,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_balance_trigger
    AFTER INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_credit_balance();

-- Comments for table documentation
COMMENT ON TABLE users IS 'keen-s-a: Enhanced user management with Supabase Auth integration and preserved admin privileges';
COMMENT ON TABLE credits IS 'keen-s-a: Cloud-native credit management with high precision decimal support';
COMMENT ON TABLE credit_transactions IS 'keen-s-a: Immutable audit trail with enhanced precision for cloud billing';
COMMENT ON TABLE agent_sessions IS 'keen-s-a: Real-time agent sessions with preserved recursive capabilities';
COMMENT ON TABLE phase_transitions IS 'keen-s-a: Phase 3.3 transitions with real-time updates';
COMMENT ON TABLE tool_executions IS 'keen-s-a: Enhanced tool execution tracking with cloud-native precision';
COMMENT ON TABLE git_operations IS 'keen-s-a: Git operations with preserved sequential merge support';
COMMENT ON TABLE agent_tree_nodes IS 'keen-s-a: Agent tree management with real-time status updates';
COMMENT ON TABLE real_time_subscriptions IS 'keen-s-a: Native Supabase real-time subscription management';
COMMENT ON TABLE daily_analytics IS 'keen-s-a: Enhanced analytics with cloud-native metrics and real-time event tracking';
