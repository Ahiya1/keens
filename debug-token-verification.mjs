import { DatabaseManagerEnhanced } from './dist/database/DatabaseManagerEnhanced.js';
import { UserDAO } from './dist/database/dao/UserDAO.js';
import { AuthenticationService } from './dist/api/services/AuthenticationService.js';
import { AuditLogger } from './dist/api/services/AuditLogger.js';

async function debugTokenVerification() {
  const db = new DatabaseManagerEnhanced();
  
  try {
    await db.initialize();
    
    const userDAO = new UserDAO(db);
    const auditLogger = new AuditLogger(db);
    const authService = new AuthenticationService(db, userDAO, auditLogger);
    
    const userId = "be584a09-4c93-48b6-a484-a0e79fe9ddc9";
    
    console.log('🔍 Looking up user by ID directly...');
    const user = await userDAO.getUserById(userId);
    
    if (user) {
      console.log('✅ User found:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Username:', user.username);
      console.log('  Account Status:', user.account_status);
      console.log('  Is Admin:', user.is_admin);
    } else {
      console.log('❌ User not found!');
    }
    
    // Test the token verification directly
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZTU4NGEwOS00YzkzLTQ4YjYtYTQ4NC1hMGU3OWZlOWRkYzkiLCJlbWFpbCI6ImFoaXlhLmJ1dG1hbkBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImFoaXlhX2FkbWluIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaXNBZG1pbiI6dHJ1ZSwiYWRtaW5Qcml2aWxlZ2VzIjp7ImF1ZGl0X2FjY2VzcyI6dHJ1ZSwiZ2xvYmFsX2FjY2VzcyI6dHJ1ZSwidW5saW1pdGVkX2NyZWRpdHMiOnRydWUsImJ5cGFzc19yYXRlX2xpbWl0cyI6dHJ1ZSwicHJpb3JpdHlfZXhlY3V0aW9uIjp0cnVlLCJzeXN0ZW1fZGlhZ25vc3RpY3MiOnRydWUsInVzZXJfaW1wZXJzb25hdGlvbiI6dHJ1ZSwidmlld19hbGxfYW5hbHl0aWNzIjp0cnVlfSwic2NvcGVzIjpbInByb2ZpbGU6cmVhZCIsImNyZWRpdHM6cmVhZCIsImFnZW50czpleGVjdXRlIiwic2Vzc2lvbnM6cmVhZCIsImFkbWluOmFuYWx5dGljcyIsImFkbWluOnVzZXJzOnJlYWQiLCJhZG1pbjp1c2Vyczp3cml0ZSIsImFkbWluOmNyZWRpdHM6d3JpdGUiLCJhZG1pbjpzeXN0ZW06cmVhZCIsImFkbWluOmF1ZGl0OnJlYWQiLCJhZ2VudHM6dW5saW1pdGVkIiwiY3JlZGl0czp1bmxpbWl0ZWQiXSwiaWF0IjoxNzU3MDQ2MzI4LCJleHAiOjE3NTcwNDk5Mjh9.I4v5p9v2m803QIdyfLgwlpeO7BHzXi89gvJqXLVIn6c";
    
    console.log('🔍 Testing token verification...');
    try {
      const payload = await authService.verifyAccessToken(token);
      console.log('✅ Token verification successful:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await db.close();
  }
}

debugTokenVerification();