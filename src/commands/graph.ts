import { scanSkills } from "../core/scanner.js";
import { resolveSkills } from "../core/resolver.js";
import { buildGraph, type GraphMode } from "../core/graph.js";
import { toMermaid } from "../core/mermaid.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface GraphOptions {
  root?: string;
  mermaid?: boolean;
  format?: string;
  json?: boolean;
  mode?: string;
}

export async function graphCommand(options: GraphOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  exitOnValidationErrors(validateSkills(skills), "render graph");
  const resolved = resolveSkills(skills);

  const rawMode = options.mode ?? "deps";
  if (!["deps", "containment", "both"].includes(rawMode)) {
    console.error(`Invalid graph mode: ${rawMode}. Expected one of: deps, containment, both.`);
    process.exit(1);
  }
  const mode = rawMode as GraphMode;

  const graph = buildGraph(resolved, mode);
  const format = options.format;

  if (format && !["text", "json", "mermaid"].includes(format)) {
    console.error(`Invalid graph format: ${format}. Expected one of: text, json, mermaid.`);
    process.exit(1);
  }

  if (options.json || format === "json") {
    console.log(JSON.stringify(graph, null, 2));
  } else if (options.mermaid || format === "mermaid") {
    console.log(toMermaid(graph));
  } else {
    console.log(`Nodes: ${graph.nodes.join(", ")}`);
    console.log(`Edges: ${graph.edges.map((e) => `${e.from} -> ${e.to}`).join(", ")}`);
  }
}
