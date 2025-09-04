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

  private async showDetailedInfo(): Promise<void> {// Read package.json for version info
    try {
      const packageJsonPath = path.join(__dirname, "../../../package.json");
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );} catch (error) {}// Check environment variables
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasDbConfig = !!(process.env.DB_HOST && process.env.DB_NAME);: chalk.red("❌ Missing")}`
    );: chalk.red("❌ Missing")}`
    ););

`