import { refreshJobsSnapshot } from "../app/lib/jobs";

async function main() {
  console.log("Refreshing job sources and saving cache...");
  const snapshot = await refreshJobsSnapshot();
  console.log(`Saved ${snapshot.jobs.length} jobs at ${snapshot.refreshedAt}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
