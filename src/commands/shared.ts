import path from "path";

export function resolveWorkspaceRoot(root?: string): string {
  if (root) return path.resolve(root);
  const cwd = process.cwd();
  if (path.basename(cwd) === "skills") return cwd;
  return path.join(cwd, "skills");
}
