import Link from "next/link";

export const metadata = {
  title: "Terms — CV2Jobs AI",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← CV2Jobs AI
      </Link>
      <h1>Terms of use</h1>
      <p>Last updated: July 14, 2026</p>
      <section>
        <h2>The service</h2>
        <p>
          CV2Jobs AI helps you discover Israeli tech roles and prepare applications with AI. Job listings come from
          public employer feeds and related sources and may change or be incomplete.
        </p>
      </section>
      <section>
        <h2>Your responsibility</h2>
        <p>
          You are responsible for the accuracy of your CV and for any outreach or application you send. Assisted apply
          modes prepare materials for you to submit; verified one-click send only applies when that flow succeeds.
        </p>
      </section>
      <section>
        <h2>No guarantee</h2>
        <p>
          We do not guarantee interviews, offers, deliverability of every email, or that every listing is still open.
          Use professional judgment before contacting employers.
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
