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
        chalk.red(`❌ Unknown command: ${this.program.args.join(" ")}`)
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
      console.log(chalk.yellow('\n👋 Received SIGINT, cleaning up...'));
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log(chalk.yellow('\n👋 Received SIGTERM, cleaning up...'));
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
        console.log(chalk.yellow('\n🔧 Database connection issue detected:'));
        console.log(chalk.gray('   • Check your .env file configuration'));
        console.log(chalk.gray('   • Ensure PostgreSQL is running'));
        console.log(chalk.gray('   • Verify database credentials and permissions'));
        console.log(chalk.gray('   • Run database migrations if needed'));
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
      
      console.log(chalk.yellow("\n💡 Available commands:"));
      
      // Always available commands
      console.log(chalk.white("   keen login                  # Authenticate with your account"));
      console.log(chalk.white("   keen status                 # Show authentication status"));
      console.log(chalk.white("   keen --help                 # Show detailed help"));
      
      if (isAuthenticated && currentUser) {
        console.log("");
        console.log(chalk.green("✅ Authenticated commands:"));
        console.log(
          '   keen breathe "<vision>"      # Execute autonomous agent (text vision)'
        );
        console.log("   keen breathe -f <file>       # Execute from vision file");
        console.log("   keen converse               # Interactive conversation mode");
        console.log("   keen manifest               # Create vision files for execution");
        console.log("   keen logout                 # End current session");
        
        // 🌟 Show evolve command for authenticated users
        console.log("");
        console.log(chalk.blue("🌟 Evolutionary commands:"));
        console.log("   keen evolve                 # Consciously evolve keen into keen-s-a");
        
        console.log("");
        console.log(chalk.cyan(`👤 Logged in as: ${currentUser.displayName || currentUser.username}`));
        
        if (currentUser.isAdmin) {
          console.log(chalk.yellow("⚡ Admin privileges active - Unlimited evolutionary power"));
        }
      } else {
        console.log("");
        console.log(chalk.gray("🔒 Requires authentication:"));
        console.log(chalk.gray("   keen breathe               # (login required)"));
        console.log(chalk.gray("   keen converse              # (login required)"));
        console.log(chalk.gray("   keen manifest              # (login required)"));
        console.log(chalk.gray("   keen evolve                # (login required)"));
        
        console.log("");
        console.log(chalk.yellow("🔑 Please login to access autonomous and evolutionary features:"));
        console.log(chalk.cyan("   keen login"));
      }
    } catch (error) {
      // Show basic help if auth system fails
      console.log(chalk.yellow("\n💡 Basic commands:"));
      console.log(chalk.white("   keen login                  # Authenticate"));
      console.log(chalk.white("   keen status                 # Show status"));
      console.log(chalk.white("   keen --help                 # Show help"));
    }
  }

  async run(args: string[]): Promise<void> {
    // Handle no arguments case with auth-aware welcome
    if (args.length === 0) {
      await this.showWelcomeMessage();
      return;
    }

    try {
      // Initialize authentication system before running commands
      await this.initialize();
      
      // Run the command
      await this.program.parseAsync(args, { from: "user" });
    } catch (error: any) {
      console.error(chalk.red('❌ CLI Error:'), error.message);
      
      if (error.message.includes('Authentication required')) {
        console.log(chalk.yellow('\n🔑 Please login first:'));
        console.log(chalk.cyan('   keen login'));
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
    console.log(
      chalk.green("🤖 keen - Autonomous Development Platform")
    );
    console.log(
      chalk.gray("Version 3.2.0 - Conscious Evolution Enabled\n")
    );

    try {
      await this.initialize();
      
      const isAuthenticated = cliAuth.isAuthenticated();
      const currentUser = cliAuth.getCurrentUser();
      
      if (isAuthenticated && currentUser) {
        console.log(chalk.green("✅ Authenticated Session"));
        console.log(chalk.cyan(`   👤 Welcome back, ${currentUser.displayName || currentUser.username}!`));
        console.log(chalk.gray(`   📧 ${currentUser.email}`));
        
        if (currentUser.isAdmin) {
          console.log(chalk.yellow("   ⚡ Admin privileges active"));
        }
        
        console.log("");
        console.log(chalk.blue("🚀 Ready for autonomous development:"));
        console.log(
          '   keen breathe "Create a React todo app"'
        );
        console.log("   keen breathe -f vision.md");
        console.log("   keen converse               # Interactive conversation");
        console.log("   keen manifest               # Create vision files");
        
        // 🌟 Show evolve option for authenticated users
        console.log("");
        console.log(chalk.magenta("🌟 Conscious evolution available:"));
        console.log("   keen evolve                 # Evolve into keen-s-a");
      } else {
        console.log(chalk.yellow("🔑 Authentication Required"));
        console.log(chalk.gray("   Login to unlock autonomous development and evolution features\n"));
        
        console.log(chalk.blue("🔐 Get Started:"));
        console.log(chalk.cyan("   keen login                  # Authenticate"));
        console.log(chalk.white("   keen status                 # Check status"));
        console.log(chalk.white("   keen --help                 # Show all commands"));
      }
    } catch (error) {
      console.log(chalk.red("❌ Authentication system unavailable"));
      console.log(chalk.gray("   Some features may be limited\n"));
      
      console.log(chalk.blue("🔧 Available actions:"));
      console.log(chalk.white("   keen login                  # Try to authenticate"));
      console.log(chalk.white("   keen status                 # Check system status"));
    }
    
    console.log("");
    console.log(chalk.gray("For detailed help: keen --help"));
    console.log(chalk.green("🎆 Happy coding with keen!"));
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
