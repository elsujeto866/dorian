/**
 * Full Profile section — extended bio, skills, and background.
 * /classic section 2.1 (item 5).
 * Copy is Ecuadorian-neutral Spanish (tuteo/usted, no voseo).
 */
export default function FullProfile() {
  const skills = [
    "TypeScript / JavaScript",
    "React / Next.js",
    "Node.js / NestJS",
    "PostgreSQL / MongoDB",
    "Docker / CI-CD",
    "Automatización de procesos",
    "APIs REST y GraphQL",
    "Integraciones con SRI Ecuador",
  ];

  return (
    <section
      aria-labelledby="profile-heading"
      className="py-16 px-6 bg-slate-50"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="profile-heading"
          className="text-3xl font-bold text-slate-900 mb-8"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
        >
          Perfil profesional
        </h2>

        <div className="grid gap-10 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-6">
            <p className="text-slate-700 leading-relaxed">
              Soy Dorian, ingeniero en sistemas con más de 5 años de experiencia
              construyendo aplicaciones web y de escritorio para empresas en
              Ecuador y la región. Me especializo en automatizar los procesos que
              más tiempo le consumen a tu equipo.
            </p>

            <p className="text-slate-700 leading-relaxed">
              Trabajo directamente con el cliente, sin intermediarios. Eso
              significa que entiendo el problema desde la raíz y construyo la
              solución correcta — no la más complicada.
            </p>

            <p className="text-slate-700 leading-relaxed">
              Cada proyecto que entrego tiene un ROI medible. Si el software no
              le genera valor a tu negocio, no tiene sentido construirlo.
            </p>
          </div>

          {/* Credential badge */}
          <aside
            className="self-start bg-white border border-slate-200 rounded-xl p-5 min-w-[180px] text-center shadow-sm"
            aria-label="Credenciales"
          >
            <p className="text-4xl font-extrabold text-slate-900">5+</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
              años de experiencia
            </p>
            <hr className="my-4 border-slate-200" />
            <p className="text-4xl font-extrabold text-slate-900">7</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
              proyectos entregados
            </p>
          </aside>
        </div>

        {/* Skills */}
        <div className="mt-10">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            Tecnologías y áreas de expertise
          </h3>
          <ul className="flex flex-wrap gap-2" aria-label="Habilidades técnicas">
            {skills.map((skill) => (
              <li
                key={skill}
                className="bg-white border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-700 font-medium shadow-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
