/**
 * Check database schema for missing columns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  try {
    // Test if agent_sessions table exists
    console.log('1. Checking agent_sessions table...');
    const { data: sessionCount, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (sessionError) {
      console.error('❌ agent_sessions table error:', sessionError.message);
    } else {
      console.log('✅ agent_sessions table exists');
    }
    
    // Test specific columns
    console.log('2. Checking specific columns...');
    
    const testColumns = [
      'api_calls_data',
      'cost_breakdown', 
      'total_api_cost'
    ];
    
    for (const column of testColumns) {
      try {
        const { data, error } = await supabase
          .from('agent_sessions')
          .select(column)
          .limit(1);
        
        if (error) {
          console.error(`❌ Column '${column}' missing:`, error.message);
        } else {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (err) {
        console.error(`❌ Column '${column}' check failed:`, err.message);
      }
    }
    
    // Try to get table schema info
    console.log('3. Getting table schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'agent_sessions' })
      .select();
    
    if (schemaError) {
      console.log('Schema RPC not available, trying alternative...');
      
      // Try to get a sample record to see available columns
      const { data: sampleData, error: sampleError } = await supabase
        .from('agent_sessions')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Sample query failed:', sampleError.message);
      } else if (sampleData && sampleData.length > 0) {
        console.log('Available columns:', Object.keys(sampleData[0]));
      } else {
        console.log('No sample data available, creating test record...');
        
        // Create a minimal test session to see what columns exist
        const testSessionData = {
          user_id: '00000000-1111-2222-3333-444444444444',
          session_id: 'test-schema-check',
          git_branch: 'test-branch',
          vision: 'Schema check test',
          working_directory: '/tmp/test'
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('agent_sessions')
          .insert([testSessionData])
          .select();
        
        if (insertError) {
          console.error('Test insert failed:', insertError.message);
        } else {
          console.log('Test record created, available columns:', Object.keys(insertData[0]));
          
          // Clean up test record
          await supabase
            .from('agent_sessions')
            .delete()
            .eq('session_id', 'test-schema-check');
        }
      }
    } else {
      console.log('Schema data:', schemaData);
    }
    
    console.log('🎉 Schema check completed!');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema().catch(console.error);
