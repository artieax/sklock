import { describe, expect, it } from "vitest";
import type { Graph } from "./graph.js";
import { toMermaid } from "./mermaid.js";

describe("toMermaid", () => {
  it("renders edges when present", () => {
    const graph: Graph = { nodes: ["a", "b"], edges: [{ from: "a", to: "b" }] };
    expect(toMermaid(graph)).toBe(['graph TD', '  "a" --> "b"'].join("\n"));
  });

  it("renders isolated nodes even when other nodes have edges", () => {
    const graph: Graph = { nodes: ["a", "b", "solo"], edges: [{ from: "a", to: "b" }] };
    expect(toMermaid(graph)).toBe(['graph TD', '  "a" --> "b"', '  "solo"'].join("\n"));
  });

  it("renders isolated nodes when there are no edges", () => {
    const graph: Graph = { nodes: ["solo"], edges: [] };
    expect(toMermaid(graph)).toContain('"solo"');
  });
});
