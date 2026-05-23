import { describe, it, expect, beforeAll } from "vitest";
import { createServer } from "../src/server.js";
import { registerAllTools } from "../src/tools/index.js";

describe("Tools", () => {
  let server: any;

  beforeAll(() => {
    server = createServer({ name: "test", version: "1.0" });
    registerAllTools(server);
  });

  it("registers the single consolidated tool", () => {
    const names = Object.keys(server._tools);
    expect(names.length).toBe(1);
    expect(server._tools["design_3d_model"]).toBeDefined();
  });

  it("emits SCAD code from a single-node AST", async () => {
    const result = await server.callTool("design_3d_model", {
      ast: { type: "cube", size: [10, 20, 30], center: true },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scad_code).toContain("cube");
    expect(parsed.scad_code).toContain("10");
    expect(parsed.ast.type).toBe("cube");
  });

  it("emits a difference of nested children", async () => {
    const result = await server.callTool("design_3d_model", {
      ast: {
        type: "difference",
        children: [
          { type: "cube", size: [20, 20, 10], center: true },
          { type: "cylinder", h: 12, r: 4, center: true },
        ],
      },
      description: "drilled block",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scad_code).toContain("difference");
    expect(parsed.scad_code).toContain("cylinder");
    expect(parsed.scad_code).toContain("{");
    expect(parsed.description).toBe("drilled block");
  });

  it("treats a top-level array as an implicit union", async () => {
    const result = await server.callTool("design_3d_model", {
      ast: [
        { type: "cube", size: 10 },
        { type: "translate", v: [20, 0, 0], children: [{ type: "sphere", r: 5 }] },
      ],
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scad_code).toContain("cube");
    expect(parsed.scad_code).toContain("translate");
    expect(parsed.ast.type).toBe("union");
    expect(parsed.ast.children).toHaveLength(2);
  });

  it("rejects a missing ast", async () => {
    await expect(server.callTool("design_3d_model", {})).rejects.toThrow();
  });
});
