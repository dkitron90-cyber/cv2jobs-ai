import type { Job, JobSourceStatus } from "../types";
import {
  FETCH_HEADERS,
  inferWorkplaceFromText,
  isIsraelLocation,
  toPlainText,
} from "./shared";

type LeverSource = {
  id: string;
  company: string;
  slug: string;
};

type LeverJob = {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  descriptionPlain?: string;
  description?: string;
  openingPlain?: string;
  additionalPlain?: string;
  workplaceType?: string;
  categories?: {
    location?: string;
    department?: string;
    team?: string;
    allLocations?: string[];
  };
  lists?: Array<{ text?: string; content?: string }>;
};

export const LEVER_SOURCES: LeverSource[] = [
  { id: "walkme", company: "WalkMe", slug: "walkme" },
  { id: "cloudinary", company: "Cloudinary", slug: "cloudinary" },
];

function isIsraelJob(job: LeverJob): boolean {
  return isIsraelLocation(
    job.categories?.location,
    ...(job.categories?.allLocations ?? []),
  );
}

function buildDescription(job: LeverJob): string {
  const sections = [
    job.openingPlain,
    job.descriptionPlain,
    ...(job.lists ?? []).map((list) => {
      const heading = list.text?.trim();
      const body = toPlainText(list.content);
      return heading && body ? `${heading}\n${body}` : body;
    }),
    job.additionalPlain,
  ].filter(Boolean);

  return sections.join("\n\n").trim();
}

function inferWorkplace(job: LeverJob): Job["workplace"] {
  const searchable = [
    job.text,
    job.categories?.location,
    job.workplaceType,
    buildDescription(job).slice(0, 2500),
  ].join(" ");

  if (job.workplaceType === "remote") return "remote";
  if (job.workplaceType === "hybrid") return "hybrid";
  if (job.workplaceType === "onsite") return "on-site";
  return inferWorkplaceFromText(searchable);
}

function normalizeJob(source: LeverSource, job: LeverJob): Job {
  return {
    id: `lever:${source.id}:${job.id}`,
    source: "lever",
    sourceLabel: "Lever",
    company: source.company,
    title: job.text.trim(),
    location: job.categories?.location?.trim() || "Israel",
    department: job.categories?.department?.trim() || job.categories?.team?.trim() || "General",
    description: buildDescription(job),
    url: job.hostedUrl,
    updatedAt: new Date(job.createdAt).toISOString(),
    workplace: inferWorkplace(job),
  };
}

async function fetchSource(source: LeverSource): Promise<Job[]> {
  const response = await fetch(`https://api.lever.co/v0/postings/${source.slug}?mode=json`, {
    headers: FETCH_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${source.company} returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as LeverJob[];
  return data.filter(isIsraelJob).map((job) => normalizeJob(source, job));
}

export async function fetchLeverJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  const results = await Promise.allSettled(LEVER_SOURCES.map(fetchSource));
  const jobs: Job[] = [];
  const sources = results.map((result, index): JobSourceStatus => {
    const source = LEVER_SOURCES[index];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      return { id: source.id, company: source.company, jobCount: result.value.length, ok: true };
    }
    return { id: source.id, company: source.company, jobCount: 0, ok: false };
  });

  return { jobs, sources };
}
