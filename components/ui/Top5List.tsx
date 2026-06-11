import type { Project } from "@/lib/content/types";

interface Top5ListProps {
  projects: Project[];
}

/**
 * Ordered list of the top 5 projects by ROI.
 * Rendered in /classic section 2.1 (item 3).
 * Order comes from getTop5() in the content layer — S-P7.
 */
export default function Top5List({ projects }: Top5ListProps) {
  return (
    <section aria-labelledby="top5-heading" className="py-16 px-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h2
          id="top5-heading"
          className="text-3xl font-bold text-slate-900 mb-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
        >
          Top 5 proyectos por retorno de inversión
        </h2>
        <p className="text-slate-500 mb-10 text-sm">
          Ordenados de mayor a menor impacto económico comprobado.
        </p>

        <ol className="flex flex-col gap-4" aria-label="Top 5 proyectos por ROI">
          {projects.map((project, index) => {
            const roiLabel =
              project.roi.metric ??
              `$${project.roi.amountUsd.toLocaleString("es-EC")} USD/${project.roi.period ?? "año"}`;

            return (
              <li
                key={project.id}
                className="
                  flex items-start gap-5 bg-white rounded-xl border border-slate-200
                  px-6 py-5 shadow-sm
                "
              >
                {/* Rank badge — min 44×44 for tap target */}
                <span
                  aria-hidden="true"
                  className="
                    flex-shrink-0 flex items-center justify-center
                    w-11 h-11 rounded-full bg-slate-900 text-white
                    font-extrabold text-lg
                  "
                >
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-base leading-snug">
                    {project.name}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5">{project.sector}</p>
                  <p
                    className="
                      mt-2 inline-block bg-sky-50 text-sky-700
                      border border-sky-200 rounded-full px-3 py-0.5
                      text-xs font-semibold
                    "
                    aria-label={`ROI: ${roiLabel}`}
                  >
                    {roiLabel}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
