import { describe, it, expect } from "vitest";
import { toWhatsAppNumber, whatsAppDeepLink } from "../lib/whatsapp/phone";

/**
 * Phone normalisation is the one piece of the WhatsApp integration that can
 * silently message the WRONG PERSON if it gets a digit wrong, so it gets
 * real coverage. No network, no DB.
 */

describe("toWhatsAppNumber", () => {
  it("keeps an already-qualified Indian number", () => {
    expect(toWhatsAppNumber("919876543210")).toBe("919876543210");
  });

  it("strips + and spaces", () => {
    expect(toWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
  });

  it("strips punctuation", () => {
    expect(toWhatsAppNumber("+91-98765-43210")).toBe("919876543210");
    expect(toWhatsAppNumber("(091) 98765 43210")).toBe("919876543210");
  });

  it("adds the country code to a bare 10-digit mobile", () => {
    expect(toWhatsAppNumber("9876543210")).toBe("919876543210");
  });

  it("strips a single trunk 0 then adds the country code", () => {
    expect(toWhatsAppNumber("09876543210")).toBe("919876543210");
  });

  it("strips a 00 international prefix without adding a country code", () => {
    expect(toWhatsAppNumber("0044 20 7946 0958")).toBe("442079460958");
  });

  it("leaves a foreign number that already carries its country code alone", () => {
    // 12 digits — must NOT get a 91 glued on the front.
    expect(toWhatsAppNumber("442079460958")).toBe("442079460958");
  });

  it("rejects too-short input", () => {
    expect(toWhatsAppNumber("12345")).toBeNull();
    expect(toWhatsAppNumber("1")).toBeNull();
  });

  it("rejects too-long input", () => {
    expect(toWhatsAppNumber("1234567890123456789")).toBeNull();
  });

  it("rejects empty / null / non-numeric input", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
    expect(toWhatsAppNumber("not a phone")).toBeNull();
  });

  it("rejects a string of only zeros", () => {
    expect(toWhatsAppNumber("0000")).toBeNull();
  });
});

describe("whatsAppDeepLink", () => {
  it("builds a bare wa.me link", () => {
    expect(whatsAppDeepLink("9876543210")).toBe("https://wa.me/919876543210");
  });

  it("URL-encodes the prefilled text", () => {
    const link = whatsAppDeepLink("9876543210", "Hello there & welcome");
    expect(link).toBe("https://wa.me/919876543210?text=Hello%20there%20%26%20welcome");
  });

  it("encodes newlines so multi-line intros survive", () => {
    const link = whatsAppDeepLink("9876543210", "Line one\nLine two");
    expect(link).toContain("%0A");
  });

  it("returns null for an unusable number rather than a broken link", () => {
    expect(whatsAppDeepLink("123")).toBeNull();
    expect(whatsAppDeepLink(null)).toBeNull();
  });
});
