/**
 * Content data module — single source of truth for all project/category data.
 *
 * Loads JSON at module load time (build time for SSG pages), validates via zod,
 * and fails with a human-readable error if any data is malformed or referentially
 * inconsistent. Both /classic (server component) and <City> (client) import from
 * here — scene never sees raw JSON.
 */

import projectsRaw from "@/data/projects.json";
import categoriesRaw from "@/data/categories.json";
import {
  ProjectsSchema,
  CategoriesSchema,
} from "./schema";
import type { Project, Category, CategoryGroup } from "./types";

// ---------------------------------------------------------------------------
// Parse + validate at module load — build fails here if data is malformed
// ---------------------------------------------------------------------------

function parseWithContext<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
  filename: string
): T {
  try {
    return schema.parse(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown validation error";
    throw new Error(`[content] Validation failed for ${filename}:\n${message}`);
  }
}

const categories: Category[] = parseWithContext(
  CategoriesSchema,
  categoriesRaw,
  "categories.json"
);

const projects: Project[] = parseWithContext(
  ProjectsSchema,
  projectsRaw,
  "projects.json"
);

// ---------------------------------------------------------------------------
// Referential integrity check: every project.categoryId must exist
// ---------------------------------------------------------------------------

const categoryIds = new Set(categories.map((c) => c.id));

for (const project of projects) {
  if (!categoryIds.has(project.categoryId)) {
    throw new Error(
      `[content] Project "${project.id}" references categoryId "${project.categoryId}" which does not exist in categories.json`
    );
  }
}

// ---------------------------------------------------------------------------
// Derived data functions
// ---------------------------------------------------------------------------

/**
 * Returns the top 5 projects sorted by roi.amountUsd DESC.
 * Tiebreaker: featured=true projects rank before featured=false,
 * then alphabetical by name for full determinism.
 */
export function getTop5(projectList: Project[] = projects): Project[] {
  const sorted = [...projectList].sort((a, b) => {
    // Primary: roi.amountUsd DESC
    const roiDiff = b.roi.amountUsd - a.roi.amountUsd;
    if (roiDiff !== 0) return roiDiff;
    // Tiebreaker 1: featured=true first
    const aFeatured = a.featured === true ? 0 : 1;
    const bFeatured = b.featured === true ? 0 : 1;
    if (aFeatured !== bFeatured) return aFeatured - bFeatured;
    // Tiebreaker 2: alphabetical by name (deterministic)
    return a.name.localeCompare(b.name);
  });

  return sorted.slice(0, 5);
}

/**
 * Returns all projects, grouped by category, preserving category order.
 * If categoryId is provided, returns only that group (empty array if no match).
 */
export function getByCategory(categoryId?: string): CategoryGroup[] {
  const sortedCategories = [...categories].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999)
  );

  const filtered = categoryId
    ? sortedCategories.filter((c) => c.id === categoryId)
    : sortedCategories;

  return filtered.map((category) => ({
    category,
    projects: projects.filter((p) => p.categoryId === category.id),
  }));
}

/**
 * Returns all validated projects.
 */
export function getAllProjects(): Project[] {
  return [...projects];
}

/**
 * Returns all validated categories.
 */
export function getAllCategories(): Category[] {
  return [...categories];
}
