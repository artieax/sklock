import { scanSkills } from "../core/scanner.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ScanOptions {
  root?: string;
  json?: boolean;
}

export async function scanCommand(options: ScanOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings, errors } = await scanSkills(root);

  if (options.json) {
    console.log(JSON.stringify({ skills, warnings, errors }, null, 2));
  } else {
    for (const w of warnings) {
      console.warn(w.message);
    }
    for (const e of errors) {
      console.error(e.message);
    }
    if (errors.length > 0) {
      process.exitCode = 1;
    }
    if (skills.length === 0) {
      console.log("No skills found.");
    } else {
      console.log(`Found ${skills.length} skill(s):`);
      for (const skill of skills) {
        console.log(`  ${skill.id}${skill.version ? `@${skill.version}` : ""} — ${skill.path}`);
      }
    }
  }
}
