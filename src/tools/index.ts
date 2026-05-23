import { registerDesign } from "./design.js";

// Consolidated to a single tool: `design_3d_model` takes a whole AST tree in
// one call. The old per-node files (primitives.ts, transforms.ts, booleans.ts,
// modifiers.ts, modules.ts) are kept on disk for reference but no longer
// registered — 32 atomic tools made the model guess tool names and produced
// AST-less output that the 3D preview couldn't render.
export function registerAllTools(server: any): void {
  registerDesign(server);
}
