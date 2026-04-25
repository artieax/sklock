import type { ResolvedSkill } from "./resolver.js";

export interface GraphEdge {
  from: string;
  to: string;
}

export interface Graph {
  nodes: string[];
  edges: GraphEdge[];
}

export function buildGraph(skills: ResolvedSkill[]): Graph {
  const nodes = skills.map((s) => s.id);
  const edges: GraphEdge[] = [];
  for (const skill of skills) {
    for (const dep of skill.resolvedRequires) {
      edges.push({ from: skill.id, to: dep.id });
    }
  }
  return { nodes, edges };
}
