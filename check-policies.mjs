import { SupabaseManager } from './dist/database/SupabaseManager.js';

async function checkPolicies() {
  try {
    console.log('🔌 Connecting to database...');
    const supabase = new SupabaseManager(false);
    await supabase.initialize();
    const client = supabase.client;
    
    // Check current RLS policies
    console.log('🔍 Checking RLS policies for audit_logs table...');
    const { data: policies, error: policyError } = await client
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'audit_logs');
    
    console.log('Current policies:', policies);
    
    // Check if RLS is enabled
    console.log('🔍 Checking if RLS is enabled...');
    const { data: rlsStatus, error: rlsError } = await client.rpc('sql', {
      query: `
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = 'audit_logs';
      `
    });
    
    console.log('RLS status:', rlsStatus);
    
    // Try to check current setting
    console.log('🔍 Checking current session settings...');
    const { data: settings, error: settingsError } = await client.rpc('sql', {
      query: `
        SELECT 
          current_setting('app.is_admin_user', true) as is_admin,
          current_setting('app.current_user_id', true) as user_id;
      `
    });
    
    console.log('Current settings:', settings);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPolicies();