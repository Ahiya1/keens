/**
 * keen converse Command - Real Claude Agent for Human Conversation
 * Interactive conversation mode with real Claude agent that can execute read-only tools
 * FIXED: Removed require() call that was causing ES modules error
 */

import { Command } from "commander";
import chalk from "chalk";
import readline from "readline";
import path from "path";
import { CLIOptions } from "../types.js";
import { cliAuth } from "../auth/CLIAuthManager.js";
import {
  ConversationAgent,
  ConversationOptions,
} from "../../agent/ConversationAgent.js";

export class ConverseCommand {
  constructor(program: Command) {
    program
      .command("converse")
      .description(
        "💬 Interactive conversation mode - chat with Claude agent with real tool access (requires login)"
      )
      .option(
        "--directory <dir>",
        "Working directory for the conversation",
        process.cwd()
      )
      .option("--verbose", "Enable verbose output with thinking blocks")
      .option("--debug", "Enable debug logging")
      .option("--no-web-search", "Disable web search capability")
      .action(async (options: any, command: Command) => {
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
          if (currentUser) {
            console.log(chalk.blue(`👤 Authenticated as: ${currentUser.email}`));
            if (currentUser.isAdmin) {
              console.log(chalk.green("🔑 Admin privileges active"));
            }
          }

          console.log(chalk.cyan("💬 Starting interactive conversation with Claude agent..."));
          console.log(chalk.gray("Working directory: " + options.directory));
          console.log(chalk.gray("Type 'help' for commands, 'exit' to quit."));
          console.log("");

          // Initialize ConversationAgent
          const conversationOptions: ConversationOptions = {
            workingDirectory: options.directory,
            userContext: userContext,
            verbose: options.verbose || command.parent?.opts().verbose,
            debug: options.debug || command.parent?.opts().debug,
            enableWebSearch: !options.noWebSearch,
          };

          const agent = new ConversationAgent(conversationOptions);

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan("You: "),
          });

          if (currentUser?.isAdmin) {
            console.log(chalk.green("🚀 Admin mode: Enhanced agent capabilities enabled"));
          }

          rl.prompt();

          rl.on("line", async (input: string) => {
            const userInput = input.trim();

            if (!userInput) {
              rl.prompt();
              return;
            }

            // Handle special commands
            if (
              userInput.toLowerCase() === "exit" ||
              userInput.toLowerCase() === "quit"
            ) {
              console.log(chalk.yellow("Goodbye! 👋"));
              rl.close();
              return;
            }

            if (userInput.toLowerCase() === "help") {
              this.showHelp();
              rl.prompt();
              return;
            }

            if (userInput.toLowerCase() === "clear") {
              agent.clearHistory();
              console.log(chalk.yellow("📝 Conversation history cleared"));
              rl.prompt();
              return;
            }

            if (userInput.toLowerCase() === "manifest") {
              await this.handleManifestFromConversation(
                agent,
                options.directory,
                userContext
              );
              rl.prompt();
              return;
            }

            if (userInput.toLowerCase() === "breathe") {
              await this.handleBreatheTransition(
                agent,
                options.directory,
                userContext
              );
              rl.close();
              return;
            }

            if (userInput.toLowerCase() === "status") {
              this.showStatus(currentUser);
              rl.prompt();
              return;
            }

            // Process actual conversation with Claude
            try {
              const response = await agent.converse(userInput);

              if (response.error) {
                console.log(chalk.red("❌ Error: " + response.error));
              } else {
                if (response.thinking && options.verbose) {
                  console.log(chalk.gray("🤔 Thinking: " +
                    response.thinking.substring(0, 500) +
                    (response.thinking.length > 500 ? "..." : "")
                  ));
                }
                console.log(chalk.white("Claude: " + response.response));
              }
            } catch (error: any) {
              console.log(chalk.red("❌ Conversation error: " + error.message));
            }

            rl.prompt();
          });

          rl.on("close", () => {
            console.log(chalk.yellow("\nConversation ended. Goodbye! 👋"));
            process.exit(0);
          });
        } catch (error: any) {
          console.error(chalk.red("❌ Conversation error: " + error.message));

          if (error.message.includes("Authentication required")) {
            console.log(chalk.yellow("💡 Hint: Run 'keen login' first to authenticate"));
          }

          process.exit(1);
        }
      })
      .addHelpText(
        "after",
        `
🔑 Authentication Required:
  This command requires authentication. Run 'keen login' first.

📋 Conversation Commands:
  help      Show available commands
  status    Show current user and session info
  manifest  Create a vision file from conversation
  breathe   Synthesize conversation and execute autonomously
  clear     Clear conversation history
  exit      End conversation and return to terminal

💡 Examples:
  keen converse
  keen converse --directory ./my-project --verbose
  keen converse --debug --no-web-search

📊 User Context:
  • All conversations use real Claude with tool access
  • Claude can analyze files and project structure
  • Admin users get enhanced analysis capabilities
  • Conversation history is maintained during session`
      );
  }

  private showHelp(): void {
    console.log(chalk.cyan("\n📋 Available Commands:"));
    console.log(chalk.white("  help      - Show this help message"));
    console.log(chalk.white("  status    - Show current user and session info"));
    console.log(chalk.white("  manifest  - Create a vision file from conversation"));
    console.log(chalk.white("  breathe   - Synthesize and execute vision autonomously"));
    console.log(chalk.white("  clear     - Clear conversation history"));
    console.log(chalk.white("  exit/quit - End conversation\n"));
  }

  private showStatus(currentUser: any): void {
    console.log(chalk.cyan("\n📊 Current Status:"));
    if (currentUser) {
      console.log(chalk.white(`  User: ${currentUser.email}`));
      if (currentUser.isAdmin) {
        console.log(chalk.green("  Role: Admin (Enhanced capabilities)"));
      } else {
        console.log(chalk.white("  Role: User"));
      }
      console.log(chalk.white(`  User ID: ${currentUser.userId?.substring(0, 8)}...`));
    }
    console.log("");
  }

  /**
   * Handle creating a manifest file from conversation
   */
  private async handleManifestFromConversation(
    agent: ConversationAgent,
    directory: string,
    userContext: any,
  ): Promise<void> {
    try {
      const history = agent.getConversationHistory();
      if (history.length === 0) {
        console.log(chalk.yellow("📝 No conversation history to create manifest from"));
        return;
      }

      // Synthesize the conversation into a vision
      const vision = await agent.synthesizeVision();

      if (!vision || vision.includes("No conversation to synthesize")) {
        console.log(chalk.yellow("📝 Unable to synthesize vision from conversation"));
        return;
      }

      // Create the manifest content
      const manifestContent = this.createManifestContent(
        vision,
        history,
        userContext
      );

      // Generate filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split(".")[0];
      const filename = `vision-${timestamp}.md`;

      // Import dynamic modules
      const { promises: fs } = await import("fs");

      const filepath = path.resolve(directory, filename);

      await fs.writeFile(filepath, manifestContent, "utf-8");
      console.log(chalk.green(`📄 Vision manifest created: ${filename}`));
      console.log(chalk.gray(`   Execute with: keen breathe -f ${filename}`));
    } catch (error: any) {
      console.log(chalk.red("❌ Failed to create manifest: " + error.message));
    }
  }

  /**
   * Create manifest content from vision and conversation
   */
  private createManifestContent(
    vision: string,
    history: any[],
    userContext: any,
  ): string {
    const timestamp = new Date().toISOString();
    const conversationSummary = history
      .filter((msg) => msg.role === "user")
      .map((msg) => `- ${msg.content}`)
      .slice(0, 5) // Limit to first 5 user messages
      .join("\n");

    return `# Development Vision

**Generated:** ${timestamp}
**User:** ${userContext?.userId?.substring(0, 8)}...${userContext?.isAdmin ? " (Admin)" : ""}
**Source:** keen converse session

## Vision Statement

${vision}

## Conversation Context

Key discussion points from conversation:
${conversationSummary}

## Execution Notes

- This vision was synthesized from an interactive conversation with Claude
- The conversation included ${history.length} exchanges
- Execute with: \`keen breathe -f ${path.basename(process.cwd())}/vision-*.md\`

---

*Generated by keen converse - Autonomous Development Platform*
`;
  }

  private async handleBreatheTransition(
    agent: ConversationAgent,
    directory: string,
    userContext: any,
  ): Promise<void> {
    console.log(chalk.cyan("🔄 Preparing to transition from conversation to autonomous execution..."));

    const history = agent.getConversationHistory();
    if (history.length === 0) {
      console.log(chalk.yellow("📝 No conversation history to execute"));
      return;
    }

    // Synthesize the conversation into a vision
    const synthesizedVision = await agent.synthesizeVision();

    // FIXED: Use a proper Promise-based approach instead of conflicting readline interfaces
    return new Promise<void>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        chalk.yellow("🚀 Execute this vision autonomously? (y/n): "),
        async (answer: string) => {
          if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
            rl.close();

            try {
              console.log(chalk.green("🚀 Starting autonomous execution..."));

              // Import and execute KeenAgent with user context
              const { KeenAgent } = await import("../../agent/KeenAgent.js");

              const options: CLIOptions = {
                vision: synthesizedVision,
                directory,
                phase: "EXPLORE",
                maxIterations: 100,
                costBudget: 50.0,
                webSearch: true,
                extendedContext: true,
                stream: true,
                verbose: false,
                debug: false,
                dryRun: false,
                // Pass user context from conversation
                userContext: userContext,
              };

              const keenAgent = new KeenAgent(options);
              await keenAgent.execute();
            } catch (error: any) {
              console.error(chalk.red(`❌ Execution failed: ${error.message}`));
            }
          } else {
            console.log(chalk.yellow("Execution cancelled. Returning to conversation."));
            rl.close();
          }
          resolve();
        }
      );
    });
  }
}