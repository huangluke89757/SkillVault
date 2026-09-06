import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { VERSION } from "../constants.js";
import { registerList } from "./tools/list.js";
import { registerAdd } from "./tools/add.js";
import { registerRemove } from "./tools/remove.js";
import { registerUpdate } from "./tools/update.js";
import { registerSync } from "./tools/sync.js";
import { registerScan } from "./tools/scan.js";

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "skillvault",
    version: VERSION,
  });

  // Read-only tools
  registerList(server);
  // Write tools
  registerAdd(server);
  registerRemove(server);
  registerUpdate(server);
  registerSync(server);
  registerScan(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
