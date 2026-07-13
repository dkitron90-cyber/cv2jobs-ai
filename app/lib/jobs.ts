import type { Job, JobSourceStatus } from "./types";
import { detectContentLanguage } from "./text-language";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchComeetJobs } from "./sources/comeet";
import { fetchDrushimJobs } from "./sources/drushim";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import { fetchLinkedInJobs, fetchLinkedInJobDescription } from "./sources/linkedin";
import { deduplicateJobs } from "./sources/shared";
import { loadPersistedSnapshot, savePersistedSnapshot } from "./jobs-cache";

export type JobsSnapshot = {
  jobs: Job[];
  sources: JobSourceStatus[];
  refreshedAt: string;
};

export const JOBS_BACKGROUND_REFRESH_MS = 4 * 60 * 60 * 1000;

let memoryCache: { expiresAt: number; snapshot: JobsSnapshot } | null = null;
let refreshInFlight: Promise<JobsSnapshot> | null = null;

function enrichJob(job: Job): Job {
  return {
    ...job,
    contentLanguage: detectContentLanguage(`${job.title}\n${job.description.slice(0, 2000)}`),
  };
}

function enrichJobs(jobs: Job[]): Job[] {
  return jobs.map(enrichJob);
}

async function fetchFreshSnapshot(): Promise<JobsSnapshot> {
  const [greenhouse, lever, ashby, comeet, drushim, linkedin] = await Promise.all([
    fetchGreenhouseJobs(),
    fetchLeverJobs(),
    fetchAshbyJobs(),
    fetchComeetJobs(),
    fetchDrushimJobs(),
    fetchLinkedInJobs(),
  ]);

  return {
    jobs: enrichJobs(deduplicateJobs([
      ...greenhouse.jobs,
      ...lever.jobs,
      ...ashby.jobs,
      ...comeet.jobs,
      ...drushim.jobs,
      ...linkedin.jobs,
    ])),
    sources: [
      ...greenhouse.sources,
      ...lever.sources,
      ...ashby.sources,
      ...comeet.sources,
      ...drushim.sources,
      ...linkedin.sources,
    ],
    refreshedAt: new Date().toISOString(),
  };
}

export async function refreshJobsSnapshot(): Promise<JobsSnapshot> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const snapshot = await fetchFreshSnapshot();
      memoryCache = { expiresAt: Date.now() + 15 * 60 * 1000, snapshot };
      await savePersistedSnapshot(snapshot);
      return snapshot;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function getJobsSnapshot(forceRefresh = false): Promise<JobsSnapshot> {
  if (!forceRefresh && memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.snapshot;
  }

  if (!forceRefresh) {
    const persisted = await loadPersistedSnapshot();
    if (persisted) {
      memoryCache = { expiresAt: Date.now() + 15 * 60 * 1000, snapshot: persisted };
      return persisted;
    }
  }

  return refreshJobsSnapshot();
}

export async function getJobById(jobId: string, forceRefresh = false): Promise<Job | null> {
  const snapshot = await getJobsSnapshot(forceRefresh);
  const job = snapshot.jobs.find((entry) => entry.id === jobId) ?? null;
  if (!job) return null;

  // LinkedIn search results do not include descriptions; fetch on first open.
  if (job.source === "linkedin" && !job.description) {
    const description = await fetchLinkedInJobDescription(job.id);
    if (description) {
      job.description = description;
      job.contentLanguage = detectContentLanguage(`${job.title}\n${description.slice(0, 2000)}`);
    }
  }

  return job;
}
