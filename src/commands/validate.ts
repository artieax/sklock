import { scanSkills } from "../core/scanner.js";
import { validateSkills } from "../core/validator.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ValidateOptions {
  root?: string;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const result = validateSkills(skills);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!options.quiet) {
    if (result.valid) {
      console.log(`✓ All ${skills.length} skill(s) are valid.`);
    } else {
      console.error(`✗ Validation failed with ${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.error(`  [${err.skillId}] ${err.message}`);
      }
    }
  }

  if (!result.valid) process.exit(2);
}
