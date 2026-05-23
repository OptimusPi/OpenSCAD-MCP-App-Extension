import { describe, it, expect } from "vitest";
import {
  cube, sphere, cylinder, translate, rotate, union, difference,
  linearExtrude, moduleDef, variable, echo, importFile, color, polygon
} from "../src/lib/scad-ast.js";

describe("SCAD AST", () => {
  it("creates a cube node", () => {
    const node = cube([10, 20, 30], true);
    expect(node.type).toBe("cube");
    expect(node.size).toEqual([10, 20, 30]);
    expect(node.center).toBe(true);
  });

  it("creates a sphere", () => {
    const node = sphere(10, { $fn: 100 });
    expect(node.r).toBe(10);
    expect(node.$fn).toBe(100);
  });

  it("creates a cylinder", () => {
    const node = cylinder({ h: 20, r: 10, center: true });
    expect(node.h).toBe(20);
    expect(node.r).toBe(10);
  });

  it("creates a translate", () => {
    const node = translate([1, 2, 3], [cube(10)]);
    expect(node.v).toEqual([1, 2, 3]);
    expect(node.children).toHaveLength(1);
  });

  it("creates a rotate", () => {
    const node = rotate({ a: 45, v: [0, 0, 1], children: [cube(5)] });
    expect(node.a).toBe(45);
    expect(node.children).toHaveLength(1);
  });

  it("creates a union", () => {
    const node = union([cube(10), sphere(5)]);
    expect(node.children).toHaveLength(2);
  });

  it("creates a variable", () => {
    const node = variable("width", 50);
    expect(node.name).toBe("width");
    expect(node.value).toBe(50);
  });

  it("creates a module def", () => {
    const node = moduleDef("myBox", [{ name: "size", default: 10 }], [cube(20)]);
    expect(node.name).toBe("myBox");
    expect(node.parameters[0].default).toBe(10);
  });

  it("creates echo", () => {
    const node = echo("hello");
    expect(node.message).toBe("hello");
  });

  it("creates import", () => {
    const node = importFile("model.stl");
    expect(node.file).toBe("model.stl");
  });

  it("creates color", () => {
    const node = color("red", [cube(10)]);
    expect(node.c).toBe("red");
  });

  it("creates polygon", () => {
    const node = polygon([[0, 0], [10, 0], [5, 10]]);
    expect(node.points).toHaveLength(3);
  });
});
