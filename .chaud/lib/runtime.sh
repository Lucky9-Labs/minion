#!/bin/bash
# runtime.sh - Port allocation and environment transformation utilities for chaud
#
# Source this file in prework.sh or chaud script:
#   source "$CHAUD_MAIN_REPO/.chaud/lib/runtime.sh"

is_port_available() {
    local port="$1"
    if command -v lsof &> /dev/null; then
        ! lsof -i :"$port" &> /dev/null
    elif command -v nc &> /dev/null; then
        ! nc -z localhost "$port" &> /dev/null
    else
        (echo > /dev/tcp/localhost/"$port") 2>/dev/null && return 1 || return 0
    fi
}

find_available_port() {
    local start="${1:-3001}"
    local end="${2:-3099}"
    for port in $(seq "$start" "$end"); do
        if is_port_available "$port"; then
            echo "$port"
            return 0
        fi
    done
    return 1
}

read_runtime_config() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [ ! -f "$config_file" ] && return 1
    command -v jq &> /dev/null || { echo "Warning: jq not installed" >&2; return 1; }

    RUNTIME_ENABLED=$(jq -r '.runtime.enabled // false' "$config_file")
    RUNTIME_PORT_START=$(jq -r '.runtime.portRange[0] // 3001' "$config_file")
    RUNTIME_PORT_END=$(jq -r '.runtime.portRange[1] // 3099' "$config_file")
    RUNTIME_DEV_COMMAND=$(jq -r '.runtime.devCommand // "npm run dev"' "$config_file")
    NGROK_ENABLED=$(jq -r '.ngrok.enabled // false' "$config_file")
    DOCKER_ENABLED=$(jq -r '.docker.enabled // false' "$config_file")
    DOCKER_COMPOSE_FILE=$(jq -r '.docker.composeFile // "docker-compose.yml"' "$config_file")
    DOCKER_PORT_START=$(jq -r '.docker.portRange[0] // 5401' "$config_file")
    DOCKER_PORT_END=$(jq -r '.docker.portRange[1] // 5499' "$config_file")
    return 0
}

allocate_worktree_port() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local port_file="$worktree_dir/.chaud/port"

    if [ -f "$port_file" ]; then
        local existing_port=$(cat "$port_file")
        if is_port_available "$existing_port"; then
            echo "$existing_port"
            return 0
        fi
    fi

    read_runtime_config || { RUNTIME_PORT_START=3001; RUNTIME_PORT_END=3099; }
    local port=$(find_available_port "$RUNTIME_PORT_START" "$RUNTIME_PORT_END")
    [ -z "$port" ] && { echo "Error: No available port" >&2; return 1; }

    mkdir -p "$(dirname "$port_file")"
    echo "$port" > "$port_file"
    echo "$port"
}

get_worktree_port() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local port_file="$worktree_dir/.chaud/port"
    [ -f "$port_file" ] && cat "$port_file"
}

transform_env_file() {
    local src_file="$1"
    local dest_file="${2:-$1}"
    local port="$3"
    local config_file="${4:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"

    [ ! -f "$src_file" ] && return 0
    [ ! -f "$config_file" ] && { [ "$src_file" != "$dest_file" ] && cp "$src_file" "$dest_file"; return 0; }

    local content=$(cat "$src_file")
    local env_vars=$(jq -r '.runtime.envTransforms // {} | keys[]' "$config_file" 2>/dev/null)

    for var in $env_vars; do
        local template=$(jq -r --arg v "$var" '.runtime.envTransforms[$v]' "$config_file")
        local value=$(echo "$template" | sed "s/\${PORT}/$port/g")
        if grep -q "^${var}=" <<< "$content"; then
            content=$(echo "$content" | sed "s|^${var}=.*|${var}=${value}|")
        else
            content="$content"$'\n'"${var}=${value}"
        fi
    done
    echo "$content" > "$dest_file"
}

allocate_docker_ports() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local config_file="${2:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    local ports_file="$worktree_dir/.chaud/docker-ports"

    [ -f "$ports_file" ] && { source "$ports_file"; return 0; }
    read_runtime_config "$config_file" || return 1

    local services=$(jq -r '.docker.services[]? // empty' "$config_file" 2>/dev/null)
    [ -z "$services" ] && return 0

    local current_port="${DOCKER_PORT_START:-5401}"
    mkdir -p "$(dirname "$ports_file")"
    echo "# Docker port allocations" > "$ports_file"

    for service in $services; do
        while ! is_port_available "$current_port" && [ "$current_port" -le "${DOCKER_PORT_END:-5499}" ]; do
            ((current_port++))
        done
        local var_name=$(echo "${service^^}_PORT" | tr '-' '_')
        echo "export $var_name=$current_port" >> "$ports_file"
        ((current_port++))
    done
    source "$ports_file"
}

