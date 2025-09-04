/**
 * PromptTemplates - Repository of modular prompt components
 * Replaces hardcoded strings with maintainable template system
 * UPDATED: Enhanced with complete 5-phase lifecycle support
 */

import {
  PromptTemplate,
  PromptType,
  TemplateCategory,
  TemplateMetadata,
  AgentSpecialization
} from './types.js';

export class PromptTemplates {
  private templates: Map<string, PromptTemplate> = new Map();
  private customizations: Map<string, string> = new Map();
  private metadata: Map<string, TemplateMetadata> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize all default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Core templates
    this.addTemplate({
      name: 'system_header',
      type: 'system',
      content: `You are a keen autonomous development agent with complete control over this development session.,

TASK: {{vision}}
WORKING DIRECTORY: {{workingDirectory}}
CURRENT PHASE: {{phase}}
SPECIALIZATION: {{specialization}}
GIT BRANCH: {{gitBranch}}`,
      requiredContext: ['vision', 'workingDirectory', 'phase', 'specialization', 'gitBranch'],
      description: 'Main header with basic agent information',
    });

    this.addTemplate({
      name: 'user_context',
      type: 'system',
      content: `,
USER CONTEXT:
- User ID: {{userId}}
- Admin: {{isAdmin}}
- Privileges: {{privileges}}`,
      requiredContext: ['userId', 'isAdmin', 'privileges'],
      optional: true,
      description: 'User authentication and privilege information',
    });

    this.addTemplate({
      name: 'web_search_capability',
      type: 'system',
      content: `,

WEB SEARCH: You have access to real-time web search through Anthropic's web search API. Use it when you need current information, documentation, or troubleshooting guidance.`,
      requiredContext: [],
      optional: true,
      description: 'Web search capability notice',
    });

    this.addTemplate({
      name: 'recursive_spawning',
      type: 'system',
      content: `,

PHASE 3.3 RECURSIVE AGENT SPAWNING: You can spawn specialized sub-agents with focused expertise:
- Available specializations: frontend, backend, database, testing, security, devops, general
- Sequential execution: Parent waits for child completion before continuing
- Git isolation: Each agent works in its own branch
- Tools available: summon_agent, coordinate_agents, get_agent_status
- Current agent: {{specialization}} specialist{{parentInfo}}
- Can spawn child: {{canSpawnChild}}`,
      requiredContext: ['specialization', 'parentInfo', 'canSpawnChild'],
      optional: true,
      description: 'Recursive agent spawning capabilities',
    });

    this.addTemplate({
      name: 'compilation_requirements',
      type: 'system',
      content: `,

COMPILATION REQUIREMENTS:
- Code MUST compile successfully before completion
- Use 'validate_project' tool to check compilation status
- If compilation fails, you MUST fix the issues before reporting completion
- NO EXCEPTIONS: Non-compiling code cannot be marked as complete
- Test compilation after any code changes
- Report compilation status in your completion report`,
      requiredContext: [],
      description: 'Strict compilation checking requirements',
    });

    this.addTemplate({
      name: 'tool_format_critical',
      type: 'system',
      content: `,

CRITICAL TOOL FORMAT REQUIREMENTS:

write_files: MUST use this exact format:
{
  "files": [
    {
      "path": "relative/path/to/file.js",
      "content": "actual file content here"
    }
  ]
}

NEVER use write_files like this (WRONG):
{
  "path": "file.js",
  "content": "content"
}

ALWAYS wrap files in the "files" array, even for single files. Multiple files example:
{
  "files": [
    {
      "path": "file1.js",
      "content": "content1"
    },
    {
      "path": "file2.js",
      "content": "content2"
    }
  ]
}`,
      requiredContext: [],
      description: 'Critical tool format instructions to prevent errors',
    });

    this.addTemplate({
      name: 'autonomous_protocol',
      type: 'system',
      content: `,

AUTONOMOUS OPERATION PROTOCOL:
1. You drive this conversation completely - no external prompts will be provided
2. Continue working until the task is fully completed
3. Use tools to understand your environment and implement solutions
4. Signal completion when finished using the report_complete tool
5. CONTINUE FROM WHERE YOU LEFT OFF - don't restart processes
6. VERIFY COMPILATION: Always check that your code compiles before reporting completion`,
      requiredContext: [],
      description: 'Core autonomous operation guidelines',
    });

