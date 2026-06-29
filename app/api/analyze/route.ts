import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractCvText, parseJson } from "../../lib/extract-cv";
import { getErrorMessage, parseLocale } from "../../lib/i18n";
import { buildAnalyzePrompt } from "../../lib/prompts";
import { detectContentLanguage } from "../../lib/text-language";

export const runtime = "nodejs";

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
    const jobDescription = String(form.get("jobDescription") || "").trim();

    if (!file) return NextResponse.json({ error: getErrorMessage(locale, "cvRequired") }, { status: 400 });
    if (!jobDescription) {
      return NextResponse.json({ error: getErrorMessage(locale, "jobDescriptionRequired") }, { status: 400 });
    }

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
    const jobLanguage = detectContentLanguage(jobDescription);

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: buildAnalyzePrompt(
        cvText.slice(0, 25000),
        jobDescription.slice(0, 15000),
        locale,
        cvLanguage,
        jobLanguage,
      ),
      text: { format: { type: "json_object" } },
    });

    const content = response.output_text;
    return NextResponse.json(parseJson(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : getErrorMessage(locale, "unknown");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
