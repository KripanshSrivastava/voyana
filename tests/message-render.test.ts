import { describe, it, expect } from "vitest";
import { renderTemplate, extractPlaceholders, unknownPlaceholders } from "../lib/messaging/render";

/**
 * These templates are admin-authored and reach real customers, so the
 * substitution rules get explicit coverage — particularly the "optional
 * value leaves a dangling label" case, which is the one that would produce
 * embarrassing output in production.
 */

describe("renderTemplate", () => {
  it("substitutes simple placeholders", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Priya" })).toBe("Hello Priya");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplate("Hello {{ name }}", { name: "Priya" })).toBe("Hello Priya");
  });

  it("substitutes the same placeholder more than once", () => {
    expect(renderTemplate("{{a}} and {{a}}", { a: "x" })).toBe("x and x");
  });

  it("accepts numbers", () => {
    expect(renderTemplate("{{n}} travellers", { n: 2 })).toBe("2 travellers");
  });

  it("renders missing values as empty rather than leaving the placeholder", () => {
    expect(renderTemplate("Hi {{name}}!", {})).toBe("Hi !");
    expect(renderTemplate("Hi {{name}}!", { name: null })).toBe("Hi !");
    expect(renderTemplate("Hi {{name}}!", { name: undefined })).toBe("Hi !");
  });

  it("drops a whole line when its only value is empty", () => {
    const body = ["Hello there", "Travel date: {{travelDate}}", "Bye"].join("\n");
    expect(renderTemplate(body, { travelDate: null })).toBe("Hello there\nBye");
  });

  it("keeps the line when the value is present", () => {
    const body = ["Hello there", "Travel date: {{travelDate}}", "Bye"].join("\n");
    expect(renderTemplate(body, { travelDate: "18 Sep" })).toBe(
      "Hello there\nTravel date: 18 Sep\nBye",
    );
  });

  it("collapses runs of blank lines left by dropped lines", () => {
    const body = ["A", "", "Date: {{d}}", "Travellers: {{t}}", "", "B"].join("\n");
    expect(renderTemplate(body, { d: null, t: null })).toBe("A\n\nB");
  });

  it("trims leading and trailing whitespace", () => {
    expect(renderTemplate("\n\n  Hello  \n\n", {})).toBe("Hello");
  });

  it("leaves text with no placeholders untouched", () => {
    expect(renderTemplate("Just plain text", { a: "x" })).toBe("Just plain text");
  });

  it("does not treat single braces as placeholders", () => {
    expect(renderTemplate("Set {x} aside", { x: "no" })).toBe("Set {x} aside");
  });

  it("renders a realistic multi-line intro correctly", () => {
    const body = [
      "Hello {{customerName}},",
      "",
      "This is {{agentCompany}} about your {{destination}} enquiry.",
      "",
      "Travel date: {{travelDate}}",
      "Travellers: {{travellers}}",
      "",
      "When is a good time to talk?",
    ].join("\n");

    const out = renderTemplate(body, {
      customerName: "Priya",
      agentCompany: "Rajesh Travels",
      destination: "Kerala",
      travelDate: null,
      travellers: "2 adults",
    });

    expect(out).toBe(
      [
        "Hello Priya,",
        "",
        "This is Rajesh Travels about your Kerala enquiry.",
        "",
        "Travellers: 2 adults",
        "",
        "When is a good time to talk?",
      ].join("\n"),
    );
  });
});

describe("extractPlaceholders", () => {
  it("returns each distinct name once", () => {
    expect(extractPlaceholders("{{a}} {{b}} {{a}}").sort()).toEqual(["a", "b"]);
  });

  it("returns an empty array for plain text", () => {
    expect(extractPlaceholders("no placeholders here")).toEqual([]);
  });
});

describe("unknownPlaceholders", () => {
  it("flags names outside the whitelist", () => {
    expect(unknownPlaceholders("{{good}} {{bad}}", ["good"])).toEqual(["bad"]);
  });

  it("returns empty when everything is allowed", () => {
    expect(unknownPlaceholders("{{good}}", ["good", "other"])).toEqual([]);
  });

  it("returns empty for a body with no placeholders", () => {
    expect(unknownPlaceholders("plain", ["good"])).toEqual([]);
  });
});
