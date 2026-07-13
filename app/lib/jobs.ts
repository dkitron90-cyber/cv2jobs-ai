import type { Job, JobSourceStatus } from "./types";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchComeetJobs } from "./sources/comeet";
import { fetchDrushimJobs } from "./sources/drushim";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
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

async function fetchFreshSnapshot(): Promise<JobsSnapshot> {
  const [greenhouse, lever, ashby, comeet, drushim] = await Promise.all([
    fetchGreenhouseJobs(),
    fetchLeverJobs(),
    fetchAshbyJobs(),
    fetchComeetJobs(),
    fetchDrushimJobs(),
  ]);

  return {
    jobs: deduplicateJobs([
      ...greenhouse.jobs,
      ...lever.jobs,
      ...ashby.jobs,
      ...comeet.jobs,
      ...drushim.jobs,
    ]),
    sources: [...greenhouse.sources, ...lever.sources, ...ashby.sources, ...comeet.sources, ...drushim.sources],
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
