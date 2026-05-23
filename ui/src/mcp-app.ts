// ============================================================================
// OpenSCAD Preview — MCP App entry point
// ============================================================================
// A two-tab MCP App: an interactive three.js viewport and a .scad code view.
// It receives `{ scad_code, ast, description }` as the structuredContent of any
// OpenSCAD tool result. The Code tab is the floor — it always shows real
// output even when the 3D previewer can't render a given construct.

import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { renderAst } from "./scad-renderer.js";

// --- DOM ---------------------------------------------------------------------

const root = document.getElementById("root")!;
const tab3d = document.getElementById("tab-3d")!;
const tabCode = document.getElementById("tab-code")!;
const view3d = document.getElementById("view-3d")!;
const viewCode = document.getElementById("view-code")!;
const viewport = document.getElementById("viewport")!;
const badge = document.getElementById("badge")!;
const caption = document.getElementById("caption")!;
const codeEl = document.querySelector("#code code") as HTMLElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;

function activateTab(which: "3d" | "code"): void {
  const is3d = which === "3d";
  tab3d.classList.toggle("is-active", is3d);
  tabCode.classList.toggle("is-active", !is3d);
  view3d.classList.toggle("is-active", is3d);
  viewCode.classList.toggle("is-active", !is3d);
  if (is3d) resizeRenderer();
}
tab3d.addEventListener("click", () => activateTab("3d"));
tabCode.addEventListener("click", () => activateTab("code"));

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(codeEl.textContent ?? "");
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
  } catch {
    // Clipboard access can be blocked inside the sandbox — fail quietly.
  }
});

// --- three.js scene ----------------------------------------------------------

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls | null = null;
let modelGroup: THREE.Group | null = null;
let webglOk = false;
let visible = true;

function initThree(): void {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    viewport.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100000);
    camera.up.set(0, 0, 1); // OpenSCAD is Z-up

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1, 1, 2);
    const fill = new THREE.DirectionalLight(0xbcccff, 0.4);
    fill.position.set(-1, -0.5, -1);
    scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.45));

    webglOk = true;
    resizeRenderer();
    animate();
  } catch {
    webglOk = false;
    viewport.textContent = "3D preview unavailable — use the Code tab.";
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  if (!visible || !renderer) return;
  controls?.update();
  renderer.render(scene, camera);
}

function resizeRenderer(): void {
  if (!renderer) return;
  const w = viewport.clientWidth || 1;
  const h = viewport.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function fitCamera(obj: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) {
    camera.position.set(40, -40, 30);
    controls?.target.set(0, 0, 0);
    controls?.update();
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 1) * 0.5;
  const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * 2.2;
  camera.position.set(
    center.x + dist,
    center.y - dist,
    center.z + dist * 0.8,
  );
  camera.near = Math.max(dist / 1000, 0.01);
  camera.far = dist * 1000;
  camera.updateProjectionMatrix();
  controls?.target.copy(center);
  controls?.update();

  // A faint ground grid in the model's XY plane (Z-up) for orientation.
  const grid = new THREE.GridHelper(radius * 4, 10, 0x888888, 0x888888);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(center.x, center.y, box.min.z);
  const gm = grid.material as THREE.Material;
  gm.transparent = true;
  gm.opacity = 0.15;
  obj.add(grid);
}

function disposeModel(): void {
  if (!modelGroup) return;
  scene.remove(modelGroup);
  modelGroup.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
  });
  modelGroup = null;
}

function showAst(ast: unknown): void {
  if (!webglOk || !ast || typeof ast !== "object") return;
  disposeModel();
  const { object, unsupported } = renderAst(ast as { type: string });
  modelGroup = new THREE.Group();
  modelGroup.add(object);
  scene.add(modelGroup);
  fitCamera(modelGroup);

  if (unsupported.length) {
    badge.hidden = false;
    badge.textContent = `Not previewed: ${unsupported.join(", ")} — see Code tab`;
  } else {
    badge.hidden = true;
  }
}

// --- tool data ---------------------------------------------------------------

interface ToolPayload {
  scad_code?: string;
  ast?: unknown;
  description?: string;
}

function applyResult(data: ToolPayload | undefined): void {
  if (!data) return;
  if (typeof data.scad_code === "string") codeEl.textContent = data.scad_code;
  caption.textContent = data.description ? String(data.description) : "";
  if (data.ast) {
    showAst(data.ast);
  } else {
    // e.g. scad_emit_document returns a full file with no single AST root.
    badge.hidden = false;
    badge.textContent = "Document output — see Code tab";
  }
}

// --- host context ------------------------------------------------------------

function handleHostContext(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    root.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
  resizeRenderer();
}

// --- MCP App wiring ----------------------------------------------------------

const app = new App({ name: "OpenSCAD Preview", version: "1.0.0" });

// Handlers must be registered before connect().
app.onteardown = async () => ({});
app.onerror = (err) => console.error("[openscad-app]", err);
app.onhostcontextchanged = handleHostContext;
app.ontoolinput = () => {
  caption.textContent = "Rendering…";
};
app.ontoolresult = (result: CallToolResult) => {
  applyResult(result.structuredContent as ToolPayload | undefined);
};

initThree();

new ResizeObserver(resizeRenderer).observe(viewport);
new IntersectionObserver((entries) => {
  visible = entries[0]?.isIntersecting ?? true;
}).observe(viewport);

app
  .connect()
  .then(() => {
    const ctx = app.getHostContext();
    if (ctx) handleHostContext(ctx);
  })
  .catch((err) => console.error("[openscad-app] connect failed", err));
