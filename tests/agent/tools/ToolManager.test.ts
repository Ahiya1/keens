/**
 * ToolManager Comprehensive Tests
 * Tests tool registration, execution, validation, and error handling
 */

import { ToolManager } from '../../../src/agent/tools/ToolManager.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { ProgressReporter } from '../../../src/utils/ProgressReporter.js';

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockLogger: Logger;
  let mockProgress: ProgressReporter;

  beforeEach(() => {
    mockLogger = new Logger({ level: LogLevel.ERROR, writeToFile: false });
    mockProgress = new ProgressReporter('test_session', 10, false, false);
    toolManager = new ToolManager(mockLogger, mockProgress);
  });

  afterEach(() => {
    mockProgress.destroy();
  });

  describe('Tool Registration', () => {
    test('should register all default tools', () => {
      expect(toolManager.getAvailableTools().length).toBeGreaterThan(10);
      
      const toolNames = toolManager.getAvailableTools().map(tool => tool.name);
      expect(toolNames).toContain('get_project_tree');
      expect(toolNames).toContain('read_files');
      expect(toolNames).toContain('write_files');
      expect(toolNames).toContain('run_command');
      expect(toolNames).toContain('git');
    });

    test('should get tool by name', () => {
      const tool = toolManager.getTool('get_project_tree');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('get_project_tree');
    });

    test('should return undefined for non-existent tool', () => {
      const tool = toolManager.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });

    test('should validate tool schemas', () => {
      const tools = toolManager.getAvailableTools();
      tools.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      });
    });
  });

  describe('Tool Execution', () => {
    test('should execute get_project_tree tool', async () => {
      const result = await toolManager.executeTool('get_project_tree', {
        maxDepth: 2,
        includeHidden: false
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('object');
    });

    test('should execute read_files tool', async () => {
      const result = await toolManager.executeTool('read_files', {
        paths: ['package.json']
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    test('should handle tool execution errors', async () => {
      const result = await toolManager.executeTool('read_files', {
        paths: ['/non/existent/file.txt']
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate tool parameters', async () => {
      const result = await toolManager.executeTool('get_project_tree', {
        maxDepth: 'invalid', // Should be number
        includeHidden: 'not_boolean' // Should be boolean
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
    });

    test('should reject unknown tools', async () => {
      const result = await toolManager.executeTool('unknown_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });

  describe('Tool Performance', () => {
    test('should track tool execution time', async () => {
      const startTime = Date.now();
      const result = await toolManager.executeTool('get_project_tree', {
        maxDepth: 1
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.duration).toBeDefined();
      expect(result.duration!).toBeGreaterThan(0);
      expect(result.duration!).toBeLessThan(endTime - startTime + 100); // Some buffer
    });

    test('should handle concurrent tool executions', async () => {
      const promises = [
        toolManager.executeTool('get_project_tree', { maxDepth: 1 }),
        toolManager.executeTool('get_project_tree', { maxDepth: 1 }),
        toolManager.executeTool('get_project_tree', { maxDepth: 1 })
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Tool Categories', () => {
    test('should categorize file system tools', () => {
      const fileTools = toolManager.getAvailableTools()
        .filter(tool => ['get_project_tree', 'read_files', 'write_files'].includes(tool.name));
      
      expect(fileTools.length).toBe(3);
    });

    test('should categorize execution tools', () => {
      const execTools = toolManager.getAvailableTools()
        .filter(tool => ['run_command', 'git'].includes(tool.name));
      
      expect(execTools.length).toBe(2);
    });

    test('should categorize agent management tools', () => {
      const agentTools = toolManager.getAvailableTools()
        .filter(tool => [
          'report_phase', 'report_complete', 'continue_work',
          'summon_agent', 'coordinate_agents'
        ].includes(tool.name));
      
      expect(agentTools.length).toBe(5);
    });
  });

  describe('Error Recovery', () => {
    test('should continue after tool failure', async () => {
      // Execute a failing tool
      const failResult = await toolManager.executeTool('run_command', {
        command: 'nonexistent_command_12345'
      });
      expect(failResult.success).toBe(false);

      // Should still work after failure
      const successResult = await toolManager.executeTool('get_project_tree', {
        maxDepth: 1
      });
      expect(successResult.success).toBe(true);
    });

    test('should handle malformed parameters gracefully', async () => {
      const result = await toolManager.executeTool('write_files', {
        files: 'not_an_array' // Should be array
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Tool Documentation', () => {
    test('should provide tool descriptions', () => {
      const tools = toolManager.getAvailableTools();
      
      tools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description).not.toContain('TODO');
      });
    });

    test('should provide parameter schemas', () => {
      const tool = toolManager.getTool('write_files');
      
      expect(tool?.input_schema.properties).toBeDefined();
      expect(tool?.input_schema.required).toBeDefined();
      expect(Array.isArray(tool?.input_schema.required)).toBe(true);
    });
  });
});
