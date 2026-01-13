#!/bin/bash
# iterm2.sh - iTerm2 tab and pane management utilities for chaud
#
# Source this file in chaud script:
#   source "$CHAUD_MAIN_REPO/.chaud/lib/iterm2.sh"

# Get RGB values for a color preset (Bash 3 compatible)
get_color_rgb() {
    case "$1" in
        red)    echo "255,80,80" ;;
        orange) echo "255,165,0" ;;
        yellow) echo "255,220,80" ;;
        green)  echo "80,200,120" ;;
        cyan)   echo "80,200,220" ;;
        blue)   echo "80,130,255" ;;
        purple) echo "180,100,255" ;;
        pink)   echo "255,140,200" ;;
        gray)   echo "140,140,150" ;;
        *)      echo "80,130,255" ;;  # default to blue
    esac
}

# Check if running in iTerm2
is_iterm2() {
    [[ "$TERM_PROGRAM" == "iTerm.app" ]] || [[ -n "$ITERM_SESSION_ID" ]]
}

# Set tab color using escape sequences (RGB 0-255)
set_tab_color() {
    local red="$1"
    local green="$2"
    local blue="$3"

    is_iterm2 || return 0

    printf '\033]6;1;bg;red;brightness;%d\a' "$red"
    printf '\033]6;1;bg;green;brightness;%d\a' "$green"
    printf '\033]6;1;bg;blue;brightness;%d\a' "$blue"
}

# Set tab color from preset name
set_tab_color_preset() {
    local preset="$1"
    local rgb
    rgb=$(get_color_rgb "$preset")
    IFS=',' read -r r g b <<< "$rgb"
    set_tab_color "$r" "$g" "$b"
}

