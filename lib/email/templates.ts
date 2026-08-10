// Reusable transactional email templates (inline-styled, client-safe HTML).
// Product name is intentionally hardcoded to "Moksh Booking" here — this is
// customer-facing brand copy, not a variable configured per deploy.

const BRAND = "Moksh Booking";
const TAGLINE = "Your trip. Your way.";

function shell(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f1e38">
    <div style="background:#0f1e38;padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:20px;font-weight:700">${BRAND}</span>
    </div>
    <div style="border:1px solid #e2e8f2;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <p style="color:#9aabc9;font-size:12px;text-align:center;margin-top:16px">${BRAND} — ${TAGLINE}</p>
  </div>`;
}

export function customerLeadReceived(p: { name: string; code: string; destination: string }) {
  return {
    subject: `We received your travel request (${p.code})`,
    html: shell("We received your travel request", `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>Thanks for sharing your plans for <strong>${escapeHtml(p.destination)}</strong>. Our travel experts will review your requirements and get in touch with personalized options.</p>
      <p style="background:#f2f5fa;padding:10px 14px;border-radius:8px">Your reference ID: <strong>${p.code}</strong></p>
      <p style="color:#48608b;font-size:14px">There's nothing more you need to do right now — keep an eye on your phone and email.</p>`),
  };
}

export function adminNewLead(p: { code: string; destination: string; quality: string; source: string; budget?: number | null; url: string }) {
  const hot = p.quality === "EXCELLENT" ? "🔥 " : "";
  return {
    subject: `${hot}New ${p.quality.toLowerCase()} lead — ${p.code}`,
    html: shell(`${hot}New lead: ${escapeHtml(p.destination)}`, `
      <table style="font-size:14px;color:#2e3d5c">
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead</td><td><strong>${p.code}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Destination</td><td>${escapeHtml(p.destination)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Quality</td><td>${p.quality}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Source</td><td>${escapeHtml(p.source)}</td></tr>
        ${p.budget ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Budget</td><td>₹${p.budget.toLocaleString("en-IN")}</td></tr>` : ""}
      </table>
      <p style="margin-top:16px"><a href="${p.url}" style="background:#f97316;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">View lead</a></p>`),
  };
}

export function agentLeadPurchased(p: { agentName: string; code: string; destination: string; price: number }) {
  // `price` is the stored value on LeadAssignment — now denominated in
  // Lead Credits. Never surface a ₹ amount for the agent's cost; only
  // the customer's own budget (if any) may be shown in rupees elsewhere.
  const credits = Math.max(1, Math.floor(p.price));
  return {
    subject: `Lead purchase receipt — ${p.code}`,
    html: shell("New lead purchased", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>You've purchased lead <strong>${p.code}</strong> for <strong>${escapeHtml(p.destination)}</strong>. Customer contact details are now available in your dashboard.</p>
      <p style="background:#f2f5fa;padding:10px 14px;border-radius:8px">Charged: <strong>${credits.toLocaleString("en-IN")} Lead Credit${credits === 1 ? "" : "s"}</strong></p>
      <p style="color:#48608b;font-size:14px">Tip: contact the customer quickly — faster responses convert better.</p>`),
  };
}

