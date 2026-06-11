import type { z } from "zod";
import type {
  CategorySchema,
  ProjectSchema,
  RoiSchema,
} from "./schema";

// Infer TypeScript types from zod schemas — single source of truth.
export type Category = z.infer<typeof CategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Roi = z.infer<typeof RoiSchema>;

// Convenience type for grouped projects by category
export interface CategoryGroup {
  category: Category;
  projects: Project[];
}
