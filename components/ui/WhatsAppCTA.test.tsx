import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WhatsAppCTA, { buildWhatsAppHref } from "./WhatsAppCTA";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setEnv(number: string | undefined) {
  if (number === undefined) {
    delete process.env.NEXT_PUBLIC_WA_NUMBER;
  } else {
    process.env.NEXT_PUBLIC_WA_NUMBER = number;
  }
}

// ---------------------------------------------------------------------------
// buildWhatsAppHref unit tests (S-P3, S-X1)
// ---------------------------------------------------------------------------

describe("buildWhatsAppHref", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WA_NUMBER;
  });

  it("returns null when NEXT_PUBLIC_WA_NUMBER is not set", () => {
    setEnv(undefined);
    expect(buildWhatsAppHref()).toBeNull();
  });

  it("returns a valid wa.me URL with the env number", () => {
    setEnv("593987654321");
    const href = buildWhatsAppHref();
    expect(href).toMatch(/^https:\/\/wa\.me\/593987654321\?text=/);
  });

  it("URL-encodes the message", () => {
    setEnv("593987654321");
    const href = buildWhatsAppHref("Hola, test & check");
    expect(href).toContain("Hola%2C%20test%20%26%20check");
  });

  it("uses default message when no message is passed", () => {
    setEnv("593987654321");
    const href = buildWhatsAppHref();
    expect(href).toContain(encodeURIComponent("Hola, me interesa hablar sobre una app para mi negocio."));
  });

  it("uses provided message instead of default", () => {
    setEnv("593987654321");
    const href = buildWhatsAppHref("Quiero una app de facturación.");
    expect(href).toContain(encodeURIComponent("Quiero una app de facturación."));
  });

  it("falls back to default message when waMessage is null", () => {
    setEnv("593987654321");
    const href = buildWhatsAppHref(null);
    expect(href).toContain(encodeURIComponent("Hola, me interesa hablar sobre una app para mi negocio."));
  });
});

// ---------------------------------------------------------------------------
// WhatsAppCTA component tests (S-P2, S-P3)
// ---------------------------------------------------------------------------

describe("WhatsAppCTA", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WA_NUMBER;
  });

  it("renders nothing when NEXT_PUBLIC_WA_NUMBER is not set", () => {
    setEnv(undefined);
    const { container } = render(<WhatsAppCTA />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the CTA link when env var is set (S-P3)", () => {
    setEnv("593987654321");
    render(<WhatsAppCTA />);
    const link = screen.getByRole("link", { name: /WhatsApp/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/593987654321\?text=/));
  });

  it("CTA link has min 44px tap target via classes (S-P2)", () => {
    setEnv("593987654321");
    render(<WhatsAppCTA />);
    const link = screen.getByRole("link", { name: /WhatsApp/i });
    // Check that min-h-[44px] and min-w-[44px] classes are applied
    expect(link.className).toContain("min-h-[44px]");
    expect(link.className).toContain("min-w-[44px]");
  });

  it("opens in a new tab with rel=noopener", () => {
    setEnv("593987654321");
    render(<WhatsAppCTA />);
    const link = screen.getByRole("link", { name: /WhatsApp/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("uses per-project waMessage when provided", () => {
    setEnv("593987654321");
    const msg = "Hola, quiero hablar sobre facturación electrónica.";
    render(<WhatsAppCTA waMessage={msg} />);
    const link = screen.getByRole("link", { name: /WhatsApp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining(encodeURIComponent(msg)));
  });

  it("has a descriptive aria-label for accessibility", () => {
    setEnv("593987654321");
    render(<WhatsAppCTA />);
    const link = screen.getByRole("link", { name: /Hablemos de tu negocio/i });
    expect(link).toBeInTheDocument();
  });
});
