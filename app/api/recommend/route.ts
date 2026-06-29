import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractCvText, parseJson } from "../../lib/extract-cv";
import { getJobsSnapshot } from "../../lib/jobs";
import { fallbackRecommendations, mergeRankings, prefilterJobs } from "../../lib/match-jobs";
import { buildProfilePrompt, buildRankJobsPrompt } from "../../lib/prompts";
import type { CvProfile, RecommendResponse } from "../../lib/types";

export const runtime = "nodejs";

type RankingsPayload = {
  rankings: Array<{ id: string; matchScore: number; reason: string }>;
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const form = await req.formData();
    const file = form.get("cv") as File | null;

    if (!file) return NextResponse.json({ error: "CV file is required" }, { status: 400 });

    const cvText = await extractCvText(file);
    if (!cvText.trim()) return NextResponse.json({ error: "Could not extract text from CV" }, { status: 400 });

    const profileResponse = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: buildProfilePrompt(cvText.slice(0, 25000)),
      text: { format: { type: "json_object" } },
    });

    const profile = parseJson<CvProfile>(profileResponse.output_text);
    const snapshot = await getJobsSnapshot();
    const candidates = prefilterJobs(snapshot.jobs, profile);

    if (candidates.length === 0) {
      const payload: RecommendResponse = { profile, recommendations: [] };
      return NextResponse.json(payload);
    }

    const summaries = candidates.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      department: job.department,
      location: job.location,
      excerpt: job.description.slice(0, 500),
    }));

    let recommendations = fallbackRecommendations(candidates, profile);

    try {
      const rankResponse = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        input: buildRankJobsPrompt(profile, summaries),
        text: { format: { type: "json_object" } },
      });

      const ranked = mergeRankings(candidates, parseJson<RankingsPayload>(rankResponse.output_text).rankings);
      if (ranked.length > 0) recommendations = ranked;
    } catch {
      recommendations = fallbackRecommendations(candidates, profile);
    }

    const payload: RecommendResponse = { profile, recommendations };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
