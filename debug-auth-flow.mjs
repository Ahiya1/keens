import { CLIAuthManager } from './dist/cli/auth/CLIAuthManager.js';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugAuthFlow() {
  const authManager = new CLIAuthManager();
  const authFile = join(homedir(), '.keen', 'auth.json');
  
  try {
    console.log('🔄 Initializing auth manager...');
    await authManager.initialize();
    
    console.log('📁 Checking auth file before login:', authFile);
    try {
      const beforeLogin = await fs.readFile(authFile, 'utf-8');
      console.log('📄 Auth file exists before login:', beforeLogin.slice(0, 100) + '...');
    } catch (error) {
      console.log('📄 No auth file before login (expected)');
    }
    
    console.log('🔐 Attempting login...');
    const result = await authManager.login({
      email: 'ahiya.butman@gmail.com',
      password: '2con-creator',
      remember: false
    });
    
    console.log('📊 Login result:', result);
    
    console.log('📁 Checking auth file after login...');
    try {
      const afterLogin = await fs.readFile(authFile, 'utf-8');
      console.log('📄 Auth file exists after login, size:', afterLogin.length);
      console.log('📄 Auth file content preview:', afterLogin.slice(0, 200) + '...');
    } catch (error) {
      console.error('❌ Auth file not found after login!', error.message);
    }
    
    console.log('🔍 Testing authentication check...');
    const isAuth = authManager.isAuthenticated();
    console.log('✅ Is authenticated:', isAuth);
    
    // Don't cleanup yet - let's see if file persists
    console.log('📁 Final auth file check...');
    try {
      const finalCheck = await fs.readFile(authFile, 'utf-8');
      console.log('📄 Auth file still exists, size:', finalCheck.length);
    } catch (error) {
      console.error('❌ Auth file disappeared!', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    console.log('🧹 Cleaning up auth manager...');
    await authManager.cleanup();
  }
}

debugAuthFlow();