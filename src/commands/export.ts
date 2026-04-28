import { readFile, writeFile } from "fs/promises";
import path from "path";
import { scanSkills } from "../core/scanner.js";
import { resolveSkills } from "../core/resolver.js";
import { buildGraph } from "../core/graph.js";
import { generateLockfile } from "../core/lockfile.js";
import { exportAsJson, exportAsYaml, exportAsMermaid } from "../core/export.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface ExportOptions {
  root?: string;
  output?: string;
  format?: string;
  wrap?: boolean;
}

const MERMAID_FENCE_RE = /```mermaid\n[\s\S]*?\n```/;
const FORMATS = new Set(["json", "yaml", "mermaid"]);

export async function exportCommand(options: ExportOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  exitOnValidationErrors(validateSkills(skills), "export skills");
  const resolved = resolveSkills(skills);
  const lockfile = await generateLockfile(skills, root);
  const graph = buildGraph(resolved);
  const format = options.format ?? "json";
  if (!FORMATS.has(format)) {
    console.error(`Invalid export format: ${format}. Expected one of: json, yaml, mermaid.`);
    process.exit(1);
  }
  if (options.wrap && format !== "mermaid") {
    console.error(`--wrap is only valid with --format mermaid (got: ${format}).`);
    process.exit(1);
  }

  let output: string;
  if (format === "yaml") {
    output = exportAsYaml(lockfile);
  } else if (format === "mermaid") {
    output = exportAsMermaid(graph);
  } else {
    output = exportAsJson(lockfile);
  }

  if (options.wrap && format === "mermaid") {
    output = "```mermaid\n" + output + "\n```";
  }

  if (options.output) {
    const outPath = path.resolve(options.output);

    if (options.wrap && format === "mermaid") {
      let existing: string | null = null;
      try {
        existing = await readFile(outPath, "utf-8");
      } catch {
        // file doesn't exist yet
      }

      if (existing !== null && MERMAID_FENCE_RE.test(existing)) {
        await writeFile(outPath, existing.replace(MERMAID_FENCE_RE, output), "utf-8");
        console.log(`Updated mermaid block in ${options.output}`);
      } else if (existing !== null) {
        await writeFile(outPath, existing.trimEnd() + "\n\n" + output + "\n", "utf-8");
        console.log(`Appended mermaid block to ${options.output}`);
      } else {
        await writeFile(outPath, output + "\n", "utf-8");
        console.log(`Exported to ${options.output}`);
      }
      return;
    }

    await writeFile(outPath, output, "utf-8");
    console.log(`Exported to ${options.output}`);
  } else {
    console.log(output);
  }
}
