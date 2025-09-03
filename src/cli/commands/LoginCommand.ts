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
      .action(async (options: any) => {
        console.log(chalk.blue("🔐 keen Login"));
        console.log(chalk.gray("Authenticate to access autonomous agent features\n"));

        try {
          // Check if already logged in
          if (cliAuth.isAuthenticated()) {
            const currentUser = cliAuth.getCurrentUser();
            console.log(chalk.yellow("⚠️  Already logged in as:"));
            console.log(chalk.white(`   👤 ${currentUser?.username} (${currentUser?.email})`));
            
            // Ask if they want to logout and login as different user
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            const answer = await new Promise<string>((resolve) => {
              rl.question(
                chalk.cyan("\n🤔 Login as different user? (y/n): "),
                (answer) => {
                  rl.close();
                  resolve(answer);
                }
              );
            });

            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
              console.log(chalk.green("\n✅ Using existing login session"));
              return;
            }

            // Logout current session
            console.log(chalk.gray("\n📤 Logging out current session..."));
            await cliAuth.logout();
          }

          // Get email
          let email = options.email;
          if (!email) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            email = await new Promise<string>((resolve) => {
              rl.question(chalk.cyan("📧 Email: "), (answer) => {
                rl.close();
                resolve(answer);
              });
            });
          }

          if (!email?.trim()) {
            console.error(chalk.red("❌ Email is required"));
            process.exit(1);
          }

          // Get password
          let password = options.password;
          if (!password) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            // Hide password input
            const stdin = process.stdin;
            stdin.setRawMode!(true);
            
            password = await new Promise<string>((resolve) => {
              console.log(chalk.cyan("🔑 Password: "));
              let password = '';
              
              const onData = (char: Buffer) => {
                const c = char.toString('utf8');
                
                if (c === '\r' || c === '\n') {
                  // Enter pressed
                  stdin.setRawMode!(false);
                  stdin.removeListener('data', onData);
                  rl.close();
                  console.log(); // New line after hidden input
                  resolve(password);
                } else if (c === '\u0003') {
                  // Ctrl+C
                  stdin.setRawMode!(false);
                  process.exit(1);
                } else if (c === '\u007f' || c === '\b') {
                  // Backspace
                  if (password.length > 0) {
                    password = password.slice(0, -1);
                  }
                } else if (c >= ' ' && c <= '~') {
                  // Printable characters only
                  password += c;
                }
              };
              
              stdin.on('data', onData);
            });
          }

          if (!password?.trim()) {
            console.error(chalk.red("❌ Password is required"));
            process.exit(1);
          }

          // Attempt login
          console.log(chalk.gray("\n🔄 Authenticating..."));
          
          const result = await cliAuth.login({
            email: email.trim(),
            password: password.trim(),
            remember: options.remember || false
          });

          if (result.success) {
            console.log(chalk.green("\n✅ " + result.message));
            
            const user = cliAuth.getCurrentUser();
            if (user) {
              console.log(chalk.gray(`👤 User: ${user.displayName || user.username}`));
              console.log(chalk.gray(`📧 Email: ${user.email}`));
              console.log(chalk.gray(`🔐 Role: ${user.role}${user.isAdmin ? ' (Admin)' : ''}`));
              
              if (user.isAdmin) {
                console.log(chalk.yellow("\n⚡ Admin privileges enabled:"));
                console.log(chalk.gray("   • Unlimited credits and rate limits"));
                console.log(chalk.gray("   • Access to system diagnostics"));
                console.log(chalk.gray("   • User management capabilities"));
              }
            }
            
            console.log(chalk.cyan("\n🚀 Ready to use keen commands!"));
            console.log(chalk.gray('Try: keen breathe "Create a simple todo app"'));
          } else {
            console.error(chalk.red("\n❌ Login failed: " + result.message));
            console.log(chalk.yellow("\n💡 Troubleshooting:"));
            console.log(chalk.gray("   • Check your email and password"));
            console.log(chalk.gray("   • Ensure your account is active"));
            console.log(chalk.gray("   • Contact support if issues persist"));
            process.exit(1);
          }
        } catch (error: any) {
          console.error(chalk.red("\n❌ Login error: " + error.message));
          
          if (error.message.includes('database') || error.message.includes('connection')) {
            console.log(chalk.yellow("\n🔧 Database connection issue detected"));
            console.log(chalk.gray("   • Check your database configuration"));
            console.log(chalk.gray("   • Ensure the keen database is running"));
            console.log(chalk.gray("   • Verify your .env file settings"));
          }
          
          process.exit(1);
        }
      })
      .addHelpText(
        "after",
        `\nExamples:\n  keen login\n  keen login --email user@example.com\n  keen login --email user@example.com --remember\n\nSecurity:\n  • Passwords are never stored locally\n  • Session tokens are encrypted\n  • Use --remember for extended sessions\n\nNote:\n  First time users need to be created via the web interface or admin CLI.`
      );
  }
}
