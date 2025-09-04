/**
 * keen manifest Command - Create Vision Files
 * Interactive command to create vision files in markdown format for breathe execution
 */

import { Command } from "commander";
import chalk from "chalk";
import readline from "readline";
import { promises as fs } from "fs";
import path from "path";
import { cliAuth } from "../auth/CLIAuthManager.js";
import { ConversationAgent, ConversationOptions } from "../../agent/ConversationAgent.js";

export class ManifestCommand {
  constructor(program: Command) {
    program
      .command("manifest")
      .argument(
        "[description]",
        "Brief description of what you want to build (or use interactive mode)"
      )
      .description(
        "📜 Create vision files for autonomous execution (requires login)"
      )
      .option(
        "--directory <dir>",
        "Working directory for the vision file",
        process.cwd()
      )
      .option(
        "--output <file>",
        "Output filename for the vision file (default: vision-<timestamp>.md)"
      )
      .option(
        "--interactive",
        "Use interactive mode with Claude assistance",
        false
      )
      .option(
        "--verbose",
        "Enable verbose output with thinking blocks"
      )
      .option(
        "--debug",
        "Enable debug logging"
      )
      .action(async (description: string | undefined, options: any, command: Command) => {
        try {
          // 🔑 AUTHENTICATION REQUIRED
          let userContext;
          try {
            // Ensure auth manager is initialized before checking auth
            await cliAuth.initialize();
            userContext = await cliAuth.requireAuth();
          } catch (authError: any) {
            console.error(chalk.red("❌ " + authError.message));
            process.exit(1);
          }

          const currentUser = cliAuth.getCurrentUser();
          console.log(chalk.blue("\n📜 Vision File Creator - Autonomous Development"));
          if (currentUser) {
            console.log(chalk.gray(`👤 User: ${currentUser.email || 'Unknown'}`));
            if (currentUser.isAdmin) {
              console.log(chalk.green("🔧 Admin mode: Enhanced capabilities enabled"));
            }
          }

          if (description && !options.interactive) {
            // Direct mode - create vision from description
            await this.createDirectVision(description, options, userContext);
          } else {
            // Interactive mode with Claude assistance
            await this.createInteractiveVision(options, userContext, description);
          }
        } catch (error: any) {
          console.error(chalk.red("❌ Manifest creation error: " + error.message));
          
          if (error.message.includes('Authentication required')) {
            console.error(chalk.yellow("💡 Hint: Run 'keen login' to authenticate first"));
          }
          
          process.exit(1);
        }
      })
      .addHelpText(
        "after",
        `
🔑 Authentication Required:
  This command requires authentication. Run 'keen login' first.

📝 Examples:
  keen manifest                                    # Interactive mode with Claude
  keen manifest "Create a React todo app"          # Direct mode
  keen manifest --interactive --verbose            # Interactive with verbose output
  keen manifest "API server" --output api-vision.md  # Custom output file

📋 Output:
  • Creates markdown vision files suitable for 'keen breathe -f'
  • Files include timestamp, user context, and execution notes
  • Automatically suggests next steps with breathe command

📊 User Context:
  • Vision files are tagged with your user information
  • Admin users get enhanced vision creation capabilities
  • All manifests are optimized for autonomous execution`
      );
  }

  /**
   * Create vision directly from description
   */
  private async createDirectVision(
    description: string,
    options: any,
    userContext: any,
  ): Promise<void> {
    console.log(chalk.blue("🎯 Creating vision from description..."));
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const filename = options.output || `vision-${timestamp}.md`;
    const filepath = path.resolve(options.directory, filename);

    // Create enhanced vision content
    const visionContent = await this.createEnhancedVisionContent(
      description,
      options.directory,
      userContext,
      'direct'
    );

    // Write the file
    await fs.writeFile(filepath, visionContent, "utf-8");
    console.log(chalk.green(`✅ Vision file created: ${filename}`));
    
    this.showNextSteps(filename);
  }

