#!/bin/bash

# coc-mcp-launcher.sh
# This script is used by the gemini CLI to launch the coc-nvim-mcp server
# It ensures that the current Neovim environment is preserved.

# The NVIM environment variable is passed from the parent gemini process
# which is running inside a Neovim terminal.
export NVIM_LISTEN_ADDRESS="$NVIM"

# Execute node from the same directory as this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec node "$DIR/dist/index.js" "$@"
