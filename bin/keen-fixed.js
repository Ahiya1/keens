#!/usr/bin/env node

/**
 * keen CLI - FIXED VERSION with Loop Prevention
 * Entry point for keen FIXED commands: breathe-fixed, breath -f, converse
 * Solves agent loop issues with intelligent completion detection
 */

import { KeenCLIFixed } from '../dist/src/cli/indexFixed.js';

const cli = new KeenCLIFixed();
cli.run(process.argv.slice(2))
  .catch(error => {
    console.error('❌ keen FIXED CLI Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
