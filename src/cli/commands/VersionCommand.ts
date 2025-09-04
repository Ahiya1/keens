/**
 * keen version and info commands
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";

export class VersionCommand {
  constructor(program: Command) {
    // Version command (already handled by commander, but we can add info)
    program
      .command("info")
      .description("Show detailed keen platform information")
      .action(async () => {
        await this.showDetailedInfo();
      });
  }

  private async showDetailedInfo(): Promise<void> {
    console.log(chalk.cyan('🚀 keen Platform Information'));
    console.log(chalk.gray('=' .repeat(40)));

    // Read package.json for version info
    try {
      const packageJsonPath = path.join(__dirname, "../../../package.json");
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );

      console.log(chalk.blue(`Version: ${packageJson.version}`));
      console.log(chalk.blue(`Description: ${packageJson.description}`));
    } catch (error) {
      console.log(chalk.blue('Version: 3.2.0'));
      console.log(chalk.blue('Description: Autonomous Development Platform'));
    }

    // Check environment variables
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasDbConfig = !!(process.env.DB_HOST && process.env.DB_NAME);

    console.log('\n' + chalk.yellow('Configuration:'));
    console.log(`  Anthropic API Key: ${hasAnthropicKey ? chalk.green('✅ Configured') : chalk.red('❌ Missing')}`);
    console.log(`  Database Config: ${hasDbConfig ? chalk.green('✅ Configured') : chalk.red('❌ Missing')}`);
    console.log(`  Node.js Version: ${chalk.green(process.version)}`);
    console.log(`  Platform: ${chalk.green(process.platform)}`);

    console.log('\n' + chalk.magenta('For more help:'));
    console.log('  keen --help     - Show available commands');
    console.log('  keen login      - Authenticate with the platform');
  }
}
