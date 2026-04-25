import { scanSkills } from "../core/scanner.js";
import { resolveSkills } from "../core/resolver.js";
import { buildGraph } from "../core/graph.js";
import { toMermaid } from "../core/mermaid.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface GraphOptions {
  root?: string;
  mermaid?: boolean;
  format?: string;
  json?: boolean;
}

export async function graphCommand(options: GraphOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const resolved = resolveSkills(skills);
  const graph = buildGraph(resolved);

  if (options.json) {
    console.log(JSON.stringify(graph, null, 2));
  } else if (options.mermaid) {
    console.log(toMermaid(graph));
  } else {
    console.log(`Nodes: ${graph.nodes.join(", ")}`);
    console.log(`Edges: ${graph.edges.map((e) => `${e.from} -> ${e.to}`).join(", ")}`);
  }
}
