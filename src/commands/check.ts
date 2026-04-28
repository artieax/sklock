import { scanSkills } from "../core/scanner.js";
import { generateLockfile, readLockfile } from "../core/lockfile.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface CheckOptions {
  root?: string;
  frozen?: boolean;
  json?: boolean;
}

/** Deterministic JSON-like string for lock entries; only supports JSON-serializable primitives. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }
  if (value === undefined) {
    return "undefined";
  }
  return JSON.stringify(value);
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  exitOnValidationErrors(validateSkills(skills), "check skill.lock", { json: options.json });
  const current = await generateLockfile(skills, root);
  const existing = await readLockfile(root);

  if (!existing) {
    const failOnMissingLockfile = Boolean(options.frozen);
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            stale: true,
            missingLockfile: true,
            added: Object.keys(current.skills).sort(),
            removed: [],
            changed: [],
            warnings,
          },
          null,
          2
        )
      );
    } else {
      const logMissing = failOnMissingLockfile ? console.error.bind(console) : console.warn.bind(console);
      logMissing("No skill.lock found. Run `sklock lock` first.");
    }
    if (failOnMissingLockfile) process.exit(4);
    return;
  }

  const currentKeys = Object.keys(current.skills).sort();
  const existingKeys = Object.keys(existing.skills).sort();

  const added = currentKeys.filter((k) => !existing.skills[k]);
  const removed = existingKeys.filter((k) => !current.skills[k]);
  const changed = currentKeys.filter(
    (k) => existing.skills[k] && stableStringify(existing.skills[k]) !== stableStringify(current.skills[k])
  );

  const isStale = added.length > 0 || removed.length > 0 || changed.length > 0;
  const failOnStale = Boolean(options.frozen);

  if (options.json) {
    console.log(JSON.stringify({ stale: isStale, added, removed, changed, warnings }, null, 2));
    if (isStale && failOnStale) process.exit(3);
    return;
  }

  if (!isStale) {
    console.log("✓ skill.lock is up to date.");
    return;
  }

  const logStale = failOnStale ? console.error.bind(console) : console.warn.bind(console);
  logStale("✗ skill.lock is stale. Run `sklock lock` to update.");
  if (added.length) logStale(`  Added:   ${added.join(", ")}`);
  if (removed.length) logStale(`  Removed: ${removed.join(", ")}`);
  if (changed.length) logStale(`  Changed: ${changed.join(", ")}`);
  if (failOnStale) process.exit(3);
}
