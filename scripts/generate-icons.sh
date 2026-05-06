#!/bin/bash
# Generate all required iOS app icon sizes from the 1024x1024 source image.
# Uses macOS built-in `sips` tool - no external dependencies needed.
#
# Usage: ./scripts/generate-icons.sh [source_image]
# Default source: ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ICON_DIR="$PROJECT_DIR/ios/App/App/Assets.xcassets/AppIcon.appiconset"
SOURCE="${1:-$ICON_DIR/AppIcon-512@2x.png}"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source image not found at $SOURCE"
  exit 1
fi

echo "Source: $SOURCE"
echo "Output: $ICON_DIR"
echo ""

# All required iOS icon sizes
SIZES=(20 29 40 58 60 76 80 87 120 152 167 180 1024)

for SIZE in "${SIZES[@]}"; do
  OUTPUT="$ICON_DIR/AppIcon-${SIZE}x${SIZE}.png"
  echo "Generating ${SIZE}x${SIZE}..."
  sips -z "$SIZE" "$SIZE" "$SOURCE" --out "$OUTPUT" > /dev/null 2>&1
done

echo ""
echo "Generated ${#SIZES[@]} icon sizes."

# Update Contents.json with all icon entries
cat > "$ICON_DIR/Contents.json" << 'CONTENTS'
{
  "images" : [
    {
      "filename" : "AppIcon-20x20.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20x20.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29x29.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29x29.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40x40.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40x40.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-60x60.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-60x60.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-20x20.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20x20.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29x29.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29x29.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40x40.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40x40.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-76x76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-76x76.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-167x167.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "AppIcon-1024x1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
CONTENTS

echo "Updated Contents.json with all icon entries."
echo ""
echo "Done! Icon sizes generated:"
for SIZE in "${SIZES[@]}"; do
  echo "  - ${SIZE}x${SIZE}"
done
