/**
 * Logout Command - CLI authentication
 * Handles user logout and session cleanup
 */

import { Command } from "commander";
import chalk from "chalk";
import { cliAuth } from "../auth/CLIAuthManager.js";

export class LogoutCommand {
  constructor(program: Command) {
    program
      .command("logout")
      .description("Logout from your keen account")
      .option("--force", "Force logout even if there are errors")
      .action(async (options: any) => {
        console.log(chalk.blue("📤 keen Logout"));
        
        try {
          // Check if user is logged in
          if (!cliAuth.isAuthenticated()) {
            const user = cliAuth.getCurrentUser();
            if (user) {
              console.log(chalk.yellow("⚠️  Session appears to be expired"));
              console.log(chalk.gray(`Last user: ${user.username} (${user.email})`));
            } else {
              console.log(chalk.yellow("⚠️  No active login session found"));
            }
            
            // Force cleanup anyway
            await cliAuth.logout();
            console.log(chalk.green("✅ Cleared any existing session data"));
            return;
          }

          const currentUser = cliAuth.getCurrentUser();
          if (currentUser) {
            console.log(chalk.gray(`Logging out: ${currentUser.username} (${currentUser.email})`));
          }

          console.log(chalk.gray("🔄 Revoking session tokens..."));
          
          const result = await cliAuth.logout();
          
          if (result.success) {
            console.log(chalk.green("\n✅ " + result.message));
            console.log(chalk.gray("🔒 All session tokens have been revoked"));
            console.log(chalk.gray("📱 Local authentication data cleared"));
            
            console.log(chalk.cyan("\n👋 Thanks for using keen!"));
            console.log(chalk.gray('To login again: keen login'));
          } else {
            if (options.force) {
              console.log(chalk.yellow("⚠️  Logout had issues but --force specified"));
              console.log(chalk.gray("🗑️  Clearing local session data anyway..."));
              
              // Force clear local state
              await cliAuth.logout();
              console.log(chalk.green("✅ Local session cleared"));
            } else {
              console.error(chalk.red("❌ Logout failed: " + result.message));
              console.log(chalk.yellow("\n💡 Use --force to clear local session anyway"));
              process.exit(1);
            }
          }
        } catch (error: any) {
          if (options.force) {
            console.log(chalk.yellow("⚠️  Error during logout, but --force specified:"));
            console.log(chalk.gray(error.message));
            
            try {
              await cliAuth.logout();
              console.log(chalk.green("✅ Local session cleared"));
            } catch (cleanupError) {
              console.error(chalk.red("❌ Failed to clear local session"));
              process.exit(1);
            }
          } else {
            console.error(chalk.red("❌ Logout error: " + error.message));
            console.log(chalk.yellow("\n💡 Use --force to ignore errors and logout anyway"));
            process.exit(1);
          }
        }
      })
      .addHelpText(
        "after",
        `\nExamples:\n  keen logout\n  keen logout --force\n\nBehavior:\n  • Revokes all session tokens on server\n  • Clears local authentication data\n  • Use --force to handle network/server errors`
      );
  }
}
