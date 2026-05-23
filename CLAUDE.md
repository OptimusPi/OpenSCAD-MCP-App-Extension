# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP server that generates OpenSCAD `.scad` code (it does not run OpenSCAD — it emits code as text), plus an **MCP App**: an interactive three.js preview + code viewer that renders inline in MCP hosts. Deployed as a Vercel Node.js serverless function.

## Commands

```bash
npm run build      # build:ui → inline-html → build:server (run in this order)
npm run build:ui   # vite: bundles ui/ into a single self-contained ui/dist/mcp-app.html
npm run inline-html# embeds that HTML into src/generated/app-html.ts (see "Edge → Node" below)
npm run build:server # tsc → dist/
npm run lint       # tsc --noEmit
npm run serve      # local Streamable-HTTP server on :3001 (after build) — for host testing
npm test           # vitest (unit) + tests/smoke-mcp.mjs (full MCP protocol, in-memory)
npm run test:node  # legacy node runner against the old in-memory registry
```

Single test file: `npx vitest run tests/scad-emitter.test.ts`
HTTP smoke test: `npm run serve &` then `node tests/smoke-http.mjs`
UI type-check: `npx tsc -p ui/tsconfig.json`

## Architecture — two halves

### 1. The MCP server (`src/`, `api/`)

The request path: `vercel.json` routes everything to `api/mcp.ts`, which is a one-line re-export of `handleMcpRequest` from **`src/http-handler.ts`** — the single source of truth. That handler runs **stateless**: a fresh `McpServer` + `StreamableHTTPServerTransport` per request. `scripts/dev-server.mjs` wraps the *same* handler in a raw Node HTTP server, so local `npm run serve` runs production code.

**`src/mcp-server.ts` is the heart.** `createMcpServer()` builds a real SDK `McpServer`, then registers the existing OpenSCAD tools/resources/prompts via an **adapter**: `buildAdapter()` exposes the legacy `addTool / addResource / addPrompt` surface that `src/tools/*`, `src/resources/*`, `src/prompts/*` expect, but each call lands on the real SDK server. This is why **`src/tools/`, `src/lib/`, `src/resources/`, `src/prompts/` were not modified** — they still call `server.addTool(name, desc, jsonSchema, handler)` unchanged.

The adapter does two transformations:
- `addTool` → `registerAppTool` (from `@modelcontextprotocol/ext-apps/server`): the registered tool becomes an **MCP App tool** pointing at the single shared resource `APP_RESOURCE_URI` (`ui://openscad/preview.html`). JSON Schema → Zod conversion happens in **`src/lib/json-schema-to-zod.ts`** (a deliberately minimal converter covering only the subset the tool defs use).
- The tool handler is wrapped: legacy handlers JSON-stringify `{ scad_code, ast, description }` into `content[0].text`; the wrapper parses that back out into `structuredContent` so the UI gets typed data, while `content` stays as the text-only fallback.

The OpenSCAD surface is **a single consolidated tool, `design_3d_model`** (`src/tools/design.ts`): the caller passes a whole AST tree in one call and the server emits `.scad` from it via `emitDocument`. This replaced the original 32 atomic tools (`scad_cube`, `scad_translate`, …) — those made the model guess tool names and the old `scad_emit_document` returned code with no `ast`, so the 3D preview had nothing to render. The old per-node files (`src/tools/primitives.ts`, `transforms.ts`, `booleans.ts`, `modifiers.ts`, `modules.ts`) are kept on disk for reference but `registerAllTools` no longer registers them.

**`src/server.ts` is legacy** — the original hand-rolled in-memory registry that never spoke MCP. It is kept only because `tests/tools.test.ts` and `tests/run.mjs` still exercise it to unit-test tool definitions in isolation. Nothing in the live request path imports it. (Same for the unused `fastmcp` dependency.)

The **AST → emitter pipeline** is unchanged and still the core of code generation: `src/lib/scad-ast.ts` (the `SCADNode` discriminated union + constructors) and `src/lib/scad-emitter.ts` (`emit()` renders a node to source — its `default` case emits `${node.type}(...)`, so for most nodes the AST `type` *is* the OpenSCAD function name).

### 2. The MCP App UI (`ui/`)

A standalone Vite project (its own `ui/tsconfig.json`, `ui/vite.config.ts`). `vite-plugin-singlefile` bundles everything — including three.js — into one self-contained `ui/dist/mcp-app.html`, because the sandboxed iframe a host renders it in cannot fetch sibling assets.

- `ui/src/mcp-app.ts` — entry: wires up the `App` from `@modelcontextprotocol/ext-apps`, two tabs (3D / Code), three.js viewport, host theming via `applyDocumentTheme`/`applyHostStyleVariables`/`applyHostFonts`, safe-area insets. Receives `{ scad_code, ast, description }` as `ontoolresult`'s `structuredContent`.
- `ui/src/scad-renderer.ts` — `renderAst()` walks the AST into a three.js object graph. It is a **preview, not a CSG evaluator**: primitives + transforms render exactly; `union` is a group; `difference` shows the base solid plus translucent-red "cutters"; `intersection` shows operands translucent; `hull`/`minkowski` group their operands; `linear_extrude` works over a `polygon` child. Anything else (text, 2D, control flow, modules, imports) is collected into `unsupported` and surfaced as a badge pointing at the Code tab. The scene is Z-up to match OpenSCAD (`camera.up = +Z`). The Code tab is always the floor — it shows real output even when 3D can't.

## Conventions & constraints

- **Runtime is Node.js, not Edge.** Edge has no filesystem and its Web `Request`/`Response` model fights the SDK transport (which wants Node `IncomingMessage`/`ServerResponse`). `vercel.json` no longer pins a runtime — Node is the default for `api/*`.
- **Why `inline-html`:** the serverless function bundle can't reliably read build artifacts at runtime, so the UI HTML is embedded as a string module (`src/generated/app-html.ts`, auto-generated — do not edit). `vercel-build` runs `build:ui && inline-html`; Vercel then compiles `api/mcp.ts` and its TS imports itself.
- **ESM with `.js` import specifiers** in `src/` and `api/` even though files are `.ts` (`moduleResolution: bundler`).
- **The tool count is asserted** in `tests/tools.test.ts`, `tests/run.mjs`, and `tests/smoke-mcp.mjs` (currently expecting the single `design_3d_model`) — adding/removing a tool means updating those.
- Server `tsconfig.json` (`lib: ES2022`, no DOM) covers `src/` + `api/` only; `ui/` is built by Vite and type-checked by `ui/tsconfig.json` separately.
- `_legacy/` holds backups of the pre-rewrite `api/mcp.ts` (Edge handler) and `vercel.json`.

## Not yet verified

The MCP protocol layer is verified end-to-end (in-memory + HTTP smoke tests). Two things still need a real environment: (a) the UI rendering inside an actual host — test with the `ext-apps` `basic-host` example against `npm run serve`; (b) the Vercel deployment itself. Whether Claude's mobile app renders `ui://` resources today (SEP-1865 host support) is also unconfirmed.
