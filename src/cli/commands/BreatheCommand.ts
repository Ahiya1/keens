/**
 * keen breathe '<vision>' Command - ENHANCED WITH AUTHENTICATION
 * Now requires user authentication and passes user context to agent
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { KeenAgent } from "../../agent/KeenAgent.js";
import { CLIOptions } from "../types.js";
import {
  validateVision,
  validateDirectory,
  validateFile,
} from "../utils/validation.js";
import {
  startProgressIndicator,
  stopProgressIndicator,
} from "../utils/progress.js";
import { cliAuth } from "../auth/CLIAuthManager.js";

/**
 * Expand short commands to meaningful visions
 */
function expandShortCommand(vision: string): string {
  const shortCommands: Record<string, string> = {
    create:
      "Create a new project with modern development setup including TypeScript, testing framework, linting, and proper project structure",
    init: "Initialize a new development project with essential files and configuration",
    setup:
      "Set up a development environment with all necessary tools and dependencies",
    scaffold:
      "Generate project scaffolding with best practices and modern tooling",
    bootstrap: "Bootstrap a new application with complete development setup",
    new: "Create a new project from scratch with modern development standards",
    enhance:
      "Enhance existing project with improved functionality, logging, and testing capabilities",
    debug:
      "Debug and fix issues in the existing codebase with comprehensive logging",
    test: "Add comprehensive testing suite with Jest and proper test coverage",
    monitor:
      "Add monitoring, logging, and observability features to the project",
    readme:
      "Update and enhance the README file with comprehensive documentation",
    docs: "Improve project documentation including README, API docs, and code comments",
  };

  const normalizedVision = vision.trim().toLowerCase();

  if (shortCommands[normalizedVision]) {
    return shortCommands[normalizedVision];
  }

  return vision;
}

