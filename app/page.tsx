import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dorian — Portfolio interactivo",
  description:
    "Portfolio interactivo con experiencia 3D. Si tu dispositivo no soporta WebGL, accede a la versión clásica.",
};

export default function HomePage() {
  return (
    <main id="main-content">
      <p>
        <Link href="/classic">Ver versión clásica</Link>
      </p>
    </main>
  );
}
