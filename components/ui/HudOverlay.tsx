"use client";

/**
 * HudOverlay.tsx
 *
 * DOM overlay positioned absolutely over the 3D canvas.
 *
 * Phase 4: wired to real project data and mayor profile.
 *   - "Ver versión clásica" always-visible link (S-3D7)
 *   - Building info panel: name, summary, ROI metric, tags, sector
 *   - Mayor profile panel: full profile + WhatsApp contact
 *   - Keyboard navigation: HUD list lets Tab+Enter select buildings
 *     (satisfies accessibility requirement — S-3D accessibility path)
 *   - ESC / close button returns to overview
 *
 * Subscribes to useSceneStore. No Three.js imports.
 * Spanish Ecuador-neutral copy.
 *
 * Design ref: section 3 "UI overlay ↔ canvas state bridge".
 */

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useSceneStore } from "../scene/useSceneStore";
import { getAllProjects, getAllCategories } from "@/lib/content/content";
import type { Project } from "@/lib/content/types";
import { buildCityLayout } from "../scene/cityLayout";
import { computeFocusWaypoint } from "../scene/waypoint";
import { MAYOR_ID } from "../scene/constants";

// ─── Nav mode toggle button ───────────────────────────────────────────────────

function NavModeToggle() {
  const { navMode, toggleNavMode } = useSceneStore();
  const isWalk = navMode === "walk";

  return (
    <button
      type="button"
      onClick={toggleNavMode}
      aria-label={isWalk ? "Cambiar a vista aérea" : "Caminar por la ciudad"}
      title={isWalk ? "Cambiar a vista aérea" : "Caminar por la ciudad (V)"}
      className="
        inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium
        bg-slate-900/80 backdrop-blur-sm border border-slate-700
        text-slate-300 hover:text-white hover:bg-slate-800/90
        transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400
        focus:ring-offset-2 focus:ring-offset-transparent
      "
    >
      {isWalk ? (
        <>
          {/* Aerial view icon */}
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Vista aérea
        </>
      ) : (
        <>
          {/* Walk icon */}
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4" r="2" />
            <path d="M15 8.5L13 16l-3-3-2 5" />
            <path d="M9 8.5l4 2.5" />
          </svg>
          Caminar
        </>
      )}
    </button>
  );
}

// ─── Walk controls help overlay ───────────────────────────────────────────────

function WalkControlsHelp() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Controles de caminata"
      className="
        absolute bottom-6 right-4 pointer-events-auto z-10
        bg-slate-950/80 backdrop-blur-md border border-slate-700/60
        rounded-2xl px-4 py-3 shadow-xl shadow-black/50 ring-1 ring-white/5
        max-w-[200px] text-xs text-slate-400
      "
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-200 font-semibold text-xs">Controles</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar ayuda de controles"
          className="text-slate-500 hover:text-white transition-colors ml-3"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <ul className="space-y-1">
        <li className="flex gap-2">
          <kbd className="font-mono text-slate-300 bg-slate-800 px-1 rounded text-[10px]">WASD</kbd>
          <span>Moverse</span>
        </li>
        <li className="flex gap-2">
          <kbd className="font-mono text-slate-300 bg-slate-800 px-1 rounded text-[10px]">↑↓←→</kbd>
          <span>Moverse</span>
        </li>
        <li className="flex gap-2">
          <kbd className="font-mono text-slate-300 bg-slate-800 px-1 rounded text-[10px]">E</kbd>
          <span>Ver proyecto</span>
        </li>
        <li className="flex gap-2">
          <kbd className="font-mono text-slate-300 bg-slate-800 px-1 rounded text-[10px]">V</kbd>
          <span>Vista aérea</span>
        </li>
      </ul>
    </div>
  );
}

// ─── Proximity interaction hint ───────────────────────────────────────────────

function ProximityHint() {
  const proximityBuildingId = useSceneStore((s) => s.proximityBuildingId);
  if (!proximityBuildingId) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Presiona E para ver el proyecto"
      className="
        absolute bottom-24 left-1/2 -translate-x-1/2
        bg-slate-950/85 backdrop-blur-md border border-cyan-700/60
        rounded-xl px-4 py-2.5 shadow-lg shadow-cyan-900/30
        text-cyan-300 text-sm font-medium pointer-events-none z-10
        animate-pulse
      "
    >
      Presiona <kbd className="font-mono bg-slate-800 text-white px-1.5 py-0.5 rounded text-xs mx-1">E</kbd> para ver el proyecto
    </div>
  );
}

