import "server-only";

/**
 * Canonical definitions for every admin-editable automated message.
 *
 * These are the seed values AND the fallback: if the DB row is missing (fresh
 * install, failed migration, DB unreachable during build) the sender falls
 * back to the body here rather than sending nothing.
 *
 * `placeholders` is the whitelist the admin editor offers as insertable chips
 * and validates against on save — an admin typing `{{nonsense}}` gets a clear
 * error instead of a literal `{{nonsense}}` reaching a customer.
 */

export type TemplateKey =
  | "whatsapp.agent_intro"
  | "whatsapp.lead_alert"
  | "whatsapp.customer_ack";

export type TemplateDefault = {
  key: TemplateKey;
  channel: "WHATSAPP";
  label: string;
  description: string;
  body: string;
  providerTemplateName: string | null;
  language: string;
  /** See the MessageTemplate model docs — true = body is sent as-is. */
  sendsVerbatim: boolean;
  /** Whitelisted `{{placeholder}}` names offered/validated in the admin editor. */
  placeholders: { name: string; example: string; description: string }[];
};

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  {
    key: "whatsapp.agent_intro",
    channel: "WHATSAPP",
    label: "Agent → customer intro (WhatsApp button)",
    description:
      "Pre-filled into WhatsApp when an agent taps the WhatsApp button on a purchased lead. The agent reviews and presses send themselves, so this text is sent exactly as written and needs no Meta approval. Edits go live immediately.",
    sendsVerbatim: true,
    providerTemplateName: null,
    language: "en",
    body: [
      "Hello {{customerName}},",
      "",
      "This is {{agentCompany}}, reaching out via {{brandName}} about your {{destination}} travel enquiry.",
      "",
      "Travel date: {{travelDate}}",
      "Travellers: {{travellers}}",
      "",
      "I'd be happy to put together some options for you. When is a good time to talk?",
    ].join("\n"),
    placeholders: [
      { name: "customerName", example: "Priya Sharma", description: "The customer's name" },
      { name: "agentCompany", example: "Rajesh Travels", description: "Your company name" },
      { name: "brandName", example: "Moksh Booking", description: "Platform brand name" },
      { name: "destination", example: "Kerala", description: "Where they want to travel" },
      { name: "travelDate", example: "18 Sep 2026", description: "Blank if not provided" },
      { name: "travellers", example: "2 adults", description: "Blank if not provided" },
    ],
  },
  {
    key: "whatsapp.lead_alert",
    channel: "WHATSAPP",
    label: "Agent lead alert",
    description:
      "Sent to agents who enabled WhatsApp alerts when a matching lead arrives. Sent immediately — no approval step required. Edits go live the moment you save.",
    sendsVerbatim: true,
    providerTemplateName: null,
    language: "en",
    body:
      "Hi {{agentName}}, a new {{tripCategory}} lead just arrived on {{brandName}}: {{destination}}. Quality: {{quality}}. Open your dashboard to view and purchase it.",
    placeholders: [
      { name: "agentName", example: "Rajesh Travels", description: "Agent's name" },
      { name: "tripCategory", example: "Domestic", description: "Lead category" },
      { name: "destination", example: "Goa", description: "Destination" },
      { name: "quality", example: "Good", description: "Lead quality" },
      { name: "brandName", example: "Moksh Booking", description: "Platform brand name" },
    ],
  },
  {
    key: "whatsapp.customer_ack",
    channel: "WHATSAPP",
    label: "Customer enquiry acknowledgement",
    description:
      "Sent to a customer right after they submit an enquiry, on every channel (website form, Google/Meta lead ads, partner API). Sent immediately — no approval step required. Edits go live the moment you save.",
    sendsVerbatim: true,
    providerTemplateName: null,
    language: "en",
    body:
      "Hi {{customerName}}, thanks for your enquiry about {{destination}} with {{brandName}}. Your reference is {{leadCode}}. Our verified travel partners will contact you shortly with personalised options.",
    placeholders: [
      { name: "customerName", example: "Priya Sharma", description: "Customer's name" },
      { name: "destination", example: "Kerala", description: "Destination" },
      { name: "leadCode", example: "LD-2026-000123", description: "Reference code" },
      { name: "brandName", example: "Moksh Booking", description: "Platform brand name" },
    ],
  },
];

export function defaultFor(key: TemplateKey): TemplateDefault {
  const found = TEMPLATE_DEFAULTS.find((t) => t.key === key);
  if (!found) throw new Error(`Unknown message template key: ${key}`);
  return found;
}

/** Placeholder names an admin is allowed to use in a given template. */
export function allowedPlaceholders(key: TemplateKey): string[] {
  return defaultFor(key).placeholders.map((p) => p.name);
}
