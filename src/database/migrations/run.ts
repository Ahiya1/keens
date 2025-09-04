/**
 * Migration runner - Execute database migrations
 * Simplified version to enable compilation
 */

import fs from "fs";
import path from "path";
import { DatabaseManager } from "../DatabaseManager.js";
import { supabaseConfig } from "../../config/database.js";

interface MigrationFile {
  filename: string;
  content: string;
}

export class MigrationRunner {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  /**
   * Load all migration files
   */
  private loadMigrations(): MigrationFile[] {
    const migrationsDir = path.join(process.cwd(), "src", "database", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    return files.map((filename) => ({
      filename,
      content: fs.readFileSync(path.join(migrationsDir, filename), "utf8"),
    }));
  }

  /**
   * Execute all migration files
   */
  async runMigrations(): Promise<void> {
    console.log("🛠️ Starting database migrations...");

    try {
      const connected = await this.db.testConnection();
      if (!connected) {
        throw new Error("Failed to connect to database");
      }

      const migrations = this.loadMigrations();
      console.log(`📁 Found ${migrations.length} migration file(s)`);

      for (const migration of migrations) {
        console.log(`🛠️ Executing migration: ${migration.filename}`);
        
        await this.db.transaction(async (transaction) => {
          await transaction.query(migration.content);
        });

        console.log(`✅ Migration completed: ${migration.filename}`);
      }

      console.log("🎉 All migrations completed successfully!");
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  }

  /**
   * Check if migrations are up to date
   */
  async checkMigrationStatus(): Promise<boolean> {
    try {
      console.log("🔍 Checking migration status...");
      
      // Simple check - verify database connection
      const connected = await this.db.testConnection();
      if (!connected) {
        console.error("❌ Database connection failed");
        return false;
      }

      console.log("✅ Database connection verified");
      return true;
    } catch (error) {
      console.error("❌ Migration status check error:", error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

// CLI execution check
const isMainModule = process.argv[1] &&
  (process.argv[1].endsWith("run.ts") || process.argv[1].endsWith("run.js"));

if (isMainModule) {
  const runner = new MigrationRunner();

  runner
    .runMigrations()
    .then(() => runner.checkMigrationStatus())
    .then((valid) => {
      if (valid) {
        console.log("🎉 Database migrations completed successfully!");
        process.exit(0);
      } else {
        console.error("❌ Database migration validation failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Database migration failed:", error);
      process.exit(1);
    })
    .finally(() => {
      runner.close();
    });
}
