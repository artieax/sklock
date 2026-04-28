import { z } from "zod";

const SkillNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase kebab-case");

const versionField = z.preprocess(
  (v) => (v === undefined || v === null ? undefined : String(v)),
  z
    .string()
    .regex(
      /^\d+\.\d+(\.\d+)?([.+~-]?[a-zA-Z0-9.-]*)?$/,
      "Must look like a simple version (e.g. 1.2.3)"
    )
    .optional()
);

function applyIdCheck<T extends { id?: string | undefined; name: string }>(
  skill: T,
  ctx: z.RefinementCtx
): void {
  if (skill.id && skill.id !== skill.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["id"],
      message: "Deprecated id field must match name",
    });
  }
}

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: SkillNameSchema,
  description: z.string().min(1).max(1024).optional(),
  license: z.string().optional(),
  compatibility: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  "allowed-tools": z.string().optional(),

  // sklock extensions. Keep these top-level for existing workspaces while the
  // core Agent Skills fields stay spec-compatible.
  version: versionField,
  author: z.string().optional(),
  requires: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
})
  // Agent Skills base + Claude Code / ecosystem extension fields (hooks, context, …)
  .passthrough()
  .superRefine(applyIdCheck);

export type Skill = z.infer<typeof SkillSchema>;

/**
 * Agent Skills spec-compliant schema.
 * description is required; metadata values must be strings.
 * Use with --strict validation mode.
 */
export const SkillStrictSchema = z.object({
  id: z.string().optional(),
  name: SkillNameSchema,
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  "allowed-tools": z.string().optional(),
  version: versionField,
  author: z.string().optional(),
  requires: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
})
  .passthrough()
  .superRefine(applyIdCheck);
