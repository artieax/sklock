import { scanSkills } from "../core/scanner.js";
import { validateSkills, validateSkillsStrict } from "../core/validator.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ValidateOptions {
  root?: string;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  /** Enforce Agent Skills spec compliance: description required, metadata values must be strings. */
  strict?: boolean;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  const result = validateSkills(skills);

  if (options.strict) {
    const strictErrors = validateSkillsStrict(skills);
    result.errors.push(...strictErrors);
    result.valid = result.errors.length === 0;
  }

  if (options.json) {
    console.log(JSON.stringify({ ...result, warnings, strict: Boolean(options.strict) }, null, 2));
  } else if (!options.quiet) {
    for (const w of warnings) {
      console.warn(w.message);
    }
    if (result.valid) {
      const modeLabel = options.strict ? " (strict)" : "";
      console.log(`✓ All ${skills.length} skill(s) are valid${modeLabel}.`);
      if (options.verbose) {
        for (const skill of skills) {
          console.log(`  ${skill.id}${skill.version ? `@${skill.version}` : ""}`);
        }
      }
    } else {
      console.error(`✗ Validation failed with ${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.error(`  [${err.skillId}] ${err.message}`);
      }
    }
  }

  if (!result.valid) process.exit(2);
}
