/**
 * Status Command - Show authentication and system status
 * Displays current login status, user info, and system health
 */

import { Command } from "commander";
import chalk from "chalk";
import { cliAuth } from "../auth/CLIAuthManager.js";

export class StatusCommand {
  constructor(program: Command) {
    program
      .command("status")
      .alias("whoami")
      .description("Show current authentication status and user information")
      .option("--verbose", "Show detailed system information")
      .option("--json", "Output status information in JSON format")
      .action(async (options: any) => {
        try {
          // Initialize auth manager to load stored auth state
          await cliAuth.initialize();
          
          const isAuthenticated = cliAuth.isAuthenticated();
          const currentUser = cliAuth.getCurrentUser();
          const userContext = await cliAuth.getCurrentUserContext();
          
          if (options.json) {
            // JSON output
            const status: any = {
              authenticated: isAuthenticated,
              user: currentUser,
              userContext,
              timestamp: new Date().toISOString(),
              version: "3.1.0",
            };

            // Add system info conditionally for verbose mode
            if (options.verbose) {
              status.system = {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                cwd: process.cwd(),
              };
            }

            console.log(JSON.stringify(status, null, 2));
            return;
          }

          // Human-readable output
          console.log(chalk.blue("\n🔍 Authentication Status"));
          
          // Authentication Status
          if (isAuthenticated && currentUser) {
            console.log(chalk.green(`✅ Authenticated as: ${currentUser.username} (${currentUser.email})`));
            
            if (currentUser.isAdmin) {
              console.log(chalk.yellow(`🔑 Admin user with elevated privileges`));
              
              if (options.verbose && currentUser.adminPrivileges) {
                const privileges = currentUser.adminPrivileges;
                console.log(chalk.gray("   Admin privileges:"));
                Object.entries(privileges).forEach(([key, value]) => {
                  if (value) {
                    console.log(chalk.gray(`     • ${key}: enabled`));
                  }
                });
              }
            } else {
              console.log(chalk.cyan("👤 Regular user account"));
            }

            // Show session info if verbose (but don't reference tokenExpiry)
            if (options.verbose && userContext) {
              console.log(chalk.gray(`🕐 Session active for user: ${userContext.userId?.substring(0, 8)}...`));
            }
          } else {
            console.log(chalk.red("❌ Not authenticated"));
          }

          // Empty line
          console.log("");

          // System Information
          if (options.verbose) {
            console.log(chalk.blue("🖥️ System Information"));
            console.log(chalk.gray(`   Node.js: ${process.version}`));
            console.log(chalk.gray(`   Platform: ${process.platform} ${process.arch}`));
            console.log(chalk.gray(`   Working directory: ${process.cwd()}`));
            
            // Check database connectivity if authenticated
            if (isAuthenticated) {
              try {
                const context = await cliAuth.getCurrentUserContext();
                if (context) {
                  console.log(chalk.green("   Database: Connected ✅"));
                } else {
                  console.log(chalk.yellow("   Database: Connection issues ⚠️"));
                }
              } catch (error) {
                console.log(chalk.red("   Database: Connection failed ❌"));
                if (options.verbose) {
                  console.log(chalk.gray(`     Error: ${(error as Error).message}`));
                }
              }
            }
            
            // Empty line
            console.log("");
          }

          // Available Actions
          console.log(chalk.blue("🎯 Available Actions"));
          if (isAuthenticated) {
            console.log(chalk.green("   • keen breathe [vision]     # Start autonomous execution"));
            console.log(chalk.green("   • keen converse              # Interactive conversation"));
            console.log(chalk.green("   • keen manifest              # Create vision files"));
            console.log(chalk.green("   • keen logout                # End session"));
          } else {
            console.log(chalk.yellow("   • keen login                 # Authenticate with keen service"));
          }

          if (!isAuthenticated) {
            console.log(chalk.gray("\n💡 Run 'keen login' to access authenticated features"));
          }
        } catch (error: any) {
          if (options.json) {
            console.log(JSON.stringify({
              authenticated: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2));
          } else {
            console.error(chalk.red("❌ Error checking status: " + error.message));
          }

          process.exit(1);
        }
      })
      .addHelpText(
        "after",
        `\nExamples:\n  keen status                 # Show basic status\n  keen whoami                 # Same as status (alias)\n  keen status --verbose       # Show detailed information\n  keen status --json          # JSON output for scripts\n\nOutput:\n  • Authentication status and user details\n  • Available commands based on login state\n  • System information (with --verbose)\n  • Database connectivity (when authenticated)`
      );
  }
}