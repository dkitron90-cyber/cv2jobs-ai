import type { JobsResponse } from "./types";

const CACHE_KEY = "cv2jobs:jobs-cache";
const CACHE_VERSION = 2;

type StoredJobsCache = {
  version: number;
  savedAt: string;
  data: JobsResponse;
};

export function readLocalJobsCache(): JobsResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredJobsCache;
    if (parsed.version !== CACHE_VERSION || !parsed.data?.jobs?.length) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeLocalJobsCache(data: JobsResponse): void {
  if (typeof window === "undefined") return;

  try {
    const payload: StoredJobsCache = {
      version: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}
