#!/bin/bash

# coc-mcp-launcher.sh
# This script is used by the gemini CLI to launch the coc-nvim-mcp server
# It ensures that the current Neovim environment is preserved.

# The NVIM environment variable is passed from the parent gemini process
# which is running inside a Neovim terminal.
export NVIM_LISTEN_ADDRESS="$NVIM"

LOG_FILE="/tmp/coc-mcp-server.log"

# Log for debugging - only if some debug indicator is present
if [[ "$*" == *"--debug"* ]] || [[ "$DEBUG" == "true" ]]; then
  echo "[$(date)] Launcher starting node dist/index.js with NVIM=$NVIM args=$*" >> "$LOG_FILE"
fi

# Execute node from the same directory as this script
# Use BASH_SOURCE for robustness in bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ ! -f "$DIR/dist/index.js" ]; then
    echo "Error: $DIR/dist/index.js not found. Did you run npm run build?" >> "$LOG_FILE"
    exit 1
fi

# Run node and replace the shell process
exec node "$DIR/dist/index.js" "$@"

