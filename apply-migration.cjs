/**
 * Apply cost tracking migration
 * CommonJS script to avoid ESM issues
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyMigration() {
  console.log('🛠️ Applying cost tracking migration...');
  
  // Initialize Supabase client
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
    // Read migration file
    const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '006_cost_tracking_columns.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Migration SQL loaded, executing...');
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      // Try manual approach - split SQL and execute individually
      console.log('🔄 Trying manual approach...');
      const sqlStatements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (const statement of sqlStatements) {
        if (statement.toUpperCase().startsWith('ALTER TABLE agent_sessions')) {
          console.log('⚡ Executing:', statement.substring(0, 80) + '...');
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.error('Statement error:', stmtError.message);
          } else {
            console.log('✅ Statement executed successfully');
          }
        }
      }
      
      // Try direct column addition
      console.log('🔧 Adding columns directly...');
      
      const columnStatements = [
        'ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS api_calls_data JSONB DEFAULT \'[]\';',
        'ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT \'{}\';',
        'ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_api_cost DECIMAL(12,6) DEFAULT 0.000000;'
      ];
      
      for (const stmt of columnStatements) {
        console.log('⚡ Adding column:', stmt);
        const { error: colError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (colError) {
          console.error('Column error:', colError.message);
        } else {
          console.log('✅ Column added successfully');
        }
      }
      
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    // Verify columns exist
    console.log('🔍 Verifying columns...');
    const { data, error: queryError } = await supabase
      .from('agent_sessions')
      .select('api_calls_data, cost_breakdown, total_api_cost')
      .limit(1);
    
    if (queryError) {
      console.error('❌ Column verification failed:', queryError.message);
    } else {
      console.log('✅ Columns verified successfully!');
    }
    
    console.log('🎉 Migration application completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
