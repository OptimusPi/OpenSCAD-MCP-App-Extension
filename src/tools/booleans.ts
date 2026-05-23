import * as AST from "../lib/scad-ast.js";
import { emit } from "../lib/scad-emitter.js";

function toolResponse(ast: any, description: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: emit(ast), ast, description }) }] };
}

export function registerBooleans(server: any) {
  server.addTool("scad_union", "Union of shapes", { type: "object", properties: {
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.union(args.children);
    return toolResponse(ast, `union() — ${args.children.length} children`);
  });

  server.addTool("scad_difference", "Difference of shapes", { type: "object", properties: {
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.difference(args.children);
    return toolResponse(ast, `difference() — ${args.children.length} children`);
  });

  server.addTool("scad_intersection", "Intersection of shapes", { type: "object", properties: {
    children: { type: "array" },
  }, required: ["children"] }, (args: any) => {
    const ast = AST.intersection(args.children);
    return toolResponse(ast, `intersection() — ${args.children.length} children`);
  });
}
