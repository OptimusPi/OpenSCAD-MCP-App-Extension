// HTTP smoke test — connects a real MCP client to the running dev server over
// the Streamable HTTP transport. This exercises the exact code path the Vercel
// function uses (src/http-handler.ts). Start the server first:
//
//   node scripts/dev-server.mjs &   (or: npm run serve)
//   node tests/smoke-http.mjs

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = process.env.MCP_URL ?? "http://localhost:3001";

let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Health endpoint
const health = await fetch(`${base}/health`).then((r) => r.json());
check("health endpoint responds ok", health.status === "ok");
check("health reports streamable-http transport", health.transport === "streamable-http");

// Real MCP client over Streamable HTTP
const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
const client = new Client({ name: "smoke-http", version: "1.0.0" });
await client.connect(transport);
check("MCP initialize handshake over HTTP", true);

const { tools } = await client.listTools();
check("32 tools over HTTP", tools.length === 32, `got ${tools.length}`);

const result = await client.callTool({
  name: "scad_cylinder",
  arguments: { h: 30, r: 10, center: true },
});
check(
  "tools/call over HTTP returns scad code",
  (result.content?.[0]?.text ?? "").includes("cylinder"),
);
check(
  "tools/call over HTTP returns structuredContent",
  result.structuredContent?.ast?.type === "cylinder",
);

const res = await client.readResource({ uri: "ui://openscad/preview.html" });
check(
  "MCP App resource served over HTTP",
  (res.contents?.[0]?.text ?? "").includes("OpenSCAD Preview"),
);

await client.close();

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
