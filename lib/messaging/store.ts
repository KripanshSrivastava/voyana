import "server-only";
import { cache } from "react";
import { prisma } from "../db";
import { TEMPLATE_DEFAULTS, defaultFor, type TemplateKey, type TemplateDefault } from "./defaults";

/**
 * Read/write layer for admin-editable message templates.
 *
 * Resilience rules, in priority order:
 *  1. Never block a send. If the DB is unreachable we fall back to the
 *     hardcoded default rather than dropping the message.
 *  2. Never invent copy. The fallback is the same text that seeds the row,
 *     so a fallback send is indistinguishable from a normal one until an
 *     admin edits it.
 *  3. Seed lazily. A fresh install has no rows; the first read upserts the
 *     defaults. Same pattern as getSiteSettings().
 */

export type ResolvedTemplate = {
  key: TemplateKey;
  label: string;
  description: string;
  body: string;
  providerTemplateName: string | null;
  language: string;
  sendsVerbatim: boolean;
  /** True when this came from the hardcoded default, not the database. */
  isFallback: boolean;
  updatedAt: Date | null;
};

function fromDefault(def: TemplateDefault): ResolvedTemplate {
  return {
    key: def.key,
    label: def.label,
    description: def.description,
    body: def.body,
    providerTemplateName: def.providerTemplateName,
    language: def.language,
    sendsVerbatim: def.sendsVerbatim,
    isFallback: true,
    updatedAt: null,
  };
}

/**
 * Fetch one template. Request-scoped `cache()` so a page rendering several
 * messages doesn't re-query per template.
 */
export const getMessageTemplate = cache(async (key: TemplateKey): Promise<ResolvedTemplate> => {
  const def = defaultFor(key);
  try {
    const row = await prisma.messageTemplate.findUnique({ where: { key } });
    if (!row) return fromDefault(def);
    return {
      key,
      // Label/description/sendsVerbatim are product/structural, not admin
      // copy — always from code so provider changes (e.g. this one) don't
      // need a data migration for templates seeded under the old provider.
      label: def.label,
      description: def.description,
      body: row.body,
      providerTemplateName: row.providerTemplateName,
      language: row.language,
      sendsVerbatim: def.sendsVerbatim,
      isFallback: false,
      updatedAt: row.updatedAt,
    };
  } catch (e) {
    console.error("[messaging] template read failed, using default for %s:", key, e);
    return fromDefault(def);
  }
});

/**
 * All templates for the admin screen, seeding any that don't exist yet.
 * Seeding is best-effort: a failure still returns the defaults so the admin
 * page renders instead of erroring.
 */
export async function listMessageTemplates(): Promise<ResolvedTemplate[]> {
  try {
    const rows = await prisma.messageTemplate.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));

    const missing = TEMPLATE_DEFAULTS.filter((d) => !byKey.has(d.key));
    if (missing.length > 0) {
      await prisma.messageTemplate.createMany({
        data: missing.map((d) => ({
          key: d.key,
          channel: d.channel,
          label: d.label,
          description: d.description,
          body: d.body,
          providerTemplateName: d.providerTemplateName,
          language: d.language,
          sendsVerbatim: d.sendsVerbatim,
        })),
        skipDuplicates: true,
      });
      // Re-read so the caller gets real ids/timestamps for the seeded rows.
      const reread = await prisma.messageTemplate.findMany();
      reread.forEach((r) => byKey.set(r.key, r));
    }

    return TEMPLATE_DEFAULTS.map((def) => {
      const row = byKey.get(def.key);
      if (!row) return fromDefault(def);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        body: row.body,
        providerTemplateName: row.providerTemplateName,
        language: row.language,
        sendsVerbatim: def.sendsVerbatim,
        isFallback: false,
        updatedAt: row.updatedAt,
      };
    });
  } catch (e) {
    console.error("[messaging] template list failed, using defaults:", e);
    return TEMPLATE_DEFAULTS.map(fromDefault);
  }
}

/** Persist an admin edit. Body validation happens in the API route. */
export async function saveMessageTemplate(
  key: TemplateKey,
  data: { body: string; providerTemplateName?: string | null; language?: string },
) {
  const def = defaultFor(key);
  return prisma.messageTemplate.upsert({
    where: { key },
    create: {
      key,
      channel: def.channel,
      label: def.label,
      description: def.description,
      body: data.body,
      providerTemplateName: data.providerTemplateName ?? def.providerTemplateName,
      language: data.language ?? def.language,
      sendsVerbatim: def.sendsVerbatim,
    },
    update: {
      body: data.body,
      ...(data.providerTemplateName !== undefined ? { providerTemplateName: data.providerTemplateName } : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
    },
  });
}

/** Restore a template to the shipped default. */
export async function resetMessageTemplate(key: TemplateKey) {
  const def = defaultFor(key);
  return saveMessageTemplate(key, {
    body: def.body,
    providerTemplateName: def.providerTemplateName,
    language: def.language,
  });
}
