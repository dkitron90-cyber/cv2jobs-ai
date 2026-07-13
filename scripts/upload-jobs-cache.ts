import { readFileSync } from "node:fs";
import { savePersistedSnapshot } from "../app/lib/jobs-cache";
import type { JobsSnapshot } from "../app/lib/jobs";

async function main() {
  const raw = readFileSync(new URL("../tmp-jobs.json", import.meta.url), "utf8");
  const payload = JSON.parse(raw) as { jobs: JobsSnapshot["jobs"]; sources: JobsSnapshot["sources"]; refreshedAt: string };
  const snapshot: JobsSnapshot = {
    jobs: payload.jobs,
    sources: payload.sources,
    refreshedAt: payload.refreshedAt,
  };

  const ok = await savePersistedSnapshot(snapshot);
  if (!ok) {
    console.error("Save failed");
    process.exit(1);
  }

  console.log(`Saved ${snapshot.jobs.length} jobs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
