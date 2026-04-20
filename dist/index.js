import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { attach, Neovim } from "neovim";
const server = new Server({
    name: "coc-nvim-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
let nvim;
async function initNvim() {
    const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
    if (!nvimAddr) {
        // This is handled in main()
        throw new Error("NVIM_LISTEN_ADDRESS or NVIM environment variable not set");
    }
    try {
        nvim = attach({ socket: nvimAddr });
    }
    catch (err) {
        throw err;
    }
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
async function main() {
    const nvimAddr = process.env.NVIM_LISTEN_ADDRESS || process.env.NVIM;
    if (!nvimAddr) {
        // If not running inside Neovim, exit quietly.
        // This allows the server to be globally configured but only active when spawned from Neovim.
        process.exit(0);
    }
    await initNvim();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    process.exit(1);
});
//# sourceMappingURL=index.js.map