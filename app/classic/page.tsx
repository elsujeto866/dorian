import type { Metadata } from "next";
import { getTop5, getByCategory } from "@/lib/content/content";
import HeroSection from "@/components/ui/HeroSection";
import Top5List from "@/components/ui/Top5List";
import CategorySection from "@/components/ui/CategorySection";
import FullProfile from "@/components/ui/FullProfile";
import WhatsAppCTA from "@/components/ui/WhatsAppCTA";

// ---------------------------------------------------------------------------
// SEO metadata (spec section 2.3)
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Dorian — Apps a medida que hacen ganar dinero a tu negocio | Guayaquil, Ecuador",
  description:
    "Ingeniero en sistemas especializado en apps a medida y automatización de procesos para empresas en Ecuador. Resultados con ROI medible desde el primer mes.",
  alternates: {
    canonical: "/classic",
  },
  openGraph: {
    title: "Dorian — Apps a medida que hacen ganar dinero a tu negocio",
    description:
      "Ingeniero en sistemas especializado en apps a medida y automatización de procesos para empresas en Ecuador. Resultados con ROI medible desde el primer mes.",
    images: [
      {
        url: "/og-classic.png",
        width: 1200,
        height: 630,
        alt: "Dorian — Apps a medida que hacen ganar dinero a tu negocio",
      },
    ],
    type: "website",
    locale: "es_EC",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dorian — Apps a medida que hacen ganar dinero a tu negocio",
    description:
      "Ingeniero en sistemas en Ecuador. Apps a medida con ROI medible.",
    images: ["/og-classic.png"],
  },
};

// ---------------------------------------------------------------------------
// Structured data — Service / ProfessionalService (spec section 5.2 S-P6)
// ---------------------------------------------------------------------------

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Dorian — Desarrollo de software a medida",
  description:
    "Desarrollo de aplicaciones web y móviles a medida con ROI medible para empresas en Ecuador.",
  areaServed: {
    "@type": "Country",
    name: "Ecuador",
  },
  serviceType: "Desarrollo de software",
  provider: {
    "@type": "Person",
    name: "Dorian",
    jobTitle: "Ingeniero de software",
    url: "https://dorian.dev",
  },
};

// ---------------------------------------------------------------------------
// Page component — fully static SSG (no "use client" directive)
// ---------------------------------------------------------------------------

export default function ClassicPage() {
  const top5 = getTop5();
  const groups = getByCategory();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <main id="main-content">
        {/* 1. ROI Promise Hero */}
        <HeroSection />

        {/* 2. ROI-ranked Top 5 */}
        <Top5List projects={top5} />

        {/* 3. Project Cards by Category */}
        <CategorySection groups={groups} />

        {/* 4. Full Profile */}
        <FullProfile />

        {/* 5. Section-level WhatsApp CTA */}
        <section aria-label="Contacto" className="py-16 px-6 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              ¿Listo para hablar de tu proyecto?
            </h2>
            <p className="text-slate-500 mb-8 text-sm">
              Sin formularios. Sin esperas. Escribime directamente.
            </p>
            <WhatsAppCTA />
          </div>
        </section>

        {/* Link back to 3D experience */}
        <div className="py-6 text-center bg-slate-950">
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
          >
            Ver experiencia interactiva →
          </a>
        </div>
      </main>
    </>
  );
}
