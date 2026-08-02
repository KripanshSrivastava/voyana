// Reusable transactional email templates (inline-styled, client-safe HTML).

function shell(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f1e38">
    <div style="background:#0f1e38;padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:20px;font-weight:700">Voyana</span>
    </div>
    <div style="border:1px solid #e2e8f2;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <p style="color:#9aabc9;font-size:12px;text-align:center;margin-top:16px">Voyana — Your trip. Your way.</p>
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
  return {
    subject: `Lead purchase receipt — ${p.code}`,
    html: shell("New lead purchased", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>You've purchased lead <strong>${p.code}</strong> for <strong>${escapeHtml(p.destination)}</strong>. Customer contact details are now available in your dashboard.</p>
      <p style="background:#f2f5fa;padding:10px 14px;border-radius:8px">Amount charged: <strong>₹${p.price.toLocaleString("en-IN")}</strong></p>
      <p style="color:#48608b;font-size:14px">Tip: contact the customer quickly — faster responses convert better.</p>`),
  };
}

export function agentAutoLeadPurchased(p: { agentName: string; code: string; destination: string; price: number; travelDate?: string | null; travelers?: number | null; budget?: number | null; quality: string }) {
  return {
    subject: `New Lead Auto-Purchased — ${p.code}`,
    html: shell("Auto-purchased lead", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>A lead matching your auto-buy preferences was purchased automatically.</p>
      <table style="font-size:14px;color:#2e3d5c">
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead ID</td><td><strong>${p.code}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Destination</td><td>${escapeHtml(p.destination)}</td></tr>
        ${p.travelDate ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Travel date</td><td>${escapeHtml(p.travelDate)}</td></tr>` : ""}
        ${p.travelers != null ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Travelers</td><td>${p.travelers}</td></tr>` : ""}
        ${p.budget != null ? `<tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Budget</td><td>₹${p.budget.toLocaleString("en-IN")}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Lead quality</td><td>${escapeHtml(p.quality)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6a80a8">Purchase price</td><td><strong>₹${p.price.toLocaleString("en-IN")}</strong></td></tr>
      </table>`),
  };
}

export function agentApproved(p: { agentName: string }) {
  return {
    subject: "Your Voyana partner account is active",
    html: shell("Welcome aboard", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>Your Voyana partner account has been approved. You can now browse and purchase available travel leads.</p>`),
  };
}

export function walletCredited(p: { agentName: string; amount: number; balance: number }) {
  return {
    subject: "Your Voyana wallet has been credited",
    html: shell("Wallet credited", `
      <p>Hi ${escapeHtml(p.agentName)},</p>
      <p>₹${p.amount.toLocaleString("en-IN")} has been added to your wallet. New balance: <strong>₹${p.balance.toLocaleString("en-IN")}</strong>.</p>`),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
