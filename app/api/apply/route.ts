import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractCvText, parseJson } from "../../lib/extract-cv";
import { extractContactEmail, normalizeJobDescription } from "../../lib/format-description";
import { getErrorMessage, parseLocale } from "../../lib/i18n";
import { buildApplyPrompt } from "../../lib/prompts";
import { buildAiOutreachMessage } from "../../lib/outreach-message";
import { detectContentLanguage } from "../../lib/text-language";
import type { ApplyResponse } from "../../lib/types";

export const runtime = "nodejs";

type ApplyPayload = {
  candidateName: string;
  coverLetter: string;
  recruiterMessage: string;
  matchScore: number;
};

export async function POST(req: NextRequest) {
  let locale = parseLocale("en");

  try {
    const form = await req.formData();
    locale = parseLocale(form.get("locale"));

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: getErrorMessage(locale, "missingOpenAiKey") }, { status: 500 });
    }

    const file = form.get("cv") as File | null;
    const jobTitle = String(form.get("jobTitle") || "").trim();
    const company = String(form.get("company") || "").trim();
    const jobUrl = String(form.get("jobUrl") || "").trim();
    const jobDescription = normalizeJobDescription(String(form.get("jobDescription") || ""));
    const cvTextFromClient = String(form.get("cvText") || "").trim();
    const existingCoverLetter = String(form.get("coverLetter") || "").trim();
    const existingRecruiterMessage = String(form.get("recruiterMessage") || "").trim();
    const existingCandidateName = String(form.get("candidateName") || "").trim();
    const existingMatchScore = Number(form.get("matchScore"));

    if (!file) return NextResponse.json({ error: getErrorMessage(locale, "cvRequired") }, { status: 400 });
    if (!jobTitle || !jobDescription) {
      return NextResponse.json({ error: getErrorMessage(locale, "jobDescriptionRequired") }, { status: 400 });
    }

    let cvText = cvTextFromClient;
    if (!cvText) {
      try {
        cvText = await extractCvText(file);
      } catch (error) {
        if (error instanceof Error && error.message === "UNSUPPORTED_FILE_TYPE") {
          return NextResponse.json({ error: getErrorMessage(locale, "unsupportedFile") }, { status: 400 });
        }
        throw error;
      }
    }

    if (!cvText.trim()) {
      return NextResponse.json({ error: getErrorMessage(locale, "extractFailed") }, { status: 400 });
    }

    if (existingCoverLetter && existingRecruiterMessage) {
      const candidateName = existingCandidateName || "Candidate";
      const result: ApplyResponse = {
        candidateName,
        coverLetter: existingCoverLetter,
        recruiterMessage: existingRecruiterMessage,
        outreachMessage: buildAiOutreachMessage({
          candidateName,
          jobTitle,
          company,
          recruiterMessage: existingRecruiterMessage,
          locale,
        }),
        matchScore: Number.isFinite(existingMatchScore) ? existingMatchScore : 70,
        applyUrl: jobUrl,
        contactEmail: extractContactEmail(jobDescription),
      };
      return NextResponse.json(result);
    }

    const cvLanguage = detectContentLanguage(cvText);
    const jobLanguage = detectContentLanguage(jobDescription);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: buildApplyPrompt(
        cvText.slice(0, 25000),
        jobTitle,
        company,
        jobDescription.slice(0, 15000),
        locale,
        cvLanguage,
        jobLanguage,
      ),
      text: { format: { type: "json_object" } },
    });

    const payload = parseJson<ApplyPayload>(response.output_text);
    const result: ApplyResponse = {
      candidateName: payload.candidateName,
      coverLetter: payload.coverLetter,
      recruiterMessage: payload.recruiterMessage,
      outreachMessage: buildAiOutreachMessage({
        candidateName: payload.candidateName,
        jobTitle,
        company,
        recruiterMessage: payload.recruiterMessage,
        locale,
      }),
      matchScore: payload.matchScore,
      applyUrl: jobUrl,
      contactEmail: extractContactEmail(jobDescription),
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : getErrorMessage(locale, "unknown");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
