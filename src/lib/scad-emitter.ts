// ============================================================================
// OpenSCAD AST to Source Code Emitter
// ============================================================================

import type { SCADNode } from "./scad-ast.js";

const INDENT_SIZE = 2;

function indentString(level: number): string {
  return " ".repeat(level * INDENT_SIZE);
}

function emitValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(emitValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("start" in obj && "end" in obj) {
      const step = obj.step;
      if (step !== undefined) return `[${emitValue(obj.start)}:${emitValue(step)}:${emitValue(obj.end)}]`;
      return `[${emitValue(obj.start)}:${emitValue(obj.end)}]`;
    }
    throw new Error(`Cannot emit object as SCAD value: ${JSON.stringify(value)}`);
  }
  return String(value);
}

function emitParameters(
  params: Record<string, unknown>,
  excludeKeys: readonly string[] = ["type", "children"],
): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (excludeKeys.includes(key)) continue;
    if (value === undefined) continue;
    entries.push(`${key} = ${emitValue(value)}`);
  }
  return entries.join(", ");
}

function hasChildren(node: SCADNode): node is SCADNode & { children: SCADNode[] } {
  return "children" in node && Array.isArray((node as unknown as Record<string, unknown>).children);
}

function getChildren(node: SCADNode): SCADNode[] | undefined {
  return hasChildren(node) ? node.children : undefined;
}

// ============================================================================
// Main Emitter
// ============================================================================

export function emit(node: SCADNode | SCADNode[], level: number = 0): string {
  if (Array.isArray(node)) return node.map((n) => emit(n, level)).join("\n");

  const prefix = indentString(level);

  switch (node.type) {
    // --- Variable ---
    case "variable":
      return `${prefix}${node.name} = ${emitValue(node.value)};`;

    // --- Echo ---
    case "echo":
      return `${prefix}echo(${emitValue(node.message)});`;

    // --- Import / Use / Include ---
    case "import": {
      const params = emitParameters({ file: node.file, convexity: node.convexity, layer: node.layer });
      return `${prefix}import(${params});`;
    }

    case "use":
      return `${prefix}use <${node.file}>;`;

    case "include":
      return `${prefix}include <${node.file}>;`;

    // --- For loop ---
    case "for": {
      const params = emitParameters({ [node.variable]: node.range });
      const childrenStr = emit(node.children, level + 1);
      return `${prefix}for (${params}) {\n${childrenStr}\n${prefix}}`;
    }

    // --- If ---
    case "if": {
      const thenStr = emit(node.thenBranch, level + 1);
      if (node.elseBranch && node.elseBranch.length > 0) {
        const elseStr = emit(node.elseBranch, level + 1);
        return `${prefix}if (${node.condition}) {\n${thenStr}\n${prefix}} else {\n${elseStr}\n${prefix}}`;
      }
      return `${prefix}if (${node.condition}) {\n${thenStr}\n${prefix}}`;
    }

    // --- Module definition ---
    case "module_def": {
      const params = node.parameters
        .map((p) => (p.default !== undefined ? `${p.name} = ${emitValue(p.default)}` : p.name))
        .join(", ");
      const bodyStr = emit(node.body, level + 1);
      return `${prefix}module ${node.name}(${params}) {\n${bodyStr}\n${prefix}}`;
    }

    // --- Module call ---
    case "module_call": {
      const params = emitParameters(node.arguments);
      if (node.children && node.children.length > 0) {
        const childrenStr = emit(node.children, level + 1);
        return `${prefix}${node.name}(${params}) {\n${childrenStr}\n${prefix}}`;
      }
      return `${prefix}${node.name}(${params});`;
    }

    // --- Color (special: first param can be positional string or array) ---
    case "color": {
      const params = emitParameters({ c: node.c, alpha: node.alpha }, ["type", "children"]);
      const children = getChildren(node);
      if (children && children.length > 0) {
        const childrenStr = emit(children, level + 1);
        return `${prefix}color(${params}) {\n${childrenStr}\n${prefix}}`;
      }
      return `${prefix}color(${params});`;
    }

    // --- Text (special: first param 'text' is the actual content) ---
    case "text": {
      const params = emitParameters(node as unknown as Record<string, unknown>);
      return `${prefix}text(${params});`;
    }

    // --- Polygon ---
    case "polygon": {
      const params = emitParameters(node as unknown as Record<string, unknown>);
      return `${prefix}polygon(${params});`;
    }

    // --- Surface ---
    case "surface": {
      const params = emitParameters({ file: node.file, center: node.center, invert: node.invert, convexity: node.convexity });
      return `${prefix}surface(${params});`;
    }

    // --- Default: primitives, transforms, booleans, modifiers ---
    default: {
      const params = emitParameters(node as unknown as Record<string, unknown>);
      const children = getChildren(node);
      if (children && children.length > 0) {
        const childrenStr = emit(children, level + 1);
        return `${prefix}${node.type}(${params}) {\n${childrenStr}\n${prefix}}`;
      }
      return `${prefix}${node.type}(${params});`;
    }
  }
}

// ============================================================================
// Document Emitter
// ============================================================================

export function emitDocument(nodes: SCADNode[]): string {
  const header = "// Generated by OpenSCAD MCP Server\n// https://github.com/openscad-mcp-server\n";
  return header + emit(nodes, 0);
}
