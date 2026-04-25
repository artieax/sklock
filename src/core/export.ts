import type { Lockfile } from "../schema/lock.schema.js";
import type { Graph } from "./graph.js";
import { toMermaid } from "./mermaid.js";
import { stringify } from "yaml";

export function exportAsJson(lockfile: Lockfile): string {
  return JSON.stringify(lockfile, null, 2);
}

export function exportAsYaml(lockfile: Lockfile): string {
  return stringify(lockfile);
}

export function exportAsMermaid(graph: Graph): string {
  return toMermaid(graph);
}