#######################################
# Generate Docker Compose override file with remapped ports for worktree isolation
# Creates docker-compose.override.yml with unique host ports per service
#######################################
generate_docker_compose_override() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local config_file="${2:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    local override_file="$worktree_dir/.chaud/docker-compose.override.yml"
    local ports_file="$worktree_dir/.chaud/docker-ports"

    [ ! -f "$config_file" ] && return 0
    local generate_override=$(jq -r '.docker.generateOverride // false' "$config_file" 2>/dev/null)
    [ "$generate_override" != "true" ] && return 0

    # Get services config - services is an object, get its keys
    local services=$(jq -r '.docker.services | if type == "object" then keys[] else empty end' "$config_file" 2>/dev/null)
    [ -z "$services" ] && return 0

    read_runtime_config "$config_file" || return 1
    local current_port="${DOCKER_PORT_START:-4223}"

    mkdir -p "$(dirname "$override_file")"
    echo "# Auto-generated by chaud - port overrides for worktree" > "$override_file"
    echo "services:" >> "$override_file"
    echo "# Docker port allocations for worktree" > "$ports_file"

    for service in $services; do
        # Get ports array for this service
        local orig_ports=$(jq -r --arg s "$service" '.docker.services[$s].ports // [] | .[]' "$config_file" 2>/dev/null)
        [ -z "$orig_ports" ] && continue

        echo "  $service:" >> "$override_file"
        echo "    ports:" >> "$override_file"

        # Create var name from service (uppercase, replace dashes with underscores)
        local var_name=$(echo "${service}" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_PORT
        local first_port_saved=false

        for port_mapping in $orig_ports; do
            # Parse "host:container" format
            local container_port="${port_mapping##*:}"

            # Find available port
            while ! is_port_available "$current_port"; do
                ((current_port++))
            done

            echo "      - \"$current_port:$container_port\"" >> "$override_file"

            # Save first port as the service port variable
            if [ "$first_port_saved" = false ]; then
                echo "export ${var_name}=$current_port" >> "$ports_file"
                first_port_saved=true
            fi

            ((current_port++))
        done
    done

    source "$ports_file"
    echo "  ✓ Generated docker-compose.override.yml"
}

start_docker_services() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local config_file="$CHAUD_MAIN_REPO/.chaud/runtime.json"

    read_runtime_config "$config_file" || return 0
    [ "$DOCKER_ENABLED" != "true" ] && return 0

    local compose_file="$CHAUD_MAIN_REPO/$DOCKER_COMPOSE_FILE"
    [ ! -f "$compose_file" ] && { echo "Warning: $DOCKER_COMPOSE_FILE not found" >&2; return 1; }

    # Generate override with unique ports if enabled
    generate_docker_compose_override "$worktree_dir" "$config_file"

    allocate_docker_ports "$worktree_dir" "$config_file"
    [ -f "$worktree_dir/.chaud/docker-ports" ] && source "$worktree_dir/.chaud/docker-ports"

    local project_name=$(get_docker_project_name "$worktree_dir")
    local override_file="$worktree_dir/.chaud/docker-compose.override.yml"

    echo "Starting Docker services..."
    cd "$worktree_dir"

    if [ -f "$override_file" ]; then
        COMPOSE_PROJECT_NAME="$project_name" docker-compose -f "$compose_file" -f "$override_file" up -d
    else
        COMPOSE_PROJECT_NAME="$project_name" docker-compose -f "$compose_file" up -d
    fi
}

#######################################
# Generate Docker project name with description for visibility
#######################################
get_docker_project_name() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local repo_name=$(basename "$CHAUD_MAIN_REPO")
    local branch_name="${CHAUD_BRANCH:-$(basename "$worktree_dir")}"
    local description="${CHAUD_DESCRIPTION:-}"

    # Sanitize branch name (lowercase, replace / with -)
    local safe_branch=$(echo "$branch_name" | tr '/' '-' | tr '[:upper:]' '[:lower:]')

    # Start with repo-branch
    local project_name="${repo_name}-${safe_branch}"

    # Optionally append truncated description for visibility in docker ps
    if [[ -n "$description" ]]; then
        # Take first 15 chars, lowercase, replace spaces with dashes, keep only alphanumeric and dashes
        local safe_desc=$(echo "$description" | cut -c1-15 | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')
        # Remove trailing dashes
        safe_desc="${safe_desc%-}"
        if [[ -n "$safe_desc" ]]; then
            project_name="${project_name}-${safe_desc}"
        fi
    fi

    # Docker project names have max length ~63 chars, truncate if needed
    echo "${project_name:0:63}"
}

