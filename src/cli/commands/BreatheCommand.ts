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
    docs: "Improve project documentation including README, API docs, and code comments"
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
              if (currentUser.isAdmin) {
                console.log(chalk.blue("🔧 Admin user detected - unlimited resources"));
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
                    chalk.red(`❌ Vision file not found: ${options.file}`)
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
                  chalk.blue(`🔄 Expanded shorthand: "${vision}" → "${finalVision}"`)  
                );
              }
            } else {
              console.error(
                chalk.red(
                  "❌ Error: Vision is required (either as argument or via -f flag)"
                )
              );
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
              userContext: userContext,
            };

            // Validate inputs
            validateVision(
              finalVision,
              options.file ? "vision file" : "command argument"
            );

            validateDirectory(cliOptions.directory!);

            // Display startup information
            console.log(chalk.blue("\n🌬️ Keen Agent - Autonomous Development"));
            console.log(chalk.gray(`📍 Working directory: ${cliOptions.directory}`));

            if (visionFile) {
              console.log(chalk.gray(`📄 Vision file: ${visionFile}`));
            } else {
              console.log(
                chalk.gray(
                  `💭 Vision: ${finalVision.length > 100 ? finalVision.substring(0, 100) + "..." : finalVision}`
                )
              );
            }

            if (currentUser?.isAdmin) {
              console.log(chalk.green("🔧 Admin mode: Unlimited resources"));
            }

            if (debugMode) {
              console.log(chalk.yellow("🐛 Debug mode: Enabled"));
            }
            if (verboseMode) {
              console.log(chalk.yellow("📢 Verbose mode: Enabled"));
            }

            // Start progress indicator for initialization
            const progressStop = startProgressIndicator(
              "Initializing authenticated agent..."
            );

            // 🎆 Create agent with user context
            agent = new KeenAgent(cliOptions);

            // Stop initialization progress
            stopProgressIndicator(progressStop);
            
            if (userContext) {
              console.log(chalk.green(`✅ Authenticated as: ${userContext.email || 'User'}`));
            }

            // Execute the agent
            const result = await agent.execute();

            // Display results
            const duration = Date.now() - startTime;
            
            if (result.success) {
              console.log(chalk.green("\n✅ Agent execution completed successfully!"));
            } else {
              console.log(chalk.red("\n❌ Agent execution completed with issues."));
            }

            console.log(
              chalk.gray(`⏱️ Execution time: ${(duration / 1000).toFixed(2)}s`)
            );

            if (currentUser) {
              console.log(chalk.gray(`👤 User: ${currentUser.email || 'Unknown'}`));
            }

            if (result.filesCreated && result.filesCreated.length > 0) {
              console.log(chalk.green("📁 Files created:"));
              result.filesCreated.forEach((file) =>
                console.log(chalk.green(`  + ${file}`))
              );
            }

            if (result.filesModified && result.filesModified.length > 0) {
              console.log(chalk.yellow("📝 Files modified:"));
              result.filesModified.forEach((file) =>
                console.log(chalk.yellow(`  ~ ${file}`))
              );
            }

            if (result.summary) {
              console.log(chalk.blue(`\n📋 Summary: ${result.summary}`));
            }

            if (result.nextSteps && result.nextSteps.length > 0) {
              console.log(chalk.cyan("\n🎯 Next steps:"));
              result.nextSteps.forEach((step, index) =>
                console.log(chalk.cyan(`  ${index + 1}. ${step}`))
              );
            }

            if (result.error) {
              console.error(chalk.red(`\n❌ Error: ${result.error}`));
            }
          } catch (error: any) {
            console.error(chalk.red("\n❌ Agent execution failed:"));
            console.error(chalk.red(error.message));

            // Enhanced error handling with authentication context
            if (error.message.includes('Authentication required')) {
              console.error(chalk.yellow("💡 Hint: Run 'keen login' to authenticate first"));
            } else if (error.message.includes('database') || error.message.includes('connection')) {
              console.error(chalk.yellow("💡 Hint: Check your network connection and try again"));
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