// ─── Day/night toggle button ──────────────────────────────────────────────────

function DayNightToggle() {
  const { timeOfDay, toggleTimeOfDay } = useSceneStore();
  const isDay = timeOfDay === "day";

  return (
    <button
      type="button"
      onClick={toggleTimeOfDay}
      aria-label={isDay ? "Activar modo noche" : "Activar modo día"}
      title={isDay ? "Activar modo noche" : "Activar modo día"}
      className="
        inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium
        bg-slate-900/80 backdrop-blur-sm border border-slate-700
        text-slate-300 hover:text-white hover:bg-slate-800/90
        transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400
        focus:ring-offset-2 focus:ring-offset-transparent
      "
    >
      {isDay ? (
        <>
          {/* Moon icon */}
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
          Modo noche
        </>
      ) : (
        <>
          {/* Sun icon */}
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Modo día
        </>
      )}
    </button>
  );
}

// ─── ROI display helper ───────────────────────────────────────────────────────

function formatRoi(project: Project): string {
  if (project.roi.metric) return project.roi.metric;
  const formatter = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const amount = formatter.format(project.roi.amountUsd);
  const verb = project.roi.kind === "saved" ? "ahorrados" : "generados";
  const period = project.roi.period ? ` / ${project.roi.period}` : "";
  return `${amount} ${verb}${period}`;
}

// ─── Building info panel ──────────────────────────────────────────────────────

interface BuildingPanelProps {
  project: Project;
  onClose: () => void;
}

