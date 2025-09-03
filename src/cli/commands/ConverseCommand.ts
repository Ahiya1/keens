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
          console.log(chalk.blue("🔑 Checking authentication..."));

          let userContext;
          try {
            userContext = await cliAuth.requireAuth();
          } catch (authError: any) {
            console.error(chalk.red("❌ " + authError.message));
            console.log(chalk.yellow("\n💡 Quick start:"));
            console.log(
              chalk.cyan(
                "   keen login                  # Login to your account"
              )
            );
            console.log(
              chalk.gray(
                "   keen status                 # Check authentication status"
              )
            );
            process.exit(1);
          }

          const currentUser = cliAuth.getCurrentUser();

          console.log(
            chalk.blue(
              "💬 keen converse - Interactive Conversation with Claude"
            )
          );
          console.log(
            chalk.gray("Real Claude agent with read-only tool access")
          );
          console.log(chalk.gray(`📁 Working Directory: ${options.directory}`));

          if (currentUser) {
            console.log(
              chalk.green(
                `👤 Authenticated as: ${currentUser.displayName || currentUser.username}`
              )
            );
            if (currentUser.isAdmin) {
              console.log(chalk.yellow("   ⚡ Admin privileges active"));
            }
          }
          console.log("");

          console.log(chalk.yellow("✨ What Claude can do:"));
          console.log("• 🔍 Analyze your project structure and files");
          console.log("• 📖 Read and understand your codebase");
          console.log("• 🌐 Search the web for technical information");
          console.log("• 💡 Provide development guidance and suggestions");
          console.log(
            "• 🧠 Use full reasoning with thinking blocks (--verbose)"
          );
          console.log("");

          console.log(chalk.red("🚫 What Claude cannot do:"));
          console.log("• ❌ Write or modify files (conversation mode only)");
          console.log("• ❌ Execute destructive commands");
          console.log("• ❌ Make git commits or changes");
          console.log("");

          console.log(chalk.cyan("🎮 Commands:"));
          console.log(
            '• Type "manifest" to create a vision file from this conversation'
          );
          console.log(
            '• Type "breathe" to synthesize conversation and execute autonomously'
          );
          console.log('• Type "clear" to clear conversation history');
          console.log('• Type "help" to see available commands');
          console.log('• Type "exit" or "quit" to end conversation');
          console.log("");

          // Initialize ConversationAgent
          console.log(chalk.blue("🤖 Initializing Claude agent..."));

          const conversationOptions: ConversationOptions = {
            workingDirectory: options.directory,
            userContext: userContext,
            verbose: options.verbose || command.parent?.opts().verbose,
            debug: options.debug || command.parent?.opts().debug,
            enableWebSearch: !options.noWebSearch,
          };

          const agent = new ConversationAgent(conversationOptions);

          console.log(chalk.green("✅ Claude agent ready for conversation"));
          console.log("");

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan("You: "),
          });

          console.log(
            chalk.green(
              "🤖 Claude: Hello! I'm here to help you explore and understand your project. I can analyze your codebase, explain concepts, and help you plan your development work. What would you like to discuss?"
            )
          );

          if (currentUser?.isAdmin) {
            console.log(
              chalk.yellow(
                "⚡ Admin note: You have unlimited access to all features and resources."
              )
            );
          }

          console.log("");
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
              console.log(
                chalk.yellow("👋 Goodbye! Your conversation has been saved.")
              );
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
              console.log(chalk.yellow("🧹 Conversation history cleared."));
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
              console.log(chalk.gray("\n🤔 Claude is thinking..."));

              const response = await agent.converse(userInput);

              if (response.error) {
                console.log(chalk.red(`\n❌ Error: ${response.error}`));
              } else {
                console.log(chalk.green("\n🤖 Claude: ") + response.response);

                if (response.thinking && options.verbose) {
                  console.log(chalk.magenta("\n🧠 Claude's thinking:"));
                  console.log(
                    chalk.gray(
                      response.thinking.substring(0, 500) +
                        (response.thinking.length > 500 ? "..." : "")
                    )
                  );
                }
              }
            } catch (error: any) {
              console.log(
                chalk.red(`\n❌ Conversation error: ${error.message}`)
              );
            }

            console.log("");
            rl.prompt();
          });

          rl.on("close", () => {
            process.exit(0);
          });
        } catch (error: any) {
          console.error(chalk.red("❌ Conversation error: " + error.message));

          if (error.message.includes("Authentication required")) {
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

\nConversation Commands:\n  help      Show available commands\n  status    Show current user and session info\n  manifest  Create a vision file from conversation\n  breathe   Synthesize conversation and execute autonomously\n  clear     Clear conversation history\n  exit      End conversation and return to terminal\n\nExamples:\n  keen converse\n  keen converse --directory ./my-project --verbose\n  keen converse --debug --no-web-search\n\n📊 User Context:\n  • All conversations use real Claude with tool access\n  • Claude can analyze files and project structure\n  • Admin users get enhanced analysis capabilities\n  • Conversation history is maintained during session`
      );
  }

  private showHelp(): void {
    console.log(chalk.yellow("\n💡 Conversation Commands:"));
    console.log("• help      - Show this help message");
    console.log("• status    - Show current user and session status");
    console.log("• manifest  - Create a vision file from this conversation");
    console.log(
      "• breathe   - Synthesize conversation into autonomous execution"
    );
    console.log("• clear     - Clear conversation history");
    console.log("• exit      - End conversation and save");
    console.log("");
    console.log(chalk.cyan("🔍 What Claude can help with:"));
    console.log("• Analyze your project files and structure");
    console.log("• Understand your codebase and dependencies");
    console.log("• Search for technical information online");
    console.log("• Discuss development plans and requirements");
    console.log("• Help you formulate clear vision statements");
    console.log("");
    console.log(chalk.red("🚫 What Claude cannot do in conversation mode:"));
    console.log("• Write or modify files");
    console.log("• Execute destructive commands");
    console.log("• Make git commits or changes");
    console.log(
      '• Make actual changes (use "breathe" for autonomous execution)'
    );
  }

  private showStatus(currentUser: any): void {
    console.log(chalk.cyan("\n📋 Current Session Status:"));
    if (currentUser) {
      console.log(
        chalk.white(
          `   👤 User: ${currentUser.displayName || currentUser.username}`
        )
      );
      console.log(chalk.white(`   📧 Email: ${currentUser.email}`));
      console.log(chalk.white(`   🔐 Role: ${currentUser.role}`));

      if (currentUser.isAdmin) {
        console.log(chalk.yellow(`   ⚡ Admin: Yes (unlimited resources)`));
      } else {
        console.log(chalk.white(`   ⚡ Admin: No`));
      }
    }
    console.log("");
  }

  /**
   * Handle creating a manifest file from conversation
   */
  private async handleManifestFromConversation(
    agent: ConversationAgent,
    directory: string,
    userContext: any
  ): Promise<void> {
    try {
      console.log(chalk.blue("\n📝 Creating vision file from conversation..."));

      const history = agent.getConversationHistory();
      if (history.length === 0) {
        console.log(
          chalk.red("❌ No conversation history to create a manifest from.")
        );
        console.log(
          chalk.yellow(
            '💡 Have a conversation about your project first, then type "manifest".'
          )
        );
        return;
      }

      // Synthesize the conversation into a vision
      const vision = await agent.synthesizeVision();

      if (!vision || vision.includes("No conversation to synthesize")) {
        console.log(
          chalk.red("❌ Unable to synthesize conversation into vision.")
        );
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

      console.log(chalk.green(`✅ Vision file created: ${filename}`));
      console.log(chalk.gray(`   📁 Location: ${filepath}`));
      console.log(
        chalk.gray(`   📝 Length: ${manifestContent.length} characters`)
      );
      console.log("");
      console.log(chalk.cyan("🚀 Next steps:"));
      console.log(
        chalk.white(`   keen breathe -f ${filename}   # Execute this vision`)
      );
      console.log(
        chalk.gray(
          `   keen breathe -f ${filename} --dry-run   # Preview execution`
        )
      );
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to create manifest: ${error.message}`));
    }
  }

  /**
   * Create manifest content from vision and conversation
   */
  private createManifestContent(
    vision: string,
    history: any[],
    userContext: any
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
    userContext: any
  ): Promise<Promise<void>> {
    console.log(
      chalk.blue("\n🌊 Synthesizing conversation into autonomous vision...")
    );

    const history = agent.getConversationHistory();
    if (history.length === 0) {
      console.log(chalk.red("❌ No conversation history to synthesize."));
      console.log(
        chalk.yellow(
          '💡 Chat about your project first, then type "breathe" to execute.'
        )
      );
      return Promise.resolve();
    }

    // Synthesize the conversation into a vision
    const synthesizedVision = await agent.synthesizeVision();

    console.log(chalk.cyan("\n📋 Synthesized Vision:"));
    console.log(chalk.white(synthesizedVision));
    console.log("");

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

              console.log(
                chalk.blue("\n🚀 Transitioning to autonomous execution...")
              );
              const keenAgent = new KeenAgent(options);
              await keenAgent.execute();
            } catch (error: any) {
              console.error(chalk.red(`❌ Execution failed: ${error.message}`));
            }
          } else {
            console.log(
              chalk.yellow(
                "👋 Execution cancelled. Continue your conversation or type 'exit'."
              )
            );
            rl.close();
          }
          resolve();
        }
      );
    });
  }
}
