import { registerResources } from "./scad-files.js";

export function registerAllResources(server: any): void {
  registerResources(server);
}

export * from "./scad-files.js";
