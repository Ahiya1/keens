#!/usr/bin/env node

/**
 * keen-s-a CLI Entry Point
 * Enhanced for cloud-native deployment and real-time capabilities
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the project root directory
function findProjectRoot() {
  // First try relative to this script (for local development)
  let projectRoot = join(__dirname, '..');
  if (existsSync(join(projectRoot, 'dist', 'cli', 'index.js'))) {
    return projectRoot;
  }
  
  // If that doesn't work, try from the global installation location
  // Assuming this script was installed via npm link or npm install -g
  const possibleRoots = [
    '/home/ahiya/Ahiya/keens',  // hardcoded fallback
    join(__dirname, '..', '..', 'keens'),
    join(process.env.HOME || '/home/ahiya', 'Ahiya', 'keens')
  ];
  
  for (const root of possibleRoots) {
    if (existsSync(join(root, 'dist', 'cli', 'index.js'))) {
      return root;
    }
  }
  
  throw new Error('Could not find keens project directory');
}

// Dynamic import for ES modules
try {
  const projectRoot = findProjectRoot();
  
  // Load environment variables from the project directory
  const envPath = join(projectRoot, '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  const cliPath = join(projectRoot, 'dist', 'cli', 'index.js');
  
  const { KeenCLI } = await import(cliPath);
  
  const cli = new KeenCLI();
  await cli.run(process.argv);
} catch (error) {
  console.error('keen-s-a CLI Error:', error.message);
  
  if (error.message.includes('Could not find keens project directory')) {
    console.error('\n❌ Project not found. Make sure keens is built and accessible.');
    console.error('\n🔄 Try running from the keens directory: npm run build');
  } else {
    console.error('\n❌ Build not found. Please run: npm run build');
    console.error('\n🔄 For development: npm run dev');
  }
  
  process.exit(1);
}