function BuildingPanel({ project, onClose }: BuildingPanelProps) {
  return (
    <div
      role="dialog"
      aria-label={`Información del proyecto: ${project.name}`}
      aria-modal="false"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm pointer-events-auto z-10"
    >
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-600/60 rounded-2xl p-5 shadow-2xl shadow-black/60 text-left ring-1 ring-white/5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-white font-semibold text-base leading-snug">
            {project.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de información"
            className="text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 rounded pointer-events-auto shrink-0"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Sector badge */}
        <p className="text-slate-400 text-xs mb-2 uppercase tracking-wide">{project.sector}</p>

        {/* Summary */}
        <p className="text-slate-300 text-sm leading-relaxed mb-3">{project.summary}</p>

        {/* ROI highlight */}
        <div className="bg-slate-900/80 border border-cyan-800/40 rounded-xl px-3 py-2 mb-3">
          <p className="text-xs text-slate-400 mb-1">Resultado</p>
          <p className="text-cyan-300 font-semibold text-sm">{formatRoi(project)}</p>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Tecnologías y áreas">
            {project.tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-800/70 border border-slate-600/60 text-slate-300 hover:border-slate-500 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mayor profile panel ──────────────────────────────────────────────────────

interface MayorPanelProps {
  onClose: () => void;
}

function MayorPanel({ onClose }: MayorPanelProps) {
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER;
  const waMessage = encodeURIComponent("Hola, quiero conversar sobre un proyecto de software.");
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : null;

  return (
    <div
      role="dialog"
      aria-label="Perfil: Dorian — El Desarrollador"
      aria-modal="false"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-auto z-10"
    >
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-700/40 rounded-2xl p-6 shadow-2xl shadow-black/60 text-left ring-1 ring-cyan-500/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Dorian</h2>
            <p className="text-cyan-400 text-sm font-medium">Ingeniero de Software · El Desarrollador</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar perfil"
            className="text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded shrink-0"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          Construyo aplicaciones a medida que le hacen ganar dinero a tu negocio.
          Más de 7 proyectos entregados en Ecuador — automatización, gestión empresarial y deportes.
        </p>

        <div className="flex flex-col gap-2">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Escríbeme directamente
            </a>
          ) : (
            <p className="text-slate-500 text-xs">Contacto por WhatsApp no disponible en este entorno.</p>
          )}
          <Link
            href="/classic"
            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Ver portfolio completo
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Building navigation list (keyboard accessibility) ────────────────────────

interface NavListProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function BuildingNavList({ projects, selectedId, onSelect }: NavListProps) {
  return (
    <nav
      aria-label="Navegar por proyectos"
      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-auto z-10 max-h-[60vh] overflow-y-auto"
    >
      {/* Glassmorphism container */}
      <div className="bg-slate-950/75 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 shadow-2xl shadow-black/50 ring-1 ring-white/5">
        <ul className="flex flex-col gap-0.5" role="listbox" aria-label="Lista de proyectos">
          {projects.map((project) => (
            <li key={project.id} role="option" aria-selected={selectedId === project.id}>
              <button
                type="button"
                onClick={() => onSelect(project.id)}
                className={`
                  text-left w-full px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-slate-950
                  ${selectedId === project.id
                    ? "bg-cyan-900/70 text-cyan-200 border border-cyan-600/60 shadow-sm shadow-cyan-900/40"
                    : "text-slate-400 border border-transparent hover:text-white hover:bg-slate-800/60 hover:border-slate-600/40 active:bg-slate-700/60"
                  }
                `}
              >
                {project.name}
              </button>
            </li>
          ))}
          {/* Developer statue entry */}
          <li role="option" aria-selected={selectedId === MAYOR_ID}>
            <button
              type="button"
              onClick={() => onSelect(MAYOR_ID)}
              className={`
                text-left w-full px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-slate-950
                ${selectedId === MAYOR_ID
                  ? "bg-cyan-900/70 text-cyan-200 border border-cyan-600/60 shadow-sm shadow-cyan-900/40"
                  : "text-slate-400 border border-transparent hover:text-white hover:bg-slate-800/60 hover:border-slate-600/40 active:bg-slate-700/60"
                }
              `}
            >
              El Desarrollador (Dorian)
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

// ─── HudOverlay root ──────────────────────────────────────────────────────────

export function HudOverlay() {
  const { selectedBuildingId, clearSelection, selectBuilding, phase, navMode } = useSceneStore();
  const isWalk = navMode === "walk";

  const projects = getAllProjects();

  const districts = buildCityLayout(projects, getAllCategories());

  // ESC key returns to overview. V key toggles nav mode.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedBuildingId) {
        clearSelection();
      }
    },
    [selectedBuildingId, clearSelection]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Find building waypoint for keyboard navigation.
  const handleSelectFromNav = useCallback(
    (id: string) => {
      if (id === MAYOR_ID) {
        const mayorWaypoint = computeFocusWaypoint(
          { position: { x: 0, y: 0, z: 0 }, halfHeight: 4 },
          { distance: 10, elevationOffset: 2 }
        );
        selectBuilding(MAYOR_ID, mayorWaypoint);
        return;
      }
      // Find building waypoint from city layout.
      for (const district of districts) {
        const building = district.buildings.find((b) => b.id === id);
        if (building) {
          selectBuilding(id, building.waypoint);
          return;
        }
      }
    },
    [districts, selectBuilding]
  );

  const selectedProject = selectedBuildingId
    ? projects.find((p) => p.id === selectedBuildingId) ?? null
    : null;

  const isMayorSelected = selectedBuildingId === MAYOR_ID;

  return (
    <div
      aria-label="Controles de experiencia 3D"
      className="absolute inset-0 pointer-events-none"
    >
      {/* ── Top-right controls ───────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 pointer-events-auto z-10 flex items-center gap-2">
        <NavModeToggle />
        <DayNightToggle />
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

      {/* ── Keyboard nav list (left rail) ────────────────────────────────── */}
      <BuildingNavList
        projects={projects}
        selectedId={selectedBuildingId}
        onSelect={handleSelectFromNav}
      />

      {/* ── Building info panel ───────────────────────────────────────────── */}
      {selectedProject && !isMayorSelected && (
        <BuildingPanel project={selectedProject} onClose={clearSelection} />
      )}

      {/* ── Mayor profile panel ───────────────────────────────────────────── */}
      {isMayorSelected && (
        <MayorPanel onClose={clearSelection} />
      )}

      {/* ── Proximity hint (walk mode only) ──────────────────────────────── */}
      {isWalk && <ProximityHint />}

      {/* ── Walk controls help (walk mode only, dismissible) ─────────────── */}
      {isWalk && <WalkControlsHelp />}

      {/* ── Phase indicator (loading state) ──────────────────────────────── */}
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
