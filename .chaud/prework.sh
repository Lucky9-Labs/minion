#!/bin/bash
# Prework script for Next.js projects
# Runs after worktree is created, before Claude launches

set -e

echo "Setting up Next.js worktree..."

# Copy environment files from main repo
if [ -f "$CHAUD_MAIN_REPO/.env.local" ]; then
    cp "$CHAUD_MAIN_REPO/.env.local" "$CHAUD_WORKTREE/.env.local"
    echo "  ✓ Copied .env.local"
fi

if [ -f "$CHAUD_MAIN_REPO/.env" ]; then
    cp "$CHAUD_MAIN_REPO/.env" "$CHAUD_WORKTREE/.env"
    echo "  ✓ Copied .env"
fi

# Symlink node_modules to save disk space and install time
if [ -d "$CHAUD_MAIN_REPO/node_modules" ]; then
    ln -s "$CHAUD_MAIN_REPO/node_modules" "$CHAUD_WORKTREE/node_modules"
    echo "  ✓ Symlinked node_modules"
fi

# Symlink .next cache (optional - comment out if you want fresh builds)
# if [ -d "$CHAUD_MAIN_REPO/.next" ]; then
#     ln -s "$CHAUD_MAIN_REPO/.next" "$CHAUD_WORKTREE/.next"
#     echo "  ✓ Symlinked .next cache"
# fi

# Inject development overlay if enabled
if command -v jq &> /dev/null && [ -f "$CHAUD_MAIN_REPO/.chaud/runtime.json" ]; then
    overlay_enabled=$(jq -r '.overlay.enabled // false' "$CHAUD_MAIN_REPO/.chaud/runtime.json")
    overlay_position=$(jq -r '.overlay.position // "bottom-right"' "$CHAUD_MAIN_REPO/.chaud/runtime.json")

    if [ "$overlay_enabled" = "true" ]; then
        echo "Injecting development overlay..."

        # Source the injection script if available
        if [ -f "$CHAUD_MAIN_REPO/.chaud/lib/overlay/inject-nextjs.sh" ]; then
            source "$CHAUD_MAIN_REPO/.chaud/lib/overlay/inject-nextjs.sh"
            inject_nextjs_overlay "$CHAUD_WORKTREE" "$CHAUD_MAIN_REPO" "$CHAUD_DESCRIPTION" "$CHAUD_PORT" "$CHAUD_BRANCH" "$overlay_position"
        elif [ -f "$CHAUD_SCRIPT_DIR/lib/overlay/inject-nextjs.sh" ]; then
            source "$CHAUD_SCRIPT_DIR/lib/overlay/inject-nextjs.sh"
            inject_nextjs_overlay "$CHAUD_WORKTREE" "$CHAUD_MAIN_REPO" "$CHAUD_DESCRIPTION" "$CHAUD_PORT" "$CHAUD_BRANCH" "$overlay_position"
        else
            echo "  Warning: Overlay injection script not found"
        fi
    fi
fi

# Setup services if configured
if [ -f "$CHAUD_MAIN_REPO/.chaud/lib/services.sh" ]; then
    export CHAUD_LIB="$CHAUD_MAIN_REPO/.chaud/lib"
    source "$CHAUD_MAIN_REPO/.chaud/lib/services.sh"

    # Setup test services if integration tests are configured
    if command -v jq &> /dev/null && [ -f "$CHAUD_MAIN_REPO/.chaud/runtime.json" ]; then
        test_services=$(jq -r '.test.integration.services // []' "$CHAUD_MAIN_REPO/.chaud/runtime.json")
        if [ "$test_services" != "[]" ] && [ "$test_services" != "null" ]; then
            echo ""
            echo "Starting test services..."
            setup_test_services "$CHAUD_MAIN_REPO/.chaud/runtime.json"
        fi
    fi
fi

echo "Setup complete!"
