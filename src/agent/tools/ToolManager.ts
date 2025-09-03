/**
 * keen Agent Tools - Tool Manager with Authentication and Phase 3.3 Recursive Agent Support
 * Enhanced with user context support for database operations and recursive agent spawning
 * UPDATED: Added Phase 3.3 recursive spawning tools and AgentTreeManager integration
 * UPDATED: Removed WebSearchTool - web search is now handled by Anthropic API directly
 */

import { ToolManagerOptions, ToolSchema, ToolResult, AgentExecutionContext } from '../types.js';
import { UserContext } from '../../database/DatabaseManager.js';
import { AgentTreeManager } from '../AgentTreeManager.js';
import { GetProjectTreeTool } from './GetProjectTreeTool.js';
import { ReadFilesTool } from './ReadFilesTool.js';
import { WriteFilesTool } from './WriteFilesTool.js';
import { RunCommandTool } from './RunCommandTool.js';
// REMOVED: import { WebSearchTool } from './WebSearchTool.js'; - Web search now handled by Anthropic API
import { GitTool } from './GitTool.js';
import { ReportPhaseTool } from './ReportPhaseTool.js';
import { ContinueWorkTool } from './ContinueWorkTool.js';
import { ReportCompleteTool } from './ReportCompleteTool.js';
import { ValidateProjectTool } from './ValidateProjectTool.js';
// 🌟 NEW: Phase 3.3 recursive spawning tools
import { SummonAgentTool } from './SummonAgentTool.js';
import { CoordinateAgentsTool } from './CoordinateAgentsTool.js';
import { GetAgentStatusTool } from './GetAgentStatusTool.js';
import chalk from 'chalk';

export class ToolManager {
  private tools: Map<string, any> = new Map();
  private options: ToolManagerOptions;
  // 🎯 NEW: User context for authenticated operations
  private userContext?: UserContext;
  // 🌟 NEW: Agent tree manager for recursive spawning
  private agentTreeManager?: AgentTreeManager;
  
  constructor(options: ToolManagerOptions) {
    this.options = options;
    this.userContext = options.userContext;
    this.agentTreeManager = options.agentTreeManager;
    this.initializeTools();
  }
  
  /**
   * Initialize all available tools with user context and Phase 3.3 support
   * UPDATED: Added Phase 3.3 recursive spawning tools
   * UPDATED: Web search is no longer a local tool - it's handled by Anthropic API directly
   */
  private initializeTools(): void {
    // Foundation Tools
    this.tools.set('get_project_tree', new GetProjectTreeTool());
    this.tools.set('read_files', new ReadFilesTool());
    this.tools.set('write_files', new WriteFilesTool());
    this.tools.set('run_command', new RunCommandTool());
    
    // Web & Information Tools
    // REMOVED: Web search tool - now handled by Anthropic API directly
    // The agents will configure web search as part of their Claude API calls
    
    // Git Tools
    this.tools.set('git', new GitTool());
    
    // Validation Tools (with database integration)
    this.tools.set('validate_project', new ValidateProjectTool());
    
    // Autonomy Tools (may need database access for logging)
    this.tools.set('report_phase', new ReportPhaseTool());
    this.tools.set('continue_work', new ContinueWorkTool());
    this.tools.set('report_complete', new ReportCompleteTool());
    
    // 🌟 NEW: Phase 3.3 Recursive Agent Spawning Tools
    if (this.agentTreeManager) {
      this.tools.set('summon_agent', new SummonAgentTool());
      this.tools.set('coordinate_agents', new CoordinateAgentsTool());
      this.tools.set('get_agent_status', new GetAgentStatusTool());
      
      if (this.options.debug) {
        console.log(chalk.green('🌟 Phase 3.3 recursive spawning tools enabled'));
      }
    } else if (this.options.debug) {
      console.log(chalk.yellow('⚠️  Phase 3.3 tools disabled - AgentTreeManager not provided'));
    }
    
    if (this.options.debug) {
      const authInfo = this.userContext ? 
        `(authenticated as ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? ' - Admin' : ''})` : 
        '(no user context)';
      const webSearchNote = this.options.enableWebSearch ? ' + Anthropic web search' : '';
      const treeManagerNote = this.agentTreeManager ? ' + recursive spawning' : '';
      console.log(chalk.gray(`Initialized ${this.tools.size} local tools${webSearchNote}${treeManagerNote} ${authInfo}`));
    }
  }
  
  /**
   * Set agent tree manager (for late initialization)
   */
  setAgentTreeManager(agentTreeManager: AgentTreeManager): void {
    this.agentTreeManager = agentTreeManager;
    this.options.agentTreeManager = agentTreeManager;
    
    // Add Phase 3.3 tools if not already present
    if (!this.tools.has('summon_agent')) {
      this.tools.set('summon_agent', new SummonAgentTool());
      this.tools.set('coordinate_agents', new CoordinateAgentsTool());
      this.tools.set('get_agent_status', new GetAgentStatusTool());
      
      if (this.options.debug) {
        console.log(chalk.green('🌟 Phase 3.3 recursive spawning tools enabled (late initialization)'));
      }
    }
  }
  
