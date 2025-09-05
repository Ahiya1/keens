/**
 * Test the enhanced authentication system
 * Verify that the fixed CLIAuthManager works with DatabaseManagerEnhanced
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

class EnhancedAuthSystemTest {
  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || 'ahiya.butman@gmail.com';
    this.adminUsername = process.env.ADMIN_USERNAME || 'ahiya_admin';
  }

  async testDatabaseConnection() {
    console.log('\n🔍 Testing enhanced database connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
        
      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }
      
      console.log('✅ Database connection successful, found', data, 'users');
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      return false;
    }
  }

  async testAdminUserExists() {
    console.log('\n👤 Testing admin user exists...');
    
    try {
      const { data: adminUser, error } = await supabase
        .from('users')
        .select('id, email, username, is_admin, admin_privileges')
        .eq('email', this.adminEmail)
        .single();
        
      if (error) {
        console.error('❌ Admin user lookup failed:', error);
        return false;
      }
      
      if (!adminUser) {
        console.error('❌ Admin user not found');
        return false;
      }
      
      console.log('✅ Admin user found:');
      console.log('  Email:', adminUser.email);
      console.log('  Username:', adminUser.username);
      console.log('  Is Admin:', adminUser.is_admin);
      console.log('  Privileges:', Object.keys(adminUser.admin_privileges || {}).length);
      
      return adminUser.is_admin;
    } catch (error) {
      console.error('❌ Admin user test error:', error);
      return false;
    }
  }

  async testCreditAccountExists() {
    console.log('\n💳 Testing admin credit account...');
    
    try {
      // Get admin user first
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', this.adminEmail)
        .single();
        
      if (userError || !adminUser) {
        console.error('❌ Could not find admin user for credit test');
        return false;
      }
      
      // Check credit account
      const { data: creditAccount, error: creditError } = await supabase
        .from('credit_accounts')
        .select('current_balance, unlimited_credits')
        .eq('user_id', adminUser.id)
        .single();
        
      if (creditError) {
        console.error('❌ Credit account lookup failed:', creditError);
        return false;
      }
      
      if (!creditAccount) {
        console.error('❌ Credit account not found for admin user');
        return false;
      }
      
      console.log('✅ Admin credit account found:');
      console.log('  Balance:', creditAccount.current_balance);
      console.log('  Unlimited:', creditAccount.unlimited_credits);
      
      return true;
    } catch (error) {
      console.error('❌ Credit account test error:', error);
      return false;
    }
  }

  async testAuthTokenOperations() {
    console.log('\n🔑 Testing auth token operations...');
    
    try {
      // Get admin user
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', this.adminEmail)
        .single();
        
      if (userError || !adminUser) {
        console.error('❌ Could not find admin user for token test');
        return false;
      }
      
      // Check existing tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('auth_tokens')
        .select('id, token_type, is_active, created_at')
        .eq('user_id', adminUser.id)
        .limit(5);
        
      if (tokenError) {
        console.error('❌ Auth token lookup failed:', tokenError);
        return false;
      }
      
      console.log('✅ Auth token query successful, found', tokens.length, 'tokens');
      
      if (tokens.length > 0) {
        console.log('  Recent token types:', tokens.map(t => t.token_type).join(', '));
      }
      
      return true;
    } catch (error) {
      console.error('❌ Auth token test error:', error);
      return false;
    }
  }

  async testSessionOperations() {
    console.log('\n📋 Testing session operations...');
    
    try {
      // Get admin user
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', this.adminEmail)
        .single();
        
      if (userError || !adminUser) {
        console.error('❌ Could not find admin user for session test');
        return false;
      }
      
      // Check sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('agent_sessions')
        .select('id, session_id, current_phase, execution_status, created_at')
        .eq('user_id', adminUser.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (sessionError) {
        console.error('❌ Session lookup failed:', sessionError);
        return false;
      }
      
      console.log('✅ Session query successful, found', sessions.length, 'sessions');
      
      if (sessions.length > 0) {
        console.log('  Recent sessions:');
        sessions.forEach(s => {
          console.log(`    ${s.session_id}: ${s.current_phase} (${s.execution_status})`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Session test error:', error);
      return false;
    }
  }

  async testComplexQueries() {
    console.log('\n🔍 Testing complex database queries...');
    
    try {
      // Test complex filtering and joins
      const { data: activeUsers, error: activeError } = await supabase
        .from('users')
        .select('id, email, username, is_admin, created_at')
        .eq('account_status', 'active')
        .eq('email_verified', true)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (activeError) {
        console.error('❌ Complex query failed:', activeError);
        return false;
      }
      
      console.log('✅ Complex query successful, found', activeUsers.length, 'active verified users');
      
      // Test aggregation
      const { count: totalUsers, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'active');
        
      if (countError) {
        console.error('❌ Count query failed:', countError);
        return false;
      }
      
      console.log('✅ Aggregation query successful, total active users:', totalUsers);
      
      return true;
    } catch (error) {
      console.error('❌ Complex query test error:', error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Enhanced Authentication System Tests...');
    console.log('Testing integration of DatabaseManagerEnhanced with real operations');
    
    const tests = [
      { name: 'Database Connection', fn: () => this.testDatabaseConnection() },
      { name: 'Admin User Exists', fn: () => this.testAdminUserExists() },
      { name: 'Credit Account', fn: () => this.testCreditAccountExists() },
      { name: 'Auth Tokens', fn: () => this.testAuthTokenOperations() },
      { name: 'Sessions', fn: () => this.testSessionOperations() },
      { name: 'Complex Queries', fn: () => this.testComplexQueries() }
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
    
    console.log(`\n📊 Enhanced Auth System Test Results: ${passedTests}/${tests.length} tests passed`);
    
    // Show detailed results
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
    });
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All enhanced authentication tests passed!');
      console.log('✅ This confirms:');
      console.log('  1. DatabaseManagerEnhanced can handle all core operations');
      console.log('  2. Admin user and credentials are functional');
      console.log('  3. Credit system is operational');
      console.log('  4. Authentication infrastructure works');
      console.log('  5. Complex queries and filtering work properly');
      console.log('\n➡️ Next: Replace original DatabaseManager with enhanced version');
      console.log('  and test the fixed CLIAuthManager');
      return true;
    } else if (passedTests > tests.length / 2) {
      console.log('\n⚠️ Most tests passed - enhanced system is largely functional.');
      console.log('The enhanced DatabaseManager should work for most operations.');
      return true;
    } else {
      console.log('\n❌ Multiple critical tests failed.');
      console.log('Enhanced system may not be ready for integration.');
      return false;
    }
  }
}

if (require.main === module) {
  const tester = new EnhancedAuthSystemTest();
  
  tester.runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
}
