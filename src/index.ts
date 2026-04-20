import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { attach, Neovim } from "neovim";
import * as fs from "fs";
import * as path from "path";

const args = process.argv.slice(2);
const DEBUG = args.includes("--debug") || process.env.DEBUG === "true";
const LOG_FILE_ARG = args.find(arg => arg.startsWith("--log-file="))?.split("=")[1];
const LOG_FILE = LOG_FILE_ARG || "/tmp/coc-mcp-server.log";

function log(msg: string) {
  if (!DEBUG) return;
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    // Ignore logging errors to prevent server crash
  }
}

// Ensure log file exists if debug is on
if (DEBUG) {
  try {
    fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] Stdio Server starting...\n`);
  } catch (e) {
    // Ignore logging errors
  }
}

const server = new Server(
  {
    name: "coc-nvim-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let nvim: Neovim;

async function initNvim() {
  const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
  if (!nvimAddr) {
    log("Error: NVIM_LISTEN_ADDRESS or NVIM environment variable not set");
    throw new Error("NVIM_LISTEN_ADDRESS or NVIM environment variable not set");
  }

  log(`Connecting to Neovim at: ${nvimAddr}`);
  try {
    nvim = attach({ socket: nvimAddr });
    // Test connection
    await nvim.command("echo 'coc-nvim-mcp connected via Stdio'");
    log("Connected to Neovim successfully");
  } catch (err: any) {
    log(`Failed to attach to Neovim: ${err.message}`);
    throw err;
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("Received tools/list");
  return {
    tools: [
      {
        name: "get_diagnostics",
        description: "Get all diagnostics from coc.nvim",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_definition",
        description: "Get definition at the current cursor position",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_references",
        description: "Get references for the symbol at the current cursor position",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_buffer",
        description: "Read the content of the current Neovim buffer",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  log(`Tool call: ${name}`);
  try {
    switch (name) {
      case "get_diagnostics": {
        const diagnostics = await nvim.call("CocAction", ["diagnosticList"]);
        return {
          content: [{ type: "text", text: JSON.stringify(diagnostics, null, 2) }],
        };
      }
      case "get_definition": {
        const definitions = await nvim.call("CocAction", ["definitions"]);
        return {
          content: [{ type: "text", text: JSON.stringify(definitions, null, 2) }],
        };
      }
      case "get_references": {
        const references = await nvim.call("CocAction", ["references"]);
        return {
          content: [{ type: "text", text: JSON.stringify(references, null, 2) }],
        };
      }
      case "read_buffer": {
        const buffer = await nvim.buffer;
        const lines = await buffer.lines;
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    log(`Error in tool ${name}: ${error.message}`);
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  await initNvim();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Server connected to Stdio transport");
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});
