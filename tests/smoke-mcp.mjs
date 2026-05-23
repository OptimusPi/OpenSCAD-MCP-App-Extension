// End-to-end MCP smoke test — runs the real server through a real MCP client
// over the SDK's in-memory transport. Exercises the full protocol path:
// initialize handshake, tools/list, tools/call, resources/list, resources/read.
//
// Run after `npm run build`:  node tests/smoke-mcp.mjs

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../dist/src/mcp-server.js";

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

const server = createMcpServer();
const [clientTransport, serverTransport] =
  InMemoryTransport.createLinkedPair();

const client = new Client({ name: "smoke-test", version: "1.0.0" });

await server.connect(serverTransport);
await client.connect(clientTransport); // performs the initialize handshake

console.log("\n=== MCP handshake ===");
check("client connected (initialize negotiated)", true);

console.log("\n=== tools/list ===");
const { tools } = await client.listTools();
check("1 consolidated tool advertised", tools.length === 1, `got ${tools.length}`);
const design = tools.find((t) => t.name === "design_3d_model");
check("design_3d_model present with input schema", !!design?.inputSchema);
check(
  "design_3d_model carries MCP App ui metadata",
  !!design?._meta && JSON.stringify(design._meta).includes("ui://openscad/preview.html"),
);

console.log("\n=== tools/call ===");
const cubeResult = await client.callTool({
  name: "design_3d_model",
  arguments: { ast: { type: "cube", size: [10, 20, 30] } },
});
const cubeText = cubeResult.content?.[0]?.text ?? "";
check("design_3d_model returns scad code", cubeText.includes("cube"));
check(
  "design_3d_model returns structuredContent for the UI",
  !!cubeResult.structuredContent &&
    typeof cubeResult.structuredContent.scad_code === "string" &&
    cubeResult.structuredContent.ast?.type === "cube",
);

const diffResult = await client.callTool({
  name: "design_3d_model",
  arguments: {
    ast: {
      type: "difference",
      children: [
        { type: "cube", size: 10, center: true },
        { type: "sphere", r: 6 },
      ],
    },
  },
});
check(
  "design_3d_model composes nested children",
  (diffResult.structuredContent?.scad_code ?? "").includes("difference"),
);

console.log("\n=== resources ===");
const { resources } = await client.listResources();
check("at least one resource listed", resources.length >= 1);
const appRes = await client.readResource({
  uri: "ui://openscad/preview.html",
});
const html = appRes.contents?.[0]?.text ?? "";
check("MCP App resource readable", html.length > 1000);
check(
  "MCP App resource is the built UI (not the placeholder)",
  html.includes("OpenSCAD Preview") && !html.includes("UI not built"),
);

console.log("\n=== prompts ===");
const { prompts } = await client.listPrompts();
check("4 design prompts listed", prompts.length === 4, `got ${prompts.length}`);

await client.close();
await server.close();

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
