"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export default function AppFooter() {
  const { t } = useLanguage();

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <strong>CV2Jobs AI</strong>
          <p>{t("footer.blurb")}</p>
        </div>
        <nav className="app-footer-links" aria-label={t("footer.nav")}>
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <Link href="/terms">{t("footer.terms")}</Link>
          <a href="mailto:hello@cv2jobs.ai">{t("footer.contact")}</a>
        </nav>
        <p className="app-footer-meta">{t("footer.cvNote")}</p>
      </div>
    </footer>
  );
}
