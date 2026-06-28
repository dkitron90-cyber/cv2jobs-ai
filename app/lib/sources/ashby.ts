import type { Job, JobSourceStatus } from "../types";
import {
  FETCH_HEADERS,
  inferWorkplaceFromText,
  isIsraelLocation,
  toPlainText,
} from "./shared";

type AshbySource = {
  id: string;
  company: string;
  slug: string;
};

type AshbyJob = {
  id: string;
  title: string;
  location: string;
  department?: string;
  team?: string;
  publishedAt: string;
  jobUrl: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  isRemote?: boolean;
  workplaceType?: string;
  secondaryLocations?: Array<{ location?: string }>;
};

type AshbyResponse = {
  jobs?: AshbyJob[];
};

export const ASHBY_SOURCES: AshbySource[] = [
  { id: "redis", company: "Redis", slug: "redis" },
];

function isIsraelJob(job: AshbyJob): boolean {
  return isIsraelLocation(
    job.location,
    ...(job.secondaryLocations ?? []).map((entry) => entry.location),
  );
}

function inferWorkplace(job: AshbyJob): Job["workplace"] {
  const searchable = [
    job.title,
    job.location,
    job.workplaceType,
    job.isRemote ? "remote" : "",
    toPlainText(job.descriptionHtml ?? job.descriptionPlain).slice(0, 2500),
  ].join(" ");

  if (job.isRemote) return "remote";
  if (job.workplaceType?.toLowerCase() === "remote") return "remote";
  if (job.workplaceType?.toLowerCase() === "hybrid") return "hybrid";
  if (job.workplaceType?.toLowerCase() === "onsite") return "on-site";
  return inferWorkplaceFromText(searchable);
}

function normalizeJob(source: AshbySource, job: AshbyJob): Job {
  return {
    id: `ashby:${source.id}:${job.id}`,
    source: "ashby",
    sourceLabel: "Ashby",
    company: source.company,
    title: job.title.trim(),
    location: job.location.trim() || "Israel",
    department: job.department?.trim() || job.team?.trim() || "General",
    description: job.descriptionPlain?.trim() || toPlainText(job.descriptionHtml),
    url: job.jobUrl,
    updatedAt: job.publishedAt,
    workplace: inferWorkplace(job),
  };
}

async function fetchSource(source: AshbySource): Promise<Job[]> {
  const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${source.slug}`, {
    headers: FETCH_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${source.company} returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as AshbyResponse;
  return (data.jobs ?? []).filter(isIsraelJob).map((job) => normalizeJob(source, job));
}

export async function fetchAshbyJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  const results = await Promise.allSettled(ASHBY_SOURCES.map(fetchSource));
  const jobs: Job[] = [];
  const sources = results.map((result, index): JobSourceStatus => {
    const source = ASHBY_SOURCES[index];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      return { id: source.id, company: source.company, jobCount: result.value.length, ok: true };
    }
    return { id: source.id, company: source.company, jobCount: 0, ok: false };
  });

  return { jobs, sources };
}
