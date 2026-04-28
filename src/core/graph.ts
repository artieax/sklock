import type { ResolvedSkill } from "./resolver.js";

export interface GraphEdge {
  from: string;
  to: string;
  type?: "dep" | "contains";
}

export interface Graph {
  nodes: string[];
  edges: GraphEdge[];
}

export type GraphMode = "deps" | "containment" | "both";

export function buildGraph(skills: ResolvedSkill[], mode: GraphMode = "deps"): Graph {
  const nodes = skills.map((s) => s.id);
  const edges: GraphEdge[] = [];

  if (mode === "deps" || mode === "both") {
    for (const skill of skills) {
      for (const dep of skill.resolvedRequires) {
        edges.push({ from: skill.id, to: dep.id, type: "dep" });
      }
    }
  }

  if (mode === "containment" || mode === "both") {
    for (const skill of skills) {
      if (skill.parentId) {
        edges.push({ from: skill.parentId, to: skill.id, type: "contains" });
      }
    }
  }

  return { nodes, edges };
}
