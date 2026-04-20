---
name: coc-nvim-mcp
description: Expertise in language-specific diagnostics and LSP information provided by coc.nvim. Use when the user asks for error analysis, code quality checks, or diagnostic information for any language in the editor.
---

# Neovim CoC Diagnostics Instructions

This skill enables you to leverage `coc.nvim`'s language server diagnostics via the `coc-nvim-mcp` server. It provides real-time feedback on code quality, errors, and warnings across all languages supported by the user's Neovim configuration.

## Instructions

- **Contextual Awareness:** Always use the `get_diagnostics` tool from the `coc-nvim-mcp` server when you need to understand the current state of the code or troubleshoot errors.
- **Language Support:** This tool works for any language that has an active `coc.nvim` language server (e.g., TypeScript, Python, Go, Rust, etc.).
- **Error Resolution:** When a user reports a bug or you detect a failure, start by fetching diagnostics to pinpoint the exact location and nature of the issue.
- **Verification:** After making changes, use `get_diagnostics` again to verify that the errors have been resolved and no new ones have been introduced.

## Available Tools

- `get_diagnostics`: Retrieves all diagnostics (errors, warnings, information, hints) from `coc.nvim` for the current workspace.
