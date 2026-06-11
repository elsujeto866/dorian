import type { Metadata } from "next";
import { Experience } from "@/components/experience/Experience";

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
 * Root page — SSG shell.
 *
 * The <Experience /> component runs the capability gate on the client:
 *   - WebGL absent / prefers-reduced-motion / low-perf → router.replace("/classic")
 *   - Passes → mounts <Scene /> via next/dynamic(ssr:false)
 *
 * This page itself remains a static Server Component. The 3D bundle is
 * never evaluated at build time or on /classic.
 */
export default function HomePage() {
  return (
    <main
      id="main-content"
      className="w-screen h-screen overflow-hidden bg-[#020210]"
    >
      <Experience />
    </main>
  );
}
