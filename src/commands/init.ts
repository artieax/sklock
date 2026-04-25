import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { stringify } from "yaml";

interface InitOptions {
  root?: string;
  example?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const root = options.root ?? resolveRoot();

  try {
    await access(root);
  } catch {
    await mkdir(root, { recursive: true });
    console.log(`Created ${root}`);
  }

  const workspacePath = path.join(root, "skill-workspace.yml");
  try {
    await access(workspacePath);
    console.log("skill-workspace.yml already exists");
  } catch {
    await writeFile(
      workspacePath,
      stringify({ version: "1", name: "my-skills" }),
      "utf-8"
    );
    console.log(`Created ${workspacePath}`);
  }

  if (options.example) {
    const exampleDir = path.join(root, "hello");
    await mkdir(exampleDir, { recursive: true });
    await writeFile(
      path.join(exampleDir, "skill.yml"),
      stringify({ id: "hello", name: "Hello Skill", description: "A sample skill", requires: [] }),
      "utf-8"
    );
    await writeFile(
      path.join(exampleDir, "SKILL.md"),
      "# Hello Skill\n\nA sample skill.\n",
      "utf-8"
    );
    console.log(`Created example skill at ${exampleDir}`);
  }

  console.log("\nNext steps:");
  console.log("  sklock validate");
  console.log("  sklock lock");
  console.log("  sklock graph --mermaid");
}

function resolveRoot(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "skills") return cwd;
  return path.join(cwd, "skills");
}
