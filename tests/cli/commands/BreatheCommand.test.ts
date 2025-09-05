/**
 * BreatheCommand Tests - Fixed Mock Version
 * FIXED: Added missing .argument() method to mock
 */

import { BreatheCommand } from '../../../src/cli/commands/BreatheCommand.js';
import { Command } from 'commander';

// Mock commander with all required methods
const mockProgram = {
  command: jest.fn().mockReturnThis(),
  argument: jest.fn().mockReturnThis(),  // ADDED: Missing method
  description: jest.fn().mockReturnThis(),
  option: jest.fn().mockReturnThis(),
  action: jest.fn().mockReturnThis(),
  addHelpText: jest.fn().mockReturnThis(),
} as any;

describe('BreatheCommand', () => {
  let breatheCommand: BreatheCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    breatheCommand = new BreatheCommand(mockProgram);
  });

  describe('Command setup', () => {
    test('should create BreatheCommand instance', () => {
      expect(breatheCommand).toBeInstanceOf(BreatheCommand);
    });

    test('should configure commander with breathe command', () => {
      expect(mockProgram.command).toHaveBeenCalledWith('breathe');
    });

    test('should set up command with argument', () => {
      expect(mockProgram.argument).toHaveBeenCalledWith(
        '[vision]',
        'Vision statement for autonomous task execution (or use -f for file)'
      );
    });

    test('should set up command options', () => {
      // Should have multiple option calls
      expect(mockProgram.option).toHaveBeenCalled();
      expect(mockProgram.option.mock.calls.length).toBeGreaterThan(5);
    });
  });

  describe('Command functionality', () => {
    test('should handle autonomous execution flow', async () => {
      // Verify the action function is set
      expect(mockProgram.action).toHaveBeenCalled();
      expect(typeof mockProgram.action.mock.calls[0][0]).toBe('function');
    });
  });
});
