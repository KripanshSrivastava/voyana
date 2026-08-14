import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { MessageTemplatesManager, type TemplateRow } from "@/components/admin/MessageTemplatesManager";
import { listMessageTemplates } from "@/lib/messaging/store";
import { defaultFor, type TemplateKey } from "@/lib/messaging/defaults";

export const metadata = { title: "Messaging", robots: { index: false } };

/**
 * Admin editor for the copy used by automated outbound messages.
 *
 * The distinction that matters on this screen: templates where our text is
 * sent verbatim (click-to-chat links) versus templates that must be approved
 * by Meta before the wording changes. MessageTemplatesManager renders a
 * prominent warning for the latter — see the model docs in schema.prisma.
 */
export default async function AdminMessagingPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "settings")) {
    return <AccessRestricted area="Messaging" />;
  }

  const templates = await listMessageTemplates();

  // Merge the DB/fallback values with the placeholder metadata, which only
  // ever lives in code — admins pick from a whitelist, they don't invent
  // placeholders, so there's nothing to persist.
  const rows: TemplateRow[] = templates.map((t) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    body: t.body,
    providerTemplateName: t.providerTemplateName,
    language: t.language,
    sendsVerbatim: t.sendsVerbatim,
    isFallback: t.isFallback,
    placeholders: defaultFor(t.key as TemplateKey).placeholders,
  }));

  return (
    <div>
      <PageHeader
        title="Messaging"
        subtitle="Edit the text of automated WhatsApp messages. Changes to click-to-chat messages go live immediately; templates sent by WhatsApp on your behalf need Meta's approval first."
      />
      <MessageTemplatesManager initial={rows} />
    </div>
  );
}
