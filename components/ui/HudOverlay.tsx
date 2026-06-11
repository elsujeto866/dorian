"use client";

/**
 * HudOverlay.tsx
 *
 * DOM overlay positioned absolutely over the 3D canvas.
 *
 * Phase 3 skeleton:
 *   - "Ver versión clásica" always-visible link (S-3D7)
 *   - Selected building info panel (empty in Phase 3; wired in Phase 4)
 *   - Keyboard navigation list for buildings (empty list in Phase 3)
 *
 * Subscribes to useSceneStore for selectedBuildingId to show/hide the panel.
 * Written with accessible markup; no Three.js imports.
 *
 * Design ref: section 3 "UI overlay ↔ canvas state bridge".
 */

import Link from "next/link";
import { useSceneStore } from "../scene/useSceneStore";

export function HudOverlay() {
  const { selectedBuildingId, clearSelection, phase } = useSceneStore();

  return (
    <div
      aria-label="Controles de experiencia 3D"
      className="absolute inset-0 pointer-events-none"
    >
      {/* ── Always-visible classic link (S-3D7) ──────────────────────────── */}
      <div className="absolute top-4 right-4 pointer-events-auto z-10">
        <Link
          href="/classic"
          aria-label="Ver versión clásica del portfolio"
          className="
            inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium
            bg-slate-900/80 backdrop-blur-sm border border-slate-700
            text-slate-300 hover:text-white hover:bg-slate-800/90
            transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400
            focus:ring-offset-2 focus:ring-offset-transparent
          "
        >
          Ver versión clásica
        </Link>
      </div>

      {/* ── Selected building info panel ─────────────────────────────────── */}
      {selectedBuildingId && (
        <div
          role="dialog"
          aria-label="Información del proyecto"
          aria-modal="false"
          className="
            absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm
            pointer-events-auto z-10
          "
        >
          <div className="
            bg-slate-900/90 backdrop-blur-sm border border-slate-700
            rounded-xl p-5 shadow-xl text-left
          ">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-white font-semibold text-base leading-snug">
                {/* Phase 4: replace with project name from content layer */}
                Proyecto seleccionado
              </h2>
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Cerrar panel de información"
                className="
                  text-slate-400 hover:text-white transition-colors
                  focus:outline-none focus:ring-2 focus:ring-sky-400 rounded
                  pointer-events-auto shrink-0
                "
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Phase 3 placeholder — Phase 4 wires real project data */}
            <p className="text-slate-400 text-sm">
              ID: <span className="text-slate-300 font-mono">{selectedBuildingId}</span>
            </p>
            <p className="text-slate-500 text-xs mt-3">
              Detalles del proyecto disponibles en la próxima fase.
            </p>
          </div>
        </div>
      )}

      {/* ── Phase indicator (dev-visible only in loading phase) ──────────── */}
      {phase === "loading" && (
        <div
          role="status"
          aria-label="Cargando escena"
          className="absolute top-4 left-4 pointer-events-none"
        >
          <span className="text-slate-600 text-xs font-mono">loading…</span>
        </div>
      )}
    </div>
  );
}
