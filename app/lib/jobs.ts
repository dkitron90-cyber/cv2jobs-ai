import type { Job, JobSourceStatus } from "./types";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchComeetJobs } from "./sources/comeet";
import { fetchDrushimJobs } from "./sources/drushim";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import { deduplicateJobs } from "./sources/shared";

export type JobsSnapshot = {
  jobs: Job[];
  sources: JobSourceStatus[];
  refreshedAt: string;
};

let memoryCache: { expiresAt: number; snapshot: JobsSnapshot } | null = null;

export async function getJobsSnapshot(forceRefresh = false): Promise<JobsSnapshot> {
  if (!forceRefresh && memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.snapshot;
  }

  const [greenhouse, lever, ashby, comeet, drushim] = await Promise.all([
    fetchGreenhouseJobs(),
    fetchLeverJobs(),
    fetchAshbyJobs(),
    fetchComeetJobs(),
    fetchDrushimJobs(),
  ]);

  const snapshot = {
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

  memoryCache = { expiresAt: Date.now() + 15 * 60 * 1000, snapshot };
  return snapshot;
}
