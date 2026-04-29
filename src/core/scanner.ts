import fg from "fast-glob";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import path from "path";
import { SkillSchema } from "../schema/skill.schema.js";

export interface DiscoveredSkill {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  allowedTools?: string;
  requires: string[];
  tags: string[];
  path: string;
  skillMdPath: string;
  parentId?: string;
}

export class SkillScanError extends Error {
  constructor(
    message: string,
    public readonly file: string
  ) {
    super(message);
    this.name = "SkillScanError";
  }
}

export interface OrphanParentWarning {
  code: "orphan_parent";
  skillId: string;
  parentId: string;
  skillMdPath: string;
  message: string;
}

export interface ScanParseError {
  code: "parse_error";
  file: string;
  message: string;
}

export interface ScanResult {
  skills: DiscoveredSkill[];
  warnings: OrphanParentWarning[];
  errors: ScanParseError[];
}

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = parse(match[1]);
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { data: {}, body: match[2] };
  }
  return { data: data as Record<string, unknown>, body: match[2] };
}

function inferParentDir(root: string, skillDir: string): string | undefined {
  const relativeParts = path.relative(root, skillDir).split(path.sep);
  if (
    relativeParts.length >= 3 &&
    relativeParts[relativeParts.length - 2] === "skills"
  ) {
    return path.dirname(path.dirname(skillDir));
  }
  return undefined;
}

export async function scanSkills(root: string): Promise<ScanResult> {
  const resolvedRoot = path.resolve(root);
  const files = (
    await fg("**/SKILL.md", {
      cwd: resolvedRoot,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/.git/**"],
    })
  ).sort();

  const contents = await Promise.all(files.map((file) => readFile(file, "utf-8")));

  const skills: Array<DiscoveredSkill & { parentDir?: string }> = [];
  const errors: ScanParseError[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const content = contents[i]!;
    let data: Record<string, unknown>;
    try {
      ({ data } = parseFrontmatter(content));
    } catch (error) {
      errors.push({
        code: "parse_error",
        file,
        message: `Invalid YAML frontmatter in ${file}: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const skillDir = path.dirname(file);
    const dirName = path.basename(skillDir);

    const parsed = SkillSchema.safeParse(data);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
        .join("; ");
      errors.push({
        code: "parse_error",
        file,
        message: `Invalid SKILL.md at ${file}: ${details}`,
      });
      continue;
    }
    if (parsed.data.name !== dirName) {
      errors.push({
        code: "parse_error",
        file,
        message: `Invalid SKILL.md at ${file}: name must match parent directory (${dirName})`,
      });
      continue;
    }

    skills.push({
      id: parsed.data.name,
      name: parsed.data.name,
      version: parsed.data.version,
      description: parsed.data.description,
      author: parsed.data.author,
      license: parsed.data.license,
      compatibility: parsed.data.compatibility,
      metadata: parsed.data.metadata,
      allowedTools: parsed.data["allowed-tools"],
      requires: parsed.data.requires ?? [],
      tags: parsed.data.tags ?? [],
      path: skillDir,
      skillMdPath: file,
      parentDir: inferParentDir(resolvedRoot, skillDir),
    });
  }

  const idByPath = new Map(skills.map((skill) => [skill.path, skill.id]));
  const resolved = skills.map(({ parentDir, ...skill }) => ({
    ...skill,
    parentId: parentDir ? idByPath.get(parentDir) : undefined,
  }));

  const warnings: OrphanParentWarning[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const parentDir = skills[i]?.parentDir;
    const parentId = parentDir ? idByPath.get(parentDir) : undefined;
    if (parentDir && !parentId) {
      const missingParentId = path.basename(parentDir);
      const skill = resolved[i]!;
      warnings.push({
        code: "orphan_parent",
        skillId: skill.id,
        parentId: missingParentId,
        skillMdPath: skill.skillMdPath,
        message: `sklock: skill "${skill.id}" references missing parent "${missingParentId}" (${skill.skillMdPath})`,
      });
    }
  }

  return { skills: resolved, warnings, errors };
}
