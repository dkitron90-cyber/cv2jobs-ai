import { after, NextRequest, NextResponse } from "next/server";
import { isSnapshotStale } from "../../lib/jobs-cache";
import { toJobSummaries } from "../../lib/job-summary";
import { getJobById, getJobsSnapshot, JOBS_BACKGROUND_REFRESH_MS, refreshJobsSnapshot } from "../../lib/jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId")?.trim() ?? "";
    const query = searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
    const company = searchParams.get("company")?.trim().toLocaleLowerCase() ?? "";
    const workplace = searchParams.get("workplace")?.trim() ?? "";
    const forceRefresh = searchParams.get("refresh") === "1";

    if (jobId) {
      const job = await getJobById(jobId, forceRefresh);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json(
        { job },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        },
      );
    }

    const snapshot = await getJobsSnapshot(forceRefresh);

    if (!forceRefresh && isSnapshotStale(snapshot.refreshedAt, JOBS_BACKGROUND_REFRESH_MS)) {
      after(async () => {
        try {
          await refreshJobsSnapshot();
        } catch {
          // Keep serving the last saved snapshot if background refresh fails.
        }
      });
    }

    const jobs = toJobSummaries(snapshot.jobs).filter((job) => {
      const haystack = [job.title, job.company, job.location, job.department]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!company || job.company.toLocaleLowerCase() === company) &&
        (!workplace || job.workplace === workplace)
      );
    });

    return NextResponse.json(
      {
        jobs,
        total: jobs.length,
        availableTotal: snapshot.jobs.length,
        sources: snapshot.sources,
        refreshedAt: snapshot.refreshedAt,
      },
      {
        headers: {
          "Cache-Control": forceRefresh
            ? "no-store"
            : "public, s-maxage=300, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not refresh job sources";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
