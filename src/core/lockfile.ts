import { readFile, stat, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { isUtf8 } from "buffer";
import fg from "fast-glob";
import path from "path";
import { LockfileSchema, type Lockfile, type LockEntry } from "../schema/lock.schema.js";
import type { DiscoveredSkill } from "./scanner.js";

const HASH_READ_CONCURRENCY = 12;
const TEXT_EXTENSIONS = new Set([
  ".bash",
  ".c",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".env",
  ".fish",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".less",
  ".md",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
]);
const TEXT_FILENAMES = new Set([
  ".dockerignore",
  ".gitignore",
  "CHANGELOG",
  "CODE_OF_CONDUCT",
  "CONTRIBUTING",
  "Dockerfile",
  "LICENSE",
  "Makefile",
  "README",
  "SECURITY",
  "SKILL",
]);

function lockRelativePath(root: string, skillPath: string): string {
  return path.relative(root, skillPath).split(path.sep).join("/");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

interface FileHashInput {
  buf: Buffer;
  executableBits: number;
}

function isKnownTextPath(relativePath: string): boolean {
  const parsed = path.posix.parse(relativePath);
  return TEXT_EXTENSIONS.has(parsed.ext) || TEXT_FILENAMES.has(parsed.name) || TEXT_FILENAMES.has(parsed.base);
}

/** Normalize line endings only for known text files; assets and other binary-ish files stay raw. */
function normalizeBufferForHash(relativePath: string, buf: Buffer): Buffer {
  if (!isKnownTextPath(relativePath)) {
    return buf;
  }
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  if (sample.includes(0) || !isUtf8(buf)) {
    return buf;
  }
  const text = buf.toString("utf8");
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(normalized, "utf8");
}

async function readFilesWithConcurrency(files: string[], concurrency: number): Promise<FileHashInput[]> {
  const results: FileHashInput[] = new Array(files.length);
  let index = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = index++;
      if (i >= files.length) return;
      const file = files[i]!;
      const [buf, fileStat] = await Promise.all([readFile(file), stat(file)]);
      results[i] = { buf, executableBits: fileStat.mode & 0o111 };
    }
  }
  const n = Math.min(concurrency, Math.max(1, files.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/**
 * Stable hash of everything under the skill directory (SKILL.md plus scripts,
 * references, assets, etc.). Paths are normalized to forward slashes.
 * Digest is truncated to 16 hex characters (64 bits) — enough for change detection.
 */
export async function hashSkillDirectory(skillPath: string): Promise<string> {
  const resolvedRoot = path.resolve(skillPath);
  const files = (
    await fg("**/*", {
      cwd: resolvedRoot,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/.git/**", "skill.lock"],
      dot: true,
    })
  )
    .map((f) => path.resolve(f))
    .sort((a, b) => {
      const ra = path.relative(resolvedRoot, a).split(path.sep).join("/");
      const rb = path.relative(resolvedRoot, b).split(path.sep).join("/");
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });

  const inputs = await readFilesWithConcurrency(files, HASH_READ_CONCURRENCY);
  const h = createHash("sha256");
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const rel = path.relative(resolvedRoot, file).split(path.sep).join("/");
    const input = inputs[i]!;
    const buf = normalizeBufferForHash(rel, input.buf);
    h.update(`${rel.length}:`);
    h.update(rel);
    h.update(`\0x${input.executableBits.toString(8)}\0${buf.length}:`);
    h.update(buf);
  }
  return h.digest("hex").slice(0, 16);
}

export async function generateLockfile(
  skills: DiscoveredSkill[],
  root: string
): Promise<Lockfile> {
  const hashes = await Promise.all(skills.map((skill) => hashSkillDirectory(skill.path)));
  const entries: Record<string, LockEntry> = {};
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i]!;
    const entry: LockEntry = {
      id: skill.id,
      path: lockRelativePath(root, skill.path),
      hash: hashes[i]!,
      requires: skill.requires ?? [],
    };
    if (skill.version) entry.version = skill.version;
    if (skill.parentId) entry.parent = skill.parentId;
    entries[skill.id] = entry;
  }

  const skillsSorted: Record<string, LockEntry> = {};
  for (const key of Object.keys(entries).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    skillsSorted[key] = entries[key];
  }

  return { version: "1", skills: skillsSorted };
}

export async function writeLockfile(lockfile: Lockfile, root: string): Promise<void> {
  const lockPath = path.join(root, "skill.lock");
  await writeFile(lockPath, JSON.stringify(lockfile, null, 2), "utf-8");
}

export async function readLockfile(root: string): Promise<Lockfile | null> {
  const lockPath = path.join(root, "skill.lock");
  try {
    const content = await readFile(lockPath, "utf-8");
    return LockfileSchema.parse(JSON.parse(content));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid skill.lock at ${lockPath}: ${reason}`);
  }
}
