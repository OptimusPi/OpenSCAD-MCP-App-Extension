# OpenSCAD MCP Server

A Model Context Protocol (MCP) server that generates parametric OpenSCAD `.scad` code — with an **MCP App**: an interactive three.js 3D preview that renders inline in the conversation. Deploy on Vercel and connect any MCP client (Claude Desktop, Claude Code, Claude mobile, Cursor).

```
┌─────────────┐   Streamable HTTP   ┌──────────────────┐
│ MCP Client  │ ──────────────────▶ │ Vercel (Node fn) │
│ (Claude,    │      JSON-RPC       │  MCP server      │ ── 32 OpenSCAD tools
│  Cursor)    │ ◀────────────────── │  + MCP App UI    │ ── ui://openscad/preview.html
└─────────────┘                     └──────────────────┘
       │  renders ui:// resource (3D preview + .scad code) in a sandboxed iframe
```

## How it works

- **32 tools** build an OpenSCAD AST and emit `.scad` source. Every tool is an *MCP App tool*: its result carries `structuredContent` and points at one shared UI resource.
- **The MCP App** (`ui/`) is a single self-contained HTML bundle. When a host supports MCP Apps it renders the tool's output as an interactive three.js model (Code tab always available as fallback).
- **Stateless Streamable HTTP** — a fresh server per request, so it runs cleanly as a serverless function.

## Develop

```bash
npm install
npm run build        # build:ui → inline-html → build:server
npm test             # vitest + full MCP protocol smoke test (in-memory)
npm run serve        # local MCP server on http://localhost:3001/mcp
node tests/smoke-http.mjs   # smoke-test the running server over HTTP
```

Test the UI in a real host with the [`ext-apps`](https://github.com/modelcontextprotocol/ext-apps) `basic-host` example pointed at `http://localhost:3001/mcp`.

## Deploy to Vercel

```bash
npm install
vercel --prod
```

`vercel.json` sets `buildCommand` to `vercel-build` (`build:ui && inline-html`); Vercel compiles the `api/mcp.ts` function from there. Runtime is Node.js (not Edge — the SDK transport and the build pipeline both need it).

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | `GET`/`POST`/`DELETE` | MCP Streamable HTTP transport |
| `/health` | `GET` | Health check |

## Tools (32)

**Primitives** `scad_cube` · `scad_sphere` · `scad_cylinder` · `scad_text` · `scad_polygon` · `scad_polyhedron` · `scad_surface`
**Transforms** `scad_translate` · `scad_rotate` · `scad_scale` · `scad_mirror` · `scad_multmatrix`
**Booleans** `scad_union` · `scad_difference` · `scad_intersection`
**Modifiers** `scad_hull` · `scad_minkowski` · `scad_linear_extrude` · `scad_rotate_extrude` · `scad_offset` · `scad_color` · `scad_resize`
**Control flow** `scad_variable` · `scad_module_def` · `scad_module_call` · `scad_for_loop` · `scad_if` · `scad_echo`
**File I/O** `scad_import` · `scad_use` · `scad_include` · `scad_emit_document`

Tools compose: feed the `ast` from one tool's result into the `children` of a transform/boolean tool.

## Connect a client

**Claude Code:** `claude mcp add openscad https://your-app.vercel.app/mcp`

**Claude Desktop** — in `claude_desktop_config.json`:
```json
{ "mcpServers": { "openscad": { "url": "https://your-app.vercel.app/mcp" } } }
```

## Project structure

```
api/mcp.ts              # Vercel function — re-exports src/http-handler.ts
src/
  http-handler.ts       # MCP-over-HTTP handler (shared by Vercel fn + dev server)
  mcp-server.ts         # createMcpServer() — real SDK McpServer + tool adapter
  server.ts             # legacy in-memory registry (kept only for unit tests)
  lib/
    scad-ast.ts         # SCADNode AST + constructors
    scad-emitter.ts     # AST → .scad source
    json-schema-to-zod.ts # tool-schema converter for the SDK adapter
  tools/ resources/ prompts/  # 32 tools + examples + design prompts (unchanged)
  generated/app-html.ts # auto-generated: the UI bundle as a string
ui/
  mcp-app.html          # MCP App entry
  src/mcp-app.ts        # App wiring, tabs, three.js viewport, host theming
  src/scad-renderer.ts  # AST → three.js preview
  vite.config.ts        # vite-plugin-singlefile build
scripts/
  dev-server.mjs        # local Streamable-HTTP server
  inline-html.mjs       # ui/dist/mcp-app.html → src/generated/app-html.ts
```

## License

MIT
