// ============================================================================
// OpenSCAD AST -> three.js
// ============================================================================
// Walks the AST emitted by the OpenSCAD MCP tools and builds a three.js object
// graph. This is a *preview*, not a faithful CSG evaluator:
//
//   - primitives + transforms render exactly
//   - union renders as a plain group
//   - difference renders the base solid plus translucent red "cutters"
//   - intersection renders its operands translucent
//   - hull / minkowski render their operands grouped (rough occupancy)
//   - linear_extrude renders when its child is a polygon
//   - everything else (text, 2D, control flow, modules, imports) is reported
//     in `unsupported` so the UI can point the user at the Code tab
//
// The scene is built Z-up to match OpenSCAD; the caller sets camera.up = +Z.

import * as THREE from "three";

export interface RenderResult {
  object: THREE.Object3D;
  /** Node types encountered that this previewer can't render. */
  unsupported: string[];
}

type ScadNode = { type: string; children?: ScadNode[]; [key: string]: unknown };

interface MatCtx {
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

const SOLID_COLOR = 0xf4a23b; // OpenSCAD-ish amber
const CUT_COLOR = 0xe5484d; // translucent red for difference() cutters

const deg = (d: number) => (d * Math.PI) / 180;

function triple(v: unknown, fallback = 0): [number, number, number] {
  if (Array.isArray(v)) {
    return [
      typeof v[0] === "number" ? v[0] : fallback,
      typeof v[1] === "number" ? v[1] : fallback,
      typeof v[2] === "number" ? v[2] : fallback,
    ];
  }
  if (typeof v === "number") return [v, v, v];
  return [fallback, fallback, fallback];
}

function material(ctx: MatCtx, override?: MatCtx): THREE.Material {
  const color = override?.color ?? ctx.color ?? SOLID_COLOR;
  const opacity = override?.opacity ?? ctx.opacity ?? 1;
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.6,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
}

/** Reflection matrix across the plane through the origin normal to `v`. */
function reflectionMatrix(v: [number, number, number]): THREE.Matrix4 {
  const [x, y, z] = v;
  const d = x * x + y * y + z * z || 1;
  const m = new THREE.Matrix4();
  // prettier-ignore
  m.set(
    1 - (2 * x * x) / d, -(2 * x * y) / d,    -(2 * x * z) / d,    0,
    -(2 * x * y) / d,    1 - (2 * y * y) / d, -(2 * y * z) / d,    0,
    -(2 * x * z) / d,    -(2 * y * z) / d,    1 - (2 * z * z) / d, 0,
    0,                   0,                   0,                  1,
  );
  return m;
}

export function renderAst(ast: ScadNode): RenderResult {
  const unsupported = new Set<string>();

  function children(node: ScadNode, ctx: MatCtx): THREE.Object3D[] {
    return (node.children ?? []).map((c) => build(c, ctx));
  }

  function build(node: ScadNode, ctx: MatCtx): THREE.Object3D {
    switch (node.type) {
      // --- primitives ------------------------------------------------------
      case "cube": {
        const [x, y, z] = triple(node.size);
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(x || 1, y || 1, z || 1),
          material(ctx),
        );
        if (!node.center) mesh.position.set(x / 2, y / 2, z / 2);
        return mesh;
      }
      case "sphere": {
        const r = (node.r as number) ?? 1;
        const seg = Math.min(Math.max((node.$fn as number) ?? 32, 8), 64);
        return new THREE.Mesh(
          new THREE.SphereGeometry(r, seg, Math.max(8, Math.floor(seg / 2))),
          material(ctx),
        );
      }
      case "cylinder": {
        const h = (node.h as number) ?? 1;
        const d = node.d as number | undefined;
        const r1 =
          (node.r1 as number) ??
          (node.r as number) ??
          (node.d1 != null ? (node.d1 as number) / 2 : undefined) ??
          (d != null ? d / 2 : 1);
        const r2 =
          (node.r2 as number) ??
          (node.r as number) ??
          (node.d2 != null ? (node.d2 as number) / 2 : undefined) ??
          (d != null ? d / 2 : 1);
        const seg = Math.min(Math.max((node.$fn as number) ?? 32, 8), 64);
        // three's CylinderGeometry is (radiusTop, radiusBottom, height) along Y.
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(r2, r1, h, seg),
          material(ctx),
        );
        mesh.rotation.x = Math.PI / 2; // Y-up -> Z-up
        mesh.position.z = node.center ? 0 : h / 2;
        return mesh;
      }
      case "polyhedron": {
        const pts = (node.points as number[][]) ?? [];
        const faces = (node.faces as number[][]) ?? [];
        const positions: number[] = [];
        for (const face of faces) {
          for (let i = 1; i < face.length - 1; i++) {
            for (const idx of [face[0], face[i], face[i + 1]]) {
              const p = pts[idx] ?? [0, 0, 0];
              positions.push(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
            }
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, material(ctx));
      }

      // --- transforms ------------------------------------------------------
      case "translate": {
        const g = new THREE.Group();
        g.position.set(...triple(node.v));
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "rotate": {
        const g = new THREE.Group();
        if (Array.isArray(node.a)) {
          const [ax, ay, az] = triple(node.a);
          g.rotation.set(deg(ax), deg(ay), deg(az), "XYZ");
        } else if (typeof node.a === "number") {
          if (node.v) {
            const axis = new THREE.Vector3(...triple(node.v)).normalize();
            g.quaternion.setFromAxisAngle(axis, deg(node.a));
          } else {
            g.rotation.z = deg(node.a);
          }
        }
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "scale": {
        const g = new THREE.Group();
        g.scale.set(...triple(node.v, 1));
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "mirror": {
        const g = new THREE.Group();
        g.applyMatrix4(reflectionMatrix(triple(node.v)));
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "multmatrix": {
        const g = new THREE.Group();
        const m = (node.m as number[][]) ?? [];
        const at = (i: number, j: number) => m[i]?.[j] ?? (i === j ? 1 : 0);
        const e = new THREE.Matrix4();
        // prettier-ignore
        e.set(
          at(0,0), at(0,1), at(0,2), at(0,3),
          at(1,0), at(1,1), at(1,2), at(1,3),
          at(2,0), at(2,1), at(2,2), at(2,3),
          at(3,0), at(3,1), at(3,2), at(3,3),
        );
        g.applyMatrix4(e);
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "color": {
        const g = new THREE.Group();
        let color: THREE.ColorRepresentation | undefined;
        let opacity = (node.alpha as number) ?? ctx.opacity ?? 1;
        if (typeof node.c === "string") {
          color = node.c;
        } else if (Array.isArray(node.c)) {
          const c = node.c as number[];
          color = new THREE.Color(c[0] ?? 1, c[1] ?? 1, c[2] ?? 1);
          if (c.length > 3) opacity = c[3];
        }
        children(node, { color, opacity }).forEach((c) => g.add(c));
        return g;
      }
      case "resize": {
        // Resize semantics aren't evaluated; show the unresized children.
        const g = new THREE.Group();
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }

      // --- booleans --------------------------------------------------------
      case "union": {
        const g = new THREE.Group();
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }
      case "difference": {
        const g = new THREE.Group();
        (node.children ?? []).forEach((child, i) => {
          // First operand is the solid; the rest are translucent "cutters".
          const childCtx: MatCtx =
            i === 0 ? ctx : { color: CUT_COLOR, opacity: 0.35 };
          g.add(build(child, childCtx));
        });
        return g;
      }
      case "intersection": {
        const g = new THREE.Group();
        children(node, { color: ctx.color, opacity: 0.45 }).forEach((c) =>
          g.add(c),
        );
        return g;
      }
      case "hull":
      case "minkowski": {
        // Rough preview: the result roughly occupies the operands' space.
        const g = new THREE.Group();
        children(node, ctx).forEach((c) => g.add(c));
        return g;
      }

      // --- modifiers -------------------------------------------------------
      case "linear_extrude": {
        const child = (node.children ?? [])[0];
        if (child && child.type === "polygon") {
          const pts = (child.points as number[][]) ?? [];
          if (pts.length >= 3) {
            const shape = new THREE.Shape();
            shape.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++)
              shape.lineTo(pts[i][0], pts[i][1]);
            shape.closePath();
            const height = (node.height as number) ?? 1;
            const mesh = new THREE.Mesh(
              new THREE.ExtrudeGeometry(shape, {
                depth: height,
                bevelEnabled: false,
              }),
              material(ctx),
            );
            if (node.center) mesh.position.z = -height / 2;
            return mesh;
          }
        }
        unsupported.add("linear_extrude");
        return new THREE.Group();
      }

      // --- not previewable -------------------------------------------------
      default:
        unsupported.add(node.type);
        return new THREE.Group();
    }
  }

  const object = build(ast, {});
  return { object, unsupported: [...unsupported] };
}
