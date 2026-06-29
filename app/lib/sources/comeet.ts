import type { Job, JobSourceStatus } from "../types";
import {
  FETCH_HEADERS,
  inferWorkplaceFromText,
  isIsraelLocation,
  toPlainText,
} from "./shared";

type ComeetSource = {
  id: string;
  company: string;
  slug: string;
  uid: string;
};

type ComeetLocation = {
  name?: string;
  country?: string;
  city?: string;
  is_remote?: boolean;
};

type ComeetJob = {
  uid: string;
  name: string;
  department?: string;
  workplace_type?: string;
  time_updated?: string;
  location?: ComeetLocation;
  url_active_page?: string;
  url_comeet_hosted_page?: string;
  details?: Array<{ name?: string; value?: string; order?: number }>;
};

const COMEET_PAGE_HEADERS = {
  ...FETCH_HEADERS,
  Accept: "text/html,application/xhtml+xml",
};

export const COMEET_SOURCES: ComeetSource[] = [
  { id: "crossriver", company: "Cross River", slug: "crossriver", uid: "C7.00F" },
  { id: "ceva", company: "Ceva", slug: "ceva", uid: "76.005" },
  { id: "kayhut", company: "Kayhut", slug: "Kayhut", uid: "F0.00B" },
  { id: "imagene-ai", company: "Imagene AI", slug: "imagene-ai", uid: "D7.000" },
  { id: "moonshot", company: "Moonshot", slug: "moonshot", uid: "87.005" },
  { id: "groundcover", company: "Groundcover", slug: "groundcover", uid: "88.008" },
];

function isIsraelJob(job: ComeetJob): boolean {
  return (
    job.location?.country === "IL" ||
    isIsraelLocation(job.location?.name, job.location?.city)
  );
}

function buildDescription(job: ComeetJob): string {
  return (job.details ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((detail) => {
      const heading = detail.name?.trim();
      const body = toPlainText(detail.value);
      return heading && body ? `${heading}\n${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function inferWorkplace(job: ComeetJob): Job["workplace"] {
  const searchable = [
    job.name,
    job.location?.name,
    job.workplace_type,
    job.location?.is_remote ? "remote" : "",
    buildDescription(job).slice(0, 2500),
  ].join(" ");

  if (job.location?.is_remote && !/\bhybrid\b/i.test(searchable)) return "remote";
  if (job.workplace_type?.toLowerCase() === "remote") return "remote";
  if (job.workplace_type?.toLowerCase() === "hybrid") return "hybrid";
  if (job.workplace_type?.toLowerCase() === "onsite") return "on-site";
  return inferWorkplaceFromText(searchable);
}

function normalizeJob(source: ComeetSource, job: ComeetJob): Job {
  return {
    id: `comeet:${source.id}:${job.uid}`,
    source: "comeet",
    sourceLabel: "Comeet",
    company: source.company,
    title: job.name.trim(),
    location: job.location?.name?.trim() || job.location?.city?.trim() || "Israel",
    department: job.department?.trim() || "General",
    description: buildDescription(job),
    url: job.url_active_page || job.url_comeet_hosted_page || `https://www.comeet.com/jobs/${source.slug}/${source.uid}`,
    updatedAt: job.time_updated || new Date().toISOString(),
    workplace: inferWorkplace(job),
  };
}

async function resolveComeetToken(source: ComeetSource): Promise<string> {
  const response = await fetch(`https://www.comeet.com/jobs/${source.slug}/${source.uid}`, {
    headers: COMEET_PAGE_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`${source.company} careers page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(
    new RegExp(
      `"company_uid"\\s*:\\s*"${source.uid.replace(/\./g, "\\.")}"[\\s\\S]*?"token"\\s*:\\s*"([^"]+)"`,
    ),
  );

  if (!match?.[1]) {
    throw new Error(`${source.company} careers token not found`);
  }

  return match[1];
}

async function fetchSource(source: ComeetSource): Promise<Job[]> {
  const token = await resolveComeetToken(source);
  const response = await fetch(
    `https://www.comeet.co/careers-api/2.0/company/${source.uid}/positions?token=${token}&details=true`,
    {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    throw new Error(`${source.company} returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as ComeetJob[];
  return data.filter(isIsraelJob).map((job) => normalizeJob(source, job));
}

export async function fetchComeetJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  const results = await Promise.allSettled(COMEET_SOURCES.map(fetchSource));
  const jobs: Job[] = [];
  const sources = results.map((result, index): JobSourceStatus => {
    const source = COMEET_SOURCES[index];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      return { id: source.id, company: source.company, jobCount: result.value.length, ok: true };
    }
    return { id: source.id, company: source.company, jobCount: 0, ok: false };
  });

  return { jobs, sources };
}
