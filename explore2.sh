#!/bin/bash

# Project exploration script - gathers key files for analysis
OUTPUT_FILE="exploration-results.md"

# Clear the output file
> "$OUTPUT_FILE"

echo "# Project Exploration Results" >> "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add file content with header
add_file_content() {
    local file_path="$1"
    local description="$2"
    
    if [ -f "$file_path" ]; then
        echo "## $description" >> "$OUTPUT_FILE"
        echo "\`\`\`$(basename "$file_path" | sed 's/.*\.//')" >> "$OUTPUT_FILE"
        cat "$file_path" >> "$OUTPUT_FILE"
        echo "\`\`\`" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    else
        echo "## $description (FILE NOT FOUND)" >> "$OUTPUT_FILE"
        echo "File path: $file_path" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Function to add directory listing
add_directory_listing() {
    local dir_path="$1"
    local description="$2"
    
    if [ -d "$dir_path" ]; then
        echo "## $description" >> "$OUTPUT_FILE"
        echo "\`\`\`" >> "$OUTPUT_FILE"
        ls -la "$dir_path" >> "$OUTPUT_FILE"
        echo "\`\`\`" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    else
        echo "## $description (DIRECTORY NOT FOUND)" >> "$OUTPUT_FILE"
        echo "Directory path: $dir_path" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

echo "🔍 Gathering project configuration files..."

# Root configuration files
add_file_content "package.json" "Package.json - Project Dependencies"
add_file_content "package-lock.json" "Package-lock.json - Locked Dependencies (first 50 lines)" 
if [ -f "package-lock.json" ]; then
    echo "## Package-lock.json - Locked Dependencies (first 50 lines)" >> "$OUTPUT_FILE"
    echo "\`\`\`json" >> "$OUTPUT_FILE"
    head -50 package-lock.json >> "$OUTPUT_FILE"
    echo "... (truncated)" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

add_file_content "tsconfig.json" "TypeScript Configuration"
add_file_content ".env" "Environment Variables"
add_file_content ".env.local" "Local Environment Variables"
add_file_content ".env.example" "Example Environment Variables"

# Supabase configuration
echo "🗄️  Gathering Supabase configuration..."
add_directory_listing "supabase" "Supabase Directory Structure"
add_file_content "supabase/config.toml" "Supabase Configuration"
add_file_content "supabase/config.yaml" "Supabase YAML Configuration" 
add_file_content "supabase/.env" "Supabase Environment"

# Database files
echo "📊 Gathering database files..."
add_file_content "src/config/database.ts" "Database Configuration"
add_file_content "src/database/SupabaseManager.ts" "Supabase Manager"
add_file_content "src/database/DatabaseManager.ts" "Database Manager"

# Schema files
echo "📋 Gathering schema files..."
for schema_file in src/database/schema/*.sql; do
    if [ -f "$schema_file" ]; then
        add_file_content "$schema_file" "Schema: $(basename "$schema_file")"
    fi
done

# Migration files
echo "🔄 Gathering migration files..."
for migration_file in src/database/migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        add_file_content "$migration_file" "Migration: $(basename "$migration_file")"
    fi
done

# Key source files
echo "📁 Gathering key source files..."
add_file_content "src/index.ts" "Main Entry Point"
add_file_content "src/config/index.ts" "Configuration Index"
add_file_content "src/config/EnvLoader.ts" "Environment Loader"
add_file_content "src/api/server.ts" "API Server"

# CLI files
echo "⚡ Gathering CLI files..."
add_file_content "src/cli/index.ts" "CLI Entry Point"

# Docker and container files
echo "🐳 Gathering containerization files..."
add_file_content "Dockerfile" "Docker Configuration"
add_file_content "docker-compose.yml" "Docker Compose"
add_file_content "docker-compose.yaml" "Docker Compose (YAML)"

# Build and deployment files
echo "🏗️  Gathering build files..."
add_file_content "Makefile" "Makefile"
add_file_content "README.md" "Project README"

# Supabase functions and edge functions
if [ -d "supabase/functions" ]; then
    echo "## Supabase Functions Directory" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    find supabase/functions -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | head -20 >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Recent log files if any
echo "📋 Checking for log files..."
if [ -d "logs" ]; then
    add_directory_listing "logs" "Log Files Directory"
fi

# Git information
echo "📝 Gathering Git information..."
if [ -d ".git" ]; then
    echo "## Git Status" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    git status 2>/dev/null >> "$OUTPUT_FILE" || echo "Git status unavailable" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    echo "## Recent Git Commits" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    git log --oneline -10 2>/dev/null >> "$OUTPUT_FILE" || echo "Git log unavailable" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Node.js and system information
echo "## System Information" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "Node.js version: $(node --version 2>/dev/null || echo 'Not available')" >> "$OUTPUT_FILE"
echo "npm version: $(npm --version 2>/dev/null || echo 'Not available')" >> "$OUTPUT_FILE"
echo "OS: $(uname -a 2>/dev/null || echo 'Not available')" >> "$OUTPUT_FILE"
echo "Current directory: $(pwd)" >> "$OUTPUT_FILE"
echo "Current user: $(whoami)" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Process information
echo "## Running Processes (Docker/Supabase related)" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
ps aux | grep -E "(docker|supabase|postgres)" | grep -v grep >> "$OUTPUT_FILE" 2>/dev/null || echo "No relevant processes found" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "✅ Exploration complete! Results saved to: $OUTPUT_FILE"
echo ""
echo "📊 File summary:"
wc -l "$OUTPUT_FILE"
