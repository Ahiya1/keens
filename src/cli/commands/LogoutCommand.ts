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
      .action(async (options: any) => {try {
          // Check if user is logged in
          if (!cliAuth.isAuthenticated()) {
            const user = cliAuth.getCurrentUser();
            if (user) {} else {}
            
            // Force cleanup anyway
            await cliAuth.logout();return;

          const currentUser = cliAuth.getCurrentUser();
          if (currentUser) {}const result = await cliAuth.logout();
          
          if (result.success) {} else {
            if (options.force) {// Force clear local state
              await cliAuth.logout();} else {
              console.error(chalk.red("❌ Logout failed: " + result.message));process.exit(1);

        } catch (error: any) {
          if (options.force) {try {
              await cliAuth.logout();} catch (cleanupError) {
              console.error(chalk.red("❌ Failed to clear local session"));
              process.exit(1);

          } else {
            console.error(chalk.red("❌ Logout error: " + error.message));process.exit(1);

      })
      .addHelpText(
        "after",
        `\nExamples:\n  keen logout\n  keen logout --force\n\nBehavior:\n  • Revokes all session tokens on server\n  • Clears local authentication data\n  • Use --force to handle network/server errors`

`