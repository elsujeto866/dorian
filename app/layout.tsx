import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dorian.dev"),
  title: {
    template: "%s | Dorian — Ingeniero de software",
    default: "Dorian — Apps a medida que hacen ganar dinero a tu negocio",
  },
  description:
    "Ingeniero en sistemas especializado en automatización de procesos y desarrollo de apps a medida para empresas en Ecuador y la región.",
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: "Dorian — Ingeniero de software",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Dorian",
  jobTitle: "Ingeniero de software",
  url: "https://dorian.dev",
  areaServed: "Ecuador",
  sameAs: [
    `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER ?? ""}`,
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-EC" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Ir al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
