// Mirrors the max lengths in core/src/schemas/ticket.ts's inboundEmailSchema — keep in sync.
const MAX_LENGTHS = { subject: 255, fromName: 255, body: 1000, bodyHtml: 2000 };

function parseFromHeader(raw: string): { name: string; email: string } {
  // SendGrid's "from" field looks like `"Jane Doe" <jane@example.com>` or a bare email address.
  const match = raw.match(/^(.*)<([^<>]+)>\s*$/);
  if (match) {
    const name = match[1]!.trim().replace(/^"|"$/g, "");
    const email = match[2]!.trim();
    return { name: name || email, email };
  }
  const email = raw.trim();
  return { name: email, email };
}

// SendGrid's Inbound Parse POSTs multipart/form-data with its own field names (from/subject/
// text/html/...), not the { fromEmail, fromName, subject, body, bodyHtml } shape this app's
// webhook otherwise expects — this maps one to the other. Real email content can easily exceed
// inboundEmailSchema's limits (e.g. a 1000-char body), so values are truncated here rather than
// letting validateBody reject an otherwise-legitimate email outright.
export function parseSendGridInboundPayload(fields: Record<string, string>) {
  const { name: fromName, email: fromEmail } = parseFromHeader(fields.from ?? "");
  const subject = (fields.subject || "(no subject)").slice(0, MAX_LENGTHS.subject);
  const body = (fields.text ?? "").slice(0, MAX_LENGTHS.body);
  const bodyHtml = fields.html ? fields.html.slice(0, MAX_LENGTHS.bodyHtml) : undefined;

  return {
    fromEmail,
    fromName: fromName.slice(0, MAX_LENGTHS.fromName),
    subject,
    body,
    bodyHtml,
  };
}
