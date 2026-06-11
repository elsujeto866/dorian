import type { Project } from "@/lib/content/types";

interface WhatsAppCTAProps {
  /** Override message from a specific project; falls back to site default. */
  waMessage?: string | null;
  /** Render as a sticky bottom bar instead of an inline section. */
  sticky?: boolean;
  /** Optional extra CSS classes. */
  className?: string;
}

const DEFAULT_MESSAGE =
  "Hola, me interesa hablar sobre una app para mi negocio.";

/**
 * Builds a wa.me link from the NEXT_PUBLIC_WA_NUMBER env var.
 * Returns null if the env var is not set so callers can hide the CTA gracefully.
 */
export function buildWhatsAppHref(message?: string | null): string | null {
  const number = process.env.NEXT_PUBLIC_WA_NUMBER;
  if (!number) return null;
  const text = encodeURIComponent(message ?? DEFAULT_MESSAGE);
  return `https://wa.me/${number}?text=${text}`;
}

export default function WhatsAppCTA({
  waMessage,
  sticky = false,
  className = "",
}: WhatsAppCTAProps) {
  const href = buildWhatsAppHref(waMessage);

  if (!href) {
    // Env var not set: render nothing. Graceful fallback as per spec.
    return null;
  }

  const wrapperClass = sticky
    ? "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg"
    : "";

  return (
    <div className={`${wrapperClass} ${className}`.trim()}>
      <div className="max-w-3xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-slate-900 text-sm leading-tight">
            Hablemos de tu negocio
          </p>
          <p className="text-slate-500 text-xs">
            Respondo en minutos. Sin formularios.
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp — Hablemos de tu negocio"
          className="
            inline-flex items-center gap-2 min-h-[44px] min-w-[44px]
            px-5 py-3 rounded-lg font-semibold text-sm
            bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#18a850]
            text-white transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2
          "
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.22-3.48-8.52zM12 22c-1.86 0-3.68-.5-5.27-1.44l-.38-.22-3.69.93.97-3.59-.25-.39A9.97 9.97 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm5.44-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.08-.13-.27-.2-.57-.35z" />
          </svg>
          Hablemos de tu negocio
        </a>
      </div>
    </div>
  );
}

/** Helper to build a per-project WhatsApp href (used in cards). */
export function buildProjectWhatsAppHref(project: Project): string | null {
  return buildWhatsAppHref(project.waMessage);
}