export function agentAutoLeadPurchased(p: { agentName: string; code: string; destination: string; price: number; travelDate?: string | null; travelers?: number | null; budget?: number | null; quality: string }) {
  return {
    subject: `New lead auto-purchased — ${p.code}`,
    html: shell("Auto-purchased lead", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>A lead matching your auto-buy preferences was purchased automatically.</p>
      <table style="font-size:14px;color:#2e3d5c">
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead ID</td><td><strong>${p.code}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Destination</td><td>${escapeHtml(p.destination)}</td></tr>
        ${p.travelDate ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Travel date</td><td>${escapeHtml(p.travelDate)}</td></tr>` : ""}
        ${p.travelers != null ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Travelers</td><td>${p.travelers}</td></tr>` : ""}
        ${/* Customer's stated trip budget is intentionally omitted — it's a
             rupee amount and the rest of this email is credit-denominated;
             mixing the two on the same receipt was reading as confusing. The
             agent can see the customer's budget inside the app if needed. */""}
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead quality</td><td>${escapeHtml(p.quality)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Charged</td><td><strong>${Math.max(1, Math.floor(p.price)).toLocaleString("en-IN")} Lead Credit${Math.max(1, Math.floor(p.price)) === 1 ? "" : "s"}</strong></td></tr>
      </table>`),
  };
}

export function agentLeadAlert(p: { agentName: string; destination: string; tripCategory: string | null; budget: number | null; quality: string; url: string }) {
  return {
    subject: `New matching lead on ${BRAND} — ${escapeHtml(p.destination)}`,
    html: shell(`New matching lead — ${escapeHtml(p.destination)}`, `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>A new lead matches your alert preferences. Move fast — leads are shared with a limited number of agents.</p>
      <table style="font-size:14px;color:#2e3d5c">
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Destination</td><td><strong>${escapeHtml(p.destination)}</strong></td></tr>
        ${p.tripCategory ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Category</td><td>${escapeHtml(p.tripCategory)}</td></tr>` : ""}
        ${/* Budget omitted — this is an alert nudging the agent to open the
             app; the credits-vs-rupees mismatch had no place in the summary. */""}
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead quality</td><td>${escapeHtml(p.quality)}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${p.url}" style="background:#f97316;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">View available leads</a></p>`),
  };
}

export function agentApproved(p: { agentName: string }) {
  return {
    subject: `Your ${BRAND} partner account is active`,
    html: shell("Welcome aboard", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>Your ${BRAND} partner account has been approved. You can now browse and purchase available travel leads.</p>`),
  };
}

export function walletCredited(p: { agentName: string; amount: number; balance: number }) {
  return {
    subject: `Your ${BRAND} Lead Credits have been topped up`,
    html: shell("Lead Credits added", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>${p.amount.toLocaleString("en-IN")} Lead Credits have been added to your account. New balance: <strong>${p.balance.toLocaleString("en-IN")}</strong>.</p>`),
  };
}

function codeBlock(code: string): string {
  return `<div style="margin:20px 0;text-align:center">
    <span style="display:inline-block;background:#f2f5fa;border-radius:10px;padding:14px 28px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0f1e38">${code}</span>
  </div>`;
}

export function verifyEmailCode(p: { name: string; code: string }) {
  const minutes = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES) || 15;
  return {
    subject: `Verify your ${BRAND} account`,
    html: shell(`Welcome to ${BRAND}`, `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>Verify your email address to activate your ${BRAND} account.</p>
      ${codeBlock(p.code)}
      <p style="color:#48608b;font-size:14px">Enter this code on the verification screen. It expires in ${minutes} minutes.</p>
      <p style="color:#9aabc9;font-size:12px">If you didn't create a ${BRAND} account, you can safely ignore this email.</p>`),
  };
}

export function twoFactorCode(p: { name: string; code: string }) {
  return {
    subject: `Your ${BRAND} security code`,
    html: shell("Your security code", `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>Use this code to finish signing in to ${BRAND}.</p>
      ${codeBlock(p.code)}
      <p style="color:#48608b;font-size:14px">This code expires in 10 minutes and can only be used once.</p>
      <p style="color:#9aabc9;font-size:12px">If you didn't try to sign in, change your password immediately.</p>`),
  };
}

export function securitySettingsChanged(p: { name: string; change: string }) {
  return {
    subject: `Your ${BRAND} account security settings changed`,
    html: shell("Security settings changed", `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>${escapeHtml(p.change)}</p>
      <p style="color:#48608b;font-size:14px">If this wasn't you, please contact support and change your password immediately.</p>`),
  };
}

export function supportTicketCreated(p: { name: string; subject: string; ticketRef: string; url: string }) {
  return {
    subject: `${BRAND} support ticket received — ${escapeHtml(p.ticketRef)}`,
    html: shell("We received your support request", `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>Thanks for reaching out. We've opened ticket <strong>${escapeHtml(p.ticketRef)}</strong> for you and our team will reply soon.</p>
      <p style="background:#f2f5fa;padding:10px 14px;border-radius:8px">Subject: <strong>${escapeHtml(p.subject)}</strong></p>
      <p style="margin-top:16px"><a href="${p.url}" style="background:#0f1e38;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">View ticket</a></p>`),
  };
}

export function supportTicketReply(p: { name: string; ticketRef: string; url: string; snippet?: string | null }) {
  return {
    subject: `New reply on your ${BRAND} support ticket ${escapeHtml(p.ticketRef)}`,
    html: shell(`New reply on ticket ${escapeHtml(p.ticketRef)}`, `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>Our support team has replied to your ticket.</p>
      ${p.snippet ? `<blockquote style="border-left:3px solid #0f1e38;padding:8px 14px;margin:14px 0;color:#48608b;background:#f8fafc">${escapeHtml(p.snippet)}</blockquote>` : ""}
      <p style="margin-top:16px"><a href="${p.url}" style="background:#0f1e38;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">View reply</a></p>`),
  };
}

export function adminInviteEmail(p: { name: string; adminRole: string; inviterName?: string | null; link: string }) {
  // Same "never log the raw link" rule as passwordResetEmail — the action_link
  // is a one-time credential that grants a set-password session on click.
  const roleLabel = p.adminRole.replace(/_/g, " ");
  const inviter = p.inviterName ? escapeHtml(p.inviterName) : "The team";
  return {
    subject: `You're invited to the ${BRAND} admin panel`,
    html: shell(`Welcome to the ${BRAND} admin panel`, `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>${inviter} has invited you to join the ${BRAND} admin panel as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p>Click the button below to accept the invite and set your password. For security, this link can only be used once and will expire.</p>
      <p style="margin:20px 0"><a href="${p.link}" style="background:#f97316;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Set your password</a></p>
      <p style="color:#48608b;font-size:14px">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;color:#6a80a8">${escapeHtml(p.link)}</span></p>
      <p style="color:#9aabc9;font-size:12px">If you weren't expecting this invite, you can safely ignore this email — no account will be activated until the link is used.</p>`),
  };
}

export function passwordResetEmail(p: { name: string; link: string; expiresMinutes: number }) {
  // NEVER put the raw token in log output — the link itself contains it.
  // This template renders it inside an <a href> only; nothing else logs `p.link`.
  return {
    subject: `Reset your ${BRAND} password`,
    html: shell("Reset your password", `
      <p>Hi ${escapeHtml(p.name)},</p>
      <p>We received a request to reset your ${BRAND} password. Click the button below to choose a new one. This link expires in ${p.expiresMinutes} minutes and can only be used once.</p>
      <p style="margin:20px 0"><a href="${p.link}" style="background:#0f1e38;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Reset password</a></p>
      <p style="color:#48608b;font-size:14px">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;color:#6a80a8">${escapeHtml(p.link)}</span></p>
      <p style="color:#9aabc9;font-size:12px">If you didn't request this, you can safely ignore this email — your password won't change.</p>`),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
