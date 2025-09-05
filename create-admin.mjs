import { DatabaseManagerEnhanced } from './dist/database/DatabaseManagerEnhanced.js';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const db = new DatabaseManagerEnhanced();
  
  try {
    console.log('🔌 Connecting to database...');
    await db.initialize();
    
    console.log('✅ Database connected successfully');
    
    // Create admin context
    const adminContext = {
      userId: '00000000-0000-0000-0000-000000000001', // Temporary admin ID for setup
      isAdmin: true
    };
    
    // Hash the password
    console.log('🔒 Hashing admin password...');
    const passwordHash = await bcrypt.hash('2con-creator', 12);
    
    // Check if admin user already exists
    console.log('🔍 Checking for existing admin user...');
    const existingUsers = await db.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['ahiya.butman@gmail.com'],
      adminContext
    );
    
    if (existingUsers.length > 0) {
      console.log('✅ Admin user already exists:', existingUsers[0]);
      return;
    }
    
    // Create the admin user using direct insert
    console.log('👤 Creating admin user...');
    const userResult = await db.query(`
      INSERT INTO users (
        email, username, password_hash, display_name, role, is_admin,
        admin_privileges, email_verified, account_status, timezone,
        preferences, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING id, email, username
    `, [
      'ahiya.butman@gmail.com',
      'ahiya_admin', 
      passwordHash,
      'Ahiya Butman (Admin)',
      'super_admin',
      true,
      JSON.stringify({
        unlimited_credits: true,
        bypass_rate_limits: true,
        view_all_analytics: true,
        user_impersonation: true,
        system_diagnostics: true,
        priority_execution: true,
        global_access: true,
        audit_access: true
      }),
      true,
      'active',
      'UTC',
      JSON.stringify({
        dashboard_theme: "admin",
        notification_preferences: {
          email_alerts: true,
          system_alerts: true,
          security_alerts: true
        },
        admin_settings: {
          auto_refresh_analytics: true,
          show_system_metrics: true,
          enable_debug_mode: true
        }
      })
    ], adminContext);
    
    console.log('✅ Admin user created:', userResult[0]);
    
    // Now create the credit account
    const userId = userResult[0].id;
    console.log('💳 Creating admin credit account...');
    
    const creditResult = await db.query(`
      INSERT INTO credit_accounts (
        user_id, current_balance, lifetime_purchased, lifetime_spent,
        unlimited_credits, daily_limit, monthly_limit, auto_recharge_enabled,
        account_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING id, unlimited_credits
    `, [
      userId,
      99999999.9999,
      0.0000,
      0.0000,
      true,
      null,
      null,
      false,
      'active'
    ], { ...adminContext, userId });
    
    console.log('✅ Credit account created:', creditResult[0]);
    console.log('🎉 Admin setup complete!');
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

createAdmin().catch(console.error);