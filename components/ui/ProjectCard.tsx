import type { Project, Category } from "@/lib/content/types";
import { buildProjectWhatsAppHref } from "./WhatsAppCTA";

interface ProjectCardProps {
  project: Project;
  category?: Category;
}

/**
 * Card showing a single project's summary, ROI metric, sector, and tags.
 * Used in the "by-category" section of /classic.
 */
export default function ProjectCard({ project, category }: ProjectCardProps) {
  const waHref = buildProjectWhatsAppHref(project);
  const roiLabel = project.roi.metric ?? `$${project.roi.amountUsd.toLocaleString("es-EC")} USD/${project.roi.period ?? "año"}`;

  return (
    <article
      aria-label={`Proyecto: ${project.name}`}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
    >
      {/* Category color accent */}
      {category?.districtColor && (
        <div
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: category.districtColor }}
          aria-hidden="true"
        />
      )}

      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 mb-1">{project.name}</h3>
        <p className="text-sm text-slate-500 mb-3">{project.sector}</p>
        <p className="text-sm text-slate-700 leading-relaxed">{project.summary}</p>
      </div>

      {/* ROI metric chip + tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-block bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-3 py-1 text-xs font-semibold"
          aria-label={`ROI: ${roiLabel}`}
        >
          {roiLabel}
        </span>
        {project.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-block bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 text-xs"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Per-project WhatsApp link */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Hablar sobre ${project.name} por WhatsApp`}
          className="
            self-start inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px]
            text-sm font-semibold text-[#25D366] hover:text-[#1ebe5d]
            focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-1 rounded
            transition-colors
          "
        >
          Hablemos de este proyecto →
        </a>
      )}
    </article>
  );
}
