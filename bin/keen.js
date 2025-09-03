#!/usr/bin/env node

/**
 * keen-s-a CLI Entry Point
 * Enhanced for cloud-native deployment and real-time capabilities
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import for ES modules
try {
  const { CLIManager } = await import('../dist/cli/index.js');
  
  const cli = new CLIManager();
  await cli.run(process.argv);
} catch (error) {
  console.error('keen-s-a CLI Error:', error.message);
  
  // Check if build exists
  try {
    await import('../dist/cli/index.js');
  } catch (buildError) {
    console.error('\n❌ Build not found. Please run: npm run build');
    console.error('\n🔄 For development: npm run dev');
  }
  
  process.exit(1);
}
