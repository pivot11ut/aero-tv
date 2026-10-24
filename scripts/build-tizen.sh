#!/usr/bin/env bash
# ==============================================================================
# Aero TV — Tizen .wgt Package Builder
# Packages the HTML5/CSS/JS application into a standard Tizen TV Widget (.wgt)
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
WGT_FILE="$DIST_DIR/AeroTV.wgt"

echo "=========================================="
echo " Packaging Aero TV for Samsung Tizen OS   "
echo "=========================================="

mkdir -p "$DIST_DIR"
rm -f "$WGT_FILE"

cd "$PROJECT_DIR"

# Check if zip utility exists
if command -v zip >/dev/null 2>&1; then
    echo "Creating $WGT_FILE..."
    zip -r -q "$WGT_FILE" \
        config.xml \
        icon.png \
        index.html \
        css \
        js \
        assets \
        -x "*.DS_Store*" -x "*dist*" -x "*scripts*"
    
    echo "SUCCESS: Package created at: dist/AeroTV.wgt"
    ls -lh "$WGT_FILE"
    echo ""
    echo "Next steps to sideload to Samsung TV:"
    echo "  1. Connect TV to developer mode: sdb connect <TV_IP>"
    echo "  2. Install package:             sdb install dist/AeroTV.wgt"
    echo "=========================================="
else
    echo "Error: 'zip' command not found. Please install zip or run on macOS/Linux."
    exit 1
fi
