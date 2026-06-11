import WhatsAppCTA from "./WhatsAppCTA";

/**
 * ROI Promise Hero — the primary h1 and credential statement for /classic.
 * Copy is fixed per spec section 2.2. ROI numbers come from props, never hardcoded.
 */
export default function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-slate-950 text-white py-16 px-6"
    >
      <div className="max-w-3xl mx-auto">
        {/* Primary heading — S-P1 */}
        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Apps a medida que le hacen ganar dinero a tu negocio
        </h1>

        {/* Engineer credential */}
        <p className="text-lg sm:text-xl text-slate-300 mb-4 leading-relaxed">
          Soy ingeniero en sistemas con experiencia real automatizando procesos
          que le cuestan tiempo y plata a las empresas.
        </p>

        {/* Social proof */}
        <p className="text-base text-slate-400 mb-8 border-l-4 border-sky-500 pl-4">
          He ayudado a reducir un 90% el tiempo de emisión de documentos para
          una aseguradora — sin cambiar su equipo.
        </p>

        {/* WhatsApp CTA — above the fold on mobile (S-P2) */}
        <WhatsAppCTA className="mt-2" />
      </div>
    </section>
  );
}
