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
  
  vim.api.nvim_create_user_command("CocMcpUpdate", function()
    local plugin_root = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":h:h:h")
    vim.notify("coc-nvim-mcp: Installing dependencies and building...", vim.log.levels.INFO)
    
    vim.fn.jobstart("npm install && npm run build", {
      cwd = plugin_root,
      on_exit = function(_, code)
        if code == 0 then
          vim.notify("coc-nvim-mcp: Build successful!", vim.log.levels.INFO)
        else
          vim.notify("coc-nvim-mcp: Build failed with code " .. code, vim.log.levels.ERROR)
        end
      end,
      stdout_buffered = true,
      stderr_buffered = true,
    })
  end, {})
end

return M
