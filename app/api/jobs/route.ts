import { NextRequest, NextResponse } from "next/server";
import { getJobsSnapshot } from "../../lib/jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
    const company = searchParams.get("company")?.trim().toLocaleLowerCase() ?? "";
    const workplace = searchParams.get("workplace")?.trim() ?? "";
    const forceRefresh = searchParams.get("refresh") === "1";
    const snapshot = await getJobsSnapshot(forceRefresh);

    const jobs = snapshot.jobs.filter((job) => {
      const haystack = [job.title, job.company, job.location, job.department, job.description]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!company || job.company.toLocaleLowerCase() === company) &&
        (!workplace || job.workplace === workplace)
      );
    });

    return NextResponse.json({
      jobs,
      total: jobs.length,
      availableTotal: snapshot.jobs.length,
      sources: snapshot.sources,
      refreshedAt: snapshot.refreshedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not refresh job sources";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
