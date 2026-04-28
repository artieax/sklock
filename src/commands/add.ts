import { readFile, writeFile } from "fs/promises";
import { parse, parseDocument, stringify } from "yaml";
import { scanSkills } from "../core/scanner.js";
import { generateLockfile, writeLockfile } from "../core/lockfile.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface AddOptions {
  root?: string;
  dep?: string;
}

export async function addCommand(skillId: string, options: AddOptions): Promise<void> {
  if (!options.dep) {
    console.error("Error: --dep <skill-id> is required");
    process.exit(1);
  }

  const depId = options.dep;
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }

  const skill = skills.find((s) => s.id === skillId);
  if (!skill) {
    console.error(`Skill not found: ${skillId}`);
    process.exit(1);
  }

  if (!skills.some((s) => s.id === depId)) {
    console.error(`Dependency skill not found: ${depId}`);
    process.exit(1);
  }

  if (skill.requires.includes(depId)) {
    console.log(`${depId} is already in ${skillId} requires[]`);
    return;
  }

  const proposedSkills = skills.map((currentSkill) =>
    currentSkill.id === skillId
      ? {
          ...currentSkill,
          requires: [...currentSkill.requires, depId].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        }
      : currentSkill
  );
  exitOnValidationErrors(validateSkills(proposedSkills), `update ${skillId}`);

  const originalContent = await readFile(skill.skillMdPath, "utf-8");
  const updatedContent = addRequires(originalContent, depId);
  await writeFile(skill.skillMdPath, updatedContent, "utf-8");
  console.log(`Added ${depId} to ${skillId} requires[]`);

  console.log("Re-generating skill.lock...");
  try {
    const { skills: freshSkills, warnings: freshWarnings } = await scanSkills(root);
    for (const w of freshWarnings) {
      console.warn(w.message);
    }
    const result = validateSkills(freshSkills);
    if (!result.valid) {
      await writeFile(skill.skillMdPath, originalContent, "utf-8");
      exitOnValidationErrors(result, "write skill.lock");
    }
    const lockfile = await generateLockfile(freshSkills, root);
    await writeLockfile(lockfile, root);
  } catch (error) {
    await writeFile(skill.skillMdPath, originalContent, "utf-8");
    throw error;
  }
  console.log("✓ skill.lock updated");
}

export function addRequires(content: string, depId: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return `---\nrequires:\n  - ${depId}\n---\n\n${content}`;
  }

  const eol = match[0].includes("\r\n") ? "\r\n" : "\n";
  const [, frontmatterYaml, body] = match;
  try {
    const doc = parseDocument(frontmatterYaml);
    if (doc.errors.length > 0) throw doc.errors[0];
    const raw = doc.toJS() as Record<string, unknown>;
    const requires = Array.isArray(raw.requires) ? [...(raw.requires as string[])] : [];
    requires.push(depId);
    requires.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    doc.set("requires", requires);
    return `---${eol}${String(doc).trimEnd()}${eol}---${eol}${eol}${body.trimStart()}`;
  } catch {
    const data = (parse(frontmatterYaml) as Record<string, unknown>) ?? {};
    const requires = Array.isArray(data.requires) ? [...(data.requires as string[])] : [];
    requires.push(depId);
    requires.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    data.requires = requires;
    return `---${eol}${stringify(data).trimEnd()}${eol}---${eol}${eol}${body.trimStart()}`;
  }
}
