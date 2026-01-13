#!/bin/bash
# Postwork script - runs before worktree is removed
#
# Available environment variables:
#   CHAUD_MAIN_REPO    - Path to the main repository
#   CHAUD_WORKTREE     - Path to this worktree
#   CHAUD_BRANCH       - Branch name
#
# Example tasks:
#   - Clean up temp files
#   - Export any generated data
#   - Run cleanup scripts

set -e

echo "Running postwork for: $CHAUD_BRANCH"

# Stop services if running
if [ -f "$CHAUD_MAIN_REPO/.chaud/lib/services.sh" ]; then
    export CHAUD_LIB="$CHAUD_MAIN_REPO/.chaud/lib"
    source "$CHAUD_MAIN_REPO/.chaud/lib/services.sh"

    if [ -d "$CHAUD_WORKTREE/.chaud/services" ]; then
        echo "Stopping services..."
        cleanup_test_services
    fi
fi

# Remove symlinks (they'll cause issues with worktree removal otherwise)
find "$CHAUD_WORKTREE" -maxdepth 1 -type l -delete 2>/dev/null || true

echo "Postwork complete!"
