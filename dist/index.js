import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { attach, Neovim } from "neovim";
import * as fs from "fs";
import * as path from "path";
const args = process.argv.slice(2);
const DEBUG = args.includes("--debug") || process.env.DEBUG === "true";
const LOG_FILE_ARG = args.find(arg => arg.startsWith("--log-file="))?.split("=")[1];
const LOG_FILE = LOG_FILE_ARG || "/tmp/coc-mcp-server.log";
function log(msg) {
    // Always log errors if not in debug, but log everything if in debug
    if (!DEBUG && !msg.startsWith("Error") && !msg.startsWith("Fatal"))
        return;
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    }
    catch (e) {
        // Ignore logging errors to prevent server crash
    }
}
// CRITICAL: Redirect console.log and console.error to our log file
// MCP uses stdout for protocol communication, so any stray console.log will break it.
console.log = (...args) => log(`[STDOUT] ${args.join(" ")}`);
console.error = (...args) => log(`[STDERR] ${args.join(" ")}`);
// Ensure log file exists if debug is on
if (DEBUG) {
    try {
        fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] Stdio Server starting...\n`);
    }
    catch (e) {
        // Ignore logging errors
    }
}
const server = new Server({
    name: "coc-nvim-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
        prompts: {},
        resources: {},
    },
});
let nvim;
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
    }
    catch (err) {
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
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
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
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map