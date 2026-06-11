import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dorian — Portfolio interactivo | Ingeniero de software Ecuador",
  description:
    "Portfolio interactivo con experiencia 3D. Explora los proyectos de automatización y desarrollo a medida. Si tu dispositivo no soporta WebGL, accede a la versión clásica.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dorian — Portfolio interactivo",
    description:
      "Explora proyectos de automatización y desarrollo de apps a medida para empresas en Ecuador.",
    type: "website",
    locale: "es_EC",
  },
};

/**
 * Root page shell — SSG.
 * Phase 3 will mount <Experience /> (3D with capability gate + redirect).
 * For now: static shell with navigation to /classic.
 */
export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
        Dorian
      </h1>
      <p className="text-slate-400 text-lg mb-3 max-w-md">
        Ingeniero de software especializado en apps a medida y automatización de procesos.
      </p>
      <p className="text-slate-500 text-sm mb-10 max-w-xs">
        Experiencia 3D interactiva próximamente. Por ahora, accede al perfil completo.
      </p>

      {/* Primary CTA — always visible, S-3D7 anchor equivalent */}
      <Link
        href="/classic"
        className="
          inline-flex items-center gap-2 px-6 py-3 rounded-lg
          bg-sky-500 hover:bg-sky-400 active:bg-sky-600
          text-white font-semibold text-base
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950
          min-h-[44px]
        "
        aria-label="Ver versión clásica del portfolio"
      >
        Ver versión clásica
      </Link>
    </main>
  );
}
