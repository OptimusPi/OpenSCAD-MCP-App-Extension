import * as AST from "../lib/scad-ast.js";
import { emit } from "../lib/scad-emitter.js";

function toolResponse(ast: any, description: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: emit(ast), ast, description }) }] };
}

export function registerTransforms(server: any) {
  server.addTool("scad_translate", "Translate children", { type: "object", properties: {
    v: { type: "array", items: { type: "number" }, description: "[x, y, z]" },
    children: { type: "array" },
  }, required: ["v", "children"] }, (args: any) => {
    const ast = AST.translate(args.v, args.children);
    return toolResponse(ast, `translate([${args.v.join(", ")}])`);
  });

  server.addTool("scad_rotate", "Rotate children", { type: "object", properties: {
    a: { oneOf: [{ type: "number" }, { type: "array", items: { type: "number" } }], description: "Angle or [x, y, z] euler angles" },
    v: { type: "array", items: { type: "number" }, description: "Rotation axis [x, y, z]" },
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.rotate({ a: args.a, v: args.v, children: args.children });
    return toolResponse(ast, `rotate(${JSON.stringify(args.a)})`);
  });

  server.addTool("scad_scale", "Scale children", { type: "object", properties: {
    v: { oneOf: [{ type: "number" }, { type: "array", items: { type: "number" } }] },
    children: { type: "array" },
  }, required: ["v", "children"] }, (args: any) => {
    const ast = AST.scale(args.v, args.children);
    return toolResponse(ast, `scale(${Array.isArray(args.v) ? `[${args.v.join(", ")}]` : args.v})`);
  });

  server.addTool("scad_mirror", "Mirror children", { type: "object", properties: {
    v: { type: "array", items: { type: "number" } },
    children: { type: "array" },
  }, required: ["v", "children"] }, (args: any) => {
    const ast = AST.mirror(args.v, args.children);
    return toolResponse(ast, `mirror([${args.v.join(", ")}])`);
  });

  server.addTool("scad_multmatrix", "Apply 4x4 transformation matrix", { type: "object", properties: {
    m: { type: "array", items: { type: "array", items: { type: "number" } } },
    children: { type: "array" },
  }, required: ["m", "children"] }, (args: any) => {
    const ast = AST.multmatrix(args.m, args.children);
    return toolResponse(ast, `multmatrix([${args.m.length}x${args.m[0]?.length || 0}])`);
  });
}
