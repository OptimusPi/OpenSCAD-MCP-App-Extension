import * as AST from "../lib/scad-ast.js";
import { emit } from "../lib/scad-emitter.js";

function toolResponse(ast: any, description: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: emit(ast), ast, description }) }] };
}

export function registerPrimitives(server: any) {
  server.addTool("scad_cube", "Create a cube primitive", { type: "object", properties: {
    size: { oneOf: [{ type: "number" }, { type: "array", items: { type: "number" } }] },
    center: { type: "boolean" },
  }, required: ["size"] }, (args: any) => {
    const ast = AST.cube(args.size, args.center);
    return toolResponse(ast, `cube(${typeof args.size === "number" ? args.size : `[${args.size.join(", ")}]`})`);
  });

  server.addTool("scad_sphere", "Create a sphere primitive", { type: "object", properties: {
    r: { type: "number", description: "Radius" },
    $fn: { type: "number", description: "Fragment count" },
  }, required: ["r"] }, (args: any) => {
    const ast = AST.sphere(args.r, args.$fn ? { $fn: args.$fn } : undefined);
    return toolResponse(ast, `sphere(r=${args.r}${args.$fn ? `, $fn=${args.$fn}` : ""})`);
  });

  server.addTool("scad_cylinder", "Create a cylinder primitive", { type: "object", properties: {
    h: { type: "number", description: "Height" },
    r: { type: "number", description: "Radius" },
    r1: { type: "number", description: "Bottom radius" },
    r2: { type: "number", description: "Top radius" },
    d: { type: "number", description: "Diameter" },
    d1: { type: "number", description: "Bottom diameter" },
    d2: { type: "number", description: "Top diameter" },
    center: { type: "boolean" },
    $fn: { type: "number" },
  }, required: ["h"] }, (args: any) => {
    const ast = AST.cylinder({ h: args.h, r: args.r, r1: args.r1, r2: args.r2, d: args.d, d1: args.d1, d2: args.d2, center: args.center, $fn: args.$fn });
    return toolResponse(ast, `cylinder(h=${args.h})`);
  });

  server.addTool("scad_text", "Create 3D text", { type: "object", properties: {
    text: { type: "string" },
    size: { type: "number" },
    font: { type: "string" },
    halign: { type: "string" },
    valign: { type: "string" },
    $fn: { type: "number" },
  }, required: ["text"] }, (args: any) => {
    const ast = AST.text(args.text, { size: args.size, font: args.font, halign: args.halign, valign: args.valign, $fn: args.$fn });
    return toolResponse(ast, `text("${args.text}")`);
  });

  server.addTool("scad_polygon", "Create a 2D polygon", { type: "object", properties: {
    points: { type: "array", items: { type: "array", items: { type: "number" } } },
    paths: { type: "array", items: { type: "array", items: { type: "number" } } },
    convexity: { type: "number" },
  }, required: ["points"] }, (args: any) => {
    const ast = AST.polygon(args.points, args.paths, args.convexity);
    return toolResponse(ast, `polygon(points=[...${args.points.length} pts])`);
  });

  server.addTool("scad_polyhedron", "Create a polyhedron", { type: "object", properties: {
    points: { type: "array", items: { type: "array", items: { type: "number" } } },
    faces: { type: "array", items: { type: "array", items: { type: "number" } } },
    convexity: { type: "number" },
  }, required: ["points", "faces"] }, (args: any) => {
    const ast = AST.polyhedron(args.points, args.faces, args.convexity);
    return toolResponse(ast, `polyhedron(points=[...${args.points.length} pts], faces=[...${args.faces.length} faces])`);
  });

  server.addTool("scad_surface", "Create a surface from file", { type: "object", properties: {
    file: { type: "string" },
    center: { type: "boolean" },
    invert: { type: "boolean" },
  }, required: ["file"] }, (args: any) => {
    const ast = AST.surface(args.file, args.center, args.invert);
    return toolResponse(ast, `surface("${args.file}")`);
  });
}
