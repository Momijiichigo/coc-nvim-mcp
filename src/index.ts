import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { attach, Neovim } from "neovim";

const server = new McpServer(
  {
    name: "coc-nvim-mcp",
    version: "1.0.0",
  }
);

let nvim: Neovim;

async function initNvim() {
  const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
  if (!nvimAddr) {
    // This is handled in main()
    throw new Error("NVIM_LISTEN_ADDRESS or NVIM environment variable not set");
  }

  try {
    nvim = attach({ socket: nvimAddr });
  } catch (err: any) {
    throw err;
  }
}

server.registerTool(
  "get_diagnostics",
  {
    description: "Get all diagnostics from coc.nvim",
  },
  async () => {
    try {
      if (!nvim) {
        return {
          content: [{ type: "text", text: "Not running from Neovim; Coc MCP feature unavailable" }],
          isError: true,
        };
      }

      const diagnostics = await nvim.call("CocAction", ["diagnosticList"]);
      return {
        content: [{ type: "text", text: JSON.stringify(diagnostics, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
  if (nvimAddr) {
    await initNvim();
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((_error) => {
  process.exit(1);
});
