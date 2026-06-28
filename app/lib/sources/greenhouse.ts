import type { Job, JobSourceStatus } from "../types";
import {
  FETCH_HEADERS,
  inferWorkplaceFromText,
  isIsraelLocation,
  toPlainText,
} from "./shared";

type GreenhouseSource = {
  id: string;
  company: string;
  token: string;
};

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string }>;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

export const GREENHOUSE_SOURCES: GreenhouseSource[] = [
  { id: "appsflyer", company: "AppsFlyer", token: "appsflyer" },
  { id: "similarweb", company: "Similarweb", token: "similarweb" },
  { id: "riskified", company: "Riskified", token: "riskified" },
  { id: "taboola", company: "Taboola", token: "taboola" },
  { id: "lightricks", company: "Lightricks", token: "lightricks" },
  { id: "yotpo", company: "Yotpo", token: "yotpo" },
  { id: "via", company: "Via", token: "via" },
  { id: "wiz", company: "Wiz", token: "wizinc" },
  { id: "armis", company: "Armis", token: "armissecurity" },
  { id: "melio", company: "Melio", token: "melio" },
  { id: "jfrog", company: "JFrog", token: "jfrog" },
  { id: "forter", company: "Forter", token: "forter" },
  { id: "gong", company: "Gong", token: "gongio" },
  { id: "orca-security", company: "Orca Security", token: "orcasecurity" },
  { id: "torq", company: "Torq", token: "torq" },
  { id: "payoneer", company: "Payoneer", token: "payoneer" },
  { id: "catonetworks", company: "Cato Networks", token: "catonetworks" },
  { id: "nice", company: "NICE", token: "nice" },
  { id: "mongodb", company: "MongoDB", token: "mongodb" },
  { id: "fireblocks", company: "Fireblocks", token: "fireblocks" },
  { id: "elastic", company: "Elastic", token: "elastic" },
  { id: "datadog", company: "Datadog", token: "datadog" },
  { id: "bigid", company: "BigID", token: "bigid" },
];

function isIsraelJob(job: GreenhouseJob): boolean {
  return isIsraelLocation(
    job.location?.name,
    ...(job.offices ?? []).flatMap((office) => [office.name, office.location]),
  );
}

function inferWorkplace(job: GreenhouseJob): Job["workplace"] {
  const searchable = `${job.title} ${job.location?.name ?? ""} ${toPlainText(job.content).slice(0, 2500)}`;
  return inferWorkplaceFromText(searchable);
}

function normalizeJob(source: GreenhouseSource, job: GreenhouseJob): Job {
  return {
    id: `greenhouse:${source.id}:${job.id}`,
    source: "greenhouse",
    sourceLabel: "Greenhouse",
    company: source.company,
    title: job.title.trim(),
    location: job.location?.name?.trim() || "Israel",
    department: job.departments?.[0]?.name?.trim() || "General",
    description: toPlainText(job.content),
    url: job.absolute_url,
    updatedAt: job.updated_at,
    workplace: inferWorkplace(job),
  };
}

async function fetchSource(source: GreenhouseSource): Promise<Job[]> {
  const response = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${source.token}/jobs?content=true`,
    {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`${source.company} returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as GreenhouseResponse;
  return (data.jobs ?? []).filter(isIsraelJob).map((job) => normalizeJob(source, job));
}

export async function fetchGreenhouseJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  const results = await Promise.allSettled(GREENHOUSE_SOURCES.map(fetchSource));
  const jobs: Job[] = [];
  const sources = results.map((result, index): JobSourceStatus => {
    const source = GREENHOUSE_SOURCES[index];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      return { id: source.id, company: source.company, jobCount: result.value.length, ok: true };
    }
    return { id: source.id, company: source.company, jobCount: 0, ok: false };
  });

  return { jobs, sources };
}
