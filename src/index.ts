import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { attach, Neovim } from "neovim";
import { z } from "zod";

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

server.registerTool(
  "raw_get_hover",
  {
    description: "Get hover information (documentation) for a specific buffer, line, and column",
    inputSchema: {
      bufnr: z.number().describe("Buffer number"),
      line: z.number().describe("1-based line number"),
      col: z.number().describe("1-based column number"),
    },
  },
  async ({ bufnr, line, col }) => {
    try {
      if (!nvim) {
        return {
          content: [{ type: "text", text: "Not running from Neovim; Coc MCP feature unavailable" }],
          isError: true,
        };
      }

      const hover = await nvim.call("CocAction", ["getHover", { bufnr, line, col }]);

      if (!hover || (Array.isArray(hover) && hover.length === 0)) {
        return {
          content: [{ type: "text", text: "No hover information available at this position" }],
        };
      }

      const text = Array.isArray(hover) ? hover.join("\n") : String(hover);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_hover",
  {
    description: "Get hover information for a symbol in a file. Automatically finds the column and handles file loading.",
    inputSchema: {
      file_path: z.string().describe("Absolute path to the file"),
      line: z.number().describe("1-based line number"),
      symbol: z.string().describe("The symbol to hover over"),
      context: z.string().optional().describe("A unique snippet from the line containing the symbol to help disambiguate multiple occurrences"),
    },
  },
  async ({ file_path, line, symbol, context }) => {
    try {
      if (!nvim) {
        return {
          content: [{ type: "text", text: "Not running from Neovim; Coc MCP feature unavailable" }],
          isError: true,
        };
      }

      // 1. Get or create buffer
      let bufnr = (await nvim.call("bufnr", [file_path])) as number;
      if (bufnr === -1) {
        bufnr = (await nvim.call("bufadd", [file_path])) as number;
        await nvim.call("bufload", [bufnr]);
      }

      // 2. Get line content
      const lines = (await nvim.call("getbufline", [bufnr, line])) as string[];
      const lineContent = lines?.[0];
      if (lineContent === undefined) {
        return {
          content: [{ type: "text", text: `Could not read line ${line} from file ${file_path}` }],
          isError: true,
        };
      }

      // 3. Find column
      let col: number = -1;
      if (context) {
        const contextIdx = lineContent.indexOf(context);
        if (contextIdx !== -1) {
          const symbolInsideIdx = context.indexOf(symbol);
          if (symbolInsideIdx !== -1) {
            col = contextIdx + symbolInsideIdx + 1;
          } else {
            return {
              content: [{ type: "text", text: `Symbol '${symbol}' not found within the provided context '${context}'` }],
              isError: true,
            };
          }
        } else {
          return {
            content: [{ type: "text", text: `Context snippet '${context}' not found in line ${line}` }],
            isError: true,
          };
        }
      } else {
        const symbolIdx = lineContent.indexOf(symbol);
        if (symbolIdx !== -1) {
          col = symbolIdx + 1;
        } else {
          return {
            content: [{ type: "text", text: `Symbol '${symbol}' not found in line ${line}` }],
            isError: true,
          };
        }
      }

      // 4. Call CocAction
      const hover = await nvim.call("CocAction", ["getHover", { bufnr, line, col }]);

      if (!hover || (Array.isArray(hover) && hover.length === 0)) {
        return {
          content: [{ type: "text", text: `No hover information available for '${symbol}' at line ${line}, col ${col}` }],
        };
      }

      const text = Array.isArray(hover) ? hover.join("\n") : String(hover);
      return {
        content: [{ type: "text", text }],
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
