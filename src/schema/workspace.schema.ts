import { z } from "zod";

export const WorkspaceSchema = z.object({
  version: z.string().default("1"),
  name: z.string().optional(),
  description: z.string().optional(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
