/**
 * keen CLI - Enhanced with Authentication and Evolution
 * Integrated with database and authentication systems
 */

import { Command } from "commander";
import chalk from "chalk";
import { BreatheCommand } from "./commands/BreatheCommand.js";
import { VersionCommand } from "./commands/VersionCommand.js";
import { ConverseCommand } from "./commands/ConverseCommand.js";
import { ManifestCommand } from "./commands/ManifestCommand.js";
import { LoginCommand } from "./commands/LoginCommand.js";
import { LogoutCommand } from "./commands/LogoutCommand.js";
import { StatusCommand } from "./commands/StatusCommand.js";
import { EvolveCommand } from "./commands/EvolveCommand.js";
import { cliAuth } from "./auth/CLIAuthManager.js";

export class KeenCLI {
  private program: Command;
  private initialized: boolean = false;

  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  private setupCLI(): void {
    this.program
      .name("keen")
      .description("🚀 Autonomous Development Platform with Conscious Evolution")
      .version("3.2.0")
      .helpOption("-h, --help", "Display help for command")
      .configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd) => cmd.name() + " " + cmd.usage(),
      });

    // Add global options
    this.program
      .option("-v, --verbose", "Enable verbose output with progress updates")
      .option("--debug", "Enable extensive debug logging")
      .option("--no-color", "Disable colored output")
      .option(
        "--directory <dir>",
        "Working directory (default: current directory)"
      )
      .option(
        "--log-level <level>",
        "Set logging level: trace, debug, info, warn, error",
        "info"
      );

    // Register authentication commands (no auth required)
    new LoginCommand(this.program);
    new LogoutCommand(this.program);
    new StatusCommand(this.program);
    new VersionCommand(this.program);

    // Register main commands (auth required)
    new BreatheCommand(this.program);
    new ConverseCommand(this.program);
    new ManifestCommand(this.program);

    // 🌟 Register evolution command (auth required)
    new EvolveCommand(this.program);

    // Handle unknown commands with auth-aware help
    this.program.on("command:*", async () => {
      console.error(
        chalk.red("❌ Unknown command. Use 'keen --help' for available commands.")
      );
      await this.showContextualHelp();
      process.exit(1);
    });

    // Handle global errors
    process.on('unhandledRejection', async (reason, promise) => {
      console.error(chalk.red('❌ Unhandled rejection:'), reason);
      await this.cleanup();
      process.exit(1);
    });

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Initialize CLI with authentication system
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await cliAuth.initialize();
      this.initialized = true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to initialize authentication system:'));
      console.error(chalk.gray(error.message));

      if (error.message.includes('database') || error.message.includes('connection')) {
        console.error(chalk.yellow('💡 Try: keen login --setup'));
      }

      throw error;
    }
  }

  /**
   * Show contextual help based on authentication status
   */
  private async showContextualHelp(): Promise<void> {
    try {
      await this.initialize();

      const isAuthenticated = cliAuth.isAuthenticated();
      const currentUser = cliAuth.getCurrentUser();

      // Always available commands
      console.log(chalk.blue('Available commands:'));
      console.log('  keen login   - Authenticate with keen platform');
      console.log('  keen status  - Check authentication status');
      console.log('  keen version - Show version information');

      if (isAuthenticated && currentUser) {
        console.log('\n' + chalk.green('Authenticated commands:'));
        console.log('  keen breathe - Execute autonomous development tasks');
        console.log('  keen converse - Start an interactive conversation');
        console.log('  keen manifest - Generate project manifest');

        // 🌟 Show evolve command for authenticated users
        console.log('  keen evolve  - Evolve your project with AI guidance');

        if (currentUser.isAdmin) {
          console.log('\n' + chalk.magenta('Admin commands available'));
        }
      } else {
        console.log('\n' + chalk.yellow('📝 Use "keen login" to access full functionality'));
      }
    } catch (error) {
      // Show basic help if auth system fails
      console.log(chalk.blue('Basic commands:'));
      console.log('  keen login   - Authenticate with keen platform');
      console.log('  keen version - Show version information');
    }
  }

  async run(args: string[]): Promise<void> {
    // Handle no arguments case with auth-aware welcome
    // When no command is provided (just 'keen'), show welcome
    if (args.length < 3) {
      await this.showWelcomeMessage();
      return;
    }

    try {
      // Initialize authentication system before running commands
      await this.initialize();

      // Run the command - pass all arguments
      await this.program.parseAsync(args);
    } catch (error: any) {
      console.error(chalk.red('❌ CLI Error:'), error.message);

      if (error.message.includes('Authentication required')) {
        console.error(chalk.yellow('📝 Use "keen login" to authenticate first'));
      }

      if (process.env.DEBUG) {
        console.error(error.stack);
      }

      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * Show welcome message with auth status
   */
  private async showWelcomeMessage(): Promise<void> {
    console.log(chalk.cyan('🚀 Welcome to keen - Autonomous Development Platform'));
    console.log(chalk.gray('Version 3.2.0\n'));

    try {
      await this.initialize();

      const isAuthenticated = cliAuth.isAuthenticated();
      const currentUser = cliAuth.getCurrentUser();

      if (isAuthenticated && currentUser) {
        console.log(chalk.green(`✅ Authenticated as: ${currentUser.email}`));

        if (currentUser.isAdmin) {
          console.log(chalk.magenta('👑 Admin privileges enabled'));
        }

        console.log('\n' + chalk.blue('Quick start:'));
        console.log('  keen breathe "Improve my React app performance"');

        // 🌟 Show evolve option for authenticated users
        console.log('  keen evolve  "Add authentication to my app"');
      } else {
        console.log(chalk.yellow('⚠️  Not authenticated'));
        console.log('\n' + chalk.blue('Get started:'));
        console.log('  keen login   - Sign in to your account');
        console.log('  keen --help  - Show all available commands');
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Authentication system unavailable'));
      console.log('\n' + chalk.blue('Basic usage:'));
      console.log('  keen login   - Authenticate with keen platform');
      console.log('  keen --help  - Show available commands');
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.initialized) {
        await cliAuth.cleanup();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Export for main CLI entry point
export { KeenCLI as default };
