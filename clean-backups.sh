#!/bin/bash

# cleanup-backups.sh - Remove backup files from the project
# Usage: ./cleanup-backups.sh [--dry-run] [--yes]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
DRY_RUN=false
AUTO_YES=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --yes|-y)
            AUTO_YES=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Remove backup files with pattern *.backup.*"
            echo ""
            echo "OPTIONS:"
            echo "  --dry-run    Show what would be deleted without actually deleting"
            echo "  --yes, -y    Skip confirmation prompt"
            echo "  --help, -h   Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🧹 Keen Backup Cleanup Tool${NC}"
echo "================================"

# Find all backup files
echo -e "${YELLOW}Searching for backup files...${NC}"
BACKUP_FILES=$(find . -name "*.backup.*" -type f)

if [ -z "$BACKUP_FILES" ]; then
    echo -e "${GREEN}✅ No backup files found!${NC}"
    exit 0
fi

# Count backup files
BACKUP_COUNT=$(echo "$BACKUP_FILES" | wc -l)
echo -e "${YELLOW}Found ${BACKUP_COUNT} backup files:${NC}"
echo ""

# List all backup files
echo "$BACKUP_FILES" | while read -r file; do
    file_size=$(du -h "$file" 2>/dev/null | cut -f1 || echo "?")
    echo -e "  ${RED}🗑️  ${file}${NC} (${file_size})"
done

echo ""

# Calculate total size
TOTAL_SIZE=$(find . -name "*.backup.*" -type f -exec du -b {} + | awk '{sum += $1} END {print sum}')
if [ -n "$TOTAL_SIZE" ] && [ "$TOTAL_SIZE" -gt 0 ]; then
    HUMAN_SIZE=$(echo "$TOTAL_SIZE" | awk '{
        if ($1 >= 1024^3) printf "%.1f GB", $1/1024^3
        else if ($1 >= 1024^2) printf "%.1f MB", $1/1024^2  
        else if ($1 >= 1024) printf "%.1f KB", $1/1024
        else printf "%d bytes", $1
    }')
    echo -e "${YELLOW}Total size: ${HUMAN_SIZE}${NC}"
    echo ""
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}✅ Dry run complete. Use without --dry-run to actually delete files.${NC}"
    exit 0
fi

# Confirmation prompt
if [ "$AUTO_YES" != true ]; then
    echo -e "${RED}⚠️  WARNING: This will permanently delete ${BACKUP_COUNT} backup files!${NC}"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        exit 0
    fi
fi

# Delete backup files
echo -e "${YELLOW}Deleting backup files...${NC}"
DELETED_COUNT=0

echo "$BACKUP_FILES" | while read -r file; do
    if [ -f "$file" ]; then
        if rm "$file" 2>/dev/null; then
            echo -e "  ${GREEN}✅ Deleted: ${file}${NC}"
        else
            echo -e "  ${RED}❌ Failed to delete: ${file}${NC}"
        fi
    fi
done

# Final verification
REMAINING_BACKUPS=$(find . -name "*.backup.*" -type f | wc -l)
if [ "$REMAINING_BACKUPS" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Successfully cleaned up all backup files!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  ${REMAINING_BACKUPS} backup files remain (may have failed to delete)${NC}"
fi

echo -e "${BLUE}Cleanup complete!${NC}"