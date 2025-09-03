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
              version: "3.1.0"
            };
            
            // 🔧 FIXED: Add system info conditionally for verbose mode
            if (options.verbose) {
              status.system = {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                cwd: process.cwd()
              };
            }
            
            console.log(JSON.stringify(status, null, 2));
            return;
          }

          // Human-readable output
          console.log(chalk.blue("🔍 keen Status"));
          console.log(chalk.gray("Authentication and system information\n"));

          // Authentication Status
          console.log(chalk.cyan("🔐 Authentication:"));
          if (isAuthenticated && currentUser) {
            console.log(chalk.green("   ✅ Authenticated"));
            console.log(chalk.white(`   👤 User: ${currentUser.displayName || currentUser.username}`));
            console.log(chalk.white(`   📧 Email: ${currentUser.email}`));
            console.log(chalk.white(`   🔐 Role: ${currentUser.role}`));
            
            if (currentUser.isAdmin) {
              console.log(chalk.yellow(`   ⚡ Admin: Yes`));
              if (options.verbose && currentUser.adminPrivileges) {
                console.log(chalk.gray("   🔧 Admin Privileges:"));
                const privileges = currentUser.adminPrivileges;
                Object.entries(privileges).forEach(([key, value]) => {
                  if (value) {
                    console.log(chalk.gray(`      • ${key.replace(/_/g, ' ')}`));
                  }
                });
              }
            } else {
              console.log(chalk.white(`   ⚡ Admin: No`));
            }
            
            // Show token expiry if verbose
            if (options.verbose && userContext) {
              console.log(chalk.gray(`   🕒 Session active`));
            }
          } else {
            console.log(chalk.red("   ❌ Not authenticated"));
            console.log(chalk.gray("   💡 Run 'keen login' to authenticate"));
          }

          console.log(""); // Empty line

          // System Information
          if (options.verbose) {
            console.log(chalk.cyan("🖥️  System Information:"));
            console.log(chalk.white(`   📦 keen Version: 3.1.0`));
            console.log(chalk.white(`   🌐 Node.js: ${process.version}`));
            console.log(chalk.white(`   🖥️  Platform: ${process.platform} (${process.arch})`));
            console.log(chalk.white(`   📁 Working Directory: ${process.cwd()}`));
            
            // Check database connectivity if authenticated
            if (isAuthenticated) {
              console.log(chalk.gray("   🔄 Checking database connection..."));
              try {
                const context = await cliAuth.getCurrentUserContext();
                if (context) {
                  console.log(chalk.green("   ✅ Database: Connected"));
                } else {
                  console.log(chalk.red("   ❌ Database: Connection failed"));
                }
              } catch (error) {
                console.log(chalk.red("   ❌ Database: Connection error"));
                if (options.verbose) {
                  console.log(chalk.gray(`      Error: ${error}`));
                }
              }
            }
            
            console.log(""); // Empty line
          }

          // Available Actions
          console.log(chalk.cyan("🚀 Available Actions:"));
          if (isAuthenticated) {
            console.log(chalk.green('   ✅ keen breathe "<vision>"     # Execute autonomous agent'));
            console.log(chalk.green("   ✅ keen breathe -f <file>      # Execute from vision file"));
            console.log(chalk.green("   ✅ keen converse              # Interactive conversation mode"));
            console.log(chalk.white("   📤 keen logout                # End current session"));
          } else {
            console.log(chalk.yellow("   🔐 keen login                 # Authenticate to unlock commands"));
            console.log(chalk.gray("   ❌ keen breathe               # Requires authentication"));
            console.log(chalk.gray("   ❌ keen converse              # Requires authentication"));
          }
          
          console.log(chalk.white("   ℹ️  keen status --verbose     # Detailed system information"));
          console.log(chalk.white("   ❓ keen --help                # Show all available commands"));
          
          if (!isAuthenticated) {
            console.log(chalk.yellow("\n💡 Pro tip: Login to unlock all keen features!"));
            console.log(chalk.gray('   Run: keen login'));
          }
          
        } catch (error: any) {
          if (options.json) {
            console.log(JSON.stringify({
              authenticated: false,
              error: error.message,
              timestamp: new Date().toISOString()
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
