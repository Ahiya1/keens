const { DatabaseManagerEnhanced } = require('./dist/database/DatabaseManagerEnhanced.js');

async function debugAuth() {
  const db = new DatabaseManagerEnhanced();
  
  try {
    await db.initialize();
    console.log('✅ Database connected');
    
    // Check user status
    const users = await db.query('SELECT id, username, email, account_status, is_admin FROM users WHERE email = $1', ['ahiya.butman@gmail.com']);
    console.log('📋 User data:', JSON.stringify(users, null, 2));
    
    // Check auth tokens
    if (users.length > 0) {
      const tokens = await db.query('SELECT * FROM auth_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [users[0].id]);
      console.log('🔑 Recent tokens:', JSON.stringify(tokens, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

debugAuth();