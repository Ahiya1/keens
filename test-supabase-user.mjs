import { supabaseAdmin } from './dist/config/database.js';

async function testSupabaseUser() {
  const userId = "be584a09-4c93-48b6-a484-a0e79fe9ddc9";
  
  console.log('🔍 Testing Supabase admin query for user...');
  
  // Test the exact query that UserDAO uses
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('Query result:');
  console.log('- Error:', error);
  console.log('- User:', user);
  
  // Let's also try without .single() to see if there are multiple or zero results
  console.log('🔍 Testing without single()...');
  const { data: users, error: error2 } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId);
    
  console.log('Query result (without single):');
  console.log('- Error:', error2);
  console.log('- Users count:', users?.length || 0);
  console.log('- Users:', users);
  
  // Let's try to get all users to see what's in the table
  console.log('🔍 Getting all users...');
  const { data: allUsers, error: error3 } = await supabaseAdmin
    .from('users')
    .select('id, email, username, account_status');
    
  console.log('All users:');
  console.log('- Error:', error3);
  console.log('- Count:', allUsers?.length || 0);
  console.log('- Users:', allUsers);
}

testSupabaseUser().catch(console.error);