import { suggestRequires } from "../core/suggest-requires.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface SuggestRequiresOptions {
  root?: string;
  json?: boolean;
}

export async function suggestRequiresCommand(options: SuggestRequiresOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const results = await suggestRequires(root);

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const withSuggestions = results.filter((r) => r.suggestions.length > 0);

  if (withSuggestions.length === 0) {
    console.log("No missing requires suggestions found.");
    return;
  }

  const lines: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (i > 0) lines.push("");
    lines.push(result.skillId);
    if (result.suggestions.length === 0) {
      lines.push("  (no missing requires found)");
    } else {
      // Align arrows
      const maxDepLen = Math.max(...result.suggestions.map((s) => s.depId.length));
      for (const { depId, foundIn } of result.suggestions) {
        lines.push(`  → ${depId.padEnd(maxDepLen)}  (referenced in ${foundIn})`);
      }
    }
  }
  console.log(lines.join("\n"));
}
