import * as fs from "fs";
import * as path from "path";

// CRITICAL: Redirect console.log and console.error to our log file immediately
// This MUST happen before any other imports that might use console.
const LOG_FILE = "/tmp/coc-mcp-server.log";
function log(msg: string) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}
console.log = (...args) => log(`[STDOUT] ${args.join(" ")}`);
console.error = (...args) => log(`[STDERR] ${args.join(" ")}`);

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { attach, Neovim } from "neovim";

const args = process.argv.slice(2);
const DEBUG = true; // Force debug for now to catch the issue

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
      prompts: {},
      resources: {},
    },
  }
);

let nvim: Neovim;

async function initNvim() {
  const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
  if (!nvimAddr) {
    const msg = "Error: NVIM_LISTEN_ADDRESS or NVIM environment variable not set";
    log(msg);
    throw new Error(msg);
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

// Handle process signals
async function cleanup() {
  log("Cleaning up and shutting down...");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("Received tools/list request");
  try {
    const response = {
      tools: [
        {
          name: "get_diagnostics",
          description: "Get all diagnostics from coc.nvim",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
    log(`Sending tools/list response: ${JSON.stringify(response)}`);
    return response;
  } catch (err: any) {
    log(`Error in tools/list: ${err.message}`);
    throw err;
  }
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
  try {
    await initNvim();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("Server connected to Stdio transport");
  } catch (error: any) {
    log(`Fatal error in main: ${error.message}`);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  log(`Unhandled Rejection: ${reason}`);
});

process.on("uncaughtException", (error) => {
  log(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

main();

