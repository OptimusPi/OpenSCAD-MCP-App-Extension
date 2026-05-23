// ============================================================================
// OpenSCAD MCP Server — Core Server Factory
// ============================================================================

export interface OpenSCADMCPServerConfig {
  name: string;
  version: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  handler: (args: Record<string, any>) => any;
}

export interface MCPServer {
  _tools: Record<string, ToolDef>;
  _resources: Record<string, any>;
  _prompts: Record<string, any>;
  addTool: (tool: ToolDef) => void;
  addResource: (name: string, resource: any) => void;
  addPrompt: (name: string, prompt: any) => void;
  callTool: (name: string, args: Record<string, any>) => Promise<any>;
}

class OpenSCADMCPServer implements MCPServer {
  _tools: Record<string, ToolDef> = {};
  _resources: Record<string, any> = {};
  _prompts: Record<string, any> = {};
  name: string;
  version: string;

  constructor(config: OpenSCADMCPServerConfig) {
    this.name = config.name;
    this.version = config.version;
  }

  addTool(tool: ToolDef): void;
  addTool(name: string, description: string, parameters: any, handler: (args: any) => any): void;
  addTool(a: any, b?: any, c?: any, d?: any): void {
    if (typeof a === "string") {
      // Positional: addTool(name, description, parameters, handler)
      this._tools[a] = { name: a, description: b || "", parameters: c, handler: d };
    } else {
      // Object: addTool({ name, description, parameters, handler })
      this._tools[a.name] = a as ToolDef;
    }
  }

  addResource(name: string, resource: any): void {
    this._resources[name] = resource;
  }

  addPrompt(name: string, prompt: any): void {
    this._prompts[name] = prompt;
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const tool = this._tools[name];
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.handler(args);
  }
}

export function createServer(config: OpenSCADMCPServerConfig): MCPServer {
  return new OpenSCADMCPServer(config);
}
