---
name: coc-nvim-mcp
description: Expertise in language-specific diagnostics and LSP information provided by coc.nvim. Use whenever you need error analysis, code quality checks, or diagnostic information for any language in the editor.
---

# Neovim CoC LSP Integration Instructions

This skill enables you to leverage `coc.nvim`'s language server capabilities via the `coc-nvim-mcp` server. It provides real-time feedback on code quality (diagnostics) and detailed symbol information (hover/documentation) across all languages supported by the user's Neovim configuration.

## Instructions

- **Contextual Awareness:** Use the `get_diagnostics` tool to understand the current state of the code or troubleshoot errors. Use `get_hover` to inspect symbols, types, and documentation.
- **Language Support:** These tools work for any language that has an active `coc.nvim` language server (e.g., TypeScript, Python, Go, Rust, etc.).
- **Error Resolution:** When a user reports a bug or you detect a failure, start by fetching diagnostics to pinpoint the exact location and nature of the issue.
- **Symbol Inspection:** If you are unsure about a function signature, type definition, or documentation, use `get_hover` to get more context.
- **Verification:** After making changes, use `get_diagnostics` again to verify that the errors have been resolved and no new ones have been introduced.

## Available Tools

- `get_diagnostics`: Retrieves all diagnostics (errors, warnings, information, hints) from `coc.nvim` for the current workspace.
- `get_hover`: Retrieves documentation/hover information for a symbol in a file. This is the preferred tool for general inspection as it handles file loading and column calculation.
    - `file_path`: Absolute path to the file.
    - `line`: 1-based line number.
    - `symbol`: The symbol to hover over.
    - `context`: (Optional) A unique snippet from the line containing the symbol to help disambiguate multiple occurrences (e.g., if `new` appears multiple times, provide `StructB::new` as context).
- `raw_get_hover`: Retrieves hover information using exact coordinates (`bufnr`, `line`, `col`). Use this if you already have the exact position from another tool.
