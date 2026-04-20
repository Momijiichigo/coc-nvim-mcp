local M = {}

function M.get_server_info()
  -- Go up 3 levels from lua/coc-nvim-mcp/init.lua to reach coc-nvim-mcp root
  local plugin_root = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":h:h:h")
  local launcher = plugin_root .. "/coc-mcp-launcher.sh"
  
  return {
    cmd = { launcher },
    env = {
      NVIM = vim.v.servername,
    }
  }
end

function M.setup(opts)
  -- Stdio version doesn't need a background job managed by Lua
  -- because the gemini CLI will spawn it.
end

return M
