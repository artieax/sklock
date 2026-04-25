import { z } from "zod";

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  requires: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export type Skill = z.infer<typeof SkillSchema>;
