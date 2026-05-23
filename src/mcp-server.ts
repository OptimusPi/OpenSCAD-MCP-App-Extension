// ============================================================================
// OpenSCAD MCP Server — real MCP server factory
// ============================================================================
// The original `src/server.ts` is a plain in-memory registry: it never speaks
// the MCP protocol (no `initialize`, no capability negotiation, no
// `resources/read`), so no real MCP host can connect to it.
//
// This module wraps the EXISTING tool / resource / prompt registration code
// (src/tools, src/resources, src/prompts — all unchanged) onto a real
// `@modelcontextprotocol/sdk` `McpServer`, and promotes every SCAD-producing
// tool into an MCP App tool backed by a single shared UI resource.
//
// The trick: `buildAdapter()` returns an object exposing the same
// `addTool / addResource / addPrompt` surface the legacy registration code
// expects, but each call lands on the real SDK server instead.

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";

import { jsonSchemaToZodShape } from "./lib/json-schema-to-zod.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { APP_HTML } from "./generated/app-html.js";
import { VERSION } from "./versions/index.js";

/** Single shared UI resource — every SCAD tool renders into the same preview app. */
export const APP_RESOURCE_URI = "ui://openscad/preview.html";

type LegacyToolHandler = (args: Record<string, unknown>) => unknown;

/**
 * Presents the legacy `addTool / addResource / addPrompt` interface used by
 * src/tools, src/resources and src/prompts, but registers everything onto a
 * real `McpServer`.
 */
function buildAdapter(server: McpServer) {
  return {
    // src/tools/* call: addTool(name, description, jsonSchema, handler)
    addTool(
      name: string,
      description: string,
      parameters: unknown,
      handler: LegacyToolHandler,
    ): void {
      registerAppTool(
        server,
        name,
        {
          description,
          inputSchema: jsonSchemaToZodShape(
            parameters as Parameters<typeof jsonSchemaToZodShape>[0],
          ) as ZodRawShape,
          _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
        },
        async (args: Record<string, unknown>): Promise<CallToolResult> => {
          const result = (await Promise.resolve(
            handler(args),
          )) as CallToolResult;
          // Legacy handlers JSON-stringify `{ scad_code, ast, description }`
          // into content[0].text. Surface it as `structuredContent` so the UI
          // gets typed data, while keeping `content` as the text-only fallback.
          try {
            const first = result?.content?.[0] as
              | { text?: string }
              | undefined;
            if (typeof first?.text === "string") {
              return { ...result, structuredContent: JSON.parse(first.text) };
            }
          } catch {
            // Not JSON — fall through and return the raw result.
          }
          return result;
        },
      );
    },

    // src/resources/* call: addResource(name, uriTemplate, handler)
    addResource(
      name: string,
      uriTemplate: string,
      handler: (uri: URL, vars: Record<string, unknown>) => unknown,
    ): void {
      server.registerResource(
        name,
        new ResourceTemplate(uriTemplate, { list: undefined }),
        {},
        async (uri: URL, variables: Record<string, unknown>) =>
          (await Promise.resolve(handler(uri, variables))) as Awaited<
            ReturnType<Parameters<typeof server.registerResource>[3]>
          >,
      );
    },

    // src/prompts/* call: addPrompt(name, title, handler)
    addPrompt(
      name: string,
      _title: string,
      handler: (uri: URL, vars: Record<string, string>) => unknown,
    ): void {
      server.registerPrompt(
        name,
        { description: `OpenSCAD design prompt: ${name}` },
        async () => {
          const result = (await Promise.resolve(
            handler(new URL(`prompt://${name}`), {}),
          )) as { description?: string; messages: unknown[] };
          return {
            description: result.description,
            messages: result.messages,
          } as Awaited<ReturnType<Parameters<typeof server.registerPrompt>[2]>>;
        },
      );
    },
  };
}

/**
 * Build a fully-configured MCP server: the single `design_3d_model` App tool,
 * the legacy `scad-examples` resource, the four design prompts, and the shared
 * MCP App UI resource. Stateless callers create one of these per request.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "openscad-mcp-server",
    version: VERSION,
  });

  const adapter = buildAdapter(server);
  registerAllTools(adapter);
  registerAllResources(adapter);
  registerAllPrompts(adapter);

  // The shared MCP App UI: a 3D preview + .scad code viewer for tool output.
  registerAppResource(
    server,
    "OpenSCAD Preview",
    APP_RESOURCE_URI,
    {
      description:
        "Interactive 3D preview and .scad code viewer for OpenSCAD tool output",
    },
    async () => ({
      contents: [
        {
          uri: APP_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: APP_HTML,
        },
      ],
    }),
  );

  return server;
}
