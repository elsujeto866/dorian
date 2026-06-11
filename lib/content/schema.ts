import { z } from "zod";

// ---------------------------------------------------------------------------
// Category schema
// ---------------------------------------------------------------------------

export const CategorySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "id must be kebab-case",
    }),
  label: z.string().min(1, { message: "label must not be empty" }),
  districtColor: z.string().optional(),
  order: z.number().int().optional(),
});

export const CategoriesSchema = z.array(CategorySchema).min(1, {
  message: "categories.json must contain at least one entry",
});

// ---------------------------------------------------------------------------
// Project ROI schema
// ---------------------------------------------------------------------------

export const RoiSchema = z.object({
  kind: z.enum(["earned", "saved"]),
  amountUsd: z
    .number()
    .positive({ message: "roi.amountUsd must be a positive number" }),
  period: z.string().optional(),
  metric: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Project building hints (optional)
// ---------------------------------------------------------------------------

export const BuildingHintSchema = z
  .object({
    model: z.string().optional(),
    districtSlot: z.number().int().optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Project schema
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "id must be kebab-case",
    }),
  name: z.string().min(1, { message: "name must not be empty" }),
  categoryId: z.string().min(1, { message: "categoryId must not be empty" }),
  sector: z.string().min(1, { message: "sector must not be empty" }),
  summary: z.string().min(1, { message: "summary must not be empty" }),
  roi: RoiSchema,
  featured: z.boolean().optional(),
  rank: z
    .number()
    .int()
    .positive({ message: "rank must be a positive integer" })
    .optional(),
  tags: z.array(z.string()).optional(),
  building: BuildingHintSchema,
  waMessage: z.string().nullable().optional(),
});

export const ProjectsSchema = z.array(ProjectSchema).min(1, {
  message: "projects.json must contain at least one entry",
});
