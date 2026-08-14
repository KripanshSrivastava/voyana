/**
 * `{{placeholder}}` substitution for admin-authored message bodies.
 *
 * Deliberately tiny and dependency-free — this runs on text that reaches
 * customers, so the behaviour needs to be obvious and testable rather than
 * clever. No conditionals, no loops, no expression evaluation: an admin
 * writing a template can only ever produce a string with values swapped in.
 *
 * Not exported from a "server-only" module: the admin UI renders a live
 * preview with the same function so what they see matches what sends.
 */

/** Matches `{{name}}` with optional surrounding whitespace inside the braces. */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export type RenderVars = Record<string, string | number | null | undefined>;

/**
 * Substitute values into a template body.
 *
 * Missing/null/empty values render as an empty string. Because optional
 * fields (travel date, traveller count) commonly sit on their own line, we
 * then tidy the result so a blank value doesn't leave `Travel date:` dangling
 * or a run of empty lines in the middle of the message:
 *
 *   1. Drop any line that still contains only a label and no value
 *      (i.e. ends with ":" after substitution).
 *   2. Collapse 3+ consecutive newlines down to 2.
 *   3. Trim leading/trailing whitespace.
 */
export function renderTemplate(body: string, vars: RenderVars): string {
  const substituted = body.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const value = vars[name];
    if (value === null || value === undefined) return "";
    return String(value);
  });

  const cleanedLines = substituted
    .split("\n")
    // A line like "Travel date:" (label with nothing after the colon) means
    // its placeholder resolved to empty — drop the whole line.
    .filter((line) => !/^\s*[^:]{1,40}:\s*$/.test(line));

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Placeholder names actually used in a body. Used by the admin API to reject
 * unknown placeholders before they can reach a real recipient.
 */
export function extractPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_RE)) {
    found.add(match[1]);
  }
  return [...found];
}

/**
 * Validate a body against a whitelist. Returns the offending names, empty
 * array when the body is clean.
 */
export function unknownPlaceholders(body: string, allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return extractPlaceholders(body).filter((name) => !allowedSet.has(name));
}
