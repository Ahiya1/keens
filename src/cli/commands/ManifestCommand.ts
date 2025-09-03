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
          console.log(chalk.blue("🔑 Checking authentication..."));
          
          let userContext;
          try {
            userContext = await cliAuth.requireAuth();
          } catch (authError: any) {
            console.error(chalk.red("❌ " + authError.message));
            console.log(chalk.yellow("\n💡 Quick start:"));
            console.log(chalk.cyan("   keen login                  # Login to your account"));
            console.log(chalk.gray("   keen status                 # Check authentication status"));
            process.exit(1);
          }

          const currentUser = cliAuth.getCurrentUser();
          
          console.log(
            chalk.blue("📜 keen manifest - Create Vision Files")
          );
          console.log(
            chalk.gray("Generate vision files in markdown format for autonomous execution")
          );
          console.log(chalk.gray(`📁 Working Directory: ${options.directory}`));
          
          if (currentUser) {
            console.log(chalk.green(`👤 Authenticated as: ${currentUser.displayName || currentUser.username}`));
            if (currentUser.isAdmin) {
              console.log(chalk.yellow("   ⚡ Admin privileges active"));
            }
          }
          console.log("");

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
            console.log(chalk.yellow("\n🔑 Authentication issue detected:"));
            console.log(chalk.gray("   • Your session may have expired"));
            console.log(chalk.gray("   • Try logging in again: keen login"));
          }
          
          process.exit(1);
        }
      })
      .addHelpText(
        "after",
        `
🔑 Authentication Required:
  This command requires authentication. Run 'keen login' first.

\nExamples:\n  keen manifest                                    # Interactive mode with Claude\n  keen manifest "Create a React todo app"          # Direct mode\n  keen manifest --interactive --verbose            # Interactive with verbose output\n  keen manifest "API server" --output api-vision.md  # Custom output file\n\n📋 Output:\n  • Creates markdown vision files suitable for 'keen breathe -f'\n  • Files include timestamp, user context, and execution notes\n  • Automatically suggests next steps with breathe command\n\n📊 User Context:\n  • Vision files are tagged with your user information\n  • Admin users get enhanced vision creation capabilities\n  • All manifests are optimized for autonomous execution`
      );
  }

  /**
   * Create vision directly from description
   */
  private async createDirectVision(
    description: string,
    options: any,
    userContext: any
  ): Promise<void> {
    console.log(chalk.blue("📝 Creating vision file directly..."));
    console.log(chalk.gray(`Description: ${description}`));
    console.log("");

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
    console.log(chalk.gray(`   📁 Location: ${filepath}`));
    console.log(chalk.gray(`   📝 Length: ${visionContent.length} characters`));
    console.log("");
    
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
    console.log(chalk.blue("🤖 Interactive Vision Creation with Claude"));
    console.log(
      chalk.gray("Claude will help you create a comprehensive vision file")
    );
    console.log("");

    console.log(chalk.yellow("✨ Claude will help you:"));
    console.log("• 🔍 Analyze your current project structure");
    console.log("• 💡 Refine and expand your vision");
    console.log("• 🎨 Structure your requirements clearly");
    console.log("• 📝 Generate a comprehensive vision file");
    console.log("");

    // Initialize ConversationAgent
    console.log(chalk.blue("🤖 Initializing Claude agent..."));
    
    const conversationOptions: ConversationOptions = {
      workingDirectory: options.directory,
      userContext: userContext,
      verbose: options.verbose,
      debug: options.debug,
      enableWebSearch: true,
    };
    
    const agent = new ConversationAgent(conversationOptions);
    
    console.log(chalk.green("✅ Claude agent ready"));
    console.log("");

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

    console.log(chalk.cyan("You: ") + introMessage);
    
    try {
      const response = await agent.converse(introMessage);
      console.log(chalk.green("\n🤖 Claude: ") + response.response);
      
      if (response.thinking && options.verbose) {
        console.log(chalk.magenta("\n🧠 Claude's thinking:"));
        console.log(chalk.gray(response.thinking.substring(0, 500) + (response.thinking.length > 500 ? "..." : "")));
      }
    } catch (error: any) {
      console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }

    console.log("");
    console.log(chalk.yellow("🎮 Special commands:"));
    console.log("• Type 'done' when you're ready to create the vision file");
    console.log("• Type 'help' for more commands");
    console.log("• Type 'exit' to cancel");
    console.log("");
    rl.prompt();

    rl.on("line", async (input: string) => {
      const userInput = input.trim();

      if (!userInput) {
        rl.prompt();
        return;
      }

      if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
        console.log(chalk.yellow("👋 Vision creation cancelled."));
        rl.close();
        return;
      }

      if (userInput.toLowerCase() === "done") {
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
        console.log(chalk.gray("\n🤔 Claude is thinking..."));
        
        const response = await agent.converse(userInput);
        
        if (response.error) {
          console.log(chalk.red(`\n❌ Error: ${response.error}`));
        } else {
          console.log(chalk.green("\n🤖 Claude: ") + response.response);
          
          if (response.thinking && options.verbose) {
            console.log(chalk.magenta("\n🧠 Claude's thinking:"));
            console.log(chalk.gray(response.thinking.substring(0, 500) + (response.thinking.length > 500 ? "..." : "")));
          }
        }
      } catch (error: any) {
        console.log(chalk.red(`\n❌ Conversation error: ${error.message}`));
      }

      console.log("");
      rl.prompt();
    });

    rl.on("close", () => {
      // Exit gracefully
    });
  }

  /**
   * Finalize interactive vision creation
   */
  private async finalizeInteractiveVision(
    agent: ConversationAgent,
    options: any,
    userContext: any
  ): Promise<void> {
    console.log(chalk.blue("\n📝 Finalizing vision file from conversation..."));

    const history = agent.getConversationHistory();
    if (history.length === 0) {
      console.log(chalk.red("❌ No conversation to create vision from."));
      return;
    }

    try {
      // Synthesize the conversation into a vision
      const vision = await agent.synthesizeVision();
      
      if (!vision || vision.includes("No conversation to synthesize")) {
        console.log(chalk.red("❌ Unable to synthesize conversation into vision."));
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

      console.log(chalk.green(`✅ Vision file created: ${filename}`));
      console.log(chalk.gray(`   📁 Location: ${filepath}`));
      console.log(chalk.gray(`   📝 Length: ${visionContent.length} characters`));
      console.log(chalk.gray(`   💬 Based on ${history.length} conversation exchanges`));
      console.log("");
      
      this.showNextSteps(filename);
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to create vision file: ${error.message}`));
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
    console.log(chalk.yellow("\n💡 Interactive Vision Creation:"));
    console.log("• done      - Finalize and create the vision file");
    console.log("• help      - Show this help message");
    console.log("• exit      - Cancel vision creation");
    console.log("");
    console.log(chalk.cyan("🔍 What to discuss with Claude:"));
    console.log("• What you want to build or implement");
    console.log("• Technical requirements and constraints");
    console.log("• Integration with existing code");
    console.log("• Testing and documentation needs");
    console.log("• Performance or security considerations");
    console.log("");
    console.log(chalk.green("🤖 Claude can help by:"));
    console.log("• Analyzing your current project structure");
    console.log("• Suggesting best practices and patterns");
    console.log("• Refining and structuring your requirements");
    console.log("• Identifying potential challenges or dependencies");
    console.log("");
  }

  /**
   * Show next steps after vision creation
   */
  private showNextSteps(filename: string): void {
    console.log(chalk.cyan("🚀 Next Steps:"));
    console.log(chalk.white("   keen breathe -f " + filename + "                # Execute vision"));
    console.log(chalk.gray("   keen breathe -f " + filename + " --dry-run       # Preview execution"));
    console.log(chalk.gray("   keen breathe -f " + filename + " --verbose       # Execute with verbose output"));
    console.log("");
    console.log(chalk.blue("💡 Tip: The vision file is now ready for autonomous execution!"));
    console.log(chalk.gray("      Review the file contents before execution if needed."));
  }
}
