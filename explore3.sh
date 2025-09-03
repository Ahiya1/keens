#!/bin/bash

# Focused Supabase troubleshooting script
OUTPUT_FILE="supabase-debug.md"

# Clear the output file
> "$OUTPUT_FILE"

echo "# Supabase Debug Info" >> "$OUTPUT_FILE"
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
        echo "## $description (NOT FOUND)" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

echo "🔧 Gathering Supabase troubleshooting info..."

# Essential files only
add_file_content "package.json" "Package.json (Supabase version)"
add_file_content "supabase/config.toml" "Supabase Configuration"

# System info
echo "## System & Process Info" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not available')"  >> "$OUTPUT_FILE"
echo "Docker: $(docker --version 2>/dev/null || echo 'Not available')" >> "$OUTPUT_FILE"
echo "Supabase CLI: $(supabase --version 2>/dev/null || echo 'Not available')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Running Docker containers:" >> "$OUTPUT_FILE"
docker ps 2>/dev/null || echo "Docker not running or no permission" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Supabase processes:" >> "$OUTPUT_FILE"
ps aux | grep supabase | grep -v grep >> "$OUTPUT_FILE" 2>/dev/null || echo "No Supabase processes" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "✅ Debug info saved to: $OUTPUT_FILE"
