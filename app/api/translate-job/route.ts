import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getErrorMessage, parseLocale } from "../../lib/i18n";
import { parseJson } from "../../lib/extract-cv";
import { detectContentLanguage } from "../../lib/text-language";

export const runtime = "nodejs";

type TranslatePayload = {
  title: string;
  description: string;
};

export async function POST(req: NextRequest) {
  let locale = parseLocale("en");

  try {
    const body = await req.json();
    locale = parseLocale(body.locale);

    if (locale !== "he") {
      return NextResponse.json({
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        translated: false,
      });
    }

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!title && !description) {
      return NextResponse.json({ title: "", description: "", translated: false });
    }

    const sourceLanguage = detectContentLanguage(`${title}\n${description}`);
    if (sourceLanguage === "he") {
      return NextResponse.json({ title, description, translated: false });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: getErrorMessage(locale, "missingOpenAiKey") }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: `Translate this Israeli tech job posting to modern professional Hebrew for a job seeker.
Keep company names, product names, and URLs in English when appropriate.
Return only valid JSON: {"title":"string","description":"string"}

TITLE:
${title.slice(0, 500)}

DESCRIPTION:
${description.slice(0, 12000)}`,
      text: { format: { type: "json_object" } },
    });

    const translated = parseJson<TranslatePayload>(response.output_text);
    return NextResponse.json({
      title: translated.title || title,
      description: translated.description || description,
      translated: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : getErrorMessage(locale, "unknown");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
