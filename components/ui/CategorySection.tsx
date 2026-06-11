import type { CategoryGroup } from "@/lib/content/types";
import ProjectCard from "./ProjectCard";

interface CategorySectionProps {
  groups: CategoryGroup[];
}

/**
 * Renders all projects grouped by category.
 * Used in /classic section 2.1 (item 4).
 */
export default function CategorySection({ groups }: CategorySectionProps) {
  return (
    <section
      aria-labelledby="categories-heading"
      className="py-16 px-6 bg-white"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="categories-heading"
          className="text-3xl font-bold text-slate-900 mb-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
        >
          Proyectos por área
        </h2>
        <p className="text-slate-500 mb-10 text-sm">
          Cada proyecto, con su historia y resultado.
        </p>

        <div className="flex flex-col gap-14">
          {groups.map(({ category, projects }) => (
            <div key={category.id}>
              {/* Category label with color accent */}
              <div className="flex items-center gap-3 mb-6">
                {category.districtColor && (
                  <span
                    className="inline-block w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: category.districtColor }}
                    aria-hidden="true"
                  />
                )}
                <h3
                  className="text-lg font-bold text-slate-900"
                  id={`category-${category.id}`}
                >
                  {category.label}
                </h3>
              </div>

              {projects.length === 0 ? (
                <p className="text-slate-400 text-sm italic">
                  Sin proyectos en esta categoría todavía.
                </p>
              ) : (
                <ul
                  aria-labelledby={`category-${category.id}`}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {projects.map((project) => (
                    <li key={project.id}>
                      <ProjectCard project={project} category={category} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
