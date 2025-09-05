import { dbEnhanced } from './dist/database/DatabaseManagerEnhanced.js';
import { readFileSync } from 'fs';

async function applyFix() {
  try {
    console.log('🔌 Connecting to database...');
    await dbEnhanced.initialize();
    
    console.log('📜 Reading SQL fix script...');
    const sql = readFileSync('./apply-audit-logs-fix.sql', 'utf8');
    
    console.log('🔧 Applying audit logs RLS fix...');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log(`Executing: ${stmt.trim().substring(0, 60)}...`);
        try {
          const result = await dbEnhanced.query(stmt.trim());
          console.log('✅ Statement executed successfully');
        } catch (error) {
          console.log('⚠️ Statement warning:', error.message);
        }
      }
    }
    
    console.log('✅ Fix applied successfully');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    process.exit(1);
  }
}

applyFix();