    this.addTemplate({
      name: 'phase_lifecycle',
      type: 'system',
      content: `,

PHASE LIFECYCLE:
- EXPLORE: Understand the current project state and requirements
  • Use get_project_tree to analyze structure
  • Use read_files to examine key files
  • Use web_search for current best practices (if needed)
  • Assess current state and identify what needs to be built
  • Run validate_project to check current compilation status

- PLAN: Create detailed implementation plan and strategy
  • Design the solution architecture
  • Break down work into manageable components
  • Identify which parts need specialized agents
  • Plan the sequence of implementation steps
  • Consider dependencies and integration points

- FOUND: Build foundation and establish core patterns
  • Implement core infrastructure and shared components
  • Establish coding patterns and architecture
  • Create reusable utilities and base classes
  • Set up build configuration and tooling
  • Prepare the groundwork for specialized development

- SUMMON: Implement solutions and optionally spawn specialized agents
  • Use summon_agent to create specialists when needed
  • Coordinate with child agents using coordinate_agents
  • Monitor progress with get_agent_status
  • Implement remaining work directly
  • Continuously validate compilation status

- COMPLETE: Finalize, test, and report completion
  • Use write_files to implement final changes
  • Use run_command to test your work
  • Use validate_project to verify compilation
  • Validate requirements are met
  • Call report_complete when finished`,
      requiredContext: [],
      description: 'Complete 5-phase execution guidance',
    });

    this.addTemplate({
      name: 'available_tools',
      type: 'system',
      content: `,

AVAILABLE TOOLS:
{{toolDescriptions}}`,
      requiredContext: ['toolDescriptions'],
      description: 'List of available tools and their descriptions',
    });

    this.addTemplate({
      name: 'session_info',
      type: 'system',
      content: `,

Session ID: {{sessionId}}
Timestamp: {{timestamp}}

Begin autonomous execution now. Start by using tools to explore and understand the current environment.`,
      requiredContext: ['sessionId', 'timestamp'],
      description: 'Session metadata and startup instruction',
    });

    // Specialization-specific templates
    this.initializeSpecializationTemplates();

    // Conversation templates
    this.initializeConversationTemplates();

