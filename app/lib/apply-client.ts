import type { ApplyResponse, Job } from "./types";

export type ApplyChannel = "portal" | "email" | "none" | "popup_blocked";
export type SendMode = "portal" | "recruiter";

export type PreparedApplication = ApplyResponse & {
  job: Job;
  status: "ready" | "sent" | "error";
};

export type PrepareApplicationOptions = {
  file: File;
  job: Job;
  locale: string;
  cvText?: string;
  coverLetter?: string;
  recruiterMessage?: string;
  matchScore?: number;
  candidateName?: string;
};

export async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function downloadCvFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function openRecruiterEmail(application: ApplyResponse): ApplyChannel {
  if (!application.contactEmail) return "none";

  const subject = encodeURIComponent(
    `CV for ${application.candidateName} — ${application.outreachMessage.includes("CV2Jobs") ? "via CV2Jobs AI" : "application"}`,
  );
  const intro = application.outreachMessage.slice(0, 700).trim();
  const body = encodeURIComponent(
    `${intro}${application.outreachMessage.length > 700 ? "\n\n[Full message copied to your clipboard — paste it here and attach your CV.]" : "\n\n[Attach your downloaded CV file before sending.]"}`,
  );
  window.location.href = `mailto:${application.contactEmail}?subject=${subject}&body=${body}`;
  return "email";
}

export function openApplyDestination(application: ApplyResponse): ApplyChannel {
  if (application.applyUrl) {
    const opened = window.open(application.applyUrl, "_blank", "noopener,noreferrer");
    if (!opened) return "popup_blocked";
    return "portal";
  }

  if (application.contactEmail) {
    const subject = encodeURIComponent(`Application — ${application.candidateName}`);
    const intro = application.coverLetter.slice(0, 600).trim();
    const body = encodeURIComponent(
      `${intro}${application.coverLetter.length > 600 ? "\n\n[Full cover letter copied to your clipboard — paste it here.]" : ""}`,
    );
    window.location.href = `mailto:${application.contactEmail}?subject=${subject}&body=${body}`;
    return "email";
  }

  return "none";
}

export async function sendOutreachAutomatically(params: {
  file: File;
  application: ApplyResponse;
  job: Job;
  locale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("cv", params.file);
  form.append("locale", params.locale);
  form.append("to", params.application.contactEmail || "");
  form.append("candidateName", params.application.candidateName);
  form.append("jobTitle", params.job.title);
  form.append("company", params.job.company);
  form.append("outreachMessage", params.application.outreachMessage);

  const response = await fetch("/api/send-outreach", { method: "POST", body: form });
  const data = (await response.json()) as { ok?: boolean; error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error || "send failed" };
  }

  return { ok: true };
}

export async function isAutoOutreachAvailable() {
  try {
    const response = await fetch("/api/send-outreach");
    if (!response.ok) return false;
    const data = (await response.json()) as { available?: boolean };
    return Boolean(data.available);
  } catch {
    return false;
  }
}

export async function prepareApplication(params: PrepareApplicationOptions): Promise<ApplyResponse> {
  const form = new FormData();
  form.append("cv", params.file);
  form.append("locale", params.locale);
  form.append("jobTitle", params.job.title);
  form.append("company", params.job.company);
  form.append("jobUrl", params.job.url);
  form.append("jobDescription", params.job.description);

  if (params.cvText) form.append("cvText", params.cvText);
  if (params.coverLetter) form.append("coverLetter", params.coverLetter);
  if (params.recruiterMessage) form.append("recruiterMessage", params.recruiterMessage);
  if (params.matchScore != null) form.append("matchScore", String(params.matchScore));
  if (params.candidateName) form.append("candidateName", params.candidateName);

  const response = await fetch("/api/apply", { method: "POST", body: form });
  const data = (await response.json()) as ApplyResponse & { error?: string };
  if (!response.ok) throw new Error(data.error || "apply failed");
  return data;
}

export async function primeApplicationPackage(file: File, application: ApplyResponse) {
  downloadCvFile(file);
  await copyText(application.coverLetter);
  return openApplyDestination(application);
}