  /**
   * Get all tool schemas for Claude
   * NOTE: Web search is not included here as it's handled by Anthropic API directly
   */
  getToolSchemas(): ToolSchema[] {
    const schemas: ToolSchema[] = [];
    
    for (const [name, tool] of this.tools) {
      schemas.push({
        name,
        description: tool.getDescription(),
        input_schema: tool.getInputSchema()
      });
    }
    
    return schemas;
  }
  
  /**
   * Get tool descriptions for system prompt
   * UPDATED: Includes note about web search being available through Anthropic API
   * UPDATED: Includes Phase 3.3 recursive spawning capabilities
   */
  getToolDescriptions(): { name: string; description: string }[] {
    const descriptions: { name: string; description: string }[] = [];
    
    for (const [name, tool] of this.tools) {
      descriptions.push({
        name,
        description: tool.getDescription()
      });
    }
    
    // Add note about web search if enabled
    if (this.options.enableWebSearch) {
      descriptions.push({
        name: 'web_search',
        description: 'Search the web for current information, documentation, best practices, and troubleshooting guidance (handled by Anthropic API)'
      });
    }
    
    return descriptions;
  }
  
  /**
   * Execute a tool with user context and Phase 3.3 support
   */
  async executeTool(
    toolName: string, 
    parameters: any, 
    context: AgentExecutionContext
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      // Special case: web search is no longer a local tool
      if (toolName === 'web_search') {
        throw new Error('web_search is no longer a local tool. It\'s handled by the Anthropic API directly. Claude will automatically use it when needed.');
      }
      
      // Special case: Phase 3.3 tools require AgentTreeManager
      const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
      if (phase33Tools.includes(toolName)) {
        throw new Error(
          `${toolName} is a Phase 3.3 recursive spawning tool that requires AgentTreeManager. ` +
          'Please ensure the agent session is initialized with recursive spawning support.'
        );
      }
      
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    if (this.options.debug) {
      console.log(chalk.blue(`🔧 Executing tool: ${toolName}`));
      console.log(chalk.gray(`Parameters: ${JSON.stringify(parameters, null, 2)}`));
      
      if (this.userContext) {
        console.log(chalk.gray(`User Context: ${this.userContext.userId.substring(0, 8)}...${this.userContext.isAdmin ? ' (Admin)' : ''}`));
      }
      
      // Log Phase 3.3 context
      const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
      if (phase33Tools.includes(toolName)) {
        console.log(chalk.green(`🌟 Phase 3.3 recursive tool execution`));
        console.log(chalk.gray(`Session: ${context.sessionId}`));
        console.log(chalk.gray(`Parent: ${context.parentSessionId || 'none'}`));
        console.log(chalk.gray(`Specialization: ${context.specialization || 'general'}`));
      }
    }
    
    try {
      const startTime = Date.now();
      
      // 🎯 Enhanced execution context with user authentication and Phase 3.3 support
      const enhancedContext = {
        ...context,
        toolManagerOptions: {
          ...this.options,
          agentTreeManager: this.agentTreeManager // Ensure tree manager is available
        },
        userContext: this.userContext, // Pass user context to tools
      };
      
      const result = await tool.execute(parameters, enhancedContext);
      const duration = Date.now() - startTime;
      
      if (this.options.debug) {
        console.log(chalk.green(`✅ Tool ${toolName} completed in ${duration}ms`));
        
        // Log Phase 3.3 results
        const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
        if (phase33Tools.includes(toolName) && result.spawnResult) {
          console.log(chalk.green(`🌟 Spawn result: ${result.spawnResult.success ? 'success' : 'failed'}`));
          if (result.spawnResult.childSessionId) {
            console.log(chalk.gray(`Child ID: ${result.spawnResult.childSessionId}`));
          }
        }
      }
      
      return result;
    } catch (error: any) {
      console.error(chalk.red(`❌ Tool ${toolName} failed: ${error.message}`));
      
      // Enhanced error logging with user context and Phase 3.3 info
      if (this.userContext && this.options.debug) {
        console.error(chalk.gray(`User: ${this.userContext.userId.substring(0, 8)}..., Admin: ${this.userContext.isAdmin}`));
      }
      
      // Log Phase 3.3 specific errors
      const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
      if (phase33Tools.includes(toolName)) {
        console.error(chalk.red(`🌟 Phase 3.3 tool error in ${toolName}`));
        if (!this.agentTreeManager) {
          console.error(chalk.red(`  - AgentTreeManager not available`));
        }
        if (error.message.includes('sequential')) {
          console.error(chalk.red(`  - Sequential execution constraint violation`));
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Check if a tool is available
   * UPDATED: web_search is considered available if enabled in options
   * UPDATED: Phase 3.3 tools are available if AgentTreeManager is present
   */
  hasTool(toolName: string): boolean {
    if (toolName === 'web_search') {
      return this.options.enableWebSearch || false;
    }
    
    // Phase 3.3 tools require AgentTreeManager
    const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
    if (phase33Tools.includes(toolName)) {
      return !!this.agentTreeManager && this.tools.has(toolName);
    }
    
    return this.tools.has(toolName);
  }
  
  /**
   * Get list of available tool names
   * UPDATED: includes web_search if enabled and Phase 3.3 tools if AgentTreeManager is available
   */
  getAvailableTools(): string[] {
    const tools = Array.from(this.tools.keys());
    
    if (this.options.enableWebSearch) {
      tools.push('web_search');
    }
    
    return tools;
  }
  
  /**
   * Validate tool parameters against schema
   */
  validateToolParameters(toolName: string, parameters: any): { valid: boolean; errors: string[] } {
    // Special case: web search validation
    if (toolName === 'web_search') {
      if (!this.options.enableWebSearch) {
        return { valid: false, errors: ['Web search is not enabled'] };
      }
      // Web search parameters are validated by Anthropic API
      return { valid: true, errors: [] };
    }
    
    // Special case: Phase 3.3 tools validation
    const phase33Tools = ['summon_agent', 'coordinate_agents', 'get_agent_status'];
    if (phase33Tools.includes(toolName)) {
      if (!this.agentTreeManager) {
        return { 
          valid: false, 
          errors: [`${toolName} requires AgentTreeManager (Phase 3.3 recursive spawning not enabled)`] 
        };
      }
    }
    
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${toolName}`] };
    }
    
    // Basic validation - in a full implementation, this would use JSON schema validation
    const schema = tool.getInputSchema();
    const errors: string[] = [];
    
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in parameters)) {
          errors.push(`Missing required parameter: ${requiredField}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if validation tools are available
   */
  hasValidationCapabilities(): boolean {
    return this.hasTool('validate_project');
  }
  
  /**
   * Get validation-related tools
   */
  getValidationTools(): string[] {
    return this.getAvailableTools().filter(tool => 
      tool.includes('validate') || tool.includes('validation')
    );
  }
  
  /**
   * 🌟 NEW: Check if Phase 3.3 recursive spawning is enabled
   */
  hasRecursiveSpawning(): boolean {
    return !!this.agentTreeManager && 
           this.hasTool('summon_agent') && 
           this.hasTool('coordinate_agents') && 
           this.hasTool('get_agent_status');
  }
  
  /**
   * 🌟 NEW: Get Phase 3.3 recursive spawning tools
   */
  getRecursiveSpawningTools(): string[] {
    if (!this.hasRecursiveSpawning()) {
      return [];
    }
    
    return ['summon_agent', 'coordinate_agents', 'get_agent_status'];
  }
  
  /**
   * 🎯 NEW: Check if user has admin privileges
   */
  isAdminUser(): boolean {
    return this.userContext?.isAdmin || false;
  }
  
  /**
   * 🎯 NEW: Get current user context
   */
  getUserContext(): UserContext | undefined {
    return this.userContext;
  }
  
  /**
   * 🎯 NEW: Get user ID (safely)
   */
  getUserId(): string | undefined {
    return this.userContext?.userId;
  }
  
  /**
   * 🎯 NEW: Check authentication status
   */
  isAuthenticated(): boolean {
    return !!this.userContext?.userId;
  }
  
  /**
   * 🎯 NEW: Get authentication summary for logging
   */
  getAuthenticationSummary(): { authenticated: boolean; userId?: string; isAdmin: boolean } {
    return {
      authenticated: this.isAuthenticated(),
      userId: this.userContext?.userId?.substring(0, 8) + '...',
      isAdmin: this.isAdminUser()
    };
  }
  
  /**
   * 🎯 NEW: Check if web search is enabled
   */
  isWebSearchEnabled(): boolean {
    return this.options.enableWebSearch || false;
  }
  
  /**
   * 🎯 NEW: Get web search configuration for Anthropic API
   */
  getWebSearchConfig(): any | null {
    if (!this.options.enableWebSearch) {
      return null;
    }
    
    // Return the web search tool configuration for Anthropic API
    return {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5, // Reasonable default to prevent excessive usage
    };
  }
  
  /**
   * 🌟 NEW: Get current agent tree manager
   */
  getAgentTreeManager(): AgentTreeManager | undefined {
    return this.agentTreeManager;
  }
  
  /**
   * 🌟 NEW: Get Phase 3.3 capabilities summary
   */
  getPhase33Capabilities(): {
    enabled: boolean;
    tools: string[];
    hasTreeManager: boolean;
    canSpawn: boolean;
  } {
    return {
      enabled: this.hasRecursiveSpawning(),
      tools: this.getRecursiveSpawningTools(),
      hasTreeManager: !!this.agentTreeManager,
      canSpawn: !!this.agentTreeManager
    };
  }
}
