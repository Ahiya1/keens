/**
 * Login Command - CLI authentication
 * Handles user login via email and password
 */

import { Command } from "commander";
import chalk from "chalk";
import readline from "readline";
import { cliAuth } from "../auth/CLIAuthManager.js";

export class LoginCommand {
  constructor(program: Command) {
    program
      .command("login")
      .description("Login to your keen account")
      .option("-e, --email <email>", "Email address for login")
      .option("-p, --password <password>", "Password (not recommended, will prompt if not provided)")
      .option("--remember", "Remember login for extended period")
      .action(async (options: any) => {try {
          // Check if already logged in
          if (cliAuth.isAuthenticated()) {
            const currentUser = cliAuth.getCurrentUser();// Ask if they want to logout and login as different user
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const answer = await new Promise<string>((resolve) => {
              rl.question(
                chalk.cyan("\n🤔 Login as different user? (y/n): "),
                (answer) => {
                  rl.close();
                  resolve(answer);

            });

            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {return;

            // Logout current sessionawait cliAuth.logout();

          // Get email
          let email = options.email;
          if (!email) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            email = await new Promise<string>((resolve) => {
              rl.question(chalk.cyan("📧 Email: "), (answer) => {
                rl.close();
                resolve(answer);
              });
            });

          if (!email?.trim()) {
            console.error(chalk.red("❌ Email is required"));
            process.exit(1);

          // Get password
          let password = options.password;
          if (!password) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            // Hide password input
            const stdin = process.stdin;
            stdin.setRawMode!(true);
            
            password = await new Promise<string>((resolve) => {let password = '';
              
              const onData = (char: Buffer) => {
                const c = char.toString('utf8');
                
                if (c === '\r' || c === '\n') {
                  // Enter pressed
                  stdin.setRawMode!(false);
                  stdin.removeListener('data', onData);
                  rl.close();// New line after hidden input
                  resolve(password);
                } else if (c === '\u0003') {
                  // Ctrl+C
                  stdin.setRawMode!(false);
                  process.exit(1);
                } else if (c === '\u007f' || c === '\b') {
                  // Backspace
                  if (password.length > 0) {
                    password = password.slice(0, -1);

                } else if (c >= ' ' && c <= '~') {
                  // Printable characters only
                  password += c;

              stdin.on('data', onData);
            });

          if (!password?.trim()) {
            console.error(chalk.red("❌ Password is required"));
            process.exit(1);

          // Attempt loginconst result = await cliAuth.login({
            email: email.trim(),
            password: password.trim(),
            remember: options.remember || false,
          });

          if (result.success) {const user = cliAuth.getCurrentUser();
            if (user) {if (user.isAdmin) {}
            }// Don't cleanup immediately - let the auth state persist
            // The CLI framework will handle cleanup on exit
          } else {
            console.error(chalk.red("\n❌ Login failed: " + result.message));process.exit(1);

        } catch (error: any) {
          console.error(chalk.red("\n❌ Login error: " + error.message));
          
          if (error.message.includes('database') || error.message.includes('connection')) {}
          
          process.exit(1);

      })
      .addHelpText(
        "after",
        `\nExamples:\n  keen login\n  keen login --email user@example.com\n  keen login --email user@example.com --remember\n\nSecurity:\n  • Passwords are never stored locally\n  • Session tokens are encrypted\n  • Use --remember for extended sessions\n\nNote:\n  First time users need to be created via the web interface or admin CLI.`

`