stop_docker_services() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local config_file="$CHAUD_MAIN_REPO/.chaud/runtime.json"

    read_runtime_config "$config_file" 2>/dev/null || return 0
    [ "$DOCKER_ENABLED" != "true" ] && return 0

    local compose_file="$CHAUD_MAIN_REPO/$DOCKER_COMPOSE_FILE"
    [ ! -f "$compose_file" ] && return 0

    local project_name=$(get_docker_project_name "$worktree_dir")

    echo "Stopping Docker services..."
    cd "$worktree_dir" 2>/dev/null || cd "$CHAUD_MAIN_REPO"
    COMPOSE_PROJECT_NAME="$project_name" docker-compose -f "$compose_file" down -v --remove-orphans 2>/dev/null
    rm -f "$worktree_dir/.chaud/docker-ports"
}

start_ngrok() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local port="${2:-$(get_worktree_port "$worktree_dir")}"
    local config_file="${3:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    local ngrok_file="$worktree_dir/.chaud/ngrok"
    local ngrok_pid_file="$worktree_dir/.chaud/ngrok.pid"
    local ngrok_api_port_file="$worktree_dir/.chaud/ngrok-api-port"

    command -v ngrok &> /dev/null || { echo "Warning: ngrok not installed" >&2; return 1; }

    # Calculate unique API port (offset from app port to avoid collisions with other ngrok instances)
    local api_port=$((port + 1000))

    # Ensure the API port is available, increment if not
    while ! is_port_available "$api_port" && [ "$api_port" -lt $((port + 1100)) ]; do
        ((api_port++))
    done

    # Start ngrok with explicit API port to avoid conflicts with other instances
    ngrok http "$port" --api-addr "localhost:$api_port" --log=stdout > "$worktree_dir/.chaud/ngrok.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$ngrok_pid_file"
    echo "$api_port" > "$ngrok_api_port_file"

    # Wait for ngrok to start and get URL (max 10 seconds)
    local attempts=0
    local ngrok_url=""
    while [ $attempts -lt 20 ]; do
        sleep 0.5
        ngrok_url=$(curl -s "http://localhost:$api_port/api/tunnels" 2>/dev/null | jq -r '.tunnels[0].public_url // empty' 2>/dev/null)
        if [ -n "$ngrok_url" ]; then
            break
        fi
        ((attempts++))
    done

    if [ -z "$ngrok_url" ]; then
        echo "Warning: Could not get ngrok URL" >&2
        return 1
    fi

    echo "$ngrok_url" > "$ngrok_file"
    export NGROK_URL="$ngrok_url"
    export CHAUD_NGROK_URL="$ngrok_url"
    echo "$ngrok_url"
}

stop_ngrok() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local ngrok_pid_file="$worktree_dir/.chaud/ngrok.pid"

    if [ -f "$ngrok_pid_file" ]; then
        local pid=$(cat "$ngrok_pid_file")
        kill "$pid" 2>/dev/null || true
        rm -f "$ngrok_pid_file"
        rm -f "$worktree_dir/.chaud/ngrok"
        rm -f "$worktree_dir/.chaud/ngrok.log"
        rm -f "$worktree_dir/.chaud/ngrok-api-port"
    fi
}

get_ngrok_url() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local ngrok_file="$worktree_dir/.chaud/ngrok"
    [ -f "$ngrok_file" ] && cat "$ngrok_file"
}

apply_env_overrides() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local overrides_file="$CHAUD_MAIN_REPO/.chaud/env.overrides"
    local env_file="$worktree_dir/.env.local"

    [ ! -f "$overrides_file" ] && return 0

    local port=$(get_worktree_port "$worktree_dir")
    local ngrok_url=$(get_ngrok_url "$worktree_dir")
    local branch=$(basename "$worktree_dir")

    # Ensure .env.local exists
    touch "$env_file"

    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

        # Extract var name and value template
        local var="${line%%=*}"
        local template="${line#*=}"

        # Substitute placeholders
        local value="$template"
        value="${value//\{\{NGROK_URL\}\}/$ngrok_url}"
        value="${value//\{\{PORT\}\}/$port}"
        value="${value//\{\{WORKTREE\}\}/$worktree_dir}"
        value="${value//\{\{BRANCH\}\}/$branch}"

        # Update or append to .env.local
        if grep -q "^${var}=" "$env_file" 2>/dev/null; then
            sed -i '' "s|^${var}=.*|${var}=${value}|" "$env_file"
        else
            echo "${var}=${value}" >> "$env_file"
        fi
    done < "$overrides_file"
}

