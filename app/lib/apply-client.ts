import type { ApplyResponse, Job } from "./types";

export type ApplyChannel = "portal" | "email" | "none" | "popup_blocked";

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
