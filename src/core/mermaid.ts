import type { Graph } from "./graph.js";

function q(id: string): string {
  return `"${id}"`;
}

export function toMermaid(graph: Graph): string {
  const lines = ["graph TD"];
  const connectedNodes = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
    const arrow = edge.type === "contains" ? "-.->" : "-->";
    lines.push(`  ${q(edge.from)} ${arrow} ${q(edge.to)}`);
  }

  for (const node of graph.nodes) {
    if (!connectedNodes.has(node)) {
      lines.push(`  ${q(node)}`);
    }
  }
  return lines.join("\n");
}
