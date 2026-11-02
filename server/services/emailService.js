// Sends email through Resend (https://resend.com). Without RESEND_API_KEY
// emails are printed to the server console, so sign-in links still work in
// local development.

export const isEmailConfigured = () => !!process.env.RESEND_API_KEY;

export const appUrl = (path = "/") =>
  `${(process.env.FRONTEND_URL || "http://localhost:5174").replace(/\/$/, "")}${path}`;

const escapeHtml = (text = "") =>
  String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// A plain layout every email shares: a heading, paragraphs and one button
export const layout = ({ heading, paragraphs = [], button, footer }) => `<!doctype html>
<html><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1c2333">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:14px;font-weight:bold;color:#1f3a5f;padding-bottom:20px">Munim.AI</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
${paragraphs.map((text) => `<tr><td style="font-size:15px;line-height:1.55;padding-bottom:12px">${text}</td></tr>`).join("")}
${button ? `<tr><td style="padding:12px 0 8px"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px">${escapeHtml(button.label)}</a></td></tr>` : ""}
${footer ? `<tr><td style="font-size:12px;color:#6b7280;padding-top:20px">${footer}</td></tr>` : ""}
</table></td></tr></table></body></html>`;

export { escapeHtml };

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.info(`\n[email to ${to}] ${subject}\n${text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return { logged: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Munim.AI <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
};
