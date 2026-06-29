"use client";

import { useState } from "react";
import AuthStatus from "./AuthStatus";
import JobsExplorer from "./JobsExplorer";
import CvMatcher from "./CvMatcher";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Job } from "../app/lib/types";
import { useLanguage } from "./LanguageProvider";

type View = "jobs" | "match";

export default function HomePage() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("jobs");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  function matchJob(job: Job) {
    setSelectedJob(job);
    setView("match");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main>
      <header className="app-header">
        <button className="brand-lockup" onClick={() => setView("jobs")} aria-label={t("brand.homeAria")}>
          <span className="brand-mark">C2</span>
          <span><strong>CV2JOBS</strong><small>{t("brand.tagline")}</small></span>
        </button>
        <nav aria-label={t("nav.main")}>
          <button className={view === "jobs" ? "active" : ""} onClick={() => setView("jobs")}>{t("nav.jobRadar")}</button>
          <button className={view === "match" ? "active" : ""} onClick={() => setView("match")}>{t("nav.cvMatcher")}</button>
        </nav>
        <LanguageSwitcher />
        <AuthStatus />
        <div className="header-status"><i /> {t("nav.feedsLive")}</div>
      </header>

      <div className={view === "jobs" ? "view-panel" : "view-panel hidden"}>
        <JobsExplorer onMatchJob={matchJob} />
      </div>
      <div className={view === "match" ? "view-panel" : "view-panel hidden"}>
        <CvMatcher selectedJob={selectedJob} onBrowseJobs={() => setView("jobs")} />
      </div>
    </main>
  );
}
