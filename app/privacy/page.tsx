import Link from "next/link";

export const metadata = {
  title: "Privacy — CV2Jobs AI",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← CV2Jobs AI
      </Link>
      <h1>Privacy</h1>
      <p>Last updated: July 14, 2026</p>
      <section>
        <h2>What we collect</h2>
        <p>
          When you use CV2Jobs AI we may process your email address (for sign-in), CV file text you upload, job matches
          you run, applications you track, and basic product usage needed to operate the service.
        </p>
      </section>
      <section>
        <h2>How we use your CV</h2>
        <p>
          Uploaded CVs are used to infer your recent roles, rank live openings, draft cover letters / outreach, and —
          if you choose one-click send — attach the file to an email to a recruiter. We do not sell your CV.
        </p>
      </section>
      <section>
        <h2>Storage</h2>
        <p>
          Account data is stored with Supabase. If you are signed in, matches and applications can be saved to your
          personal space. You can remove saved CVs and jobs from My Space.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:hello@cv2jobs.ai">hello@cv2jobs.ai</a>
        </p>
      </section>
    </main>
  );
}
