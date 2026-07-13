import { Resend } from "resend";

export function isOutreachEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.OUTREACH_FROM_EMAIL?.trim());
}

export async function sendOutreachEmail(params: {
  to: string;
  replyTo: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  outreachMessage: string;
  cvFileName: string;
  cvBuffer: Buffer;
}) {
  if (!isOutreachEmailConfigured()) {
    throw new Error("OUTREACH_EMAIL_NOT_CONFIGURED");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.OUTREACH_FROM_EMAIL!.trim();
  const subject = `CV — ${params.candidateName} for ${params.jobTitle} at ${params.company} (via CV2Jobs AI)`;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    replyTo: params.replyTo,
    subject,
    text: params.outreachMessage,
    attachments: [
      {
        filename: params.cvFileName,
        content: params.cvBuffer,
      },
    ],
  });

  if (error) throw new Error(error.message);
  return data;
}
