-- Fix for audit logs RLS policy
-- This script applies the missing RLS policies and functions

-- Enable Row Level Security for audit logs (if not already enabled)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS audit_logs_admin_policy ON audit_logs;

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

-- Test the fix by inserting a test audit log with admin context
SELECT set_user_context('be584a09-4c93-48b6-a484-a0e79fe9ddc9'::UUID, true);

INSERT INTO audit_logs (
    event_type,
    user_id, 
    event_data,
    is_admin_action
) VALUES (
    'test_fix',
    'be584a09-4c93-48b6-a484-a0e79fe9ddc9'::UUID,
    '{"test": "RLS fix verification"}'::jsonb,
    true
);

-- Clean up test
DELETE FROM audit_logs WHERE event_type = 'test_fix';

SELECT clear_user_context();

SELECT 'Audit logs RLS fix applied successfully' as status;