import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractCvText, parseJson } from "../../lib/extract-cv";
import { buildAnalyzePrompt } from "../../lib/prompts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const form = await req.formData();
    const file = form.get("cv") as File | null;
    const jobDescription = String(form.get("jobDescription") || "").trim();

    if (!file) return NextResponse.json({ error: "CV file is required" }, { status: 400 });
    if (!jobDescription) return NextResponse.json({ error: "Job description is required" }, { status: 400 });

    const cvText = await extractCvText(file);
    if (!cvText.trim()) return NextResponse.json({ error: "Could not extract text from CV" }, { status: 400 });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: buildAnalyzePrompt(cvText.slice(0, 25000), jobDescription.slice(0, 15000)),
      text: { format: { type: "json_object" } }
    });

    const content = response.output_text;
    return NextResponse.json(parseJson(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
