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
        try {
          // Check if user is logged in
          if (!cliAuth.isAuthenticated()) {
            const user = cliAuth.getCurrentUser();
            if (user) {
              console.log(chalk.yellow('⚠️  Session appears expired, clearing local state...'));
            } else {
              console.log(chalk.blue('👋 Already logged out'));
            }
            
            // Force cleanup anyway
            await cliAuth.logout();
            return;
          }

          const currentUser = cliAuth.getCurrentUser();
          if (currentUser) {
            console.log(chalk.blue(`🔐 Logging out ${currentUser.email}...`));
          }
          
          const result = await cliAuth.logout();
          
          if (result.success) {
            console.log(chalk.green('✅ ' + result.message));
          } else {
            if (options.force) {
              console.log(chalk.yellow('⚠️  Server logout failed, but clearing local session...'));
              // Force clear local state
              await cliAuth.logout();
              console.log(chalk.green('✅ Local session cleared'));
            } else {
              console.error(chalk.red("❌ Logout failed: " + result.message));
              process.exit(1);
            }
          }

        } catch (error: any) {
          if (options.force) {
            console.log(chalk.yellow('⚠️  Error during logout, forcing cleanup...'));
            
            try {
              await cliAuth.logout();
              console.log(chalk.green('✅ Local session cleared'));
            } catch (cleanupError) {
              console.error(chalk.red("❌ Failed to clear local session"));
              process.exit(1);
            }
          } else {
            console.error(chalk.red("❌ Logout error: " + error.message));
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
