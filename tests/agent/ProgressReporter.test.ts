/**
 * Tests for Enhanced Progress Reporter
 */

import { ProgressReporter, ProgressUpdate } from '../../src/utils/ProgressReporter.js';
import { AgentPhase } from '../../src/agent/types.js';

describe('ProgressReporter', () => {
  let reporter: ProgressReporter;
  const mockSessionId = 'test_session_123';
  const maxIterations = 10;

  beforeEach(() => {
    reporter = new ProgressReporter(mockSessionId, maxIterations, true, true);
  });

  afterEach(() => {
    reporter.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      const state = reporter.getCurrentState();
      
      expect(state.phase).toBe('EXPLORE');
      expect(state.currentIteration).toBe(0);
      expect(state.totalIterations).toBe(maxIterations);
      expect(state.currentActivity).toBe('Starting agent execution...');
      expect(state.tokensUsed).toBe(0);
      expect(state.toolsExecuted).toEqual([]);
      expect(state.errorsEncountered).toBe(0);
    });

    test('should calculate progress correctly', () => {
      expect(reporter.getProgress()).toBe(0);
      
      reporter.updateIteration(5, 'Halfway through');
      expect(reporter.getProgress()).toBe(50);
      
      reporter.updateIteration(10, 'Complete');
      expect(reporter.getProgress()).toBe(100);
    });
  });

  describe('Phase Management', () => {
    test('should update phase correctly', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.updatePhase('COMPLETE', 'Task finished');
      
      const state = reporter.getCurrentState();
      expect(state.phase).toBe('COMPLETE');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toContain('EXPLORE → COMPLETE');
      expect(updates[0].message).toContain('Task finished');
      expect(updates[0].category).toBe('agent');
      
      unsubscribe();
    });

    test('should handle multiple phase transitions', () => {
      reporter.updatePhase('COMPLETE');
      reporter.updatePhase('EXPLORE', 'Restarting analysis');
      
      const state = reporter.getCurrentState();
      expect(state.phase).toBe('EXPLORE');
    });
  });

  describe('Iteration Tracking', () => {
    test('should update iteration and activity', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.updateIteration(3, 'Analyzing project structure');
      
      const state = reporter.getCurrentState();
      expect(state.currentIteration).toBe(3);
      expect(state.currentActivity).toBe('Analyzing project structure');
      expect(reporter.getProgress()).toBe(30);
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toContain('Iteration 3');
      expect(updates[0].message).toContain('Analyzing project structure');
      expect(updates[0].progress).toBe(30);
      
      unsubscribe();
    });
  });

  describe('Tool Execution Tracking', () => {
    test('should track successful tool execution', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.reportToolExecution('get_project_tree', startTime, true);
      
      const state = reporter.getCurrentState();
      expect(state.toolsExecuted).toContain('get_project_tree');
      expect(state.errorsEncountered).toBe(0);
      expect(state.currentActivity).toContain('✅ Completed get_project_tree');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toContain('✅ Tool get_project_tree completed');
      expect(updates[0].category).toBe('tool');
      
      unsubscribe();
    });

    test('should track failed tool execution', () => {
      const startTime = Date.now() - 500; // 0.5 seconds ago
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.reportToolExecution('invalid_tool', startTime, false, 'Tool not found');
      
      const state = reporter.getCurrentState();
      expect(state.toolsExecuted).not.toContain('invalid_tool');
      expect(state.errorsEncountered).toBe(1);
      expect(state.currentActivity).toContain('❌ Failed invalid_tool');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toContain('❌ Tool invalid_tool failed');
      expect(updates[0].message).toContain('Tool not found');
      expect(updates[0].category).toBe('tool');
      
      unsubscribe();
    });

    test('should track multiple tool executions', () => {
      const startTime = Date.now();
      
      reporter.reportToolExecution('read_files', startTime, true);
      reporter.reportToolExecution('write_files', startTime, true);
      reporter.reportToolExecution('run_command', startTime, false, 'Command failed');
      
      const state = reporter.getCurrentState();
      expect(state.toolsExecuted).toHaveLength(2);
      expect(state.toolsExecuted).toContain('read_files');
      expect(state.toolsExecuted).toContain('write_files');
      expect(state.errorsEncountered).toBe(1);
    });
  });

  describe('Streaming and API Tracking', () => {
    test('should track streaming progress', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.reportStreamingProgress('thinking', 1500, 30000, 'Processing complex request');
      
      const state = reporter.getCurrentState();
      expect(state.tokensUsed).toBe(1500);
      expect(state.currentActivity).toBe('🌊 Streaming thinking: Processing complex request');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toContain('Streaming thinking - 1500 tokens in 30s');
      expect(updates[0].category).toBe('streaming');
      
      unsubscribe();
    });

    test('should track API calls', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.reportApiCall('claude-sonnet-4-20250514', 1000, 500, 200, 2500);
      
      const state = reporter.getCurrentState();
      expect(state.tokensUsed).toBe(1700); // 1000 + 500 + 200
      expect(state.currentActivity).toContain('🤖 API call completed - 1700 tokens');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toBe('Claude API call: 1700 tokens in 2500ms');
      expect(updates[0].category).toBe('api');
      
      unsubscribe();
    });
  });

  describe('Error Reporting', () => {
    test('should report and track errors', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      const error = new Error('Test error message');
      reporter.reportError(error, 'tool execution');
      
      const state = reporter.getCurrentState();
      expect(state.errorsEncountered).toBe(1);
      expect(state.currentActivity).toBe('❌ Error: Test error message');
      
      expect(updates).toHaveLength(1);
      expect(updates[0].message).toBe('Error in tool execution: Test error message');
      expect(updates[0].category).toBe('error');
      
      unsubscribe();
    });

    test('should report errors without context', () => {
      const error = new Error('Generic error');
      reporter.reportError(error);
      
      const state = reporter.getCurrentState();
      expect(state.errorsEncountered).toBe(1);
    });
  });

  describe('Status Display', () => {
    test('should display current status', () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (message: string) => logs.push(message);
      
      reporter.updateIteration(5, 'Halfway through');
      reporter.reportToolExecution('test_tool', Date.now() - 1000, true);
      
      reporter.displayCurrentStatus();
      
      // Restore console.log
      console.log = originalLog;
      
      expect(logs.length).toBeGreaterThan(5); // Should have multiple status lines
      expect(logs.some(log => log.includes('Agent Status Report'))).toBe(true);
      expect(logs.some(log => log.includes('Progress: 50%'))).toBe(true);
      expect(logs.some(log => log.includes('Tools: 1 executed'))).toBe(true);
    });

    test('should display detailed status with tool breakdown', () => {
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (message: string) => logs.push(message);
      
      // Execute multiple tools
      reporter.reportToolExecution('read_files', Date.now(), true);
      reporter.reportToolExecution('write_files', Date.now(), true);
      reporter.reportToolExecution('read_files', Date.now(), true); // Duplicate
      
      reporter.displayDetailedStatus();
      
      console.log = originalLog;
      
      expect(logs.some(log => log.includes('Tools Executed:'))).toBe(true);
      expect(logs.some(log => log.includes('read_files: 2x'))).toBe(true);
      expect(logs.some(log => log.includes('write_files: 1x'))).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    test('should handle multiple subscribers', () => {
      const updates1: ProgressUpdate[] = [];
      const updates2: ProgressUpdate[] = [];
      
      const unsubscribe1 = reporter.onUpdate(update => updates1.push(update));
      const unsubscribe2 = reporter.onUpdate(update => updates2.push(update));
      
      reporter.updateIteration(1, 'Test iteration');
      
      expect(updates1).toHaveLength(1);
      expect(updates2).toHaveLength(1);
      expect(updates1[0].message).toBe(updates2[0].message);
      
      unsubscribe1();
      reporter.updateIteration(2, 'Second iteration');
      
      expect(updates1).toHaveLength(1); // Should not receive more updates
      expect(updates2).toHaveLength(2); // Should continue receiving updates
      
      unsubscribe2();
    });

    test('should handle subscriber errors gracefully', () => {
      const goodUpdates: ProgressUpdate[] = [];
      
      // Add a subscriber that throws an error
      const unsubscribe1 = reporter.onUpdate(() => {
        throw new Error('Subscriber error');
      });
      
      // Add a good subscriber
      const unsubscribe2 = reporter.onUpdate(update => goodUpdates.push(update));
      
      // Should not throw even with bad subscriber
      expect(() => {
        reporter.updateIteration(1, 'Test');
      }).not.toThrow();
      
      // Good subscriber should still receive updates
      expect(goodUpdates).toHaveLength(1);
      
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Stuck Detection', () => {
    test('should detect when agent is stuck', () => {
      expect(reporter.isStuck()).toBe(false);
      
      // Manually set last update to be old
      const state = reporter.getCurrentState();
      (reporter as any).state.lastUpdate = Date.now() - 70000; // 70 seconds ago
      
      expect(reporter.isStuck()).toBe(true);
    });

    test('should reset stuck status on activity', () => {
      // Make it appear stuck
      (reporter as any).state.lastUpdate = Date.now() - 70000;
      expect(reporter.isStuck()).toBe(true);
      
      // Update activity
      reporter.updateIteration(1, 'New activity');
      expect(reporter.isStuck()).toBe(false);
    });
  });

  describe('Final Summary', () => {
    test('should provide comprehensive final summary', () => {
      // Simulate some activity
      reporter.updateIteration(8, 'Near completion');
      reporter.reportToolExecution('tool1', Date.now() - 1000, true);
      reporter.reportToolExecution('tool2', Date.now() - 500, true);
      reporter.reportToolExecution('tool3', Date.now() - 200, false, 'Failed');
      reporter.reportApiCall('claude-sonnet-4-20250514', 1000, 500, 200, 2000);
      
      // Wait a bit for time to elapse
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Small delay
      }
      
      const summary = reporter.getFinalSummary();
      
      expect(summary.totalIterations).toBe(8);
      expect(summary.totalTokens).toBe(1700); // 1000 + 500 + 200
      expect(summary.toolsExecuted).toBe(2); // Only successful tools
      expect(summary.errorsEncountered).toBe(1);
      expect(summary.phase).toBe('EXPLORE');
      expect(summary.totalTime).toBeGreaterThan(0);
      expect(summary.averageIterationTime).toBeGreaterThan(0);
    });

    test('should handle zero iterations gracefully', () => {
      const summary = reporter.getFinalSummary();
      
      expect(summary.totalIterations).toBe(0);
      expect(summary.averageIterationTime).toBe(0);
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources on destroy', () => {
      const updates: ProgressUpdate[] = [];
      const unsubscribe = reporter.onUpdate(update => updates.push(update));
      
      reporter.destroy();
      
      // Should not receive updates after destroy
      reporter.updateIteration(1, 'Should not be received');
      expect(updates).toHaveLength(0);
      
      // Unsubscribe should still work
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Time Estimation', () => {
    test('should estimate time remaining based on progress', (done) => {
      // Complete some iterations to enable time estimation
      reporter.updateIteration(2, 'First iteration');
      
      setTimeout(() => {
        reporter.updateIteration(4, 'Second iteration');
        
        const state = reporter.getCurrentState();
        // Should have some elapsed time for calculation
        expect(state.elapsedTime).toBeGreaterThan(0);
        
        done();
      }, 50);
    });
  });
});