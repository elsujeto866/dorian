import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroSection from "./HeroSection";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WA_NUMBER;
});

// S-P1: ROI hero is the primary heading
describe("HeroSection", () => {
  it("renders an h1 with the approved ROI promise copy (S-P1)", () => {
    render(<HeroSection />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toMatch(/Apps a medida que le hacen ganar dinero/i);
  });

  it("renders the engineer credential statement", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/ingeniero en sistemas/i)
    ).toBeInTheDocument();
  });

  it("renders the social proof line with the 90% claim", () => {
    render(<HeroSection />);
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });

  it("renders the WhatsApp CTA inline (no env → renders nothing from CTA child)", () => {
    // Without env var, WhatsAppCTA returns null — hero still renders
    delete process.env.NEXT_PUBLIC_WA_NUMBER;
    render(<HeroSection />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    // No CTA link should be present
    expect(screen.queryByRole("link", { name: /WhatsApp/i })).toBeNull();
  });

  it("renders the WhatsApp CTA when env is set (S-P2 above-fold coverage)", () => {
    process.env.NEXT_PUBLIC_WA_NUMBER = "593987654321";
    render(<HeroSection />);
    const link = screen.getByRole("link", { name: /WhatsApp/i });
    expect(link).toBeInTheDocument();
  });
});
