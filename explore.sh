#!/bin/bash

# Keen-S Codebase Analysis Script
# This script creates a comprehensive analysis of the codebase for investment evaluation

OUTPUT_FILE="keen-s-analysis.md"
PROJECT_ROOT="."

echo "🔍 Starting comprehensive codebase analysis..."
echo "📄 Output will be saved to: $OUTPUT_FILE"

# Initialize output file
cat > "$OUTPUT_FILE" << 'EOF'
# Keen-S Codebase Analysis Report
Generated on: $(date)

## Executive Summary
This document provides a comprehensive analysis of the Keen-S AI agent orchestration system for investment evaluation.

---


:da

# Function to safely extract file content with error handling
extract_file_content() {
    local file_path="$1"
    local section_title="$2"
    
    if [[ -f "$file_path" ]]; then
        echo "## $section_title" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "\`\`\`$(basename "$file_path" | sed 's/.*\.//')" >> "$OUTPUT_FILE"
        cat "$file_path" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "\`\`\`" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "✅ Extracted: $file_path"
    else
        echo "⚠️  File not found: $file_path"
        echo "## $section_title" >> "$OUTPUT_FILE"
        echo "*File not found: $file_path*" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Function to extract key snippets from TypeScript files
extract_key_snippets() {
    local file_path="$1"
    local description="$2"
    
    if [[ -f "$file_path" ]]; then
        echo "### $description" >> "$OUTPUT_FILE"
        echo "**File: $file_path**" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Extract class definitions, interfaces, and key methods
        echo "\`\`\`typescript" >> "$OUTPUT_FILE"
        
        # Get imports (first 20 lines usually contain imports)
        echo "// === IMPORTS ===" >> "$OUTPUT_FILE"
        head -20 "$file_path" | grep -E "^import|^export" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Get class/interface definitions and key methods
        echo "// === KEY DEFINITIONS ===" >> "$OUTPUT_FILE"
        grep -E "^(export )?(class|interface|enum|type|const|function)" "$file_path" | head -15 >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Get method signatures from classes
        echo "// === METHOD SIGNATURES ===" >> "$OUTPUT_FILE"
        grep -E "^\s+(public|private|protected|async)?\s*(static)?\s*[a-zA-Z][a-zA-Z0-9]*\s*\(" "$file_path" | head -10 >> "$OUTPUT_FILE"
        
        echo "\`\`\`" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "✅ Analyzed: $file_path"
    else
        echo "⚠️  File not found: $file_path"
    fi
}

# Function to analyze directory structure
analyze_directory() {
    local dir_path="$1"
    local section_title="$2"
    
    echo "### $section_title" >> "$OUTPUT_FILE"
    if [[ -d "$dir_path" ]]; then
        echo "\`\`\`" >> "$OUTPUT_FILE"
        find "$dir_path" -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | head -20 | sort >> "$OUTPUT_FILE"
        echo "\`\`\`" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Count files by type
        echo "**File type breakdown:**" >> "$OUTPUT_FILE"
        find "$dir_path" -type f | sed 's/.*\.//' | sort | uniq -c | sort -nr >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    else
        echo "*Directory not found: $dir_path*" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

echo "📦 Analyzing project configuration..."

# Extract package.json for dependencies and project info
extract_file_content "package.json" "Package Configuration"
extract_file_content "tsconfig.json" "TypeScript Configuration"
extract_file_content "README.md" "Project README"
extract_file_content ".env.example" "Environment Variables Template"

echo "🏗️ Analyzing core architecture..."

# Core system files
extract_key_snippets "src/index.ts" "Main Entry Point"
extract_key_snippets "src/agent/KeenAgent.ts" "Core Keen Agent"
extract_key_snippets "src/agent/ConversationAgent.ts" "Conversation Agent"
extract_key_snippets "src/agent/AgentTreeManager.ts" "Agent Tree Manager"

echo "🔧 Analyzing tools and capabilities..."

# Agent Tools Analysis
echo "## Agent Tools & Capabilities" >> "$OUTPUT_FILE"
analyze_directory "src/agent/tools" "Available Agent Tools"

# Extract key tool implementations
extract_key_snippets "src/agent/tools/ToolManager.ts" "Tool Manager"
extract_key_snippets "src/agent/tools/SummonAgentTool.ts" "Agent Summoning"
extract_key_snippets "src/agent/tools/CoordinateAgentsTool.ts" "Agent Coordination"
extract_key_snippets "src/agent/tools/GitTool.ts" "Git Integration"

echo "🎯 Analyzing prompt system..."

# Prompt System
analyze_directory "src/agent/prompts" "Prompt Management System"
extract_key_snippets "src/agent/prompts/PromptManager.ts" "Prompt Manager"
extract_key_snippets "src/agent/prompts/PromptBuilder.ts" "Prompt Builder"

echo "✅ Analyzing validation and quality gates..."

# Validation System
analyze_directory "src/agent/validation" "Validation & Quality System"
extract_key_snippets "src/agent/validation/ValidationEngine.ts" "Validation Engine"
extract_key_snippets "src/agent/validation/QualityGateManager.ts" "Quality Gate Manager"

echo "🌐 Analyzing API and services..."

# API and Services
analyze_directory "src/api" "API Layer"
extract_key_snippets "src/api/server.ts" "API Server"
extract_key_snippets "src/api/websocket/WebSocketManager.ts" "WebSocket Manager"
extract_key_snippets "src/api/services/AuthenticationService.ts" "Authentication Service"
extract_key_snippets "src/api/services/CreditGatewayService.ts" "Credit System"

echo "💻 Analyzing CLI interface..."

# CLI Analysis
analyze_directory "src/cli" "Command Line Interface"
extract_key_snippets "src/cli/index.ts" "CLI Entry Point"
extract_key_snippets "src/cli/commands/ConverseCommand.ts" "Converse Command"
extract_key_snippets "src/cli/commands/EvolveCommand.ts" "Evolve Command"

echo "💾 Analyzing database layer..."

# Database Analysis
analyze_directory "src/database" "Database Layer"
extract_key_snippets "src/database/DatabaseManager.ts" "Database Manager"
extract_key_snippets "src/database/SupabaseManager.ts" "Supabase Integration"

# Database Schema
echo "## Database Schema" >> "$OUTPUT_FILE"
for schema_file in src/database/schema/*.sql src/database/migrations/*.sql; do
    if [[ -f "$schema_file" ]]; then
        extract_file_content "$schema_file" "Schema: $(basename "$schema_file")"
    fi
done

echo "🔍 Analyzing configuration and types..."

# Configuration and Types
extract_key_snippets "src/config/index.ts" "Configuration"
extract_key_snippets "src/agent/types.ts" "Agent Types"
extract_key_snippets "src/api/types.ts" "API Types"

echo "📊 Generating final analysis..."

# Generate summary statistics
cat >> "$OUTPUT_FILE" << 'EOF'

## Technical Metrics

### Code Statistics
EOF

echo "\`\`\`" >> "$OUTPUT_FILE"
echo "Total TypeScript files: $(find src -name "*.ts" | wc -l)" >> "$OUTPUT_FILE"
echo "Total JavaScript files: $(find src -name "*.js" | wc -l)" >> "$OUTPUT_FILE"
echo "Total lines of code: $(find src -name "*.ts" -o -name "*.js" | xargs wc -l | tail -1)" >> "$OUTPUT_FILE"
echo "Total directories: $(find src -type d | wc -l)" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"

# Dependencies analysis if package.json exists
if [[ -f "package.json" ]]; then
    echo "" >> "$OUTPUT_FILE"
    echo "### Dependencies Analysis" >> "$OUTPUT_FILE"
    echo "\`\`\`json" >> "$OUTPUT_FILE"
    jq '.dependencies // {}' package.json >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    
    echo "" >> "$OUTPUT_FILE"
    echo "**Key Dependencies Identified:**" >> "$OUTPUT_FILE"
    jq -r '.dependencies // {} | keys[]' package.json 2>/dev/null | grep -E "(anthropic|openai|langchain|agent|ai|ml)" | sed 's/^/- /' >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'

## Investment Analysis Framework

### Key Questions for Evaluation:
1. **Market Positioning**: How does this compare to existing AI agent frameworks?
2. **Technical Differentiation**: What unique capabilities does the agent orchestration provide?
3. **Scalability**: How well does the architecture support growth?
4. **Monetization**: What does the credit system reveal about business model?
5. **Competition**: How does this stack against LangChain, CrewAI, AutoGPT, etc?

### Architecture Highlights:
- Multi-agent coordination system
- Quality gates and validation pipeline
- Credit-based usage model
- WebSocket real-time communication
- CLI and API interfaces
- Database persistence with Supabase

---
*Analysis completed. Review the extracted code and schemas above for detailed technical evaluation.*
EOF

echo ""
echo "🎉 Analysis complete!"
echo "📄 Report saved to: $OUTPUT_FILE"
echo "📈 File size: $(wc -c < "$OUTPUT_FILE" | numfmt --to=iec-i)B"
echo ""
echo "🔍 Quick stats:"
echo "   - TypeScript files analyzed: $(find src -name "*.ts" 2>/dev/null | wc -l)"
echo "   - Total directories scanned: $(find src -type d 2>/dev/null | wc -l)"
echo ""
echo "💡 Next steps:"
echo "   1. Review the generated report: $OUTPUT_FILE"
echo "   2. Focus on the Agent Tools and Validation sections"
echo "   3. Compare with market alternatives"
echo "   4. Evaluate the business model via credit system"

# Make the script executable
chmod +x "$0"
