import * as AST from "../lib/scad-ast.js";
import { emit } from "../lib/scad-emitter.js";

function toolResponse(ast: any, description: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: emit(ast), ast, description }) }] };
}

export function registerModifiers(server: any) {
  server.addTool("scad_hull", "Convex hull of children", { type: "object", properties: {
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.hull(args.children);
    return toolResponse(ast, `hull() — ${args.children.length} children`);
  });

  server.addTool("scad_minkowski", "Minkowski sum of children", { type: "object", properties: {
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.minkowski(args.children);
    return toolResponse(ast, `minkowski() — ${args.children.length} children`);
  });

  server.addTool("scad_linear_extrude", "Linear extrude 2D to 3D", { type: "object", properties: {
    height: { type: "number" },
    center: { type: "boolean" },
    convexity: { type: "number" },
    twist: { type: "number" },
    scale: { oneOf: [{ type: "number" }, { type: "array", items: { type: "number" } }] },
    slices: { type: "number" },
    children: { type: "array" },
  }, required: ["height", "children"] }, (args: any) => {
    const { children, height, center, convexity, twist, scale, slices } = args;
    const ast = AST.linearExtrude({ height, center, convexity, twist, scale, slices, children });
    return toolResponse(ast, `linear_extrude(height=${height})`);
  });

  server.addTool("scad_rotate_extrude", "Rotate extrude 2D to 3D", { type: "object", properties: {
    angle: { type: "number" },
    convexity: { type: "number" },
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const { children, angle, convexity } = args;
    const ast = AST.rotateExtrude({ angle, convexity, children });
    return toolResponse(ast, `rotate_extrude(${angle !== undefined ? `angle=${angle}` : ""})`);
  });

  server.addTool("scad_offset", "Offset 2D children", { type: "object", properties: {
    r: { type: "number" },
    delta: { type: "number" },
    chamfer: { type: "boolean" },
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const { children, r, delta, chamfer } = args;
    const ast = AST.offset({ r, delta, chamfer, children });
    return toolResponse(ast, `offset(${r !== undefined ? `r=${r}` : `delta=${delta}`})`);
  });

  server.addTool("scad_color", "Apply color to children", { type: "object", properties: {
    c: { oneOf: [{ type: "string" }, { type: "array", items: { type: "number" } }] },
    alpha: { type: "number" },
    children: { type: "array" },
  }, required: ["c", "children"] }, (args: any) => {
    const ast = AST.color(args.c, args.children, args.alpha);
    return toolResponse(ast, `color(${Array.isArray(args.c) ? `[${args.c.join(", ")}]` : `"${args.c}"`})`);
  });

  server.addTool("scad_resize", "Resize children to fit dimensions", { type: "object", properties: {
    v: { type: "array", items: { type: "number" } },
    auto: { oneOf: [{ type: "boolean" }, { type: "array", items: { type: "boolean" } }] },
    children: { type: "array" },
  }, required: ["v", "children"] }, (args: any) => {
    const ast = AST.resize(args.v, args.children, args.auto);
    return toolResponse(ast, `resize([${args.v.join(", ")}])`);
  });
}
