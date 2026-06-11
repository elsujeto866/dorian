import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Top5List from "./Top5List";
import type { Project } from "@/lib/content/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-a",
    name: "Project A",
    categoryId: "automatizacion",
    sector: "Tech",
    summary: "A summary",
    roi: { kind: "saved", amountUsd: 10000, period: "año", metric: "50% ahorro" },
    featured: false,
    ...overrides,
  };
}

const projects: Project[] = [
  makeProject({ id: "p1", name: "Proyecto Uno", roi: { kind: "saved", amountUsd: 48000, period: "año", metric: "90% menos tiempo" } }),
  makeProject({ id: "p2", name: "Proyecto Dos", roi: { kind: "saved", amountUsd: 36000, period: "año", metric: "70% reducción" } }),
  makeProject({ id: "p3", name: "Proyecto Tres", roi: { kind: "earned", amountUsd: 28000, period: "año", metric: "40% más ingresos" } }),
  makeProject({ id: "p4", name: "Proyecto Cuatro", roi: { kind: "saved", amountUsd: 22000, period: "año", metric: "60% menos tiempo" } }),
  makeProject({ id: "p5", name: "Proyecto Cinco", roi: { kind: "saved", amountUsd: 18500, period: "año", metric: "50% menos multas" } }),
];

// ---------------------------------------------------------------------------
// S-P7: Top 5 rendered in ROI order
// ---------------------------------------------------------------------------

describe("Top5List", () => {
  it("renders an ordered list (ol)", () => {
    render(<Top5List projects={projects} />);
    const list = screen.getByRole("list", { name: /Top 5 proyectos/i });
    expect(list.tagName).toBe("OL");
  });

  it("renders exactly the projects passed (S-P7 content)", () => {
    render(<Top5List projects={projects} />);
    for (const p of projects) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    }
  });

  it("renders projects in the order passed — first project gets rank 1 (S-P7)", () => {
    render(<Top5List projects={projects} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    // Rank badge is the first element inside each li
    const firstBadge = items[0].querySelector('[aria-hidden="true"]');
    expect(firstBadge?.textContent).toBe("1");
    const lastBadge = items[4].querySelector('[aria-hidden="true"]');
    expect(lastBadge?.textContent).toBe("5");
  });

  it("renders the ROI metric label for each project", () => {
    render(<Top5List projects={projects} />);
    expect(screen.getByText("90% menos tiempo")).toBeInTheDocument();
    expect(screen.getByText("70% reducción")).toBeInTheDocument();
  });

  it("renders sector for each project", () => {
    render(<Top5List projects={projects} />);
    const techItems = screen.getAllByText("Tech");
    expect(techItems.length).toBeGreaterThanOrEqual(1);
  });

  it("has a visible section heading", () => {
    render(<Top5List projects={projects} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders tag chips when a project has tags", () => {
    const withTags = [
      makeProject({ id: "tagged", name: "Tagged Project", tags: ["automatización", "SRI"] }),
    ];
    render(<Top5List projects={withTags} />);
    expect(screen.getByText("automatización")).toBeInTheDocument();
    expect(screen.getByText("SRI")).toBeInTheDocument();
  });

  it("renders no tag chips when projects have no tags", () => {
    render(<Top5List projects={projects} />);
    // Fixture projects have no tags — no tag chip text should appear
    expect(screen.queryByText("automatización")).toBeNull();
  });
});
