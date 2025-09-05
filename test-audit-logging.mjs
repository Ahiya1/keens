import { DatabaseManager } from './dist/database/DatabaseManager.js';
import { AuditLogger } from './dist/api/services/AuditLogger.js';

async function testAuditLogging() {
  try {
    console.log('🔌 Connecting to database...');
    const db = new DatabaseManager();
    await db.initialize();
    
    console.log('🔍 Creating audit logger...');
    const auditLogger = new AuditLogger(db);
    
    console.log('🧪 Testing audit log creation for admin login...');
    
    // Simulate a successful admin login audit log
    await auditLogger.logSuccessfulLogin(
      'be584a09-4c93-48b6-a484-a0e79fe9ddc9',
      {
        ip: '127.0.0.1',
        userAgent: 'test-client'
      },
      {
        isAdmin: true,
        adminPrivileges: {
          audit_access: true,
          global_access: true,
          unlimited_credits: true,
          bypass_rate_limits: true,
          priority_execution: true,
          system_diagnostics: true,
          user_impersonation: true,
          view_all_analytics: true
        }
      }
    );
    
    console.log('✅ Admin login audit log created successfully!');
    
    // Test getting audit logs (this should also work now)
    console.log('🔍 Testing audit log retrieval...');
    const logs = await auditLogger.getAuditLogs('be584a09-4c93-48b6-a484-a0e79fe9ddc9', {
      eventType: 'authentication',
      limit: 5
    });
    
    console.log(`✅ Retrieved ${logs.logs.length} audit logs`);
    console.log('Sample log:', logs.logs[0]);
    
    await db.close();
    console.log('🎉 All audit logging tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAuditLogging();