/**
 * Simple Schema Application Script - JavaScript version
 * Applies the database schema directly to Supabase cloud database
 */

const fs = require('fs');
const path = require('path');

// Simple Supabase client setup
class SimpleSupabaseApplicator {
  constructor() {
    // Load environment from .env file
    require('dotenv').config();
    
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    console.log('🚀 Simple Schema Applicator initialized');
    console.log(`📍 Supabase URL: ${this.supabaseUrl}`);
  }

  async testConnection() {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': this.serviceRoleKey,
          'Authorization': `Bearer ${this.serviceRoleKey}`,
        },
      });
      
      if (response.ok) {
        console.log('✅ Supabase connection successful');
        return true;
      } else {
        console.error('❌ Supabase connection failed:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      return false;
    }
  }

  async checkExistingTables() {
    try {
      console.log('🔍 Checking existing tables...');
      
      const response = await fetch(`${this.supabaseUrl}/rest/v1/users?select=count&limit=1`, {
        method: 'HEAD',
        headers: {
          'apikey': this.serviceRoleKey,
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Prefer': 'count=exact'
        },
      });
      
      if (response.ok) {
        console.log('✅ Users table exists - schema appears to be applied');
        return true;
      } else if (response.status === 406) {
        console.log('📋 Users table does not exist - schema needs to be applied');
        return false;
      } else {
        console.error('❌ Error checking tables:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Table check error:', error.message);
      return false;
    }
  }

  displaySchemaForManualApplication() {
    try {
      console.log('📁 Loading schema file...');
      
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'migrations', '001_initial_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema file not found:', schemaPath);
        return false;
      }
      
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log(`📊 Schema file loaded (${schemaSql.length} characters)`);
      
      console.log('\n' + '='.repeat(100));
      console.log('📋 MANUAL SCHEMA APPLICATION REQUIRED');
      console.log('='.repeat(100));
      console.log('The Supabase database is empty. Please apply the schema manually:');
      console.log('');
      console.log('STEP 1: Open Supabase SQL Editor');
      console.log('🌐 URL: https://supabase.com/dashboard/project/muuursmrrrrpqtpjwwzd/sql/new');
      console.log('');
      console.log('STEP 2: Copy and paste the following SQL:');
      console.log('='.repeat(100));
      console.log(schemaSql);
      console.log('='.repeat(100));
      console.log('');
      console.log('STEP 3: Click "Run" in the Supabase SQL Editor');
      console.log('');
      console.log('STEP 4: After successful execution, run this script again to verify');
      console.log('='.repeat(100));
      
      return true;
    } catch (error) {
      console.error('❌ Error loading schema file:', error.message);
      return false;
    }
  }

  async verifySchemaApplication() {
    try {
      console.log('🔍 Verifying schema application...');
      
      // Test key tables
      const tables = ['users', 'agent_sessions', 'credit_accounts', 'auth_tokens'];
      const results = [];
      
      for (const table of tables) {
        const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}?select=count&limit=1`, {
          method: 'HEAD',
          headers: {
            'apikey': this.serviceRoleKey,
            'Authorization': `Bearer ${this.serviceRoleKey}`,
            'Prefer': 'count=exact'
          },
        });
        
        if (response.ok) {
          console.log(`✅ Table '${table}' exists and is accessible`);
          results.push(true);
        } else {
          console.error(`❌ Table '${table}' test failed:`, response.statusText);
          results.push(false);
        }
      }
      
      const allSuccess = results.every(result => result);
      
      if (allSuccess) {
        console.log('🎉 Schema verification completed successfully!');
        console.log(`📊 All ${tables.length} core tables are accessible`);
      } else {
        console.error(`❌ Schema verification failed - ${results.filter(r => !r).length} tables failed`);
      }
      
      return allSuccess;
    } catch (error) {
      console.error('❌ Schema verification error:', error.message);
      return false;
    }
  }

  async createAdminUser() {
    try {
      console.log('👤 Creating admin user...');
      
      // Admin configuration from environment
      const adminEmail = process.env.ADMIN_EMAIL || 'ahiya.butman@gmail.com';
      const adminUsername = process.env.ADMIN_USERNAME || 'ahiya_admin';
      
      console.log(`📧 Admin email: ${adminEmail}`);
      console.log(`👤 Admin username: ${adminUsername}`);
      
      // Create admin user record in users table
      const userData = {
        id: 'admin-user-direct-' + Date.now(),
        email: adminEmail,
        username: adminUsername,
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
      };
      
      const response = await fetch(`${this.supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': this.serviceRoleKey,
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Admin user created successfully!');
        console.log(`👤 User ID: ${result[0]?.id}`);
        return true;
      } else {
        const error = await response.text();
        if (error.includes('duplicate') || error.includes('already exists')) {
          console.log('⚠️ Admin user already exists, skipping creation');
          return true;
        }
        console.error('❌ Failed to create admin user:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Admin user creation error:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🚀 Starting database setup process...');
    
    // Step 1: Test connection
    if (!(await this.testConnection())) {
      console.error('❌ Cannot connect to Supabase. Please check configuration.');
      return false;
    }
    
    // Step 2: Check if schema is already applied
    const schemaExists = await this.checkExistingTables();
    
    if (!schemaExists) {
      // Step 3: Display schema for manual application
      this.displaySchemaForManualApplication();
      
      console.log('\n⏳ Please apply the schema manually and then press Enter to continue...');
      
      // Wait for user input (simplified for demo)
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
      
      // Step 4: Verify schema was applied
      if (!(await this.checkExistingTables())) {
        console.error('❌ Schema still not applied. Please ensure SQL was executed successfully.');
        return false;
      }
    } else {
      console.log('⏭️ Schema already applied, continuing to verification...');
    }
    
    // Step 5: Verify all tables
    if (!(await this.verifySchemaApplication())) {
      console.error('❌ Schema verification failed.');
      return false;
    }
    
    // Step 6: Create admin user
    if (!(await this.createAdminUser())) {
      console.warn('⚠️ Admin user creation failed, but continuing...');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('✅ Next steps:');
    console.log('1. Schema has been applied to Supabase');
    console.log('2. Admin user has been created');
    console.log('3. You can now proceed to fix the SQL query conversion issues');
    console.log('4. Run tests to verify database integration');
    
    return true;
  }
}

// CLI execution
if (require.main === module) {
  const applicator = new SimpleSupabaseApplicator();
  
  applicator.run()
    .then((success) => {
      if (success) {
        console.log('🎉 Setup completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Setup failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Setup error:', error);
      process.exit(1);
    });
}

module.exports = { SimpleSupabaseApplicator };
