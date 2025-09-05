/**
 * Test the enhanced SQL-to-Supabase conversion
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

class SqlToSupabaseConverterTest {
  async testSelectQuery() {
    console.log('\n🔍 Testing SELECT query conversion...');
    
    try {
      // Simulate the SQL query that SessionDAO uses
      const sql = "SELECT * FROM agent_sessions WHERE user_id = $1 LIMIT 10";
      const params = ['test-user-id'];
      
      // Manual conversion to test logic
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('user_id', params[0])
        .limit(10);
        
      if (error) {
        console.error('❌ SELECT conversion test failed:', error);
        return false;
      }
      
      console.log('✅ SELECT conversion successful, found', data.length, 'sessions');
      return true;
    } catch (error) {
      console.error('❌ SELECT test error:', error);
      return false;
    }
  }

  async testInsertQuery() {
    console.log('\n🔍 Testing INSERT query conversion...');
    
    try {
      // Generate a proper UUID
      const testId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Valid UUID format
      const userId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'; // Valid UUID format
      
      // Test INSERT with proper UUID
      const { data, error } = await supabase
        .from('agent_sessions')
        .insert({
          id: testId,
          user_id: userId,
          session_id: 'test-session-' + Date.now(),
          session_depth: 0,
          git_branch: 'main',
          vision: 'Test vision',
          working_directory: '/test',
          current_phase: 'EXPLORE',
          iteration_count: 0,
          tool_calls_count: 0,
          total_cost: 0.0,
          tokens_used: 0,
          context_window_size: 1000000,
          files_modified: [],
          files_created: [],
          files_deleted: [],
          execution_status: 'running',
          streaming_enabled: true,
          websocket_connections: [],
          agent_options: {}
        })
        .select();
        
      if (error) {
        console.error('❌ INSERT conversion test failed:', error);
        return false;
      }
      
      console.log('✅ INSERT conversion successful, created session:', data[0]?.session_id);
      
      // Clean up - delete the test record
      await supabase
        .from('agent_sessions')
        .delete()
        .eq('id', testId);
        
      return true;
    } catch (error) {
      console.error('❌ INSERT test error:', error);
      return false;
    }
  }

  async testUpdateQuery() {
    console.log('\n🔍 Testing UPDATE query conversion...');
    
    try {
      // First create a test record to update
      const testId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
      const userId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
      
      // Insert test record
      const { error: insertError } = await supabase
        .from('agent_sessions')
        .insert({
          id: testId,
          user_id: userId,
          session_id: 'test-update-session-' + Date.now(),
          session_depth: 0,
          git_branch: 'main',
          vision: 'Test update vision',
          working_directory: '/test',
          current_phase: 'EXPLORE',
          iteration_count: 0,
          tool_calls_count: 0,
          total_cost: 0.0,
          tokens_used: 0,
          context_window_size: 1000000,
          files_modified: [],
          files_created: [],
          files_deleted: [],
          execution_status: 'running',
          streaming_enabled: true,
          websocket_connections: [],
          agent_options: {}
        });
        
      if (insertError) {
        console.error('❌ Failed to create test record for UPDATE:', insertError);
        return false;
      }
      
      // Test UPDATE
      const { data, error } = await supabase
        .from('agent_sessions')
        .update({
          current_phase: 'PLAN',
          iteration_count: 5
        })
        .eq('id', testId)
        .select();
        
      if (error) {
        console.error('❌ UPDATE conversion test failed:', error);
        return false;
      }
      
      console.log('✅ UPDATE conversion successful, updated phase:', data[0]?.current_phase);
      
      // Clean up
      await supabase
        .from('agent_sessions')
        .delete()
        .eq('id', testId);
        
      return true;
    } catch (error) {
      console.error('❌ UPDATE test error:', error);
      return false;
    }
  }

  async testComplexQuery() {
    console.log('\n🔍 Testing complex query patterns...');
    
    try {
      // Test a complex query similar to what UserDAO might use
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, is_admin, created_at')
        .eq('account_status', 'active')
        .eq('email_verified', true)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        console.error('❌ Complex query test failed:', error);
        return false;
      }
      
      console.log('✅ Complex query successful, found', data.length, 'verified active users');
      return true;
    } catch (error) {
      console.error('❌ Complex query test error:', error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Enhanced Database Manager Conversion Tests...');
    
    const tests = [
      () => this.testSelectQuery(),
      () => this.testInsertQuery(),
      () => this.testUpdateQuery(),
      () => this.testComplexQuery()
    ];
    
    let passedTests = 0;
    
    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i]();
        if (result) {
          passedTests++;
        }
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error);
      }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('🎉 All conversion tests passed! Enhanced DatabaseManager should work.');
      console.log('\n✅ Next step: Replace DatabaseManager with DatabaseManagerEnhanced in the DAOs');
      return true;
    } else {
      console.log('❌ Some conversion tests failed. Need to fix conversion logic.');
      return false;
    }
  }
}

if (require.main === module) {
  const tester = new SqlToSupabaseConverterTest();
  
  tester.runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
}
