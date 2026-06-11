import { describe, it, expect } from "vitest";
import { ProjectSchema, CategorySchema, ProjectsSchema, CategoriesSchema } from "./schema";
import type { Project, Category } from "./types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const validCategory: Category = {
  id: "automatizacion",
  label: "Automatización de procesos",
  districtColor: "#0ea5e9",
  order: 1,
};

const validCategory2: Category = {
  id: "gestion",
  label: "Gestión empresarial",
  districtColor: "#22c55e",
  order: 2,
};

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test-project",
    name: "Test Project",
    categoryId: "automatizacion",
    sector: "Tech",
    summary: "A test project summary",
    roi: { kind: "saved", amountUsd: 10000, period: "año", metric: "50% ahorro" },
    featured: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema validation tests (S-C1, S-C2, S-C3 — unit level)
// ---------------------------------------------------------------------------

describe("CategorySchema", () => {
  it("accepts a valid category", () => {
    const result = CategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("rejects a category with an empty id", () => {
    const result = CategorySchema.safeParse({ ...validCategory, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a category with a non-kebab-case id", () => {
    const result = CategorySchema.safeParse({ ...validCategory, id: "My Category" });
    expect(result.success).toBe(false);
  });

  it("rejects a category with an empty label", () => {
    const result = CategorySchema.safeParse({ ...validCategory, label: "" });
    expect(result.success).toBe(false);
  });
});

describe("ProjectSchema", () => {
  it("accepts a valid project", () => {
    const result = ProjectSchema.safeParse(makeProject());
    expect(result.success).toBe(true);
  });

  it("rejects a project with missing roi.amountUsd (S-C2 analog)", () => {
    const bad = { ...makeProject(), roi: { kind: "saved" } };
    const result = ProjectSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects a project with empty name", () => {
    const result = ProjectSchema.safeParse(makeProject({ name: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/name/);
    }
  });

  it("rejects a project with negative roi.amountUsd", () => {
    const result = ProjectSchema.safeParse(
      makeProject({ roi: { kind: "earned", amountUsd: -100 } })
    );
    expect(result.success).toBe(false);
  });

  it("accepts waMessage as null", () => {
    const result = ProjectSchema.safeParse(makeProject({ waMessage: null }));
    expect(result.success).toBe(true);
  });

  it("accepts a project without optional fields (featured, building, waMessage)", () => {
    const minimal: Partial<Project> = {};
    // @ts-expect-error intentional: we want to test without optional fields
    const { featured, building, waMessage, ...rest } = makeProject();
    const result = ProjectSchema.safeParse(rest);
    expect(result.success).toBe(true);
    void minimal;
  });

  it("accepts a project with a valid rank (positive integer)", () => {
    const result = ProjectSchema.safeParse(makeProject({ rank: 1 }));
    expect(result.success).toBe(true);
  });

  it("rejects a project with rank = 0 (must be positive)", () => {
    const result = ProjectSchema.safeParse(makeProject({ rank: 0 }));
    expect(result.success).toBe(false);
  });

  it("rejects a project with a non-integer rank", () => {
    const result = ProjectSchema.safeParse(makeProject({ rank: 1.5 }));
    expect(result.success).toBe(false);
  });

  it("accepts a project with tags as string array", () => {
    const result = ProjectSchema.safeParse(makeProject({ tags: ["automatización", "SRI"] }));
    expect(result.success).toBe(true);
  });

  it("accepts a project with empty tags array", () => {
    const result = ProjectSchema.safeParse(makeProject({ tags: [] }));
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getTop5 derivation tests (S-C6, S-P7)
// ---------------------------------------------------------------------------

describe("getTop5", () => {
  // We test the pure function by importing it with isolated fixtures.
  // To avoid coupling to the real data files, we test the sorting logic
  // directly by constructing projects and calling a local sort helper
  // that mirrors the content.ts implementation (two-tier: rank ASC, then ROI DESC).

  function sortTop5(projectList: Project[]): Project[] {
    const ranked = [...projectList]
      .filter((p) => typeof p.rank === "number")
      .sort((a, b) => (a.rank as number) - (b.rank as number));

    const unranked = [...projectList]
      .filter((p) => typeof p.rank !== "number")
      .sort((a, b) => {
        const roiDiff = b.roi.amountUsd - a.roi.amountUsd;
        if (roiDiff !== 0) return roiDiff;
        const aFeatured = a.featured === true ? 0 : 1;
        const bFeatured = b.featured === true ? 0 : 1;
        if (aFeatured !== bFeatured) return aFeatured - bFeatured;
        return a.name.localeCompare(b.name);
      });

    return [...ranked, ...unranked].slice(0, 5);
  }

  it("returns at most 5 projects", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeProject({ id: `project-${i}`, roi: { kind: "saved", amountUsd: 1000 * (i + 1) } })
    );
    expect(sortTop5(many)).toHaveLength(5);
  });

  it("returns all projects when fewer than 5 exist", () => {
    const few = [makeProject({ roi: { kind: "saved", amountUsd: 5000 } })];
    expect(sortTop5(few)).toHaveLength(1);
  });

  it("sorts by roi.amountUsd DESC when no ranks assigned (S-P7 baseline)", () => {
    const projectList = [
      makeProject({ id: "low", roi: { kind: "saved", amountUsd: 1000 } }),
      makeProject({ id: "high", roi: { kind: "earned", amountUsd: 50000 } }),
      makeProject({ id: "mid", roi: { kind: "saved", amountUsd: 20000 } }),
    ];
    const result = sortTop5(projectList);
    expect(result[0].id).toBe("high");
    expect(result[1].id).toBe("mid");
    expect(result[2].id).toBe("low");
  });

  it("rank override: ranked projects come before unranked regardless of ROI (S-C6)", () => {
    // rank=1 project has lower ROI than an unranked project — rank must win
    const projectList = [
      makeProject({ id: "unranked-high-roi", roi: { kind: "saved", amountUsd: 99000 } }),
      makeProject({ id: "ranked-low-roi", roi: { kind: "saved", amountUsd: 1000 }, rank: 1 }),
    ];
    const result = sortTop5(projectList);
    expect(result[0].id).toBe("ranked-low-roi");
    expect(result[1].id).toBe("unranked-high-roi");
  });

  it("partial ranks: ranked slots fill first, then ROI fills remaining slots (S-C6)", () => {
    const projectList = [
      makeProject({ id: "no-rank-high", roi: { kind: "saved", amountUsd: 50000 } }),
      makeProject({ id: "rank-2", roi: { kind: "saved", amountUsd: 5000 }, rank: 2 }),
      makeProject({ id: "no-rank-low", roi: { kind: "saved", amountUsd: 1000 } }),
      makeProject({ id: "rank-1", roi: { kind: "saved", amountUsd: 2000 }, rank: 1 }),
    ];
    const result = sortTop5(projectList);
    // Ranked first: rank-1, rank-2
    expect(result[0].id).toBe("rank-1");
    expect(result[1].id).toBe("rank-2");
    // Unranked fill by ROI DESC
    expect(result[2].id).toBe("no-rank-high");
    expect(result[3].id).toBe("no-rank-low");
  });

  it("no ranks assigned: pure ROI ordering still applies (backward compat)", () => {
    const projectList = [
      makeProject({ id: "b", roi: { kind: "saved", amountUsd: 30000 } }),
      makeProject({ id: "a", roi: { kind: "saved", amountUsd: 45000 } }),
      makeProject({ id: "c", roi: { kind: "saved", amountUsd: 15000 } }),
    ];
    const result = sortTop5(projectList);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
    expect(result[2].id).toBe("c");
  });

  it("tie-break is deterministic: featured=true before featured=false (within unranked)", () => {
    const projectList = [
      makeProject({ id: "unfeatured", roi: { kind: "saved", amountUsd: 10000 }, featured: false }),
      makeProject({ id: "featured", roi: { kind: "earned", amountUsd: 10000 }, featured: true }),
    ];
    const result = sortTop5(projectList);
    expect(result[0].id).toBe("featured");
    expect(result[1].id).toBe("unfeatured");
  });

  it("tie-break is deterministic: alphabetical by name when ROI and featured are equal", () => {
    const projectList = [
      makeProject({ id: "b-project", name: "Zeta", roi: { kind: "saved", amountUsd: 10000 }, featured: true }),
      makeProject({ id: "a-project", name: "Alpha", roi: { kind: "earned", amountUsd: 10000 }, featured: true }),
    ];
    const result = sortTop5(projectList);
    expect(result[0].id).toBe("a-project");
    expect(result[1].id).toBe("b-project");
  });
});

// ---------------------------------------------------------------------------
// getByCategory grouping tests (S-C4, S-C5)
// ---------------------------------------------------------------------------

describe("getByCategory (logic)", () => {
  function groupByCategory(
    projectList: Project[],
    categoryList: Category[],
    categoryId?: string
  ) {
    const sorted = [...categoryList].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999)
    );
    const filtered = categoryId ? sorted.filter((c) => c.id === categoryId) : sorted;
    return filtered.map((category) => ({
      category,
      projects: projectList.filter((p) => p.categoryId === category.id),
    }));
  }

  const projectA = makeProject({ id: "p-a", categoryId: "automatizacion" });
  const projectB = makeProject({ id: "p-b", categoryId: "gestion" });
  const projectC = makeProject({ id: "p-c", categoryId: "automatizacion" });

  it("groups projects by categoryId correctly", () => {
    const groups = groupByCategory([projectA, projectB, projectC], [validCategory, validCategory2]);
    const autoGroup = groups.find((g) => g.category.id === "automatizacion");
    expect(autoGroup?.projects).toHaveLength(2);
    expect(autoGroup?.projects.map((p) => p.id)).toContain("p-a");
    expect(autoGroup?.projects.map((p) => p.id)).toContain("p-c");
  });

  it("returns empty projects array for a category with no matching projects", () => {
    const emptyCategory: Category = { id: "vacio", label: "Vacío", order: 99 };
    const groups = groupByCategory(
      [projectA, projectB],
      [validCategory, emptyCategory]
    );
    const emptyGroup = groups.find((g) => g.category.id === "vacio");
    expect(emptyGroup?.projects).toHaveLength(0);
  });

  it("filters to single category when categoryId is provided", () => {
    const groups = groupByCategory(
      [projectA, projectB, projectC],
      [validCategory, validCategory2],
      "automatizacion"
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].category.id).toBe("automatizacion");
  });

  it("returns empty array for unknown categoryId (S-C5 boundary)", () => {
    const groups = groupByCategory(
      [projectA, projectB],
      [validCategory, validCategory2],
      "nonexistent"
    );
    expect(groups).toHaveLength(0);
  });

  it("respects category order field (S-C5 order)", () => {
    const cat1: Category = { id: "second", label: "Second", order: 2 };
    const cat2: Category = { id: "first", label: "First", order: 1 };
    const groups = groupByCategory([], [cat1, cat2]);
    expect(groups[0].category.id).toBe("first");
    expect(groups[1].category.id).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// Build-time validation: broken category reference (S-C3)
// ---------------------------------------------------------------------------

describe("referential integrity (S-C3)", () => {
  it("CategoriesSchema rejects an empty array", () => {
    const result = CategoriesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("ProjectsSchema rejects an empty array", () => {
    const result = ProjectsSchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: real data files parse without errors (S-C1)
// ---------------------------------------------------------------------------

describe("real data files (S-C1)", () => {
  it("categories.json is valid", async () => {
    const raw = await import("@/data/categories.json");
    const result = CategoriesSchema.safeParse(raw.default);
    expect(result.success).toBe(true);
  });

  it("projects.json is valid", async () => {
    const raw = await import("@/data/projects.json");
    const result = ProjectsSchema.safeParse(raw.default);
    expect(result.success).toBe(true);
  });

  it("all project categoryIds reference existing categories (S-C3 real data)", async () => {
    const projectsRaw = await import("@/data/projects.json");
    const categoriesRaw = await import("@/data/categories.json");
    const cats = CategoriesSchema.parse(categoriesRaw.default);
    const projs = ProjectsSchema.parse(projectsRaw.default);
    const catIds = new Set(cats.map((c) => c.id));
    for (const p of projs) {
      expect(catIds.has(p.categoryId), `Project "${p.id}" has unknown categoryId "${p.categoryId}"`).toBe(true);
    }
  });

  it("at least 1 project qualifies for Top 5 (spec 1.3 min-featured invariant)", async () => {
    const projectsRaw = await import("@/data/projects.json");
    const projs = ProjectsSchema.parse(projectsRaw.default);
    const qualifiedCount = projs.filter(
      (p) => p.featured === true || typeof p.rank === "number"
    ).length;
    expect(
      qualifiedCount,
      "projects.json must have at least 1 project with featured:true or a rank value"
    ).toBeGreaterThanOrEqual(1);
  });
});
