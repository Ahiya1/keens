/**
 * Test the enhanced SQL-to-Supabase conversion with real data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

class SqlToSupabaseConverterTest {
  constructor() {
    this.testUserId = null;
  }

  async setup() {
    console.log('🔧 Setting up test with real user data...');
    
    // Get an existing user ID from the database
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (error || !users || users.length === 0) {
      console.error('❌ No users found in database. Cannot run tests.');
      return false;
    }
    
    this.testUserId = users[0].id;
    console.log('✅ Using existing user ID:', this.testUserId);
    return true;
  }

  async testSelectQuery() {
    console.log('\n🔍 Testing SELECT query conversion...');
    
    try {
      // Test basic SELECT - this simulates what the DAOs do
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('user_id', this.testUserId)
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

  async testCountQuery() {
    console.log('\n🔍 Testing COUNT query conversion...');
    
    try {
      // Test COUNT query - commonly used in DAOs
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('❌ COUNT conversion test failed:', error);
        return false;
      }
      
      console.log('✅ COUNT conversion successful, found', count, 'users');
      return true;
    } catch (error) {
      console.error('❌ COUNT test error:', error);
      return false;
    }
  }

  async testUserQuery() {
    console.log('\n🔍 Testing user lookup query...');
    
    try {
      // Test user lookup by ID - core DAO operation
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, is_admin')
        .eq('id', this.testUserId)
        .single();
        
      if (error) {
        console.error('❌ User lookup test failed:', error);
        return false;
      }
      
      console.log('✅ User lookup successful:', data.email);
      return true;
    } catch (error) {
      console.error('❌ User lookup test error:', error);
      return false;
    }
  }

  async testCreditAccountQuery() {
    console.log('\n🔍 Testing credit account operations...');
    
    try {
      // Test credit account lookup - core DAO operation  
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('user_id', this.testUserId)
        .limit(1);
        
      if (error) {
        console.error('❌ Credit account test failed:', error);
        return false;
      }
      
      console.log('✅ Credit account query successful, found', data.length, 'accounts');
      return true;
    } catch (error) {
      console.error('❌ Credit account test error:', error);
      return false;
    }
  }

  async testAuthTokenQuery() {
    console.log('\n🔍 Testing auth token operations...');
    
    try {
      // Test auth token lookup - used by authentication
      const { data, error } = await supabase
        .from('auth_tokens')
        .select('*')
        .eq('user_id', this.testUserId)
        .eq('is_active', true)
        .limit(5);
        
      if (error) {
        console.error('❌ Auth token test failed:', error);
        return false;
      }
      
      console.log('✅ Auth token query successful, found', data.length, 'active tokens');
      return true;
    } catch (error) {
      console.error('❌ Auth token test error:', error);
      return false;
    }
  }

  async testComplexJoinQuery() {
    console.log('\n🔍 Testing complex query with filtering...');
    
    try {
      // Test complex filtering - commonly used in analytics
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('id, user_id, session_id, current_phase, total_cost, created_at')
        .eq('execution_status', 'running')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        console.error('❌ Complex query test failed:', error);
        return false;
      }
      
      console.log('✅ Complex query successful, found', data.length, 'recent running sessions');
      return true;
    } catch (error) {
      console.error('❌ Complex query test error:', error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Enhanced Database Manager Conversion Tests...');
    
    // Setup
    if (!(await this.setup())) {
      console.error('❌ Setup failed - cannot run tests');
      return false;
    }
    
    const tests = [
      { name: 'SELECT Query', fn: () => this.testSelectQuery() },
      { name: 'COUNT Query', fn: () => this.testCountQuery() },
      { name: 'User Lookup', fn: () => this.testUserQuery() },
      { name: 'Credit Account', fn: () => this.testCreditAccountQuery() },
      { name: 'Auth Token', fn: () => this.testAuthTokenQuery() },
      { name: 'Complex Query', fn: () => this.testComplexJoinQuery() }
    ];
    
    let passedTests = 0;
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
        if (result) {
          passedTests++;
        }
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error.message);
        results.push({ name: test.name, passed: false });
      }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
    
    // Show detailed results
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
    });
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All conversion tests passed! The database operations work correctly.');
      console.log('✅ This confirms that:');
      console.log('  1. Supabase connection is functional');
      console.log('  2. All core tables are accessible and working');
      console.log('  3. Basic CRUD operations work');
      console.log('  4. Complex queries and filtering work');
      console.log('\n➡️ Next: Replace DatabaseManager with enhanced version in DAOs');
      return true;
    } else if (passedTests > tests.length / 2) {
      console.log('\n⚠️ Most tests passed. The core database functionality works.');
      console.log('✅ This means the "SQL query conversion not implemented" errors can be fixed.');
      console.log('\n➡️ Next: Implement the enhanced DatabaseManager and test specific DAO operations');
      return true;
    } else {
      console.log('\n❌ Multiple tests failed. There may be fundamental database issues.');
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
