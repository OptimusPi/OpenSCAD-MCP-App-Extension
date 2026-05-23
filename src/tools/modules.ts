import * as AST from "../lib/scad-ast.js";
import { emit, emitDocument } from "../lib/scad-emitter.js";

function toolResponse(ast: any, description: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: emit(ast), ast, description }) }] };
}

export function registerModules(server: any) {
  server.addTool("scad_variable", "Define a variable", { type: "object", properties: {
    name: { type: "string" },
    value: { oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "array", items: { type: "number" } }] },
  }, required: ["name", "value"] }, (args: any) => {
    const ast = AST.variable(args.name, args.value);
    return toolResponse(ast, `${args.name} = ${JSON.stringify(args.value)}`);
  });

  server.addTool("scad_module_def", "Define a reusable module", { type: "object", properties: {
    name: { type: "string" },
    parameters: { type: "array" },
    body: { type: "array" },
  }, required: ["name", "parameters", "body"] }, (args: any) => {
    const ast = AST.moduleDef(args.name, args.parameters || [], args.body);
    return toolResponse(ast, `module ${args.name}(...)`);
  });

  server.addTool("scad_module_call", "Call a defined module", { type: "object", properties: {
    name: { type: "string" },
    arguments: { type: "object" },
    children: { type: "array" },
  }, required: ["name"] }, (args: any) => {
    const ast = AST.moduleCall(args.name, args.arguments || {}, args.children);
    return toolResponse(ast, `${args.name}(...)`);
  });

  server.addTool("scad_for_loop", "For loop over children", { type: "object", properties: {
    variable: { type: "string" },
    range: { oneOf: [
      { type: "array", items: { type: "number" } },
      { type: "object", properties: { start: { type: "number" }, end: { type: "number" }, step: { type: "number" } } },
    ]},
    children: { type: "array" },
  }, required: ["variable", "range", "children"] }, (args: any) => {
    const ast = AST.forLoop(args.variable, args.range, args.children);
    return toolResponse(ast, `for (${args.variable} = ...)`);
  });

  server.addTool("scad_if", "Conditional children", { type: "object", properties: {
    condition: { type: "string" },
    thenBranch: { type: "array" },
    elseBranch: { type: "array" },
  }, required: ["condition", "thenBranch"] }, (args: any) => {
    const ast = AST.ifNode(args.condition, args.thenBranch, args.elseBranch);
    return toolResponse(ast, `if (${args.condition})`);
  });

  server.addTool("scad_echo", "Debug echo statement", { type: "object", properties: {
    message: { type: "string" },
  }, required: ["message"] }, (args: any) => {
    const ast = AST.echo(args.message);
    return toolResponse(ast, `echo("${args.message}")`);
  });

  server.addTool("scad_import", "Import a file", { type: "object", properties: {
    file: { type: "string" },
    convexity: { type: "number" },
    layer: { type: "string" },
  }, required: ["file"] }, (args: any) => {
    const ast = AST.importFile(args.file, args.convexity, args.layer);
    return toolResponse(ast, `import("${args.file}")`);
  });

  server.addTool("scad_use", "Use a library file", { type: "object", properties: {
    file: { type: "string" },
  }, required: ["file"] }, (args: any) => {
    const ast = AST.use(args.file);
    return toolResponse(ast, `use <${args.file}>`);
  });

  server.addTool("scad_include", "Include a file", { type: "object", properties: {
    file: { type: "string" },
  }, required: ["file"] }, (args: any) => {
    const ast = AST.include(args.file);
    return toolResponse(ast, `include <${args.file}>`);
  });

  server.addTool("scad_emit_document", "Emit a full SCAD document", { type: "object", properties: {
    nodes: { type: "array" },
  }, required: ["nodes"] }, (args: any) => {
    const code = emitDocument(args.nodes);
    return { content: [{ type: "text" as const, text: JSON.stringify({ scad_code: code, description: "Full SCAD document" }) }] };
  });
}
