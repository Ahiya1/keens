/**
 * keen breathe '<vision>' Command - ENHANCED WITH AUTHENTICATION
 * Now requires user authentication and passes user context to agent
 * FIXED: All undefined/null value issues and TypeScript errors resolved
 * FIXED: All UserContext property access follows correct interface structure
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { KeenAgent } from "../../agent/KeenAgent.js";
import { CLIOptions, ValidationError, ValidationResult } from "../types.js";
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

/**
 * Validate CLI options to prevent undefined/null value issues
 * FIXED: No direct access to UserContext.email property
 */
function validateCLIOptions(options: CLIOptions): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!options.vision || options.vision.trim().length === 0) {
    errors.push({
      field: "vision",
      message: "Vision cannot be empty",
      value: options.vision
    });
  }

  // Validate numeric fields
  if (isNaN(options.maxIterations!) || options.maxIterations! <= 0) {
    errors.push({
      field: "maxIterations",
      message: "maxIterations must be a positive number",
      value: options.maxIterations
    });
  }

  if (isNaN(options.costBudget!) || options.costBudget! <= 0) {
    errors.push({
      field: "costBudget",
      message: "costBudget must be a positive number",
      value: options.costBudget
    });
  }

  // Validate directory
  if (!options.directory || !path.isAbsolute(options.directory)) {
    errors.push({
      field: "directory",
      message: "directory must be an absolute path",
      value: options.directory
    });
  }

  // Validate phase
  const validPhases = ["EXPLORE", "PLAN", "FOUND", "SUMMON", "COMPLETE"];
  if (!validPhases.includes(options.phase!)) {
    errors.push({
      field: "phase",
      message: `phase must be one of: ${validPhases.join(", ")}`,
      value: options.phase
    });
  }

  // FIXED: Validate user context without accessing non-existent email property
  if (options.userContext) {
    if (!options.userContext.userId ) {
      warnings.push("userContext.userId or userContext.id is missing - some features may not work properly");
    }
    // Check if user object exists and has email
    if (options.userContext.user && !options.userContext.user.email) {
      warnings.push("userContext.user.email is missing - user identification may be limited");
    } else if (!options.userContext.user) {
      warnings.push("userContext.user object is missing - user identification may be limited");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Safely parse numeric values with fallbacks
 */
function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseFloat(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clean user context to remove undefined properties
 * FIXED: Follow UserContext interface exactly - no direct email access
 */
function cleanUserContext(userContext: any) {
  if (!userContext) return null;

  // Build clean context following UserContext interface structure
  const cleanContext: any = {
    id: userContext.id || userContext.userId || null,     // UserContext requires 'id'
    userId: userContext.userId || userContext.id || null,
    isAdmin: userContext.isAdmin || false,
  };

  // Include admin privileges if they exist
  if (userContext.adminPrivileges) {
    cleanContext.adminPrivileges = userContext.adminPrivileges;
  }

  // Include the user object if it exists (this is where email lives)
  if (userContext.user) {
    cleanContext.user = {
      id: userContext.user.id || userContext.userId || userContext.id,
      email: userContext.user.email || null,
      username: userContext.user.username || null,
      display_name: userContext.user.display_name || userContext.user.displayName || null,
      role: userContext.user.role || "user",
    };
  }

  // Remove undefined values
  Object.keys(cleanContext).forEach(key => {
    if (cleanContext[key] === undefined) {
      delete cleanContext[key];
    }
  });

  return cleanContext;
}

/**
 * Get user display name from current user object
 * FIXED: Access properties according to the actual structure
 */
function getUserDisplayName(currentUser: any): string {
  return currentUser?.display_name || currentUser?.email || 'Unknown';
}

/**
 * Get user role from current user object
 * FIXED: Access properties according to the actual structure
 */
function getUserRole(currentUser: any): string {
  return currentUser?.role || 'user';
}

/**
 * Get email from cleaned user context
 * FIXED: Access email through user object only
 */
function getEmailFromUserContext(cleanedUserContext: any): string {
  return cleanedUserContext?.user?.email ||
         cleanedUserContext?.user?.username ||
         'User';
}

/**
 * Get user ID for logging
 * FIXED: Use correct property access
 */
function getUserIdForLogging(cleanedUserContext: any): string {
  return cleanedUserContext?.user?.email ||
         cleanedUserContext?.userId ||
         cleanedUserContext?.id ||
         'unknown';
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
            // 🔐 AUTHENTICATION REQUIRED
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
            let visionFile: string | undefined = undefined;

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
                  chalk.blue(`📄 Expanded shorthand: "${vision}" → "${finalVision}"`)
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

            // Get debug and verbose flags with safe defaults
            const debugMode =
              options.debug || command.parent?.opts().debug || false;
            const verboseMode =
              options.verbose || command.parent?.opts().verbose || false;

            // Safe parsing of numeric options
            const maxIterations = safeParseInt(options.maxIterations, 100);
            const costBudget = safeParseFloat(options.costBudget, 50.0);

            // Ensure directory is absolute
            const workingDirectory = path.resolve(options.directory || process.cwd());

            // Clean user context to remove undefined values
            const cleanedUserContext = cleanUserContext(userContext);

            // Parse and validate options with safe defaults
            cliOptions = {
              vision: finalVision,
              visionFile: visionFile, // Can be undefined, that's ok
              directory: workingDirectory,
              phase: options.phase || "EXPLORE",
              maxIterations: maxIterations,
              costBudget: costBudget,
              webSearch: !options.noWebSearch,
              extendedContext: options.extendedContext || true,
              dryRun: options.dryRun || false, // Explicit false instead of undefined
              verbose: verboseMode,
              debug: debugMode,
              stream: options.stream !== false,
              // Pass cleaned user context
              userContext: cleanedUserContext,
              // Additional safe defaults
              logLevel: "info",
              exportLogs: false,
              enhanced: true,
              specialization: "general",
              maxRecursionDepth: 10
            };

            // Validate the constructed options
            const validationResult = validateCLIOptions(cliOptions);
            if (!validationResult.valid) {
              console.error(chalk.red("❌ Invalid CLI options:"));
              validationResult.errors.forEach(error => {
                console.error(chalk.red(`  • ${error.field}: ${error.message}`));
                if (error.value !== undefined) {
                  console.error(chalk.gray(`    Current value: ${error.value}`));
                }
              });
              process.exit(1);
            }

            // Show warnings if any
            if (validationResult.warnings && validationResult.warnings.length > 0) {
              console.log(chalk.yellow("⚠️  Warnings:"));
              validationResult.warnings.forEach(warning => {
                console.log(chalk.yellow(`  • ${warning}`));
              });
            }

            // Additional legacy validation calls
            validateVision(
              finalVision,
              options.file ? "vision file" : "command argument"
            );

            validateDirectory(cliOptions.directory!);

            // Display startup information using safe property access
            console.log(chalk.blue("\n🤖 keen breathe - Autonomous Development Platform"));
            console.log(chalk.gray(`📁 Working Directory: ${cliOptions.directory}`));
            console.log(chalk.gray(`👤 User: ${getUserDisplayName(currentUser)} (${getUserRole(currentUser)})`));
            console.log(chalk.gray(`🎯 Vision: ${finalVision.length > 100 ? finalVision.substring(0, 100) + "..." : finalVision}`));
            console.log(chalk.gray(`⚙️  Phase: ${cliOptions.phase}`));
            console.log(chalk.gray(`🔢 Max Iterations: ${cliOptions.maxIterations}`));
            console.log(chalk.gray(`💰 Cost Budget: $${cliOptions.costBudget}`));

            if (visionFile) {
              console.log(chalk.gray(`📄 Vision file: ${visionFile}`));
            }

            if (currentUser?.isAdmin) {
              console.log(chalk.green("⚡ Admin mode: Unlimited resources"));
            }

            if (debugMode) {
              console.log(chalk.yellow("🐛 Debug mode: Enabled"));
            }
            if (verboseMode) {
              console.log(chalk.yellow("📢 Verbose mode: Enabled"));
            }

            // Generate unique session ID
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(chalk.blue(`🎆 Session ID: ${sessionId}`));

            if (cleanedUserContext?.userId) {
              console.log(chalk.gray(`🔑 User Context: ${cleanedUserContext.userId.substring(0, 8)}...`));
            }

            console.log(chalk.green("\n🚀 Starting autonomous execution..."));

            // Start progress indicator for initialization
            const progressStop = startProgressIndicator(
              "Initializing authenticated agent..."
            );

            // Create agent with validated options
            agent = new KeenAgent(cliOptions);

            // Stop initialization progress
            stopProgressIndicator(progressStop);

            if (cleanedUserContext) {
              const userEmail = getEmailFromUserContext(cleanedUserContext);
              console.log(chalk.green(`✅ Authenticated as: ${userEmail}`));
              if (cleanedUserContext.isAdmin) {
                console.log(chalk.green("   ⚡ Admin privileges active"));
              }
            }

            // Execute the agent
            const result = await agent.execute();

            // Display results using safe property access
            const duration = Date.now() - startTime;

            console.log(chalk.blue("\n" + "=".repeat(60)));
            console.log(chalk.blue("🏁 EXECUTION COMPLETE"));
            console.log(chalk.blue("=".repeat(60)));

            if (result.success) {
              console.log(chalk.green("✅ Agent execution completed successfully"));
            } else {
              console.log(chalk.red("⚠️  Agent execution completed (check results)"));
            }

            console.log(chalk.gray(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`));
            console.log(chalk.gray(`👤 Executed by: ${getUserDisplayName(currentUser)} (${getUserRole(currentUser)})`));

            if (result.error) {
              console.log(chalk.red(`❌ Final Error:`));
              console.log(chalk.red(result.error));
            }

            if (result.filesCreated && result.filesCreated.length > 0) {
              console.log(chalk.green("📄 Files created:"));
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

            if (result.totalCost !== undefined) {
              console.log(chalk.gray(`💰 Total cost: $${result.totalCost.toFixed(4)}`));
            }

            console.log(chalk.blue("🏁 Execution completed"));

            if (cleanedUserContext?.userId) {
              const userForLogging = getUserIdForLogging(cleanedUserContext);
              console.log(chalk.gray(`📊 Session logged to database under user: ${userForLogging}`));
            }

            // Exit with appropriate code
            process.exit(result.success ? 0 : 1);

          } catch (error: any) {
            console.error(chalk.red("\n❌ Agent execution failed:"));
            console.error(chalk.red(error.message));

            // Enhanced error handling with authentication context
            if (error.message.includes('Authentication required')) {
              console.error(chalk.yellow("💡 Hint: Run 'keen login' to authenticate first"));
            } else if (error.message.includes('database') || error.message.includes('connection')) {
              console.error(chalk.yellow("💡 Hint: Check your network connection and try again"));
            } else if (error.message.includes('undefined') || error.message.includes('null')) {
              console.error(chalk.yellow("💡 Hint: There may be a configuration issue. Try with --debug for more details"));
            }

            if (cliOptions?.debug) {
              console.error(chalk.gray("\nDebug information:"));
              console.error(chalk.gray("CLIOptions:"), JSON.stringify(cliOptions, null, 2));
              console.error(chalk.gray("UserContext:"), JSON.stringify(userContext, null, 2));
              console.error(chalk.gray("Stack trace:"));
              console.error(error.stack);
            }

            process.exit(1);
          }
        }
      )
      .addHelpText(
        "after",
        `
🔐 Authentication Required:
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

📋 5-Phase Execution:
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