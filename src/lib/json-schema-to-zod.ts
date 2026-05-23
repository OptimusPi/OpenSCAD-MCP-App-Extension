// ============================================================================
// Minimal JSON-Schema → Zod converter
// ============================================================================
// Covers exactly the subset the OpenSCAD tool definitions use: object / number
// / string / boolean / array, `oneOf` unions, `required`, and `description`.
// This is intentionally NOT a general-purpose converter — it stays small and
// predictable so the 32 existing tool definitions can register on a real
// McpServer without rewriting any of them.

import { z, type ZodTypeAny, type ZodRawShape } from "zod";

interface JsonSchemaNode {
  type?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
  oneOf?: JsonSchemaNode[];
  description?: string;
}

function nodeToZod(node: JsonSchemaNode): ZodTypeAny {
  let schema: ZodTypeAny;

  if (node.oneOf && node.oneOf.length > 0) {
    const variants = node.oneOf.map(nodeToZod);
    schema =
      variants.length === 1
        ? variants[0]
        : z.union(variants as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  } else {
    switch (node.type) {
      case "number":
        schema = z.number();
        break;
      case "string":
        schema = z.string();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "array":
        schema = z.array(node.items ? nodeToZod(node.items) : z.any());
        break;
      case "object":
        schema = node.properties
          ? z.object(shapeFromProperties(node.properties, node.required ?? []))
          : z.record(z.any());
        break;
      default:
        schema = z.any();
    }
  }

  return node.description ? schema.describe(node.description) : schema;
}

function shapeFromProperties(
  properties: Record<string, JsonSchemaNode>,
  required: string[],
): ZodRawShape {
  const shape: ZodRawShape = {};
  for (const [key, prop] of Object.entries(properties)) {
    const zodProp = nodeToZod(prop);
    shape[key] = required.includes(key) ? zodProp : zodProp.optional();
  }
  return shape;
}

/**
 * Convert a top-level JSON Schema object (as used in the OpenSCAD tool defs)
 * into a Zod raw shape suitable for `registerAppTool`'s `inputSchema`.
 * A schema with no `properties` yields an empty shape (a no-argument tool).
 */
export function jsonSchemaToZodShape(
  schema: JsonSchemaNode | undefined,
): ZodRawShape {
  if (!schema?.properties) return {};
  return shapeFromProperties(schema.properties, schema.required ?? []);
}
