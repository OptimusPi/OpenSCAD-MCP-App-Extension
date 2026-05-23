// ============================================================================
// design_3d_model — the single consolidated OpenSCAD tool
// ============================================================================
// Replaces the previous 32 atomic tools (scad_cube, scad_translate, ...). The
// model now describes a whole design in ONE call by passing a complete AST
// tree, instead of composing fragments across dozens of round-trips.
//
// `ast` is required and is the only input: the server always derives `.scad`
// source from it via `emitDocument`, so the structuredContent handed to the UI
// always carries a real AST for the 3D preview to walk. (The old
// `scad_emit_document` tool returned code with no `ast`, which is exactly why
// the 3D tab showed nothing — see git history / the consolidation notes.)

import { emitDocument } from "../lib/scad-emitter.js";

const AST_DOC = `A complete OpenSCAD model as an AST. Pass EITHER a single node object OR an
array of top-level nodes (an array is an implicit union, like a .scad file).

Every node is { "type": <name>, ...params }. Container nodes also take
"children": [ ...nodes ]. \`type\` is the OpenSCAD function name.

Primitives: cube {size:number|[x,y,z], center?}, sphere {r, $fn?},
  cylinder {h, r? | r1?,r2? | d? | d1?,d2?, center?, $fn?},
  polyhedron {points,faces}, text {text,size?,font?}, polygon {points,paths?},
  surface {file}.
Transforms (need children): translate {v:[x,y,z]}, rotate {a:number|[x,y,z], v?},
  scale {v}, mirror {v}, multmatrix {m}, color {c:string|[r,g,b], alpha?}, resize {v}.
Booleans / modifiers (need children): union, difference (1st child = body,
  rest = subtracted), intersection, hull, minkowski,
  linear_extrude {height, twist?, scale?} over a polygon child,
  rotate_extrude {angle?} over a polygon child, offset {r?|delta?}.
Other: for {variable,range,children}, if {condition,thenBranch,elseBranch?},
  module_def {name,parameters,body}, module_call {name,arguments,children?},
  variable {name,value}, echo {message}, import/use/include {file}.

Examples:
  A 10mm cube:
    {"type":"cube","size":10,"center":true}
  A box with a cylindrical hole through it:
    {"type":"difference","children":[
      {"type":"cube","size":[20,20,10],"center":true},
      {"type":"cylinder","h":12,"r":4,"center":true,"$fn":48}]}
  A pillar moved up 5mm:
    {"type":"translate","v":[0,0,5],"children":[
      {"type":"cylinder","h":10,"r":3}]}
  An extruded triangle:
    {"type":"linear_extrude","height":4,"children":[
      {"type":"polygon","points":[[0,0],[10,0],[5,8]]}]}`;

/**
 * Register the single consolidated design tool onto the (adapter) server.
 * Mirrors the legacy `register*` signature so `registerAllTools` can call it.
 */
export function registerDesign(server: any): void {
  server.addTool(
    "design_3d_model",
    "Generate an OpenSCAD 3D model. Describe the whole design in one call by " +
      "passing a complete AST tree — primitives, transforms, booleans and " +
      "extrusions all nest via `children`. Returns the emitted .scad source " +
      "plus the AST, rendered as an interactive 3D preview + code viewer.",
    {
      type: "object",
      properties: {
        ast: { description: AST_DOC },
        description: {
          type: "string",
          description:
            "Short human-readable summary of what the model is (e.g. \"can of beans\").",
        },
      },
      required: ["ast"],
    },
    (args: any) => {
      const ast = args.ast;
      if (ast === undefined || ast === null || typeof ast !== "object") {
        throw new Error("design_3d_model requires an `ast` (a node object or array of nodes).");
      }
      const nodes = Array.isArray(ast) ? ast : [ast];
      if (nodes.length === 0) {
        throw new Error("design_3d_model `ast` array is empty — provide at least one node.");
      }
      const scad_code = emitDocument(nodes);
      // The UI's renderAst() walks a single node; a multi-node document is an
      // implicit union, so present it as one.
      const previewAst =
        nodes.length === 1 ? nodes[0] : { type: "union", children: nodes };
      const description =
        typeof args.description === "string" && args.description.trim()
          ? args.description
          : "OpenSCAD model";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ scad_code, ast: previewAst, description }),
          },
        ],
      };
    },
  );
}
