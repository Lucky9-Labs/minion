#!/usr/bin/env bash
# services.sh - Generic service lifecycle management for chaud runtime
#
# This module provides a unified interface for managing services (databases, caches, etc.)
# across local development and cloud runner environments.
#
# Source this file after runtime.sh:
#   source "$CHAUD_LIB/services.sh"

# Ensure required variables are set
: "${CHAUD_LIB:?CHAUD_LIB must be set}"
: "${CHAUD_WORKTREE:=$PWD}"
: "${CHAUD_MAIN_REPO:=$CHAUD_WORKTREE}"

# Service state tracking directory
CHAUD_SERVICE_STATE="${CHAUD_WORKTREE}/.chaud/services"

#######################################
# Initialize services module
#######################################
services_init() {
    mkdir -p "$CHAUD_SERVICE_STATE"
    source_service_handlers
}

#######################################
# Source all service-specific handlers
#######################################
source_service_handlers() {
    local handlers_dir="$CHAUD_LIB/services"
    if [[ -d "$handlers_dir" ]]; then
        for handler in "$handlers_dir"/*.sh; do
            [[ -f "$handler" ]] && source "$handler"
        done
    fi
}

#######################################
# Read services configuration from runtime.json
# Returns JSON array of service configs
#######################################
get_services_config() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && return 1
    command -v jq &>/dev/null || { echo "[]"; return 1; }
    jq -r '.services // []' "$config_file"
}

#######################################
# Get configuration for a specific service by name
#######################################
get_service_config() {
    local service_name="$1"
    local config_file="${2:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && return 1
    jq -r --arg name "$service_name" '.services[] | select(.name == $name)' "$config_file"
}

#######################################
# Get environment configuration
#######################################
get_environment_config() {
    local environment="$1"
    local config_file="${2:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && return 1
    jq -r --arg env "$environment" '.environments[$env] // {}' "$config_file"
}

#######################################
# Get test configuration
#######################################
get_test_config() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && return 1
    jq -r '.test.integration // {}' "$config_file"
}

#######################################
# Start all services for a given environment
# Args: $1 - JSON array of service names (e.g., '["supabase", "redis"]')
#       $2 - Environment name (e.g., "test", "development")
#######################################
start_services() {
    local services_json="${1:-[]}"
    local environment="${2:-development}"
    local config_file="${3:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"

    services_init

    local services
    if [[ "$services_json" == "[]" ]]; then
        return 0
    fi

    # Parse service names from JSON array
    local service_names
    service_names=$(echo "$services_json" | jq -r '.[]' 2>/dev/null)
    [[ -z "$service_names" ]] && return 0

    echo "Starting services for environment: $environment"

    for service_name in $service_names; do
        local service_config
        service_config=$(get_service_config "$service_name" "$config_file")
        [[ -z "$service_config" || "$service_config" == "null" ]] && {
            echo "Warning: Service '$service_name' not found in config" >&2
            continue
        }

        local service_type
        service_type=$(echo "$service_config" | jq -r '.type // "custom"')

        echo "  Starting $service_name ($service_type)..."

        case "$service_type" in
            supabase)
                start_supabase_service "$service_config" "$environment" "$config_file"
                ;;
            docker)
                start_docker_service_managed "$service_config"
                ;;
            *)
                start_custom_service "$service_config"
                ;;
        esac

        local exit_code=$?
        if [[ $exit_code -eq 0 ]]; then
            # Track running service
            echo "$service_name" >> "$CHAUD_SERVICE_STATE/running"
            echo "  ✓ $service_name started"
        else
            echo "  ✗ Failed to start $service_name" >&2
            return $exit_code
        fi
    done
}

#######################################
# Stop all running services
#######################################
stop_services() {
    local running_file="$CHAUD_SERVICE_STATE/running"
    [[ ! -f "$running_file" ]] && return 0

    echo "Stopping services..."

    # Stop in reverse order
    local services
    services=$(tac "$running_file" 2>/dev/null || cat "$running_file")

    for service_name in $services; do
        echo "  Stopping $service_name..."
        stop_service "$service_name"
    done

    rm -f "$running_file"
    echo "  ✓ All services stopped"
}

#######################################
# Stop a specific service
#######################################
stop_service() {
    local service_name="$1"
    local service_config
    service_config=$(get_service_config "$service_name")
    [[ -z "$service_config" || "$service_config" == "null" ]] && return 0

    local service_type
    service_type=$(echo "$service_config" | jq -r '.type // "custom"')

    case "$service_type" in
        supabase)
            stop_supabase_service "$service_name"
            ;;
        docker)
            stop_docker_service_managed "$service_name"
            ;;
        *)
            stop_custom_service "$service_name"
            ;;
    esac
}

#######################################
# Get list of running services
#######################################
get_running_services() {
    local running_file="$CHAUD_SERVICE_STATE/running"
    [[ -f "$running_file" ]] && cat "$running_file"
}

#######################################
# Wait for all services to be healthy
# Args: $1 - Timeout in seconds (default: 120)
#######################################
wait_for_services() {
    local timeout="${1:-120}"
    local start_time
    start_time=$(date +%s)

    local running_services
    running_services=$(get_running_services)
    [[ -z "$running_services" ]] && return 0

    echo "Waiting for services to be healthy..."

    for service_name in $running_services; do
        while ! check_service_health "$service_name"; do
            local elapsed=$(($(date +%s) - start_time))
            if [[ $elapsed -gt $timeout ]]; then
                echo "Timeout waiting for $service_name to be healthy" >&2
                return 1
            fi
            sleep 2
        done
        echo "  ✓ $service_name is healthy"
    done
}

#######################################
# Check if a service is healthy
#######################################
check_service_health() {
    local service_name="$1"
    local service_config
    service_config=$(get_service_config "$service_name")
    [[ -z "$service_config" || "$service_config" == "null" ]] && return 1

    local service_type
    service_type=$(echo "$service_config" | jq -r '.type // "custom"')

    case "$service_type" in
        supabase)
            check_supabase_health "$service_name"
            ;;
        docker)
            check_docker_service_health "$service_name" "$service_config"
            ;;
        *)
            # Custom services assumed healthy if started
            [[ -f "$CHAUD_SERVICE_STATE/${service_name}.started" ]]
            ;;
    esac
}

#######################################
# Export environment variables for all running services
# Args: $1 - Optional env file to append to
#######################################
export_service_env() {
    local env_file="${1:-$CHAUD_WORKTREE/.env.local}"
    local running_services
    running_services=$(get_running_services)
    [[ -z "$running_services" ]] && return 0

    echo "Exporting service environment variables..."

    for service_name in $running_services; do
        local env_file_service="$CHAUD_SERVICE_STATE/${service_name}.env"
        if [[ -f "$env_file_service" ]]; then
            # Source to current shell
            source "$env_file_service"

            # Append to env file if specified
            if [[ -n "$env_file" ]]; then
                # Add newline separator
                echo "" >> "$env_file"
                echo "# Service: $service_name" >> "$env_file"
                cat "$env_file_service" >> "$env_file"
            fi
        fi
    done
}

#######################################
# Start a custom service using shell command
#######################################
start_custom_service() {
    local config="$1"
    local name
    name=$(echo "$config" | jq -r '.name')
    local start_cmd
    start_cmd=$(echo "$config" | jq -r '.config.startCommand // empty')

    [[ -z "$start_cmd" ]] && {
        echo "No start command for service: $name" >&2
        return 1
    }

    # Substitute environment variables in command
    local port
    port=$(get_worktree_port "$CHAUD_WORKTREE" 2>/dev/null)
    start_cmd=$(echo "$start_cmd" | sed "s/\${PORT}/$port/g")

    # Run command
    eval "$start_cmd" &
    local pid=$!
    echo "$pid" > "$CHAUD_SERVICE_STATE/${name}.pid"
    touch "$CHAUD_SERVICE_STATE/${name}.started"

    # Export environment variables
    export_service_env_vars "$config"
}

#######################################
# Stop a custom service
#######################################
stop_custom_service() {
    local name="$1"
    local pid_file="$CHAUD_SERVICE_STATE/${name}.pid"

    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null || true
        rm -f "$pid_file"
    fi

    rm -f "$CHAUD_SERVICE_STATE/${name}.started"
    rm -f "$CHAUD_SERVICE_STATE/${name}.env"
}

#######################################
# Export environment variables for a service
#######################################
export_service_env_vars() {
    local config="$1"
    local name
    name=$(echo "$config" | jq -r '.name')
    local env_file="$CHAUD_SERVICE_STATE/${name}.env"

    # Get envExports from config
    local exports
    exports=$(echo "$config" | jq -r '.envExports // {} | to_entries[] | "\(.key)=\(.value)"' 2>/dev/null)
    [[ -z "$exports" ]] && return 0

    # Write exports to service env file
    echo "# Environment exports for $name" > "$env_file"

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue

        local key="${line%%=*}"
        local value="${line#*=}"

        # Substitute known variables
        value=$(echo "$value" | sed "s/\${PORT}/$(get_worktree_port 2>/dev/null)/g")
        value=$(echo "$value" | sed "s/\${SUPABASE_URL}/${SUPABASE_URL:-}/g")
        value=$(echo "$value" | sed "s/\${SUPABASE_SERVICE_KEY}/${SUPABASE_SERVICE_KEY:-}/g")
        value=$(echo "$value" | sed "s/\${SUPABASE_ANON_KEY}/${SUPABASE_ANON_KEY:-}/g")
        value=$(echo "$value" | sed "s/\${${name^^}_PORT}/${!name^^_PORT:-}/g")

        echo "export $key=\"$value\"" >> "$env_file"
        export "$key=$value"
    done <<< "$exports"
}

#######################################
# Check if services are enabled in runtime.json
#######################################
services_enabled() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && return 1

    local services
    services=$(jq -r '.services // []' "$config_file")
    [[ "$services" != "[]" && "$services" != "null" ]]
}

#######################################
# Get test services from runtime.json
# Returns JSON array of service names
#######################################
get_test_services() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && { echo "[]"; return 1; }
    jq -r '.test.integration.services // []' "$config_file"
}

#######################################
# Get test environment from runtime.json
#######################################
get_test_environment() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"
    [[ ! -f "$config_file" ]] && { echo "test"; return; }
    jq -r '.test.integration.environment // "test"' "$config_file"
}

#######################################
# Setup services for test environment
# Convenience function for prework.sh
#######################################
setup_test_services() {
    local config_file="${1:-$CHAUD_MAIN_REPO/.chaud/runtime.json}"

    services_enabled "$config_file" || return 0

    local test_services
    test_services=$(get_test_services "$config_file")
    [[ "$test_services" == "[]" ]] && return 0

    local test_env
    test_env=$(get_test_environment "$config_file")

    start_services "$test_services" "$test_env" "$config_file"
    wait_for_services
    export_service_env
}

#######################################
# Cleanup services for test environment
# Convenience function for postwork.sh
#######################################
cleanup_test_services() {
    stop_services
}
