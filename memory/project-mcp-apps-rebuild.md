---
name: project-mcp-apps-rebuild
description: Status of the OpenSCAD MCP server rebuild into a real MCP App
metadata:
  type: project
---

The user wants this OpenSCAD MCP server working as a real MCP App on their phone. As of 2026-05-14, the server was rebuilt off its original fake-MCP shim onto the real `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`, with a three.js MCP App UI under `ui/`. Architecture is documented in CLAUDE.md.

**Verified:** MCP protocol end-to-end (`tests/smoke-mcp.mjs` in-memory, `tests/smoke-http.mjs` over real HTTP), all 32 tools, existing unit tests, UI bundle builds and is structurally sound.

**NOT yet verified:** (1) the UI actually rendering inside a real host — needs the `ext-apps` `basic-host` example run against `npm run serve` (note: `bun` isn't installed locally; `basic-host/serve.ts` runs with `npx tsx` instead); (2) the Vercel deployment; (3) whether Claude mobile renders `ui://` resources today.

**Open question never answered by the user:** they said they "already made" a real MCP app on their phone — unclear if a proxy/bridge is pointed at the old fake-MCP shim. If so it must be re-pointed at the rebuilt server. See [[no-registry-publishing]].
