import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectCard from "./ProjectCard";
import type { Project, Category } from "@/lib/content/types";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WA_NUMBER;
});

const project: Project = {
  id: "emision-polizas",
  name: "Sistema de emisión de pólizas",
  categoryId: "automatizacion",
  sector: "Seguros",
  summary: "Automatización del proceso de emisión de pólizas para una aseguradora.",
  roi: { kind: "saved", amountUsd: 48000, period: "año", metric: "90% menos tiempo de emisión" },
  featured: true,
  waMessage: "Hola, me interesa automatizar la emisión de documentos.",
};

const category: Category = {
  id: "automatizacion",
  label: "Automatización de procesos",
  districtColor: "#0ea5e9",
  order: 1,
};

describe("ProjectCard", () => {
  it("renders the project name", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Sistema de emisión de pólizas")).toBeInTheDocument();
  });

  it("renders the project summary", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText(/Automatización del proceso/i)).toBeInTheDocument();
  });

  it("renders the ROI metric label", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("90% menos tiempo de emisión")).toBeInTheDocument();
  });

  it("renders the sector", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Seguros")).toBeInTheDocument();
  });

  it("renders a per-project WhatsApp link when env is set and waMessage is set", () => {
    process.env.NEXT_PUBLIC_WA_NUMBER = "593987654321";
    render(<ProjectCard project={project} category={category} />);
    const link = screen.getByRole("link", { name: /Hablar sobre/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(link).toHaveAttribute("href", expect.stringContaining(encodeURIComponent(project.waMessage!)));
  });

  it("does not render WhatsApp link when env is unset", () => {
    delete process.env.NEXT_PUBLIC_WA_NUMBER;
    render(<ProjectCard project={project} category={category} />);
    expect(screen.queryByRole("link", { name: /Hablar sobre/i })).toBeNull();
  });

  it("renders a color accent div when category has districtColor", () => {
    render(<ProjectCard project={project} category={category} />);
    const accent = document.querySelector('[aria-hidden="true"]');
    expect(accent).toBeInTheDocument();
    expect((accent as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it("uses roi.metric when present in ROI chip", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("90% menos tiempo de emisión")).toBeInTheDocument();
  });

  it("falls back to USD amount when roi.metric is absent", () => {
    const projectNoMetric: Project = {
      ...project,
      roi: { kind: "saved", amountUsd: 12000, period: "año" },
    };
    render(<ProjectCard project={projectNoMetric} />);
    // Should render a formatted USD string
    expect(screen.getByText(/12\.000.*USD/)).toBeInTheDocument();
  });
});
