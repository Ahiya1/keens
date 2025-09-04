/**
 * EnvLoader - Environment variable loading with multiple fallback locations
 * Based on a2s2 implementation - handles package usage from different directories
 * FIXED: Robust error handling to prevent crashes with .env/.env.local files
 */

import fs from "fs";
import path from "path";

export class EnvLoader {
  private static loaded = false;
  private static debug = process.env.KEEN_DEBUG === 'true';

  static load(): void {
    if (this.loaded) return;

    // Try loading from .env files in multiple locations
    const possibleEnvFiles = [
      ".env",
      ".env.local",
      path.join(process.env.HOME || "~", ".keen.env"),
      // Also try parent directories for when installed as package
      path.join(process.cwd(), ".env"),
      path.join(process.cwd(), "../.env"),
      path.join(process.cwd(), "../../.env"),
    ];

    for (const envFile of possibleEnvFiles) {
      try {
        if (fs.existsSync(envFile)) {
          this.loadFromFile(envFile);
          if (this.debug) {
            this.safeLog(`Loaded environment variables from ${envFile}`);
          }
        }
      } catch (error) {
        // FIXED: Robust error handling - never crash on env file issues
        if (this.debug) {
          this.safeLog(`Failed to load ${envFile}: ${(error as Error).message}`);
        }
        // Continue processing other files even if one fails
      }
    }

    this.loaded = true;
  }

  private static loadFromFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      for (const line of lines) {
        try {
          const trimmed = line.trim();
          
          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith("#")) {
            continue;
          }
          
          // Parse key=value pairs more robustly
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex === -1) {
            // Skip malformed lines instead of crashing
            if (this.debug) {
              this.safeLog(`Skipping malformed line in ${filePath}: ${line}`);
            }
            continue;
          }
          
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();
          
          // Validate key format
          if (!key || !this.isValidEnvKey(key)) {
            if (this.debug) {
              this.safeLog(`Skipping invalid key in ${filePath}: ${key}`);
            }
            continue;
          }
          
          // Only set if not already set (don't override existing env vars)
          if (!process.env[key]) {
            // Remove surrounding quotes if present
            const cleanValue = this.cleanQuotes(value);
            process.env[key] = cleanValue;
          }
          
        } catch (lineError) {
          // FIXED: Never crash on individual line parsing errors
          if (this.debug) {
            this.safeLog(`Error parsing line "${line}" in ${filePath}: ${(lineError as Error).message}`);
          }
          // Continue with next line
        }
      }
    } catch (error) {
      // FIXED: Never crash on file parsing errors
      if (this.debug) {
        this.safeLog(`Failed to parse env file ${filePath}: ${(error as Error).message}`);
      }
      // Don't throw - just log and continue
    }
  }
  
  /**
   * Validate environment variable key format
   */
  private static isValidEnvKey(key: string): boolean {
    // Basic validation: alphanumeric and underscores, not starting with number
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
  }
  
  /**
   * Clean quotes from environment variable values
   */
  private static cleanQuotes(value: string): string {
    if (!value) return value;
    
    // Remove matching quotes from start and end
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    return value;
  }
  
  /**
   * Safe logging that won't crash if console methods don't exist
   */
  private static safeLog(message: string): void {
    try {
      // Use process.stdout.write instead of console.debug which might not exist
      if (process.stdout && typeof process.stdout.write === 'function') {
        process.stdout.write(`[KEEN ENV] ${message}\n`);
      }
    } catch {
      // Ignore logging errors completely - never crash on logging
    }
  }

  static createGlobalEnvFile(): void {
    const envFile = path.join(process.env.HOME || "~", ".keen.env");

    try {
      if (fs.existsSync(envFile)) {
        this.safeLog(`Global keen environment file already exists at ${envFile}`);
        return;
      }

      // Read the current .env file for template
      const localEnvFile = path.join(process.cwd(), ".env");
      let templateContent = "";

      try {
        if (fs.existsSync(localEnvFile)) {
          templateContent = fs.readFileSync(localEnvFile, "utf8");
        } else {
          // Minimal template if no local .env exists
          templateContent = `# Keen Platform Configuration
# Anthropic API Configuration
ANTHROPIC_API_KEY=your-api-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=keen_development
DB_USER=keen_user
DB_PASSWORD=secure_password

# Admin Configuration  
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin-password

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
`;
        }
      } catch (error) {
        // Use default template if local .env can't be read
        templateContent = `# Keen Platform Configuration
# Add your environment variables here
`;
        if (this.debug) {
          this.safeLog(`Could not read template .env file: ${(error as Error).message}`);
        }
      }

      try {
        fs.writeFileSync(envFile, templateContent);
        this.safeLog(`✅ Created global keen environment file at ${envFile}`);
        this.safeLog(`Please edit this file to set your configuration.`);
      } catch (error) {
        this.safeLog(`Failed to create global env file at ${envFile}: ${(error as Error).message}`);
      }
      
    } catch (error) {
      // FIXED: Never crash on global env file creation errors
      if (this.debug) {
        this.safeLog(`Error in createGlobalEnvFile: ${(error as Error).message}`);
      }
    }
  }

  static getEnvFilePaths(): string[] {
    return [
      ".env",
      ".env.local",
      path.join(process.env.HOME || "~", ".keen.env"),
      path.join(process.cwd(), "../../.env"),
    ];
  }
  
  /**
   * Check if .env files exist and are readable
   */
  static validateEnvFiles(): { valid: string[]; invalid: string[]; errors: string[] } {
    const result = {
      valid: [] as string[],
      invalid: [] as string[],
      errors: [] as string[],
    };
    
    const envFiles = this.getEnvFilePaths();
    
    for (const envFile of envFiles) {
      try {
        if (fs.existsSync(envFile)) {
          // Try to read and parse the file
          const content = fs.readFileSync(envFile, 'utf8');
          // Basic validation - check if it's parseable
          const lines = content.split('\n');
          let hasValidLines = false;
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              hasValidLines = true;
              break;
            }
          }
          
          if (hasValidLines) {
            result.valid.push(envFile);
          } else {
            result.invalid.push(envFile);
            result.errors.push(`${envFile}: No valid environment variables found`);
          }
        }
      } catch (error) {
        result.invalid.push(envFile);
        result.errors.push(`${envFile}: ${(error as Error).message}`);
      }
    }
    
    return result;
  }
}
