// Local Streamable-HTTP MCP server for development and host testing
// (e.g. the ext-apps `basic-host` example, or `claude mcp add`).
//
// Wraps the SAME handler the Vercel function uses, so local behaviour matches
// production. Run after `npm run build`:  node scripts/dev-server.mjs
//
//   MCP endpoint: http://localhost:3001/mcp
//   Health:       http://localhost:3001/health

import { createServer } from "node:http";
import { handleMcpRequest } from "../dist/src/http-handler.js";

const port = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  // Vercel's Node runtime pre-parses JSON bodies onto req.body; a raw Node
  // server does not, so parse it here before delegating to the shared handler.
  if (req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf-8");
    try {
      req.body = raw ? JSON.parse(raw) : undefined;
    } catch {
      req.body = undefined;
    }
  }
  await handleMcpRequest(req, res);
}).listen(port, () => {
  console.log(`OpenSCAD MCP server: http://localhost:${port}/mcp`);
});
