/**
 * Prompt Templates
 *
 * MCP prompt handlers for parametric design workflows.
 */

// ---------------------------------------------------------------------------
// Prompt catalog
// ---------------------------------------------------------------------------

const PROMPTS: Record<string, string> = {
  design_parametric_box: `Design a parametric box with lid.

Parameters:
  - width          : outer width  of the box (mm)
  - height         : outer height of the box (mm)
  - depth          : outer depth  of the box (mm)
  - wall_thickness : thickness of all walls       (mm)
  - lid_tolerance  : clearance between box and lid (mm)

Instructions:
1. Create a hollow box by subtracting a smaller inner cube from an outer cube.
2. Build a matching lid that sits on top with the given tolerance gap.
3. Use the difference() boolean to carve out the interior.
4. Optionally add small finger-joint notches for better fit.

Example SCAD structure:
  outer  = cube([width, depth, height]);
  inner  = cube([width-2*wall_thickness, depth-2*wall_thickness, height-wall_thickness]);
  box    = difference() { outer; translate([wall_thickness,wall_thickness,wall_thickness]) inner; }
  lid    = cube([width+lid_tolerance*2, depth+lid_tolerance*2, wall_thickness]);`,

  design_gear: `Design a parametric spur gear.

Parameters:
  - module        : gear module (mm)
  - teeth         : number of teeth
  - pressure_angle: typically 20 degrees
  - thickness     : extrusion height (mm)
  - bore_diameter : center hole diameter (mm)

Calculated values:
  - pitch_diameter = module * teeth
  - addendum       = module
  - dedendum       = 1.25 * module
  - base_circle    = pitch_diameter * cos(pressure_angle)

Instructions:
1. Compute pitch_diameter, addendum, dedendum, and base_circle.
2. Use a loop (for i = [0:teeth-1]) to place each tooth via rotate() and translate().
3. Each tooth can be a simple cube or a custom 2-D profile linear_extruded.
4. Subtract a cylinder for the bore_diameter center hole.
5. Extrude the 2-D profile to thickness.

Hints:
  - Use linear_extrude(height = thickness) on the 2-D tooth profile.
  - The outer radius is (pitch_diameter / 2) + addendum.
  - The root radius is (pitch_diameter / 2) - dedendum.`,

  design_vase: `Design a parametric vase with twist.

Parameters:
  - height         : total height of the vase (mm)
  - base_radius    : radius at the bottom (mm)
  - top_radius     : radius at the top  (mm)
  - twist_degrees  : total rotation from bottom to top (degrees)
  - wall_thickness : thickness of the vase wall (mm)
  - segments       : number of vertical segments for smoothness

Instructions:
1. Create a 2-D profile (hollow circle with wall_thickness).
2. Use linear_extrude with twist and scale to morph from base_radius to top_radius.
3. linear_extrude(height = height, twist = twist_degrees, scale = top_radius / base_radius)
4. Inside the extrude place a difference of two circles (outer - inner).
5. Set \$fn = segments for surface smoothness.

Example SCAD skeleton:
  linear_extrude(height = height, twist = twist_degrees, scale = top_radius/base_radius, \$fn = segments)
    difference() {
      circle(r = base_radius);
      circle(r = base_radius - wall_thickness);
    }`,

  design_bracket: `Design a parametric wall-mount bracket.

Parameters:
  - width         : overall width of the bracket  (mm)
  - height        : vertical height               (mm)
  - depth         : depth from wall to load face  (mm)
  - hole_diameter : mounting bolt hole diameter   (mm)
  - fillet_radius : rounding radius at corners    (mm)
  - thickness     : material thickness            (mm)

Instructions:
1. Build the vertical back plate:  cube([width, thickness, height]).
2. Build the horizontal shelf:     cube([width, depth, thickness]).
3. Create a triangular gusset/support between back plate and shelf using a polyhedron or rotated cube.
4. Use difference() to subtract mounting holes (cylinder(h=thickness+1, r=hole_diameter/2)).
5. Use union() to combine back plate, shelf, and gussets.
6. Apply fillet rounding via minkowski() or by subtracting corner cylinders if supported.

Example SCAD structure:
  back  = cube([width, thickness, height]);
  shelf = cube([width, depth, thickness]);
  gusset = rotate([0,0,90]) cube([thickness, depth, height/2]);
  holes = translate([width/4, thickness/2, height*0.8]) cylinder(r=hole_diameter/2, h=thickness+1);
  bracket = difference() {
    union() { back; translate([0,0,0]) shelf; gusset; }
    holes;
  }`,
};

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function buildPromptResult(name: string, text: string) {
  return {
    name,
    description: `Prompt: ${name}`,
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Resource registration
// ---------------------------------------------------------------------------

/**
 * Register prompt templates with the MCP server.
 *
 * Prompts:
 *   design_parametric_box  – parametric box with lid
 *   design_gear            – parametric spur gear
 *   design_vase            – parametric twisted vase
 *   design_bracket         – parametric wall-mount bracket
 */
export function registerPrompts(server: any): void {
  for (const [name, text] of Object.entries(PROMPTS)) {
    server.addPrompt(name, name, async (_uri: URL, _params: Record<string, string>) => {
      return buildPromptResult(name, text);
    });
  }
}
