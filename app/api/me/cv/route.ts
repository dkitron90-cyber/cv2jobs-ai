import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "../../../lib/extract-cv";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("cv") as File | null;
    const analysisRaw = String(form.get("analysis") || "").trim();

    if (!file) {
      return NextResponse.json({ error: "CV file is required" }, { status: 400 });
    }

    const extractedText = await extractCvText(file);
    if (!extractedText.trim()) {
      return NextResponse.json({ error: "Could not extract text from CV" }, { status: 400 });
    }

    let analysis: Record<string, unknown> | null = null;
    if (analysisRaw) {
      try {
        analysis = JSON.parse(analysisRaw) as Record<string, unknown>;
      } catch {
        analysis = null;
      }
    }

    const { data, error } = await supabase
      .from("cvs")
      .insert({
        profile_id: user.id,
        file_name: file.name,
        extracted_text: extractedText.slice(0, 50000),
        analysis,
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
