import type { ApplyResponse, Job } from "./types";

export type PreparedApplication = ApplyResponse & {
  job: Job;
  status: "ready" | "sent" | "error";
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

export function openApplyDestination(application: ApplyResponse) {
  if (application.applyUrl) {
    window.open(application.applyUrl, "_blank", "noopener,noreferrer");
    return "portal";
  }

  if (application.contactEmail) {
    const subject = encodeURIComponent(`Application — ${application.candidateName}`);
    const body = encodeURIComponent(application.coverLetter);
    window.location.href = `mailto:${application.contactEmail}?subject=${subject}&body=${body}`;
    return "email";
  }

  return "none";
}

export async function prepareApplication(params: {
  file: File;
  job: Job;
  locale: string;
}): Promise<ApplyResponse> {
  const form = new FormData();
  form.append("cv", params.file);
  form.append("locale", params.locale);
  form.append("jobTitle", params.job.title);
  form.append("company", params.job.company);
  form.append("jobUrl", params.job.url);
  form.append("jobDescription", params.job.description);

  const response = await fetch("/api/apply", { method: "POST", body: form });
  const data = (await response.json()) as ApplyResponse & { error?: string };
  if (!response.ok) throw new Error(data.error || "apply failed");
  return data;
}

export async function sendApplicationPackage(file: File, application: ApplyResponse) {
  downloadCvFile(file);
  await copyText(application.coverLetter);
  const channel = openApplyDestination(application);
  return channel;
}