export class BreatheCommand {
  constructor(program: Command) {
    program
      .command("breathe")
      .argument(
        "[vision]",
        "Vision statement for autonomous task execution (or use -f for file)"
      )
      .description("🌬️ Execute autonomous agent with vision-driven development (requires login)")
      .option(
        "-f, --file <file>",
        "Vision file to execute (e.g., vision.md, requirements.txt)"
      )
      .option(
        "--directory <dir>",
        "Working directory for the agent",
        process.cwd()
      )
      .option(
        "--phase <phase>",
        "Starting phase: EXPLORE, PLAN, FOUND, SUMMON, or COMPLETE",
        "EXPLORE"
      )
      .option(
        "--max-iterations <num>",
        "Maximum conversation iterations",
        "100"
      )
      .option("--cost-budget <amount>", "Maximum cost budget in USD", "50.00")
      .option("--no-web-search", "Disable web search capability")
      .option("--extended-context", "Enable 1M token context window")
      .option("--dry-run", "Plan execution without making changes")
      .option("--stream", "Enable real-time streaming output")
      .option("--debug", "Enable debug logging", false)
      .action(
        async (vision: string | undefined, options: any, command: Command) => {
          const startTime = Date.now();
          let cliOptions: CLIOptions | undefined;
          let agent: KeenAgent | undefined;
          let userContext: any = null;

          try {
            // 🔑 AUTHENTICATION REQUIRED
            console.log(chalk.blue("🔑 Checking authentication..."));
            
            try {
              userContext = await cliAuth.requireAuth();
            } catch (authError: any) {
              console.error(chalk.red("❌ " + authError.message));
              console.log(chalk.yellow("\n💡 Quick start:"));
              console.log(chalk.cyan("   keen login                  # Login to your account"));
              console.log(chalk.gray("   keen status                 # Check authentication status"));
              console.log(chalk.gray("   keen --help                 # Show all commands"));
              process.exit(1);
            }

            const currentUser = cliAuth.getCurrentUser();
            if (currentUser) {
              console.log(chalk.green(`✅ Authenticated as ${currentUser.displayName || currentUser.username}`));
              if (currentUser.isAdmin) {
                console.log(chalk.yellow("   ⚡ Admin privileges active"));
              }
            }

            let finalVision: string;
            let visionFile: string | undefined;

            // Handle file-based vision vs text vision
            if (options.file) {
              // File-based vision
              const resolvedFile = path.resolve(options.file);
              validateFile(resolvedFile);

              try {
                const visionContent = await fs.readFile(resolvedFile, "utf-8");
                if (!visionContent.trim()) {
                  console.error(chalk.red("❌ Vision file is empty"));
                  process.exit(1);
                }
                finalVision = visionContent.trim();
                visionFile = resolvedFile;
              } catch (error: any) {
                if (error.code === "ENOENT") {
                  console.error(
                    chalk.red(`❌ Vision file not found: ${resolvedFile}`)
                  );
                } else {
                  console.error(
                    chalk.red(`❌ Error reading vision file: ${error.message}`)
                  );
                }
                process.exit(1);
              }
            } else if (vision) {
              // Text-based vision
              finalVision = expandShortCommand(vision);
              const wasExpanded = finalVision !== vision;

              if (
                wasExpanded &&
                (options.verbose || command.parent?.opts().verbose)
              ) {
                console.log(
                  chalk.yellow(`🔄 Expanded '${vision}' to: ${finalVision}`)
                );
              }
            } else {
              console.error(
                chalk.red(
                  "❌ Error: Vision is required (either as argument or via -f flag)"
                )
              );
              console.log(chalk.yellow("\n💡 Usage:"));
              console.log('  keen breathe "<your vision>"');
              console.log("  keen breathe -f <vision-file>");
              console.log("\nExamples:");
              console.log('  keen breathe "Create a React todo app"');
              console.log("  keen breathe -f vision.md");
              console.log("  keen breathe readme");
              process.exit(1);
            }

            // Get debug and verbose flags
            const debugMode =
              options.debug || command.parent?.opts().debug || false;
            const verboseMode =
              options.verbose || command.parent?.opts().verbose || false;

            // Parse and validate options
            cliOptions = {
              vision: finalVision,
              visionFile,
              directory: options.directory,
              phase: options.phase,
              maxIterations: parseInt(options.maxIterations),
              costBudget: parseFloat(options.costBudget),
              webSearch: !options.noWebSearch,
              extendedContext: options.extendedContext || true,
              dryRun: options.dryRun,
              verbose: verboseMode,
              debug: debugMode,
              stream: options.stream !== false,
              // 🎆 NEW: Pass user context to agent
              userContext: userContext
            };

            // Validate inputs
            validateVision(
              finalVision,
              options.file ? "vision file" : "command argument"
            );
            validateDirectory(cliOptions.directory!);

            // Display startup information
            console.log(
              chalk.green("🤖 keen breathe - Autonomous Development Platform")
            );
            console.log(
              chalk.gray(`📁 Working Directory: ${cliOptions.directory}`)
            );
            console.log(
              chalk.gray(`👤 User: ${currentUser?.displayName || currentUser?.username} (${currentUser?.email})`)
            );

            if (visionFile) {
              console.log(
                chalk.gray(`📄 Vision File: ${path.basename(visionFile)}`)
              );
              console.log(
                chalk.gray(`📝 Vision Length: ${finalVision.length} characters`)
              );
            } else {
              console.log(
                chalk.gray(
                  `🎯 Vision: ${finalVision.length > 100 ? finalVision.substring(0, 100) + "..." : finalVision}`
                )
              );
            }

            console.log(chalk.gray(`⚙️  Phase: ${cliOptions.phase}`));
            console.log(
              chalk.gray(`🔢 Max Iterations: ${cliOptions.maxIterations}`)
            );
            console.log(
              chalk.gray(`💰 Cost Budget: $${cliOptions.costBudget}`)
            );

            if (currentUser?.isAdmin) {
              console.log(chalk.yellow("⚡ Admin mode: Unlimited resources"));
            }

            if (debugMode) {
              console.log(chalk.yellow("🔍 Debug mode enabled"));
            }
            if (verboseMode) {
              console.log(chalk.yellow("📢 Verbose mode enabled"));
            }

            // Start progress indicator for initialization
            const progressStop = startProgressIndicator(
              "Initializing authenticated agent..."
            );

            // 🎆 Create agent with user context
            agent = new KeenAgent(cliOptions);

            // Stop initialization progress
            stopProgressIndicator(progressStop);

            console.log(chalk.green("✅ Agent initialized successfully"));
            console.log(chalk.gray(`🎆 Session ID: ${agent.getSessionId()}`));
            
            if (userContext) {
              console.log(chalk.gray(`🔑 User Context: ${userContext.userId.substring(0, 8)}...`));
            }
            
            console.log("");

            // Execute the agent
            console.log(chalk.blue("🚀 Starting autonomous execution..."));

            const result = await agent.execute();

            // Display results
            const duration = Date.now() - startTime;

            console.log(chalk.blue("\n" + "=".repeat(60)));
            console.log(chalk.blue("🏁 EXECUTION COMPLETE"));
            console.log(chalk.blue("=".repeat(60)));

            if (result.success) {
              console.log(
                chalk.green("\n🎉 Agent execution completed successfully!")
              );
            } else {
              console.log(
                chalk.yellow("\n⚠️  Agent execution completed (check results)")
              );
            }

            console.log(
              chalk.gray(`⏱️  Total Duration: ${Math.round(duration / 1000)}s`)
            );
            
            if (currentUser) {
              console.log(
                chalk.gray(`👤 Executed by: ${currentUser.displayName || currentUser.username}`)
              );
            }

            if (result.filesCreated && result.filesCreated.length > 0) {
              console.log(
                chalk.yellow(
                  `\n📄 Files Created: ${result.filesCreated.length}`
                )
              );
              result.filesCreated.forEach((file) =>
                console.log(chalk.gray(`   ✨ ${file}`))
              );
            }

            if (result.filesModified && result.filesModified.length > 0) {
              console.log(
                chalk.yellow(
                  `\n📝 Files Modified: ${result.filesModified.length}`
                )
              );
              result.filesModified.forEach((file) =>
                console.log(chalk.gray(`   🔧 ${file}`))
              );
            }

            if (result.summary) {
              console.log(chalk.cyan("\n📋 Summary:"));
              console.log(chalk.white(result.summary));
            }

            if (result.nextSteps && result.nextSteps.length > 0) {
              console.log(chalk.magenta("\n🔄 Suggested Next Steps:"));
              result.nextSteps.forEach((step, index) =>
                console.log(chalk.gray(`   ${index + 1}. ${step}`))
              );
            }

            if (result.error) {
              console.log(chalk.red("\n❌ Final Error:"));
              console.log(chalk.red(result.error));
            }

            console.log(chalk.blue("\n🏁 Execution completed"));
            console.log(chalk.gray(`📊 Session logged to database under user: ${currentUser?.username}`));
            
          } catch (error: any) {
            console.error(chalk.red("\n❌ Agent execution failed:"));
            console.error(chalk.red(error.message));

            // Enhanced error handling with authentication context
            if (error.message.includes('Authentication required')) {
              console.log(chalk.yellow("\n🔑 Authentication issue detected:"));
              console.log(chalk.gray("   • Your session may have expired"));
              console.log(chalk.gray("   • Try logging in again: keen login"));
            } else if (error.message.includes('database') || error.message.includes('connection')) {
              console.log(chalk.yellow("\n🔧 Database issue detected:"));
              console.log(chalk.gray("   • Database connection may be unavailable"));
              console.log(chalk.gray("   • Check your system configuration"));
              console.log(chalk.gray("   • Contact support if issue persists"));
            }

            if (cliOptions?.debug) {
              console.error(chalk.gray("\nDebug information:"));
              console.error(error.stack);
            }

            process.exit(1);
          }
        }
      )
      .addHelpText(
        "after",
        `
🔑 Authentication Required:
  This command requires authentication. Run 'keen login' first.

📝 Examples:
  keen breathe "Create a beautiful photo gallery web app"
  keen breathe -f vision.md --verbose
  keen breathe readme --debug
  keen breathe "Fix broken tests" --dry-run

🔧 Options:
  --debug         Enable detailed debug logging
  --verbose       Show progress updates and detailed output
  --dry-run       Plan execution without making changes
  --max-iterations Set maximum conversation iterations (default: 100)
  
⚡ Quick Commands:
  keen breathe create      # Create new project with modern setup
  keen breathe readme      # Update README documentation
  keen breathe test        # Add comprehensive test suite
  keen breathe enhance     # Enhance existing project
  
🔄 5-Phase Execution:
  EXPLORE → PLAN → FOUND → SUMMON → COMPLETE
  • EXPLORE: Understand project structure and requirements
  • PLAN: Create detailed implementation strategy
  • FOUND: Build foundation and establish patterns
  • SUMMON: Implement solutions (may spawn specialized agents)
  • COMPLETE: Finalize, test, and report results
  
📊 User Context:
  • All sessions are logged with your user account
  • Admin users get unlimited resources and priority
  • Regular users have cost and rate limits applied`
      );
  }
}
