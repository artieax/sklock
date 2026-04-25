import type { Graph } from "./graph.js";

export function toMermaid(graph: Graph): string {
  const lines = ["graph TD"];
  for (const edge of graph.edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  if (graph.edges.length === 0) {
    for (const node of graph.nodes) {
      lines.push(`  ${node}`);
    }
  }
  return lines.join("\n");
}