transform_env_with_ngrok() {
    local env_file="$1"
    local ngrok_url="$2"
    local config_file="${3:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"

    [ ! -f "$env_file" ] && return 0
    [ ! -f "$config_file" ] && return 0

    local content=$(cat "$env_file")
    local env_vars=$(jq -r '.ngrok.envTransforms // {} | keys[]' "$config_file" 2>/dev/null)

    for var in $env_vars; do
        local template=$(jq -r --arg v "$var" '.ngrok.envTransforms[$v]' "$config_file")
        local value=$(echo "$template" | sed "s|\${NGROK_URL}|$ngrok_url|g")
        # Keep original value for non-URL transforms (like signing keys)
        if [[ "$template" == *'${'* ]] && [[ "$template" != *'NGROK_URL'* ]]; then
            continue  # Skip non-ngrok transforms, keep original values
        fi
        if grep -q "^${var}=" <<< "$content"; then
            content=$(echo "$content" | sed "s|^${var}=.*|${var}=${value}|")
        else
            content="$content"$'\n'"${var}=${value}"
        fi
    done
    echo "$content" > "$env_file"
}

cleanup_runtime() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    stop_ngrok "$worktree_dir"
    stop_docker_services "$worktree_dir"
    rm -f "$worktree_dir/.chaud/port"
}

print_runtime_info() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local port=$(get_worktree_port "$worktree_dir")
    local ngrok_url=$(get_ngrok_url "$worktree_dir")

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  Runtime Environment"
    echo "═══════════════════════════════════════════════════════════"
    [ -n "$port" ] && echo "  Local URL:   http://localhost:$port"
    [ -n "$ngrok_url" ] && echo "  Public URL:  $ngrok_url"
    if [ -f "$worktree_dir/.chaud/docker-ports" ]; then
        source "$worktree_dir/.chaud/docker-ports"
        [ -n "$DB_PORT" ] && echo "  Database:    localhost:$DB_PORT"
        [ -n "$REDIS_PORT" ] && echo "  Redis:       localhost:$REDIS_PORT"
    fi
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

setup_runtime() {
    local worktree_dir="${1:-$CHAUD_WORKTREE}"
    local config_file="${2:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"

    read_runtime_config "$config_file" || { echo "No runtime.json found, skipping runtime setup"; return 0; }
    [ "$RUNTIME_ENABLED" != "true" ] && return 0

    echo "Setting up runtime environment..."

    local port=$(allocate_worktree_port "$worktree_dir")
    [ -z "$port" ] && { echo "Error: Failed to allocate port" >&2; return 1; }
    echo "  ✓ Allocated port: $port"

    for env_file in ".env" ".env.local"; do
        local src="$CHAUD_MAIN_REPO/$env_file"
        local dest="$worktree_dir/$env_file"
        if [ -f "$src" ]; then
            transform_env_file "$src" "$dest" "$port" "$config_file"
            echo "  ✓ Transformed $env_file"
        fi
    done

    if [ "$DOCKER_ENABLED" = "true" ]; then
        start_docker_services "$worktree_dir"
        echo "  ✓ Started Docker services"
    fi

    if [ "$NGROK_ENABLED" = "true" ]; then
        echo "  ⏳ Starting ngrok tunnel..."
        local ngrok_url=$(start_ngrok "$worktree_dir" "$port" "$config_file")
        if [ -n "$ngrok_url" ]; then
            echo "  ✓ Ngrok tunnel: $ngrok_url"
            # Transform env files with ngrok URL
            for env_file in ".env" ".env.local"; do
                local dest="$worktree_dir/$env_file"
                if [ -f "$dest" ]; then
                    transform_env_with_ngrok "$dest" "$ngrok_url" "$config_file"
                fi
            done
        else
            echo "  ⚠ Failed to start ngrok tunnel"
        fi
    fi

    # Apply env.overrides with placeholder substitution
    if [ -f "$CHAUD_MAIN_REPO/.chaud/env.overrides" ]; then
        apply_env_overrides "$worktree_dir"
        echo "  ✓ Applied env.overrides"
    fi

    export PORT="$port"
    export CHAUD_PORT="$port"
    print_runtime_info "$worktree_dir"
}

get_dev_command() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    local port="${PORT:-3000}"
    read_runtime_config "$config_file" 2>/dev/null || { echo "npm run dev"; return; }
    echo "$RUNTIME_DEV_COMMAND" | sed "s/\${PORT}/$port/g"
}
