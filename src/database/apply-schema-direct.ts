/**
 * Direct Schema Application to Supabase Cloud Database
 * Bypasses DatabaseManager SQL conversion issues and applies schema directly
 * CRITICAL: Fixes empty Supabase database by applying complete schema
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../config/database.js';

/**
 * Apply schema directly to Supabase using SQL execution
 * This bypasses the DatabaseManager's incomplete SQL conversion
 */
export class DirectSchemaApplicator {
  /**
   * Test database connection before applying schema
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Try a simple query to test connectivity
      const { data, error } = await supabaseAdmin.rpc('version');
      
      if (error && error.code !== '42883') { // Function doesn't exist is OK
        console.error('❌ Supabase connection failed:', error.message);
        return false;
      }
      
      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if schema is already applied
   */
  async checkExistingSchema(): Promise<boolean> {
    try {
      console.log('🔍 Checking existing schema...');
      
      // Check if users table exists
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') { // Table does not exist
          console.log('📋 Schema not yet applied - tables missing');
          return false;
        }
        console.error('❌ Error checking schema:', error.message);
        return false;
      }
      
      console.log('✅ Schema appears to be applied - tables exist');
      return true;
    } catch (error) {
      console.error('❌ Schema check failed:', error);
      return false;
    }
  }

  /**
   * Apply schema by outputting SQL for manual execution
   */
  async applySchema(): Promise<boolean> {
    try {
      console.log('🛠️ Preparing database schema for Supabase application...');
      
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'migrations', '001_initial_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema file not found:', schemaPath);
        return false;
      }
      
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log(`📁 Loaded schema file (${schemaSql.length} characters)`);
      
      console.log('\n' + '='.repeat(80));
      console.log('📋 MANUAL SCHEMA APPLICATION REQUIRED');
      console.log('='.repeat(80));
      console.log('Please copy the following SQL and execute it in Supabase SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/muuursmrrrrpqtpjwwzd/sql/new');
      console.log('2. Paste the SQL below');
      console.log('3. Click "Run"');
      console.log('4. Return here and run this script again to verify');
      console.log('='.repeat(80));
      console.log();
      console.log(schemaSql);
      console.log();
      console.log('='.repeat(80));
      console.log('End of SQL - Please execute the above in Supabase SQL Editor');
      console.log('='.repeat(80));
      
      console.log('\n⏳ Waiting 30 seconds for manual execution...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      return true;
    } catch (error) {
      console.error('❌ Schema preparation failed:', error);
      return false;
    }
  }

  /**
   * Create admin user in the database
   */
  async createAdminUser(): Promise<boolean> {
    try {
      console.log('👤 Creating admin user...');
      
      const { adminConfig } = await import('../config/database.js');
      
      // First, create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminConfig.email,
        password: adminConfig.password,
        email_confirm: true,
        user_metadata: {
          username: adminConfig.username,
          display_name: 'Admin User',
        },
      });
      
      if (authError && !authError.message.includes('User already registered')) {
        console.error('❌ Failed to create admin in Supabase Auth:', authError.message);
        return false;
      }
      
      const userId = authData?.user?.id || 'admin-user-id';
      
      // Then create user record in our users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: adminConfig.email,
          username: adminConfig.username,
          password_hash: null, // Using Supabase Auth
          display_name: 'Admin User',
          role: 'admin',
          is_admin: true,
          admin_privileges: {
            unlimited_credits: true,
            bypass_rate_limits: true,
            view_all_analytics: true,
            user_impersonation: true,
            system_diagnostics: true,
            priority_execution: true,
            global_access: true,
            audit_access: true
          },
          email_verified: true,
          account_status: 'active',
          timezone: 'UTC',
          preferences: {}
        }, { onConflict: 'id' });
      
      if (dbError) {
        console.error('❌ Failed to create admin user record:', dbError.message);
        return false;
      }
      
      console.log('✅ Admin user created successfully!');
      return true;
    } catch (error) {
      console.error('❌ Admin user creation failed:', error);
      return false;
    }
  }

  /**
   * Verify schema application by testing key operations
   */
  async verifySchema(): Promise<boolean> {
    try {
      console.log('🔍 Verifying schema application...');
      
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (usersError) {
        console.error('❌ Users table test failed:', usersError.message);
        return false;
      }
      
      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from('agent_sessions')
        .select('count', { count: 'exact', head: true });
      
      if (sessionsError) {
        console.error('❌ Agent sessions table test failed:', sessionsError.message);
        return false;
      }
      
      const { data: credits, error: creditsError } = await supabaseAdmin
        .from('credit_accounts')
        .select('count', { count: 'exact', head: true });
      
      if (creditsError) {
        console.error('❌ Credit accounts table test failed:', creditsError.message);
        return false;
      }
      
      console.log('✅ Schema verification completed successfully!');
      console.log(`📊 Tables verified: users, agent_sessions, credit_accounts`);
      return true;
    } catch (error) {
      console.error('❌ Schema verification failed:', error);
      return false;
    }
  }

  /**
   * Complete schema setup process
   */
  async setupDatabase(): Promise<boolean> {
    console.log('🚀 Starting complete database setup...');
    
    if (!(await this.testConnection())) {
      return false;
    }
    
    const alreadyApplied = await this.checkExistingSchema();
    
    if (!alreadyApplied) {
      if (!(await this.applySchema())) {
        return false;
      }
      
      console.log('🔄 Rechecking schema after manual application...');
      if (!(await this.checkExistingSchema())) {
        console.error('❌ Schema still not applied. Please ensure SQL was executed successfully.');
        return false;
      }
    } else {
      console.log('⏭️ Schema already applied, skipping...');
    }
    
    if (!(await this.createAdminUser())) {
      console.warn('⚠️ Admin user creation failed, but continuing...');
    }
    
    if (!(await this.verifySchema())) {
      return false;
    }
    
    console.log('🎉 Database setup completed successfully!');
    return true;
  }
}

const isMainModule = process.argv[1]?.endsWith('apply-schema-direct.ts') || process.argv[1]?.endsWith('apply-schema-direct.js');

if (isMainModule) {
  const applicator = new DirectSchemaApplicator();
  
  applicator.setupDatabase()
    .then((success) => {
      if (success) {
        console.log('🎉 Schema application completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Schema application failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Schema application error:', error);
      process.exit(1);
    });
}
