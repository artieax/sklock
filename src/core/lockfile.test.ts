import { chmod, mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { generateLockfile, hashSkillClosure, hashSkillContent, readLockfile } from "./lockfile.js";
import type { DiscoveredSkill } from "./scanner.js";

async function makeRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "sklock-lockfile-"));
}

describe("lockfile", () => {
  it("preserves parent metadata in generated entries", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "parent", "skills", "child");
    await mkdir(skillDir, { recursive: true });
    const skillMdPath = path.join(skillDir, "SKILL.md");
    await writeFile(skillMdPath, "---\nversion: \"1.0.0\"\n---\n\n# Child\n", "utf-8");
    const skills: DiscoveredSkill[] = [
      {
        id: "child",
        name: "Child",
        version: "1.0.0",
        requires: [],
        tags: [],
        path: skillDir,
        skillMdPath,
        parentId: "parent",
      },
    ];

    const lockfile = await generateLockfile(skills, root);

    expect(lockfile.skills.child.parent).toBe("parent");
  });

  it("includes non-SKILL.md files in the closure hash", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "alpha");
    await mkdir(skillDir, { recursive: true });
    const skillMdPath = path.join(skillDir, "SKILL.md");
    const skillMd = "---\nname: alpha\ndescription: Alpha\n---\n\n# A\n";
    await writeFile(skillMdPath, skillMd, "utf-8");

    const h1 = await hashSkillClosure(skillDir);
    await mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await writeFile(path.join(skillDir, "scripts", "run.sh"), "#!/bin/sh\necho ok\n", "utf-8");
    const h2 = await hashSkillClosure(skillDir);

    expect(h1).not.toBe(h2);
  });

  it("ignores the generated skill.lock at the top of the hashed directory", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "root-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: root-skill\ndescription: T\n---\n\n# T\n", "utf-8");

    const h1 = await hashSkillClosure(skillDir);
    await writeFile(path.join(skillDir, "skill.lock"), JSON.stringify({ version: "1", skills: {} }), "utf-8");
    const h2 = await hashSkillClosure(skillDir);

    expect(h1).toBe(h2);
  });

  it("contentHash excludes nested skills/ subdirectory", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "parent");
    const subSkillDir = path.join(skillDir, "skills", "child");
    await mkdir(subSkillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: parent\ndescription: P\n---\n\n# P\n", "utf-8");
    await writeFile(path.join(subSkillDir, "SKILL.md"), "---\nname: child\ndescription: C\n---\n\n# C\n", "utf-8");

    const content1 = await hashSkillContent(skillDir);
    const closure1 = await hashSkillClosure(skillDir);

    await writeFile(path.join(subSkillDir, "SKILL.md"), "---\nname: child\ndescription: changed\n---\n\n# C\n", "utf-8");

    const content2 = await hashSkillContent(skillDir);
    const closure2 = await hashSkillClosure(skillDir);

    expect(content1).toBe(content2);
    expect(closure1).not.toBe(closure2);
  });

  it("throws when skill.lock exists but is invalid", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "skill.lock"), "{not-json", "utf-8");

    await expect(readLockfile(root)).rejects.toThrow("Invalid skill.lock");
  });

  it("rejects lockfile entries whose id does not match the skills key", async () => {
    const root = await makeRoot();
    const hash = "sha256:" + "a".repeat(64);
    await writeFile(
      path.join(root, "skill.lock"),
      JSON.stringify(
        {
          version: "1",
          skills: {
            alpha: {
              id: "wrong",
              path: "alpha",
              contentHash: hash,
              closureHash: hash,
              requires: [],
            },
          },
        },
        null,
        2
      ),
      "utf-8"
    );

    await expect(readLockfile(root)).rejects.toThrow("Invalid skill.lock");
  });

  it("rejects lockfile entries missing required fields", async () => {
    const root = await makeRoot();
    await writeFile(
      path.join(root, "skill.lock"),
      JSON.stringify({ version: "1", skills: { alpha: { id: "alpha", path: "alpha" } } }, null, 2),
      "utf-8"
    );

    await expect(readLockfile(root)).rejects.toThrow("Invalid skill.lock");
  });

  it("normalizes CRLF so the same logical text yields the same hash", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "crlf");
    await mkdir(skillDir, { recursive: true });
    const crlf = "---\r\nname: crlf\ndescription: T\r\n---\r\n\r\n# T\r\n";
    const lf = "---\nname: crlf\ndescription: T\n---\n\n# T\n";
    await writeFile(path.join(skillDir, "SKILL.md"), crlf, "utf-8");
    const h1 = await hashSkillClosure(skillDir);
    await writeFile(path.join(skillDir, "SKILL.md"), lf, "utf-8");
    const h2 = await hashSkillClosure(skillDir);
    expect(h1).toBe(h2);
  });

  it("hashes non-UTF-8 binary files without replacing bytes", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "binary");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: binary\ndescription: T\n---\n\n# T\n", "utf-8");

    await writeFile(path.join(skillDir, "asset.bin"), Buffer.from([0x80]));
    const h1 = await hashSkillClosure(skillDir);
    await writeFile(path.join(skillDir, "asset.bin"), Buffer.from([0x81]));
    const h2 = await hashSkillClosure(skillDir);

    expect(h1).not.toBe(h2);
  });

  it("does not normalize line endings in binary files that happen to be valid UTF-8", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "binary-newline");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: binary-newline\ndescription: T\n---\n\n# T\n", "utf-8");

    await writeFile(path.join(skillDir, "asset.bin"), Buffer.from([0x0d]));
    const h1 = await hashSkillClosure(skillDir);
    await writeFile(path.join(skillDir, "asset.bin"), Buffer.from([0x0a]));
    const h2 = await hashSkillClosure(skillDir);

    expect(h1).not.toBe(h2);
  });

  it.runIf(process.platform !== "win32")("includes executable bits in the content hash", async () => {
    const root = await makeRoot();
    const skillDir = path.join(root, "executable");
    const scriptPath = path.join(skillDir, "scripts", "run.sh");
    await mkdir(path.dirname(scriptPath), { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: executable\ndescription: T\n---\n\n# T\n", "utf-8");
    await writeFile(scriptPath, "#!/bin/sh\necho ok\n", "utf-8");

    await chmod(scriptPath, 0o644);
    const h1 = await hashSkillClosure(skillDir);
    await chmod(scriptPath, 0o755);
    const h2 = await hashSkillClosure(skillDir);

    expect(h1).not.toBe(h2);
  });

  it("matches the committed hello example hash (cross-platform stable)", async () => {
    const helloDir = path.join(fileURLToPath(import.meta.url), "../../../examples/basic/skills/hello");
    const hash = await hashSkillClosure(helloDir);
    expect(hash).toBe("sha256:6a6b1c94891a6d40014c90d2307ad025c13d91415a0b9553506c75bbf2927b06");
  });
});
