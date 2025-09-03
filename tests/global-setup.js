/**
 * Global Jest Setup for Enhanced Testing
 */

export default async function globalSetup() {
  console.log('🧪 Setting up enhanced test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.KEEN_VERBOSE = 'false'; // Reduce noise in tests
  process.env.KEEN_DEBUG = 'false';
  process.env.KEEN_LOG_FILE = 'false';
  
  // Ensure we have a test API key (use a placeholder for tests)
  if (!process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-testing-only';
  }
  
  // Set reasonable timeouts for tests
  process.env.ANTHROPIC_TIMEOUT = '5000'; // 5 seconds for tests
  
  console.log('✅ Enhanced test environment ready');
}