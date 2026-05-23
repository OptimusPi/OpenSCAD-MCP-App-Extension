// OpenSCAD MCP Server — Vercel Node.js serverless function.
//
// Runtime note: this is a Node.js function, NOT Edge. Edge has no filesystem
// and its Web Request/Response model fights the SDK transport, which expects
// Node IncomingMessage/ServerResponse.
//
// All logic lives in src/http-handler.ts so the local dev server runs the
// exact same code path.
export { handleMcpRequest as default } from "../src/http-handler.js";
