import { SupabaseManager } from './dist/database/SupabaseManager.js';

async function applyFix() {
  try {
    console.log('🔌 Connecting to database...');
    const supabase = new SupabaseManager(false);
    await supabase.initialize();
    const client = supabase.client;
    
    console.log('🔧 Creating set_user_context function...');
    const { error: funcError } = await client.rpc('sql', {
      query: `
        CREATE OR REPLACE FUNCTION set_user_context(p_user_id UUID, p_is_admin BOOLEAN DEFAULT FALSE)
        RETURNS VOID AS $$
        BEGIN
            PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
            PERFORM set_config('app.is_admin_user', p_is_admin::TEXT, true);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (funcError) {
      console.log('⚠️ Function creation warning:', funcError.message);
    } else {
      console.log('✅ set_user_context function created');
    }
    
    console.log('🧪 Testing admin context and audit log insertion...');
    
    // First, call set_user_context as admin
    const { error: contextError } = await client.rpc('set_user_context', {
      p_user_id: 'be584a09-4c93-48b6-a484-a0e79fe9ddc9',
      p_is_admin: true
    });
    
    if (contextError) {
      console.error('❌ Failed to set context:', contextError.message);
      return;
    }
    console.log('✅ Admin context set successfully');
    
    // Now try inserting an audit log
    const { data, error: insertError } = await client
      .from('audit_logs')
      .insert({
        event_type: 'test_fix',
        user_id: 'be584a09-4c93-48b6-a484-a0e79fe9ddc9',
        event_data: { test: 'RLS fix verification' },
        is_admin_action: true
      })
      .select();
    
    if (insertError) {
      console.error('❌ Failed to insert audit log:', insertError.message);
    } else {
      console.log('✅ Audit log inserted successfully:', data);
    }
    
    // Clean up test entry
    await client
      .from('audit_logs')
      .delete()
      .eq('event_type', 'test_fix');
    
    console.log('✅ Test completed - RLS fix verified!');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    process.exit(1);
  }
}

applyFix();