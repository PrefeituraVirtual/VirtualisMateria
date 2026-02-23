#!/bin/bash
# Bundle Analysis Script for Materia Virtualis Frontend
# This script builds the application and reports bundle sizes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$FRONTEND_DIR"

echo "=============================================="
echo "Materia Virtualis - Bundle Analysis Report"
echo "=============================================="
echo ""

# Clean previous build
echo "[1/4] Cleaning previous build..."
rm -rf .next 2>/dev/null || true

# Run the build
echo "[2/4] Building application..."
npm run build 2>&1 | tee build-output.log

echo ""
echo "[3/4] Analyzing bundle sizes..."
echo ""

# Check if build was successful
if [ -d ".next/static/chunks" ]; then
    echo "=== JavaScript Chunks (Top 20 by size) ==="
    find .next/static/chunks -name "*.js" -exec du -h {} \; 2>/dev/null | sort -rh | head -20

    echo ""
    echo "=== Total Bundle Size ==="
    du -sh .next/static 2>/dev/null || echo "Unable to calculate total size"

    echo ""
    echo "=== Page Sizes ==="
    if [ -d ".next/static/chunks/pages" ]; then
        echo "Page-specific chunks:"
        find .next/static/chunks/pages -name "*.js" -exec du -h {} \; 2>/dev/null | sort -rh
    fi

    echo ""
    echo "=== Vendor Chunks ==="
    find .next/static/chunks -maxdepth 1 -name "*.js" -exec du -h {} \; 2>/dev/null | sort -rh | head -10

    echo ""
    echo "[4/4] Summary Statistics"
    echo "------------------------"

    # Count files
    JS_COUNT=$(find .next/static/chunks -name "*.js" 2>/dev/null | wc -l)
    CSS_COUNT=$(find .next/static/css -name "*.css" 2>/dev/null | wc -l)

    echo "JavaScript files: $JS_COUNT"
    echo "CSS files: $CSS_COUNT"

    # Calculate total JS size
    TOTAL_JS=$(find .next/static/chunks -name "*.js" -exec du -cb {} \; 2>/dev/null | tail -1 | cut -f1)
    if [ -n "$TOTAL_JS" ]; then
        TOTAL_JS_MB=$(echo "scale=2; $TOTAL_JS / 1048576" | bc 2>/dev/null || echo "N/A")
        echo "Total JS size: ${TOTAL_JS_MB} MB"
    fi

    echo ""
    echo "=== Performance Targets ==="
    echo "Target: Initial bundle < 1MB"
    echo "Target: Largest chunk < 500KB"
    echo ""

    # Check for large chunks (warning if > 500KB)
    echo "=== Large Chunks Warning (>500KB) ==="
    find .next/static/chunks -name "*.js" -size +500k -exec du -h {} \; 2>/dev/null || echo "No chunks exceed 500KB - Good!"

else
    echo "ERROR: Build output not found. Check build-output.log for errors."
    exit 1
fi

echo ""
echo "=============================================="
echo "Build analysis complete!"
echo "For detailed interactive analysis, run: npm run analyze"
echo "=============================================="
