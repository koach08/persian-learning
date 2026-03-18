#!/bin/bash
# Capacitor static export build script
# Temporarily moves API routes out of the way since they can't be statically exported

set -e

echo "=== Capacitor Build ==="

# 1. Move API routes out temporarily
echo "Moving API routes out of app/..."
mv app/api _api_backup

# 2. Run static export build
echo "Building static export..."
CAPACITOR_BUILD=true npx next build

# 3. Restore API routes
echo "Restoring API routes..."
mv _api_backup app/api

# 4. Sync with iOS
echo "Syncing with Capacitor iOS..."
npx cap sync ios

echo "=== Done! Open Xcode: npx cap open ios ==="
