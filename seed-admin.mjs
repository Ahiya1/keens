import { DatabaseManagerEnhanced } from './dist/database/DatabaseManagerEnhanced.js';
import { readFile } from 'fs/promises';

async function seedAdmin() {
  const db = new DatabaseManagerEnhanced();
  
  try {
    console.log('🔌 Connecting to database...');
    await db.initialize();
    
    if (!db.isConnected) {
      throw new Error('Database connection failed');
    }
    
    console.log('✅ Database connected successfully');
    
    // Read the seed script
    console.log('📄 Reading admin user seed script...');
    const seedSQL = await readFile('./src/database/seeds/001_admin_user.sql', 'utf-8');
    
    console.log('🌱 Executing individual seed statements...');
    
    // Split the SQL into individual statements and filter out empty ones
    const statements = seedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && !statement.match(/^\s*$/)) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}`);
        try {
          await db.query(statement + ';');
        } catch (error) {
          console.warn(`⚠️  Statement ${i + 1} failed (may be expected):`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Admin user seeded successfully');
    
    // Verify the admin user was created
    console.log('🔍 Verifying admin user creation...');
    const users = await db.query('SELECT id, username, email, account_status, is_admin FROM users WHERE email = $1', ['ahiya.butman@gmail.com']);
    
    if (users.length > 0) {
      console.log('✅ Admin user verified:', JSON.stringify(users[0], null, 2));
    } else {
      throw new Error('Admin user was not created');
    }
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

seedAdmin().catch(console.error);