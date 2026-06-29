import type { AnalyzeResponse, Job } from "./types";
import type { Locale } from "./i18n";
import { getMessages, t } from "./i18n";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export async function saveMatchIfSignedIn(params: {
  activeJob: Job | null;
  jobDescription: string;
  result: AnalyzeResponse;
  locale?: Locale;
}) {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const messages = getMessages(params.locale ?? "en");
  const customRole = t(messages, "server.customRole");

  const { data, error } = await supabase
    .from("job_matches")
    .insert({
      profile_id: user.id,
      job_title: params.activeJob?.title ?? customRole,
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
