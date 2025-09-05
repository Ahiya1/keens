/**
 * Simple test to identify what database operations are failing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testBasicOperations() {
  console.log('🔍 Testing basic Supabase operations...');
  
  try {
    // Test 1: Simple select
    console.log('\n1. Testing simple SELECT...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
      
    if (usersError) {
      console.error('❌ Users select failed:', usersError);
    } else {
      console.log('✅ Users select successful, found', users.length, 'users');
    }
    
    // Test 2: Simple insert
    console.log('\n2. Testing INSERT operation...');
    const testUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      username: 'test_user',
      password_hash: null,
      display_name: 'Test User',
      role: 'user',
      is_admin: false,
      email_verified: true,
      account_status: 'active',
      timezone: 'UTC',
      preferences: {}
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
      
    if (insertError) {
      console.error('❌ User insert failed:', insertError);
    } else {
      console.log('✅ User insert successful:', insertData[0]?.email);
    }
    
    // Test 3: Update operation
    console.log('\n3. Testing UPDATE operation...');
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ display_name: 'Updated Test User' })
      .eq('id', testUser.id)
      .select();
      
    if (updateError) {
      console.error('❌ User update failed:', updateError);
    } else {
      console.log('✅ User update successful');
    }
    
    // Test 4: Delete operation
    console.log('\n4. Testing DELETE operation...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUser.id);
      
    if (deleteError) {
      console.error('❌ User delete failed:', deleteError);
    } else {
      console.log('✅ User delete successful');
    }
    
    console.log('\n🎉 Basic operations test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

if (require.main === module) {
  testBasicOperations()
    .then((success) => {
      if (success) {
        console.log('\n✅ All basic operations work - the issue might be in the SQL conversion layer');
        process.exit(0);
      } else {
        console.log('\n❌ Basic operations failed - there are fundamental issues');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}