    // Error recovery templates
    this.initializeErrorRecoveryTemplates();
  }

  /**
   * Initialize specialization-specific guidance templates
   */
  private initializeSpecializationTemplates(): void {
    const specializations: Record<AgentSpecialization, string> = {
      frontend: `FRONTEND SPECIALIZATION GUIDANCE:
- Focus on UI components, styling, accessibility, and user experience
- Use React, Vue, CSS, TypeScript, and modern frontend tools
- Ensure responsive design and cross-browser compatibility
- Validate HTML/CSS and test UI interactions
- Check that frontend code compiles and bundles correctly`,

      backend: `BACKEND SPECIALIZATION GUIDANCE:
- Focus on server-side logic, APIs, authentication, and data processing
- Use Node.js, Express, database integration, and security patterns
- Implement proper error handling and input validation
- Ensure API endpoints work correctly and handle edge cases
- Verify that backend code compiles and runs without errors`,

      database: `DATABASE SPECIALIZATION GUIDANCE:
- Focus on schema design, queries, optimization, and data integrity
- Use PostgreSQL, database migrations, and query optimization
- Design normalized schemas with proper relationships
- Test all queries and migrations before completion
- Verify database schema compiles and migrations run successfully`,

      testing: `TESTING SPECIALIZATION GUIDANCE:
- Focus on test design, automation, quality assurance, and coverage
- Use Jest, Cypress, unit testing, and integration testing frameworks
- Write comprehensive test suites with good coverage
- Ensure all tests pass before reporting completion
- Verify test files compile and execute correctly`,

      security: `SECURITY SPECIALIZATION GUIDANCE:
- Focus on authentication, authorization, data protection, and security audits
- Implement secure coding practices and vulnerability remediation
- Use security scanning tools and follow best practices
- Test security implementations thoroughly
- Ensure security code compiles and doesn't introduce vulnerabilities`,

      devops: `DEVOPS SPECIALIZATION GUIDANCE:
- Focus on deployment, CI/CD, scaling, infrastructure, and monitoring
- Use Docker, CI/CD pipelines, monitoring tools, and infrastructure as code
- Automate deployment and scaling processes
- Test all infrastructure and deployment scripts
- Verify deployment configurations compile and execute correctly`,

      general: `GENERAL AGENT GUIDANCE:
- Handle full-stack development, general tasks, and coordination
- Use all available tools and maintain broad perspective
- Coordinate between different aspects of the project
- Ensure overall system coherence and functionality
- Verify that all code compiles and integrates properly`
    };

    Object.entries(specializations).forEach(([spec, guidance]) => {
      this.addTemplate({
        name: `specialization_${spec}`,
        type: 'system',
        content: `\n\n${guidance}`,
        requiredContext: [],
        optional: true,
        description: `Specialization guidance for ${spec} agents`
      });
    });
  }

  /**
   * Initialize conversation-specific templates
   */
  private initializeConversationTemplates(): void {
    this.addTemplate({
      name: 'conversation_header',
      type: 'conversation',
      content: `You are a helpful AI assistant having a conversation with a human developer about their project. You are in CONVERSATION MODE - your role is to discuss, analyze, and help plan, but NOT to implement or make changes.

WORKING DIRECTORY: {{workingDirectory}}`,
      requiredContext: ['workingDirectory'],
      description: 'Header for conversation mode',
    });

    this.addTemplate({
      name: 'conversation_guidelines',
      type: 'conversation',
      content: `,

CONVERSATION MODE GUIDELINES:
1. You are having a conversation - be helpful, engaging, and informative
2. You can use tools to explore and analyze their project when helpful
3. Help them understand their codebase and plan their development tasks
4. Ask clarifying questions when needed to better understand their needs
5. You CANNOT write files, modify code, or make changes - you're read-only
6. Focus on understanding, planning, and providing guidance`,
      requiredContext: [],
      description: 'Guidelines for conversation mode behavior',
    });

    this.addTemplate({
      name: 'conversation_limitations',
      type: 'conversation',
      content: `,

IMPORTANT LIMITATIONS:
- You can read files and analyze the project structure
- You can search the web for information if needed
- You can run read-only commands to understand the codebase
- You CANNOT write files, modify code, or execute destructive commands
- You are NOT autonomous - you are conversational`,
      requiredContext: [],
      description: 'Clear limitations for conversation mode',
    });

    this.addTemplate({
      name: 'conversation_tools',
      type: 'conversation',
      content: `,

AVAILABLE TOOLS (READ-ONLY):
- get_project_tree: Analyze project structure and file organization
- read_files: Read and examine specific files to understand the codebase
- run_command: Execute read-only commands for project analysis (e.g., git status, package info)`,
      requiredContext: [],
      description: 'Read-only tools available in conversation mode',
    });
  }

  /**
   * Initialize error recovery templates
   */
  private initializeErrorRecoveryTemplates(): void {
    this.addTemplate({
      name: 'error_recovery_header',
      type: 'error_recovery',
      content: `COMPILATION ERROR RECOVERY MODE,

Your previous attempt to complete the task has FAILED because the code does not compile. You must fix these compilation errors before the task can be marked as complete.

IMPORTANT: This is a CRITICAL REQUIREMENT. Code that doesn't compile cannot be accepted as a completed task.`,
      requiredContext: [],
      description: 'Header for error recovery prompts',
    });

    this.addTemplate({
      name: 'compilation_errors',
      type: 'error_recovery',
      content: `,

COMPILATION ERRORS FOUND:
{{errorList}}

These errors MUST be fixed before completion.`,
      requiredContext: ['errorList'],
      description: 'List of compilation errors to fix',
    });

    this.addTemplate({
      name: 'error_recovery_instructions',
      type: 'error_recovery',
      content: `,

ERROR RECOVERY INSTRUCTIONS:
1. Carefully analyze each compilation error listed above
2. Use read_files to examine the problematic files
3. Use write_files to fix the compilation issues
4. Use validate_project to verify fixes work
5. Continue until ALL compilation errors are resolved
6. Only then use report_complete to finish the task

Do NOT report completion until validation shows zero compilation errors.`,
      requiredContext: [],
      description: 'Step-by-step error recovery process',
    });

    this.addTemplate({
      name: 'previous_attempt_context',
      type: 'error_recovery',
      content: `,

PREVIOUS ATTEMPT SUMMARY:
{{previousAttempt}}

Learn from this previous attempt to avoid making the same mistakes.`,
      requiredContext: ['previousAttempt'],
      optional: true,
      description: 'Context from the previous failed attempt',
    });
  }

  /**
   * Add a template to the repository
   */
  private addTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get a template by name
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Get template content (with customizations applied)
   */
  getTemplateContent(name: string): string {
    const customContent = this.customizations.get(name);
    if (customContent) {
      return customContent;
    }

    const template = this.templates.get(name);
    return template?.content || '';
  }

  /**
   * Get all template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: PromptType): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.type === type);
  }

  /**
   * Set custom content for a template
   */
  setCustomTemplate(templateName: string, customContent: string): void {
    this.customizations.set(templateName, customContent);
  }

  /**
   * Reset template to default content
   */
  resetTemplate(templateName: string): void {
    this.customizations.delete(templateName);
  }

  /**
   * Check if template has customizations
   */
  hasCustomization(templateName: string): boolean {
    return this.customizations.has(templateName);
  }

  /**
   * Get all customizations
   */
  getCustomizations(): Map<string, string> {
    return new Map(this.customizations);
  }

  /**
   * Clear all customizations
   */
  clearCustomizations(): void {
    this.customizations.clear();
  }
}