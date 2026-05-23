/**
 * SCAD File Resources
 *
 * MCP resource handlers for reading SCAD files and serving built-in examples.
 * Note: File system reads are disabled on Edge runtime. Only built-in examples work there.
 */

const EXAMPLES: Record<string, string> = {
  cube: `// Example: Parametric Cube
cube([20, 30, 40]);
`,
  sphere: `// Example: Sphere with facets
sphere(r = 20, $fn = 100);
`,
  cylinder: `// Example: Cylinder
cylinder(h = 30, r = 10, center = true);
`,
  gear: `// Example: Parametric Gear
module gear(module, teeth, thickness, hole_diameter) {
  pitch_diameter = module * teeth;
  outer_diameter = pitch_diameter + 2 * module;
  difference() {
    cylinder(h = thickness, d = outer_diameter, $fn = teeth * 4);
    cylinder(h = thickness + 1, d = hole_diameter, $fn = 32);
  }
}

gear(2, 20, 5, 8);
`,
};

export function registerResources(server: any): void {
  // Built-in examples (works everywhere including Edge)
  server.addResource(
    "scad-examples",
    "scad://examples/{name}",
    async (_uri: URL, params: { name: string }) => {
      const name = params.name;
      const scad = EXAMPLES[name];
      if (!scad) {
        const available = Object.keys(EXAMPLES).join(", ");
        return {
          contents: [{
            uri: `scad://examples/${name}`,
            text: `// Example "${name}" not found. Available: ${available}`,
            mimeType: "application/x-openscad",
          }],
        };
      }
      return {
        contents: [{
          uri: `scad://examples/${name}`,
          text: scad,
          mimeType: "application/x-openscad",
        }],
      };
    },
  );
}
