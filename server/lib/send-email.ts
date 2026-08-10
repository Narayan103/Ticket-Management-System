import sgMail from "@sendgrid/mail";
import { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL } from "../env";

sgMail.setApiKey(SENDGRID_API_KEY);

function threadedSubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export async function sendTicketReplyEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  await sgMail.send({ to, from: SENDGRID_FROM_EMAIL, subject: threadedSubject(subject), text: body });
}
