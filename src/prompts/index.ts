import { registerPrompts } from "./templates.js";

export function registerAllPrompts(server: any): void {
  registerPrompts(server);
}

export * from "./templates.js";
