import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage, parseLocale } from "../../lib/i18n";
import { isOutreachEmailConfigured, sendOutreachEmail } from "../../lib/outreach-email";
import { createClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ available: isOutreachEmailConfigured() });
}

export async function POST(req: NextRequest) {
  let locale = parseLocale("en");

  try {
    if (!isOutreachEmailConfigured()) {
      return NextResponse.json({ error: "OUTREACH_EMAIL_NOT_CONFIGURED" }, { status: 503 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: getErrorMessage(locale, "signInRequired") }, { status: 401 });
    }

    const form = await req.formData();
    locale = parseLocale(form.get("locale"));

    const file = form.get("cv") as File | null;
    const to = String(form.get("to") || "").trim().toLowerCase();
    const candidateName = String(form.get("candidateName") || "").trim() || "Candidate";
    const jobTitle = String(form.get("jobTitle") || "").trim();
    const company = String(form.get("company") || "").trim();
    const outreachMessage = String(form.get("outreachMessage") || "").trim();

    if (!file) {
      return NextResponse.json({ error: getErrorMessage(locale, "cvRequired") }, { status: 400 });
    }
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: getErrorMessage(locale, "invalidRecruiterEmail") }, { status: 400 });
    }
    if (!outreachMessage) {
      return NextResponse.json({ error: getErrorMessage(locale, "outreachMessageRequired") }, { status: 400 });
    }

    const cvBuffer = Buffer.from(await file.arrayBuffer());

    const result = await sendOutreachEmail({
      to,
      replyTo: user.email,
      candidateName,
      jobTitle,
      company,
      outreachMessage,
      cvFileName: file.name,
      cvBuffer,
    });

    return NextResponse.json({ ok: true, id: result?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
