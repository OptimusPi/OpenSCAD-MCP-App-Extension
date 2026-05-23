// ============================================================================
// OpenSCAD AST Types and Constructor Functions
// ============================================================================

// --- Primitive Node Types ---------------------------------------------------

export interface CubeNode {
  type: "cube";
  size: number | [number, number, number];
  center?: boolean;
}

export interface SphereNode {
  type: "sphere";
  r: number;
  $fn?: number;
  $fa?: number;
  $fs?: number;
}

export interface CylinderNode {
  type: "cylinder";
  h: number;
  r?: number;
  r1?: number;
  r2?: number;
  d?: number;
  d1?: number;
  d2?: number;
  center?: boolean;
  $fn?: number;
}

export interface PolyhedronNode {
  type: "polyhedron";
  points: [number, number, number][];
  faces: number[][];
  convexity?: number;
}

export interface TextNode {
  type: "text";
  text: string;
  size?: number;
  font?: string;
  halign?: string;
  valign?: string;
  spacing?: number;
  direction?: string;
  language?: string;
  script?: string;
  $fn?: number;
}

export interface PolygonNode {
  type: "polygon";
  points: [number, number][];
  paths?: number[][];
  convexity?: number;
}

export interface SurfaceNode {
  type: "surface";
  file: string;
  center?: boolean;
  invert?: boolean;
  convexity?: number;
}

// --- Transform Node Types ---------------------------------------------------

export interface TranslateNode {
  type: "translate";
  v: [number, number, number];
  children: SCADNode[];
}

export interface RotateNode {
  type: "rotate";
  a?: number | [number, number, number];
  v?: [number, number, number];
  children: SCADNode[];
}

export interface ScaleNode {
  type: "scale";
  v: [number, number, number] | number;
  children: SCADNode[];
}

export interface MirrorNode {
  type: "mirror";
  v: [number, number, number];
  children: SCADNode[];
}

export interface MultmatrixNode {
  type: "multmatrix";
  m: number[][];
  children: SCADNode[];
}

export interface ColorNode {
  type: "color";
  c: string | [number, number, number] | [number, number, number, number];
  alpha?: number;
  children: SCADNode[];
}

export interface ResizeNode {
  type: "resize";
  v: [number, number, number] | [number, number];
  auto?: boolean | [boolean, boolean, boolean];
  children: SCADNode[];
}

// --- Boolean / Set Operation Node Types ------------------------------------

export interface UnionNode {
  type: "union";
  children: SCADNode[];
}

export interface DifferenceNode {
  type: "difference";
  children: SCADNode[];
}

export interface IntersectionNode {
  type: "intersection";
  children: SCADNode[];
}

export interface HullNode {
  type: "hull";
  children: SCADNode[];
}

export interface MinkowskiNode {
  type: "minkowski";
  children: SCADNode[];
}

// --- Modifier Node Types ----------------------------------------------------

export interface LinearExtrudeNode {
  type: "linear_extrude";
  height: number;
  center?: boolean;
  convexity?: number;
  twist?: number;
  scale?: number | [number, number];
  slices?: number;
  children: SCADNode[];
}

export interface RotateExtrudeNode {
  type: "rotate_extrude";
  angle?: number;
  convexity?: number;
  children: SCADNode[];
}

export interface OffsetNode {
  type: "offset";
  r?: number;
  delta?: number;
  chamfer?: boolean;
  children: SCADNode[];
}

// --- Control Flow Node Types -----------------------------------------------

export interface ForLoopNode {
  type: "for";
  variable: string;
  range: number[] | { start: number; end: number; step?: number };
  children: SCADNode[];
}

export interface IfNode {
  type: "if";
  condition: string;
  thenBranch: SCADNode[];
  elseBranch?: SCADNode[];
}

// --- Module Node Types -----------------------------------------------------

export interface ModuleDefNode {
  type: "module_def";
  name: string;
  parameters: { name: string; default?: string | number }[];
  body: SCADNode[];
}

export interface ModuleCallNode {
  type: "module_call";
  name: string;
  arguments: Record<string, string | number>;
  children?: SCADNode[];
}

// --- Variable Node Type ----------------------------------------------------

export interface VariableNode {
  type: "variable";
  name: string;
  value: string | number | boolean | number[];
}

// --- Utility Node Types ----------------------------------------------------

export interface EchoNode {
  type: "echo";
  message: string;
}

export interface ImportNode {
  type: "import";
  file: string;
  convexity?: number;
  layer?: string;
}

export interface UseNode {
  type: "use";
  file: string;
}

export interface IncludeNode {
  type: "include";
  file: string;
}

// --- Discriminated Union --------------------------------------------------

export type SCADNode =
  | CubeNode
  | SphereNode
  | CylinderNode
  | PolyhedronNode
  | TextNode
  | PolygonNode
  | SurfaceNode
  | TranslateNode
  | RotateNode
  | ScaleNode
  | MirrorNode
  | MultmatrixNode
  | ColorNode
  | ResizeNode
  | UnionNode
  | DifferenceNode
  | IntersectionNode
  | HullNode
  | MinkowskiNode
  | LinearExtrudeNode
  | RotateExtrudeNode
  | OffsetNode
  | ForLoopNode
  | IfNode
  | ModuleDefNode
  | ModuleCallNode
  | VariableNode
  | EchoNode
  | ImportNode
  | UseNode
  | IncludeNode;

