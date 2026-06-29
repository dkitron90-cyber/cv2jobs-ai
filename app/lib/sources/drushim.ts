import type { Job, JobSourceStatus } from "../types";
import { decodeEntities, inferWorkplaceFromText, toPlainText } from "./shared";

const DRUSHIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; CV2JobsAI/0.2)",
  "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
  Referer: "https://www.drushim.co.il/",
};

const MAX_PAGES = 12;
const PAGE_SIZE = 10;

type DrushimSearchResponse = {
  ResultList?: DrushimResult[];
  TotalPagesNumber?: number;
};

type DrushimResult = {
  Code?: number;
  Company?: {
    NameInHebrew?: string;
    CompanyDisplayName?: string;
  };
  JobContent?: {
    Name?: string;
    FullName?: string;
    Description?: string;
    Requirements?: string;
    Categories?: Array<{ NameInHebrew?: string }>;
    SubCategories?: Array<{ NameInHebrew?: string }>;
    Scopes?: Array<{ NameInHebrew?: string }>;
    Addresses?: Array<{ City?: string; CityEnglish?: string }>;
    Zones?: Array<{ NameInHebrew?: string }>;
  };
  JobInfo?: {
    Link?: string;
    DisplayDate?: string;
    Date?: string;
  };
};

function buildDescription(job: DrushimResult): string {
  const parts = [job.JobContent?.Description, job.JobContent?.Requirements]
    .filter(Boolean)
    .map((part) => toPlainText(String(part).replace(/<br\s*\/?>/gi, "\n")));

  return parts.join("\n\n").trim();
}

function buildLocation(job: DrushimResult): string {
  const cities = [...new Set((job.JobContent?.Addresses ?? []).map((entry) => entry.City?.trim()).filter(Boolean))];
  if (cities.length > 0) return cities.slice(0, 3).join(", ");

  const zones = (job.JobContent?.Zones ?? []).map((zone) => zone.NameInHebrew?.trim()).filter(Boolean);
  if (zones.length > 0) return zones.join(", ");

  return "ישראל";
}

function buildDepartment(job: DrushimResult): string {
  const subCategories = (job.JobContent?.SubCategories ?? []).map((entry) => entry.NameInHebrew?.trim()).filter(Boolean);
  if (subCategories.length > 0) return subCategories[0] as string;

  const categories = (job.JobContent?.Categories ?? []).map((entry) => entry.NameInHebrew?.trim()).filter(Boolean);
  if (categories.length > 0) return categories[0] as string;

  return "היי-טק";
}

function inferWorkplace(job: DrushimResult): Job["workplace"] {
  const searchable = [
    job.JobContent?.FullName,
    job.JobContent?.Name,
    ...(job.JobContent?.Scopes ?? []).map((scope) => scope.NameInHebrew),
    buildDescription(job).slice(0, 2500),
  ]
    .filter(Boolean)
    .join(" ");

  return inferWorkplaceFromText(searchable);
}

function normalizeJob(job: DrushimResult): Job | null {
  const code = job.Code ?? job.JobInfo?.Link?.match(/\/job\/(\d+)\//)?.[1];
  const link = job.JobInfo?.Link;
  if (!code || !link) return null;

  const title = decodeEntities(job.JobContent?.FullName || job.JobContent?.Name || "").trim();
  if (!title) return null;

  return {
    id: `drushim:${code}`,
    source: "drushim",
    sourceLabel: "Drushim",
    company: decodeEntities(job.Company?.NameInHebrew || job.Company?.CompanyDisplayName || "חברה").trim(),
    title,
    location: buildLocation(job),
    department: buildDepartment(job),
    description: buildDescription(job),
    url: link.startsWith("http") ? link : `https://www.drushim.co.il${link}`,
    updatedAt: job.JobInfo?.DisplayDate || job.JobInfo?.Date || new Date().toISOString(),
    workplace: inferWorkplace(job),
  };
}

async function fetchPage(page: number): Promise<DrushimSearchResponse> {
  const params = new URLSearchParams({
    Page: String(page),
    PageSize: String(PAGE_SIZE),
    catdir: "25",
  });

  const response = await fetch(`https://www.drushim.co.il/api/jobs/search?${params.toString()}`, {
    headers: DRUSHIM_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Drushim returned HTTP ${response.status}`);
  }

  return (await response.json()) as DrushimSearchResponse;
}

export async function fetchDrushimJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  try {
    const firstPage = await fetchPage(1);
    const totalPages = Math.min(firstPage.TotalPagesNumber ?? 1, MAX_PAGES);
    const otherPages = await Promise.all(
      Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => fetchPage(index + 2)),
    );
    const pages = [firstPage, ...otherPages];

    const jobs = pages
      .flatMap((page) => page.ResultList ?? [])
      .map(normalizeJob)
      .filter((job): job is Job => job !== null);

    return {
      jobs,
      sources: [{ id: "drushim-hitech", company: "Drushim", jobCount: jobs.length, ok: true }],
    };
  } catch {
    return {
      jobs: [],
      sources: [{ id: "drushim-hitech", company: "Drushim", jobCount: 0, ok: false }],
    };
  }
}
