import { writeFile } from "fs/promises";
import path from "path";
import { scanSkills } from "../core/scanner.js";
import { resolveSkills } from "../core/resolver.js";
import { buildGraph } from "../core/graph.js";
import { generateLockfile } from "../core/lockfile.js";
import { exportAsJson, exportAsYaml, exportAsMermaid } from "../core/export.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ExportOptions {
  root?: string;
  output?: string;
  format?: string;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const resolved = resolveSkills(skills);
  const lockfile = await generateLockfile(skills, root);
  const graph = buildGraph(resolved);
  const format = options.format ?? "json";

  let output: string;
  if (format === "yaml") {
    output = exportAsYaml(lockfile);
  } else if (format === "mermaid") {
    output = exportAsMermaid(graph);
  } else {
    output = exportAsJson(lockfile);
  }

  if (options.output) {
    await writeFile(path.resolve(options.output), output, "utf-8");
    console.log(`Exported to ${options.output}`);
  } else {
    console.log(output);
  }
}