// ============================================================================
// Constructor Helper Functions
// ============================================================================

export function cube(size: number | [number, number, number], center?: boolean): CubeNode {
  return { type: "cube", size, center };
}

export function sphere(r: number, opts?: { $fn?: number; $fa?: number; $fs?: number }): SphereNode {
  return { type: "sphere", r, ...opts };
}

export function cylinder(opts: {
  h: number; r?: number; r1?: number; r2?: number; d?: number; d1?: number; d2?: number; center?: boolean; $fn?: number;
}): CylinderNode {
  return { type: "cylinder", ...opts };
}

export function polyhedron(points: [number, number, number][], faces: number[][], convexity?: number): PolyhedronNode {
  return { type: "polyhedron", points, faces, convexity };
}

export function text(t: string, opts?: {
  size?: number; font?: string; halign?: string; valign?: string; spacing?: number;
  direction?: string; language?: string; script?: string; $fn?: number;
}): TextNode {
  return { type: "text", text: t, ...opts };
}

export function polygon(points: [number, number][], paths?: number[][], convexity?: number): PolygonNode {
  return { type: "polygon", points, paths, convexity };
}

export function surface(file: string, center?: boolean, invert?: boolean, convexity?: number): SurfaceNode {
  return { type: "surface", file, center, invert, convexity };
}

export function translate(v: [number, number, number], children: SCADNode[]): TranslateNode {
  return { type: "translate", v, children };
}

export function rotate(opts: {
  a?: number | [number, number, number];
  v?: [number, number, number];
  children: SCADNode[];
}): RotateNode {
  const { a, v, children } = opts;
  return { type: "rotate", a, v, children };
}

export function scale(v: [number, number, number] | number, children: SCADNode[]): ScaleNode {
  return { type: "scale", v, children };
}

export function mirror(v: [number, number, number], children: SCADNode[]): MirrorNode {
  return { type: "mirror", v, children };
}

export function multmatrix(m: number[][], children: SCADNode[]): MultmatrixNode {
  return { type: "multmatrix", m, children };
}

export function color(
  c: string | [number, number, number] | [number, number, number, number],
  children: SCADNode[],
  alpha?: number
): ColorNode {
  return { type: "color", c, alpha, children };
}

export function resize(
  v: [number, number, number] | [number, number],
  children: SCADNode[],
  auto?: boolean | [boolean, boolean, boolean]
): ResizeNode {
  return { type: "resize", v, auto, children };
}

export function union(children: SCADNode[]): UnionNode {
  return { type: "union", children };
}

export function difference(children: SCADNode[]): DifferenceNode {
  return { type: "difference", children };
}

export function intersection(children: SCADNode[]): IntersectionNode {
  return { type: "intersection", children };
}

export function hull(children: SCADNode[]): HullNode {
  return { type: "hull", children };
}

export function minkowski(children: SCADNode[]): MinkowskiNode {
  return { type: "minkowski", children };
}

export function linearExtrude(opts: {
  height: number; center?: boolean; convexity?: number; twist?: number;
  scale?: number | [number, number]; slices?: number; children: SCADNode[];
}): LinearExtrudeNode {
  const { height, center, convexity, twist, scale: sc, slices, children } = opts;
  return { type: "linear_extrude", height, center, convexity, twist, scale: sc, slices, children };
}

export function rotateExtrude(opts: {
  angle?: number; convexity?: number; children: SCADNode[];
}): RotateExtrudeNode {
  const { angle, convexity, children } = opts;
  return { type: "rotate_extrude", angle, convexity, children };
}

export function offset(opts: {
  r?: number; delta?: number; chamfer?: boolean; children: SCADNode[];
}): OffsetNode {
  const { r, delta, chamfer, children } = opts;
  return { type: "offset", r, delta, chamfer, children };
}

export function forLoop(
  variable: string,
  range: number[] | { start: number; end: number; step?: number },
  children: SCADNode[]
): ForLoopNode {
  return { type: "for", variable, range, children };
}

export function ifNode(
  condition: string,
  thenBranch: SCADNode[],
  elseBranch?: SCADNode[]
): IfNode {
  return { type: "if", condition, thenBranch, elseBranch };
}

export function moduleDef(
  name: string,
  parameters: { name: string; default?: string | number }[],
  body: SCADNode[]
): ModuleDefNode {
  return { type: "module_def", name, parameters, body };
}

export function moduleCall(
  name: string,
  args: Record<string, string | number>,
  children?: SCADNode[]
): ModuleCallNode {
  return { type: "module_call", name, arguments: args, children };
}

export function variable(name: string, value: string | number | boolean | number[]): VariableNode {
  return { type: "variable", name, value };
}

export function echo(message: string): EchoNode {
  return { type: "echo", message };
}

export function importFile(file: string, convexity?: number, layer?: string): ImportNode {
  return { type: "import", file, convexity, layer };
}

export function use(file: string): UseNode {
  return { type: "use", file };
}

export function include(file: string): IncludeNode {
  return { type: "include", file };
}