# Set tab color from hex code (#RRGGBB or RRGGBB)
set_tab_color_hex() {
    local hex="$1"
    hex="${hex#\#}"  # Remove leading # if present

    local r=$((16#${hex:0:2}))
    local g=$((16#${hex:2:2}))
    local b=$((16#${hex:4:2}))

    set_tab_color "$r" "$g" "$b"
}

# Reset tab color to default
reset_tab_color() {
    is_iterm2 || return 0
    printf '\033]6;1;bg;*;default\a'
}

# Set tab/window title
set_tab_title() {
    local title="$1"
    printf '\033]0;%s\007' "$title"
}

#######################################
# Locks the tab title to prevent any process from changing it.
# Uses iTerm2's native "Allow title setting" property.
# Must be called AFTER set_tab_title() to lock in the desired title.
#######################################
lock_tab_title() {
    is_iterm2 || return 0

    osascript <<'LOCKEOF' 2>/dev/null || true
tell application "iTerm2"
    tell current session of current tab of current window
        set allow title setting to false
    end tell
end tell
LOCKEOF
}

#######################################
# Unlocks the tab title, allowing processes to change it again.
# Called during cleanup to restore normal behavior.
#######################################
unlock_tab_title() {
    is_iterm2 || return 0

    osascript <<'UNLOCKEOF' 2>/dev/null || true
tell application "iTerm2"
    tell current session of current tab of current window
        set allow title setting to true
    end tell
end tell
UNLOCKEOF
}

# Setup complete iTerm2 environment for worktree
setup_iterm2_session() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local branch_name="${2:-$CHAUD_BRANCH}"
    local config_file="${3:-$CHAUD_MAIN_REPO/.chaud/iterm2.json}"

    is_iterm2 || { echo "Not running in iTerm2, skipping terminal setup"; return 0; }

    # Read configuration
    local enabled color_type color_value pane_layout
    local browser_pane_enabled browser_profile dev_server_pane_enabled dev_server_command
    if [[ -f "$config_file" ]] && command -v jq &> /dev/null; then
        enabled=$(jq -r '.enabled // true' "$config_file")
        color_type=$(jq -r '.tabColor.type // "preset"' "$config_file")
        color_value=$(jq -r '.tabColor.value // "blue"' "$config_file")
        pane_layout=$(jq -r '.paneLayout // "horizontal"' "$config_file")
        browser_pane_enabled=$(jq -r '.browserPane.enabled // false' "$config_file")
        browser_profile=$(jq -r '.browserPane.profile // "Browser"' "$config_file")
        dev_server_pane_enabled=$(jq -r '.devServerPane.enabled // false' "$config_file")
        dev_server_command=$(jq -r '.devServerPane.command // "npm run dev"' "$config_file")
    else
        enabled="true"
        color_type="preset"
        color_value="blue"
        pane_layout="horizontal"
        browser_pane_enabled="false"
        browser_profile="Browser"
        dev_server_pane_enabled="false"
        dev_server_command="npm run dev"
    fi

    [[ "$enabled" != "true" ]] && return 0

    # Set tab title and lock it to prevent Claude Code from changing it
    set_tab_title "[chaud] $branch_name"
    lock_tab_title

    # Set tab color
    if [[ "$color_type" != "none" ]]; then
        case "$color_type" in
            preset)
                set_tab_color_preset "$color_value"
                ;;
            hex)
                set_tab_color_hex "$color_value"
                ;;
            rgb)
                IFS=',' read -r r g b <<< "$color_value"
                set_tab_color "$r" "$g" "$b"
                ;;
        esac
    fi

    # Skip pane creation if layout is none
    [[ "$pane_layout" == "none" ]] && return 0

    # Prepare commands
    local menu_cmd="cd '$worktree_dir' && chaud menu"

    # Substitute PORT in dev server command
    local port="${CHAUD_PORT:-3000}"
    local dev_cmd=$(echo "$dev_server_command" | sed "s/\\\${PORT}/$port/g")
    dev_cmd="cd '$worktree_dir' && $dev_cmd"

    # URL for browser
    local browser_url="http://localhost:$port"

    # Layout when browser + dev server enabled:
    # ┌──────────────┬──────────────┐
    # │              │              │
    # │  Claude      │   Browser    │
    # │  (top left)  │  (2/3 right) │
    # │              │              │
    # ├──────────────┼──────────────┤
    # │ chaud menu   │ npm server   │
    # │ (1/3 left)   │ (1/3 right)  │
    # └──────────────┴──────────────┘

    if [[ "$browser_pane_enabled" == "true" && "$dev_server_pane_enabled" == "true" ]]; then
        # Full 4-pane layout with iTerm2 browser
        osascript <<EOF
tell application "iTerm2"
    tell current session of current window
        -- Split vertically: Claude stays left, browser pane on right
        set browserPane to (split vertically with profile "$browser_profile")

        -- Split Claude pane horizontally for menu (bottom 1/3)
        set menuPane to (split horizontally with default profile)
        tell menuPane
            write text "$menu_cmd"
        end tell

        -- Split browser pane horizontally for dev server (bottom 1/3)
        tell browserPane
            set devPane to (split horizontally with default profile)
            tell devPane
                write text "$dev_cmd"
            end tell
        end tell
    end tell
end tell
EOF
        # Navigate browser to URL after panes are set up
        sleep 1
        osascript <<EOF 2>/dev/null || true
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            repeat with s in sessions of t
                try
                    if profile name of s is "$browser_profile" then
                        tell s to write text "$browser_url"
                    end if
                end try
            end repeat
        end repeat
    end repeat
end tell
EOF

    elif [[ "$dev_server_pane_enabled" == "true" ]]; then
        # 3-pane layout: Claude top-left, menu bottom-left, dev server right
        osascript <<EOF
tell application "iTerm2"
    tell current session of current window
        -- Split vertically: Claude stays left, dev server on right
        set devPane to (split vertically with default profile)
        tell devPane
            write text "$dev_cmd"
        end tell

        -- Split Claude pane horizontally for menu
        set menuPane to (split horizontally with default profile)
        tell menuPane
            write text "$menu_cmd"
        end tell
    end tell
end tell
EOF

    else
        # Simple 2-pane layout: Claude left, menu right
        osascript <<EOF
tell application "iTerm2"
    tell current session of current window
        set menuPane to (split vertically with default profile)
        tell menuPane
            write text "$menu_cmd"
        end tell
    end tell
end tell
EOF
    fi
}

kill_worktree_processes() {
    local worktree_dir="$1"

    [[ -z "$worktree_dir" ]] && return 0
    [[ ! -d "$worktree_dir" ]] && return 0

    echo "Stopping processes in worktree..."

    local killed_count=0

    # Use pgrep to find processes whose command line contains the worktree path
    # This catches dev servers, watchers, etc. that were started with the worktree path
    # Note: We avoid lsof +D because it's extremely slow on macOS (can hang indefinitely)
    local pids
    pids=$(pgrep -f "$worktree_dir" 2>/dev/null || true)

    if [[ -n "$pids" ]]; then
        for pid in $pids; do
            # Skip our own process tree
            [[ "$pid" == "$$" ]] && continue
            [[ "$pid" == "$PPID" ]] && continue

            local pname
            pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")

            if kill -0 "$pid" 2>/dev/null; then
                echo "  Stopping: $pname (PID $pid)"
                kill -TERM "$pid" 2>/dev/null || true
                ((killed_count++)) || true
            fi
        done

        # Brief wait then force kill stragglers
        if [[ $killed_count -gt 0 ]]; then
            sleep 1
            for pid in $pids; do
                [[ "$pid" == "$$" ]] && continue
                [[ "$pid" == "$PPID" ]] && continue
                if kill -0 "$pid" 2>/dev/null; then
                    echo "  Force killing: PID $pid"
                    kill -9 "$pid" 2>/dev/null || true
                fi
            done
        fi
    fi

    if [[ $killed_count -gt 0 ]]; then
        echo "  Stopped $killed_count process(es)"
    else
        echo "  No running processes found"
    fi
}

close_iterm2_panes() {
    local worktree_dir="$1"
    local branch_name="$2"

    is_iterm2 || return 0
    [[ -z "$worktree_dir" ]] && return 0

    echo "Closing iTerm2 panes..."

    # Use AppleScript to find and close sessions whose working directory
    # contains the worktree path or whose name contains the branch name
    osascript <<EOF 2>/dev/null || true
tell application "iTerm2"
    set closedCount to 0
    repeat with w in windows
        repeat with t in tabs of w
            set sessionsToClose to {}
            repeat with s in sessions of t
                try
                    set sessionName to name of s
                    -- Check if session name contains branch name or [chaud]
                    if sessionName contains "$branch_name" or sessionName contains "[chaud]" then
                        set end of sessionsToClose to s
                    end if
                end try
            end repeat

            -- Close matching sessions (except the current one running this script)
            repeat with s in sessionsToClose
                try
                    -- Don't close if it's the only session in the tab
                    if (count of sessions of t) > 1 then
                        close s
                        set closedCount to closedCount + 1
                    end if
                end try
            end repeat
        end repeat
    end repeat
    return closedCount
end tell
EOF
}

# Cleanup iTerm2 session settings
cleanup_iterm2_session() {
    local worktree_dir="${1:-}"
    local branch_name="${2:-}"

    # Unlock tab title to allow normal behavior
    unlock_tab_title

    # Kill processes running in the worktree
    if [[ -n "$worktree_dir" ]]; then
        kill_worktree_processes "$worktree_dir"
    fi

    # Close iTerm2 panes associated with this worktree
    if [[ -n "$worktree_dir" ]] || [[ -n "$branch_name" ]]; then
        close_iterm2_panes "$worktree_dir" "$branch_name"
    fi

    # Reset tab color
    reset_tab_color
}
