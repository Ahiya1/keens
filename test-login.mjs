import { CLIAuthManager } from './dist/cli/auth/CLIAuthManager.js';

async function testLogin() {
  const authManager = new CLIAuthManager();
  
  try {
    console.log('🔄 Initializing auth manager...');
    await authManager.initialize();
    
    console.log('🔐 Testing login...');
    const result = await authManager.login({
      email: 'ahiya.butman@gmail.com',
      password: '2con-creator',
      remember: false
    });
    
    if (result.success) {
      console.log('✅ Login successful:', result.message);
      
      const user = authManager.getCurrentUser();
      console.log('👤 User:', JSON.stringify(user, null, 2));
      
      console.log('🔍 Testing authentication check...');
      const isAuth = authManager.isAuthenticated();
      console.log('✅ Is authenticated:', isAuth);
      
      if (isAuth) {
        console.log('🔍 Getting user context...');
        const context = await authManager.getCurrentUserContext();
        console.log('✅ User context:', JSON.stringify(context, null, 2));
      }
      
    } else {
      console.error('❌ Login failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await authManager.cleanup();
  }
}

testLogin();