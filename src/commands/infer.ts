import { readFile, writeFile } from "fs/promises";
import { scanSkills, type DiscoveredSkill } from "../core/scanner.js";
import { suggestRequires } from "../core/suggest-requires.js";
import { generateLockfile, writeLockfile } from "../core/lockfile.js";
import { validateSkills } from "../core/validator.js";
import { resolveWorkspaceRoot } from "./shared.js";
import { addRequires } from "./add.js";

export interface InferOptions {
  root?: string;
  apply?: boolean;
  quiet?: boolean;
  llmContext?: boolean;
}

export interface SuggestedDep {
  skill: string;
  requires: string[];
  reason: string;
}

async function inferWithStaticAnalysis(root: string): Promise<SuggestedDep[]> {
  const results = await suggestRequires(root);
  return results
    .filter((r) => r.suggestions.length > 0)
    .map((r) => ({
      skill: r.skillId,
      requires: r.suggestions.map((s) => s.depId),
      reason: `referenced in ${r.suggestions.map((s) => s.foundIn).join(", ")}`,
    }));
}

function filterExisting(
  suggestions: SuggestedDep[],
  skills: DiscoveredSkill[]
): SuggestedDep[] {
  const skillMap = new Map(skills.map((s) => [s.id, s]));
  return suggestions
    .map((sug) => ({
      ...sug,
      requires: sug.requires.filter((dep) => {
        const skill = skillMap.get(sug.skill);
        return skill && !skill.requires.includes(dep) && skillMap.has(dep);
      }),
    }))
    .filter((sug) => sug.requires.length > 0);
}

function formatLlmContext(skills: DiscoveredSkill[]): string {
  const lines: string[] = [
    "# sklock: semantic dependency context",
    "# Static analysis found no file-level cross-references.",
    "# Read each skill description and decide: does skill A require skill B?",
    "# Confirm with:  sklock add <A> --dep <B>",
    "",
    "skills:",
  ];
  for (const s of skills) {
    lines.push(`  ${s.id}:`);
    lines.push(`    description: ${JSON.stringify(s.description ?? "(none)")}`);
    lines.push(`    requires: [${s.requires.join(", ")}]`);
  }
  lines.push("");
  lines.push("# For each ordered pair (A, B), add a dependency when:");
  lines.push("#   - A's workflow produces or consumes what B provides");
  lines.push("#   - A would fail or degrade meaningfully without B");
  lines.push("#   - A explicitly orchestrates or delegates to B");
  lines.push("# Skip pairs that share a theme but have no functional dependency.");
  return lines.join("\n");
}

export async function inferCommand(options: InferOptions): Promise<SuggestedDep[]> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) console.warn(w.message);

  if (skills.length === 0) {
    if (!options.quiet) console.log("No skills found.");
    return [];
  }

  if (options.llmContext) {
    console.log(formatLlmContext(skills));
    return [];
  }

  const raw = await inferWithStaticAnalysis(root);
  const suggestions = filterExisting(raw, skills);

  if (suggestions.length === 0) {
    if (!options.quiet) {
      console.log("No new dependencies inferred (static analysis).");
      console.log("For semantic inference, run: sklock infer --llm-context");
    }
    return [];
  }

  if (!options.apply) {
    console.log("Suggested dependencies (static analysis):\n");
    for (const s of suggestions) {
      for (const dep of s.requires) {
        console.log(`  ${s.skill} → ${dep}  # ${s.reason}`);
      }
    }
    console.log(
      "\nRun with --apply to write these to SKILL.md files.\n" +
        "For semantic inference, use the sklock/initialize skill with your AI agent."
    );
    return suggestions;
  }

  const updated: string[] = [];
  for (const sug of suggestions) {
    const skill = skills.find((s) => s.id === sug.skill)!;
    let content = await readFile(skill.skillMdPath, "utf-8");
    for (const dep of sug.requires) {
      content = addRequires(content, dep);
      updated.push(`${sug.skill} → ${dep}`);
    }
    await writeFile(skill.skillMdPath, content, "utf-8");
  }

  if (updated.length > 0) {
    if (!options.quiet) {
      for (const line of updated) console.log(`  Added ${line}`);
    }

    const { skills: fresh, warnings: fw } = await scanSkills(root);
    for (const w of fw) console.warn(w.message);
    const validation = validateSkills(fresh);
    if (!validation.valid) {
      console.error("Validation failed after applying inferred dependencies:");
      for (const e of validation.errors) console.error(`  ${e}`);
      process.exit(2);
    }
    const lockfile = await generateLockfile(fresh, root);
    await writeLockfile(lockfile, root);
    if (!options.quiet) console.log("✓ skill.lock updated");
  }

  return suggestions;
}
