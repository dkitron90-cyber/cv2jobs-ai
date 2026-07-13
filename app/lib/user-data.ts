import type { AnalyzeResponse, Job } from "./types";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

export type SavedJobRow = {
  id: string;
  job_id: string;
  job_title: string;
  company: string | null;
  job_url: string | null;
  location: string | null;
  department: string | null;
  source: string | null;
  workplace: string | null;
  job_description: string | null;
  created_at: string;
};

export type JobMatchRow = {
  id: string;
  job_title: string | null;
  company: string | null;
  job_url: string | null;
  job_description: string;
  match_score: number | null;
  match_result: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export type CvRow = {
  id: string;
  file_name: string;
  extracted_text: string;
  analysis: Record<string, unknown> | null;
  created_at: string;
};

async function requireUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function savedJobToJob(row: SavedJobRow): Job {
  return {
    id: row.job_id,
    source: (row.source as Job["source"]) || "greenhouse",
    sourceLabel: row.source || "Saved",
    company: row.company || "Company",
    title: row.job_title,
    location: row.location || "Israel",
    department: row.department || "General",
    description: row.job_description || "",
    url: row.job_url || "#",
    updatedAt: row.created_at,
    workplace: (row.workplace as Job["workplace"]) || "unspecified",
  };
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const user = await requireUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(fullName: string) {
  const user = await requireUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id)
    .select("id, email, full_name, created_at")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function fetchSavedJobs(): Promise<SavedJobRow[]> {
  const user = await requireUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveJob(job: Job) {
  const user = await requireUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_jobs")
    .upsert(
      {
        profile_id: user.id,
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        job_url: job.url,
        location: job.location,
        department: job.department,
        source: job.source,
        workplace: job.workplace,
        job_description: job.description,
      },
      { onConflict: "profile_id,job_id" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function removeSavedJob(savedId: string) {
  const user = await requireUser();
  if (!user) return;

  const supabase = createClient();
  const { error } = await supabase.from("saved_jobs").delete().eq("id", savedId).eq("profile_id", user.id);
  if (error) throw error;
}

export async function fetchJobMatches(status?: string): Promise<JobMatchRow[]> {
  const user = await requireUser();
  if (!user) return [];

  const supabase = createClient();
  let query = supabase
    .from("job_matches")
    .select("id, job_title, company, job_url, job_description, match_score, match_result, status, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCvs(): Promise<CvRow[]> {
  const user = await requireUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cvs")
    .select("id, file_name, extracted_text, analysis, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveCvRecord(params: {
  fileName: string;
  extractedText: string;
  analysis?: AnalyzeResponse | Record<string, unknown>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cvs")
    .insert({
      profile_id: user.id,
      file_name: params.fileName,
      extracted_text: params.extractedText.slice(0, 50000),
      analysis: params.analysis ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function removeCv(cvId: string) {
  const user = await requireUser();
  if (!user) return;

  const supabase = createClient();
  const { error } = await supabase.from("cvs").delete().eq("id", cvId).eq("profile_id", user.id);
  if (error) throw error;
}
