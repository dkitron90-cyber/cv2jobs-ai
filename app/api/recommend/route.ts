import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractCvText, parseJson } from "../../lib/extract-cv";
import { getJobsSnapshot } from "../../lib/jobs";
import { getErrorMessage, parseLocale } from "../../lib/i18n";
import { fallbackRecommendations, mergeRankings, prefilterJobs } from "../../lib/match-jobs";
import { buildProfilePrompt, buildRankJobsPrompt } from "../../lib/prompts";
import { detectContentLanguage } from "../../lib/text-language";
import type { CvProfile, RecommendResponse } from "../../lib/types";

export const runtime = "nodejs";

type RankingsPayload = {
  rankings: Array<{ id: string; matchScore: number; reason: string }>;
};

export async function POST(req: NextRequest) {
  let locale = parseLocale("en");

  try {
    const form = await req.formData();
    locale = parseLocale(form.get("locale"));

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: getErrorMessage(locale, "missingOpenAiKey") }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = form.get("cv") as File | null;

    if (!file) return NextResponse.json({ error: getErrorMessage(locale, "cvRequired") }, { status: 400 });

    let cvText: string;
    try {
      cvText = await extractCvText(file);
    } catch (error) {
      if (error instanceof Error && error.message === "UNSUPPORTED_FILE_TYPE") {
        return NextResponse.json({ error: getErrorMessage(locale, "unsupportedFile") }, { status: 400 });
      }
      throw error;
    }

    if (!cvText.trim()) {
      return NextResponse.json({ error: getErrorMessage(locale, "extractFailed") }, { status: 400 });
    }

    const cvLanguage = detectContentLanguage(cvText);

    const profileResponse = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: buildProfilePrompt(cvText.slice(0, 25000), locale, cvLanguage),
      text: { format: { type: "json_object" } },
    });

    const profile = parseJson<CvProfile>(profileResponse.output_text);
    const snapshot = await getJobsSnapshot();
    const candidates = prefilterJobs(snapshot.jobs, profile);

    if (candidates.length === 0) {
      const payload: RecommendResponse = { profile, recommendations: [], cvLanguage };
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

    let recommendations = fallbackRecommendations(candidates, profile, 5, locale);

    try {
      const rankResponse = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        input: buildRankJobsPrompt(profile, summaries, locale, cvLanguage),
        text: { format: { type: "json_object" } },
      });

      const ranked = mergeRankings(candidates, parseJson<RankingsPayload>(rankResponse.output_text).rankings);
      if (ranked.length > 0) recommendations = ranked;
    } catch {
      recommendations = fallbackRecommendations(candidates, profile, 5, locale);
    }

    const payload: RecommendResponse = { profile, recommendations, cvLanguage };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : getErrorMessage(locale, "unknown");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
