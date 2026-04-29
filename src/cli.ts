#!/usr/bin/env node

import { cac, type CAC } from "cac";
import { readFileSync, realpathSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { validateCommand } from "./commands/validate.js";
import { lockCommand } from "./commands/lock.js";
import { checkCommand } from "./commands/check.js";
import { treeCommand } from "./commands/tree.js";
import { graphCommand } from "./commands/graph.js";
import { whyCommand } from "./commands/why.js";
import { explainCommand } from "./commands/explain.js";
import { exportCommand } from "./commands/export.js";
import { lintCommand, DEFAULT_MAX_LINES } from "./commands/lint.js";
import { addCommand } from "./commands/add.js";
import { doctorCommand } from "./commands/doctor.js";
import { inferCommand } from "./commands/infer.js";
import { runCommand } from "./commands/shared.js";

function readPackageVersion(): string {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.resolve(cliDir, "../package.json");
  const raw = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: unknown };
  if (typeof raw.version !== "string") {
    throw new Error(`Missing package version in ${packageJsonPath}`);
  }
  return raw.version;
}

export function isCliEntryPoint(importMetaUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(path.resolve(argv1));
  } catch {
    return pathToFileURL(path.resolve(argv1)).href === importMetaUrl;
  }
}

/** Configured CLI instance (parse with `cli.parse(process.argv)`). */
export function createSklockCli(): CAC {
  const cli = cac("sklock");

  cli
    .command("init", "Initialize a skills workspace")
    .option("--root <path>", "Path to skills directory")
    .option("--example", "Include example skill")
    .option("--no-infer", "Skip automatic dependency inference for existing skills")
    .action((options) => {
      runCommand(() => initCommand(options));
    });

  cli
    .command("scan", "Scan and list all discovered skills")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .action((options) => {
      runCommand(() => scanCommand(options));
    });

  cli
    .command("validate", "Validate the skills workspace")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .option("--verbose", "Verbose output")
    .option("--quiet", "Suppress output")
    .option("--strict", "Enforce Agent Skills spec compliance (description required, metadata string values)")
    .action((options) => {
      runCommand(() => validateCommand(options));
    });

  cli
    .command("lock", "Generate skills/skill.lock")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .action((options) => {
      runCommand(() => lockCommand(options));
    });

  cli
    .command("check", "Check lockfile is up to date")
    .option("--root <path>", "Path to skills directory")
    .option(
      "--frozen",
      "Exit with an error if skill.lock is out of date (default: warn only; use in CI)"
    )
    .option("--json", "Output as JSON")
    .action((options) => {
      runCommand(() => checkCommand(options));
    });

  cli
    .command("tree", "Display skills as a tree")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .action((options) => {
      runCommand(() => treeCommand(options));
    });

  cli
    .command("graph", "Render the skill dependency graph")
    .option("--root <path>", "Path to skills directory")
    .option("--mermaid", "Render as Mermaid diagram")
    .option("--format <format>", "Output format")
    .option("--json", "Output as JSON")
    .option("--mode <mode>", "Graph mode: deps (default), containment, or both")
    .action((options) => {
      runCommand(() => graphCommand(options));
    });

  cli
    .command("why <skill-id>", "Explain why a skill is included")
    .option("--root <path>", "Path to skills directory")
    .action((skillId, options) => {
      runCommand(() => whyCommand(skillId, options));
    });

  cli
    .command("explain <skill-id>", "Show details about a skill")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .action((skillId, options) => {
      runCommand(() => explainCommand(skillId, options));
    });

  cli
    .command("export", "Export skill graph data")
    .option("--root <path>", "Path to skills directory")
    .option("--output <path>", "Output file path")
    .option("--format <format>", "Output format (json|yaml|mermaid)")
    .option(
      "--wrap",
      "Wrap mermaid output in a fenced code block (updates existing block in-place when --output is used)"
    )
    .action((options) => {
      runCommand(() => exportCommand(options));
    });

  cli
    .command("lint", "Lint all skills for quality issues")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .option("--quiet", "Suppress per-skill output")
    .option(
      "--max-lines <n>",
      `SKILL.md line count that triggers a split warning (default: ${DEFAULT_MAX_LINES})`,
      { default: DEFAULT_MAX_LINES }
    )
    .action((options) => {
      runCommand(() => lintCommand(options));
    });

  cli
    .command("add <skill-id>", "Add a dependency to a skill")
    .option("--root <path>", "Path to skills directory")
    .option("--dep <skill-id>", "Dependency skill ID to add to requires[]")
    .action((skillId, options) => {
      runCommand(() => addCommand(skillId, options));
    });

  cli
    .command("doctor", "Run a full workspace health check")
    .option("--root <path>", "Path to skills directory")
    .option("--json", "Output as JSON")
    .action((options) => {
      runCommand(() => doctorCommand(options));
    });

  cli
    .command("infer", "Infer requires[] from file cross-references (static analysis)")
    .option("--root <path>", "Path to skills directory")
    .option("--apply", "Write inferred dependencies to SKILL.md files and regenerate skill.lock")
    .option("--quiet", "Suppress progress output")
    .action((options) => {
      runCommand(() => inferCommand(options).then(() => undefined));
    });

  cli.help();
  cli.version(readPackageVersion());
  return cli;
}

if (isCliEntryPoint(import.meta.url, process.argv[1])) {
  createSklockCli().parse();
}