  /**
   * Create vision interactively with Claude assistance
   */
  private async createInteractiveVision(
    options: any,
    userContext: any,
    initialDescription?: string
  ): Promise<void> {
    console.log(chalk.blue("🤖 Starting interactive vision creation with Claude..."));
    console.log(chalk.gray("Type 'help' for commands, 'done' to finalize, or 'exit' to quit"));

    // Initialize ConversationAgent
    const conversationOptions: ConversationOptions = {
      workingDirectory: options.directory,
      userContext: userContext,
      verbose: options.verbose,
      debug: options.debug,
      enableWebSearch: true,
    };

    const agent = new ConversationAgent(conversationOptions);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("You: "),
    });

    // Start with initial message
    let introMessage = "I want to create a vision file for autonomous development.";
    if (initialDescription) {
      introMessage += ` I'm thinking about: ${initialDescription}`;
    }
    introMessage += " Can you help me analyze my project and create a comprehensive vision?";

    try {
      console.log(chalk.cyan("\nClaude: Starting vision creation session..."));
      const response = await agent.converse(introMessage);
      
      if (response.thinking && options.verbose) {
        console.log(chalk.gray("\n💭 Claude's thinking:"));
        console.log(chalk.gray(response.thinking));
      }
      
      console.log(chalk.white("\n" + response.response));
    } catch (error: any) {
      console.error(chalk.red("❌ Failed to start conversation: " + error.message));
    }

    rl.prompt();

    rl.on("line", async (input: string) => {
      const userInput = input.trim();

      if (!userInput) {
        rl.prompt();
        return;
      }

      if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
        console.log(chalk.yellow("👋 Exiting interactive mode..."));
        rl.close();
        return;
      }

      if (userInput.toLowerCase() === "done") {
        console.log(chalk.blue("🎯 Finalizing vision creation..."));
        await this.finalizeInteractiveVision(agent, options, userContext);
        rl.close();
        return;
      }

      if (userInput.toLowerCase() === "help") {
        this.showInteractiveHelp();
        rl.prompt();
        return;
      }

      // Continue conversation with Claude
      try {
        const response = await agent.converse(userInput);
        
        if (response.error) {
          console.error(chalk.red("❌ Claude error: " + response.error));
        } else {
          if (response.thinking && options.verbose) {
            console.log(chalk.gray("\n💭 Claude's thinking:"));
            console.log(chalk.gray(response.thinking));
          }
          console.log(chalk.white("\nClaude: " + response.response));
        }
      } catch (error: any) {
        console.error(chalk.red("❌ Conversation error: " + error.message));
      }

      rl.prompt();
    });

    rl.on("close", () => {
      console.log(chalk.gray("\n👋 Interactive session ended"));
      // Exit gracefully
    });
  }

  /**
   * Finalize interactive vision creation
   */
  private async finalizeInteractiveVision(
    agent: ConversationAgent,
    options: any,
    userContext: any,
  ): Promise<void> {
    const history = agent.getConversationHistory();
    if (history.length === 0) {
      console.log(chalk.yellow("⚠️  No conversation to synthesize. Try having a discussion first."));
      return;
    }

    try {
      // Synthesize the conversation into a vision
      const vision = await agent.synthesizeVision();
      
      if (!vision || vision.includes("No conversation to synthesize")) {
        console.log(chalk.yellow("⚠️  Could not create vision from conversation. Try adding more details."));
        return;
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const filename = options.output || `vision-${timestamp}.md`;
      const filepath = path.resolve(options.directory, filename);

      // Create enhanced vision content
      const visionContent = await this.createEnhancedVisionContent(
        vision,
        options.directory,
        userContext,
        'interactive',
        history
      );

      // Write the file
      await fs.writeFile(filepath, visionContent, "utf-8");
      console.log(chalk.green(`✅ Interactive vision file created: ${filename}`));
      
      this.showNextSteps(filename);
    } catch (error: any) {
      console.error(chalk.red("❌ Failed to finalize vision: " + error.message));
    }
  }

  /**
   * Create enhanced vision content with metadata
   */
  private async createEnhancedVisionContent(
    vision: string,
    directory: string,
    userContext: any,
    creationMode: 'direct' | 'interactive',
    conversationHistory?: any[]
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    const projectName = path.basename(directory);
    
    let contextSection = "";
    if (creationMode === 'interactive' && conversationHistory) {
      const userMessages = conversationHistory
        .filter(msg => msg.role === 'user')
        .map(msg => `- ${msg.content}`)
        .slice(0, 5) // Limit to first 5 user messages
        .join('\n');
      
      if (userMessages) {
        contextSection = `\n## Discussion Context\n\nKey points from interactive discussion:\n${userMessages}\n`;
      }
    }

    // Try to get git info if available
    let gitInfo = "";
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout: branch } = await execAsync('git branch --show-current', { cwd: directory });
        const { stdout: remote } = await execAsync('git config --get remote.origin.url', { cwd: directory });
        gitInfo = `\n**Git Branch:** ${branch.trim()}  \n**Repository:** ${remote.trim()}  `;
      } catch {
        // Git info not available, continue without it
      }
    } catch {
      // Child process not available, continue without git info
    }

    // Generate execution commands - avoid template literal nesting issues
    const visionFilename = `vision-${new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]}.md`;
    
    let commandsSection = '```bash\n';
    commandsSection += '# Execute this vision\n';
    commandsSection += 'keen breathe -f ' + visionFilename + '\n\n';
    commandsSection += '# Preview execution (dry run)\n';
    commandsSection += 'keen breathe -f ' + visionFilename + ' --dry-run\n\n';
    commandsSection += '# Execute with verbose output\n';
    commandsSection += 'keen breathe -f ' + visionFilename + ' --verbose\n';
    commandsSection += '```';

    // Build the content using string concatenation to avoid nested template issues
    let content = `# Development Vision: ${projectName}\n\n`;
    content += `**Generated:** ${timestamp}  \n`;
    content += `**User:** ${userContext?.userId?.substring(0, 8)}...${userContext?.isAdmin ? ' (Admin)' : ''}  \n`;
    content += `**Creation Mode:** ${creationMode}  \n`;
    content += `**Project:** ${projectName}${gitInfo}  \n\n`;
    
    content += `## Vision Statement\n\n`;
    content += `${vision}${contextSection}\n\n`;
    
    content += `## Execution Guidelines\n\n`;
    content += `### Autonomous Agent Instructions\n\n`;
    content += `When executing this vision:\n\n`;
    content += `1. **Explore Phase**: Start by analyzing the current project structure\n`;
    content += `2. **Understanding**: Read existing files to understand the codebase context\n`;
    content += `3. **Planning**: Create a clear implementation plan based on the vision\n`;
    content += `4. **Implementation**: Execute changes incrementally with proper testing\n`;
    content += `5. **Validation**: Verify all requirements are met before completion\n\n`;
    
    content += `### Technical Requirements\n\n`;
    content += `- Use modern best practices and patterns\n`;
    content += `- Include comprehensive error handling\n`;
    content += `- Add appropriate logging and monitoring\n`;
    content += `- Ensure code is well-documented\n`;
    content += `- Include tests where appropriate\n`;
    content += `- Follow project's existing code style and conventions\n\n`;
    
    content += `### Success Criteria\n\n`;
    content += `The vision will be considered complete when:\n`;
    content += `- All stated requirements are implemented\n`;
    content += `- Code follows established patterns and conventions\n`;
    content += `- Appropriate tests are in place\n`;
    content += `- Documentation is updated\n`;
    content += `- No breaking changes to existing functionality\n\n`;
    
    content += `## Execution Commands\n\n`;
    content += commandsSection + '\n\n';
    
    content += `## Notes\n\n`;
    
    if (creationMode === 'interactive') {
      content += `- This vision was created through interactive discussion with Claude\n`;
      content += `- The conversation included ${conversationHistory?.length || 0} exchanges\n`;
      content += `- Claude analyzed the project structure during creation\n`;
    } else {
      content += `- This vision was created directly from user description\n`;
      content += `- Consider using interactive mode (keen manifest --interactive) for complex requirements\n`;
    }
    content += `- Execute with appropriate options based on project complexity\n`;
    content += `- Monitor execution progress and logs for any issues\n\n`;
    content += `---\n\n`;
    content += `*Generated by keen manifest - Autonomous Development Platform*\n`;
    
    return content;
  }

  /**
   * Show interactive help
   */
  private showInteractiveHelp(): void {
    console.log(chalk.blue("\n📋 Interactive Mode Commands:"));
    console.log(chalk.white("• Type your requirements and questions naturally"));
    console.log(chalk.white("• Claude will help analyze and refine your vision"));
    console.log(chalk.white("• 'done' - Finalize and create the vision file"));
    console.log(chalk.white("• 'exit' or 'quit' - Exit without saving"));
    console.log(chalk.white("• 'help' - Show this help message"));
    console.log(chalk.gray("\n💡 Tips:"));
    console.log(chalk.gray("• Be specific about your requirements"));
    console.log(chalk.gray("• Mention technologies, frameworks, or patterns you prefer"));
    console.log(chalk.gray("• Ask Claude to analyze your existing codebase"));
    console.log(chalk.gray("• Discuss implementation approach before finalizing\n"));
  }

  /**
   * Show next steps after vision creation
   */
  private showNextSteps(filename: string): void {
    console.log(chalk.blue("\n🚀 Next Steps:"));
    console.log(chalk.white(`1. Review the vision file: ${filename}`));
    console.log(chalk.white(`2. Execute the vision: keen breathe -f ${filename}`));
    console.log(chalk.white(`3. Or preview first: keen breathe -f ${filename} --dry-run`));
    console.log(chalk.gray("\n💡 Tips:"));
    console.log(chalk.gray("• Use --verbose for detailed execution logs"));
    console.log(chalk.gray("• Use --debug for troubleshooting"));
    console.log(chalk.gray("• Vision files can be edited before execution\n"));
  }
}