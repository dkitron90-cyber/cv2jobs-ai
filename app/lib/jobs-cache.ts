import type { JobsSnapshot } from "./jobs";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const JOBS_CACHE_ROW_ID = "latest";

type JobsCacheRow = {
  id: string;
  payload: JobsSnapshot;
  refreshed_at: string;
};

function createReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadPersistedSnapshot(): Promise<JobsSnapshot | null> {
  const client = createReadClient();
  if (!client) return null;

  const { data, error } = await client
    .from("jobs_cache")
    .select("payload, refreshed_at")
    .eq("id", JOBS_CACHE_ROW_ID)
    .maybeSingle<Pick<JobsCacheRow, "payload" | "refreshed_at">>();

  if (error || !data?.payload?.jobs?.length) return null;

  return {
    ...data.payload,
    refreshedAt: data.payload.refreshedAt || data.refreshed_at,
  };
}

export async function savePersistedSnapshot(snapshot: JobsSnapshot): Promise<boolean> {
  const client = createAdminClient();
  if (!client) return false;

  const { error } = await client.from("jobs_cache").upsert({
    id: JOBS_CACHE_ROW_ID,
    payload: snapshot,
    refreshed_at: snapshot.refreshedAt,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

export function isSnapshotStale(refreshedAt: string, maxAgeMs: number): boolean {
  const refreshed = Date.parse(refreshedAt);
  if (Number.isNaN(refreshed)) return true;
  return Date.now() - refreshed > maxAgeMs;
}
