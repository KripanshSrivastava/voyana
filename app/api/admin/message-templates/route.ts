import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { listMessageTemplates, saveMessageTemplate, resetMessageTemplate } from "@/lib/messaging/store";
import { allowedPlaceholders, TEMPLATE_DEFAULTS, type TemplateKey } from "@/lib/messaging/defaults";
import { unknownPlaceholders } from "@/lib/messaging/render";

const VALID_KEYS = new Set<string>(TEMPLATE_DEFAULTS.map((t) => t.key));

const MAX_BODY_LENGTH = 1024; // WhatsApp template bodies cap well below this.

export const GET = handler(async () => {
  const session = await requireRole("ADMIN");
  requireArea(session, "settings");
  const templates = await listMessageTemplates();
  return ok({ templates });
});

/**
 * Update one template's body (and, for provider-backed templates, which
 * registered template name/language to invoke).
 *
 * Validation intentionally rejects unknown `{{placeholders}}` — an admin
 * typo would otherwise ship a literal `{{destinaton}}` to a customer, and
 * there's no downstream stage that would catch it.
 */
export const PATCH = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "settings");

  const body = await req.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : "";
  if (!VALID_KEYS.has(key)) return fail("Unknown template.", 422);
  const templateKey = key as TemplateKey;

  // Reset path — restore the shipped default.
  if (body?.reset === true) {
    await resetMessageTemplate(templateKey);
    await logAudit({
      actorType: "ADMIN",
      actorId: session.uid,
      actorLabel: session.name,
      action: "messaging.template.reset",
      entityType: "cms",
      entityId: templateKey,
    });
    const templates = await listMessageTemplates();
    return ok({ templates });
  }

  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return fail("Message body cannot be empty.", 422);
  if (text.length > MAX_BODY_LENGTH) {
    return fail(`Message is too long (max ${MAX_BODY_LENGTH} characters).`, 422);
  }

  const bad = unknownPlaceholders(text, allowedPlaceholders(templateKey));
  if (bad.length > 0) {
    return fail(
      `Unknown placeholder${bad.length === 1 ? "" : "s"}: ${bad.map((b) => `{{${b}}}`).join(", ")}. Use only the placeholders listed for this template.`,
      422,
    );
  }

  const providerTemplateName =
    typeof body?.providerTemplateName === "string"
      ? body.providerTemplateName.trim().slice(0, 120) || null
      : undefined;
  const language =
    typeof body?.language === "string" ? body.language.trim().slice(0, 16) || undefined : undefined;

  await saveMessageTemplate(templateKey, { body: text, providerTemplateName, language });

  await logAudit({
    actorType: "ADMIN",
    actorId: session.uid,
    actorLabel: session.name,
    action: "messaging.template.update",
    entityType: "cms",
    entityId: templateKey,
    metadata: { length: text.length, providerTemplateName, language },
  });

  const templates = await listMessageTemplates();
  return ok({ templates });
});
