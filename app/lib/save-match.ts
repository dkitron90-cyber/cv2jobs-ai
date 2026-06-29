import type { AnalyzeResponse, Job } from "./types";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export async function saveMatchIfSignedIn(params: {
  activeJob: Job | null;
  jobDescription: string;
  result: AnalyzeResponse;
}) {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("job_matches")
    .insert({
      profile_id: user.id,
      job_title: params.activeJob?.title ?? "Custom role",
      company: params.activeJob?.company ?? null,
      job_url: params.activeJob?.url ?? null,
      job_description: params.jobDescription,
      match_score: params.result.match.matchScore,
      match_result: params.result,
      status: "matched",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
