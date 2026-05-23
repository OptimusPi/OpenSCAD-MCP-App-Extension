// ============================================================================
// MCP-over-HTTP request handler (shared)
// ============================================================================
// The single source of truth for serving MCP over the Streamable HTTP
// transport. `api/mcp.ts` (the Vercel function) and `scripts/dev-server.mjs`
// (local Node server) both delegate here, so what runs locally is exactly what
// runs in production.
//
// Stateless mode: a fresh McpServer + transport per request. McpServer binds to
// a single transport, and serverless invocations are independent anyway.

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createMcpServer } from "./mcp-server.js";
import { VERSION } from "./versions/index.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

export async function handleMcpRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );

  // Health check — handy for uptime probes and smoke tests.
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ok",
        name: "openscad-mcp-server",
        version: VERSION,
        transport: "streamable-http",
      }),
    );
    return;
  }

  // Everything else is the MCP endpoint. Stateless: one server per request.
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    // `req.body` is pre-parsed by Vercel's Node runtime; the dev server parses
    // it before calling this handler. Either way the transport gets an
    // already-parsed body and won't re-read the request stream.
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        }),
      );
    }
  }
}
