import type { AnalyzeResponse, ApplyResponse, Job } from "./types";
import type { Locale } from "./i18n";
import { getMessages, t } from "./i18n";
import type { SendMode } from "./apply-client";
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

export async function saveApplicationIfSignedIn(params: {
  job: Job;
  application: ApplyResponse;
  locale?: Locale;
  mode?: SendMode;
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
      job_title: params.job.title,
      company: params.job.company,
      job_url: params.job.url,
      job_description: params.job.description,
      match_score: params.application.matchScore,
      match_result: {
        coverLetter: params.application.coverLetter,
        recruiterMessage: params.application.recruiterMessage,
        outreachMessage: params.application.outreachMessage,
        candidateName: params.application.candidateName,
        sendMode: params.mode ?? "portal",
      },
      status: params.mode === "recruiter" ? "recruiter_outreach_sent" : "application_sent",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
