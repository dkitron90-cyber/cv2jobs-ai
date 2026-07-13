"use client";

import { useState } from "react";
import AuthStatus from "./AuthStatus";
import JobsExplorer from "./JobsExplorer";
import CvMatcher from "./CvMatcher";
import PersonalSpace from "./PersonalSpace";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Job } from "../app/lib/types";
import { useLanguage } from "./LanguageProvider";

type View = "jobs" | "match" | "space";

const NAV_ITEMS: View[] = ["jobs", "match", "space"];

export default function HomePage() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("jobs");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  function matchJob(job: Job) {
    setSelectedJob(job);
    setView("match");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const navLabels: Record<View, string> = {
    jobs: t("nav.jobRadar"),
    match: t("nav.cvMatcher"),
    space: t("nav.mySpace"),
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <button className="brand-lockup" onClick={() => setView("jobs")} aria-label={t("brand.homeAria")}>
            <span className="brand-mark">C2</span>
            <span className="brand-text">
              <strong>CV2Jobs</strong>
              <small>{t("brand.tagline")}</small>
            </span>
          </button>

          <nav className="app-nav-pills" aria-label={t("nav.main")}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={view === item ? "active" : ""}
                onClick={() => setView(item)}
                aria-current={view === item ? "page" : undefined}
              >
                {navLabels[item]}
              </button>
            ))}
          </nav>

          <div className="app-header-actions">
            <div className="status-badge">
              <i className="live-dot" aria-hidden="true" />
              {t("nav.feedsLive")}
            </div>
            <LanguageSwitcher />
            <AuthStatus onOpenSpace={() => setView("space")} />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className={view === "jobs" ? "view-panel" : "view-panel hidden"}>
          <JobsExplorer onMatchJob={matchJob} />
        </div>
        <div className={view === "match" ? "view-panel" : "view-panel hidden"}>
          <CvMatcher selectedJob={selectedJob} onBrowseJobs={() => setView("jobs")} />
        </div>
        <div className={view === "space" ? "view-panel" : "view-panel hidden"}>
          <PersonalSpace onMatchJob={matchJob} onBrowseJobs={() => setView("jobs")} />
        </div>
      </main>
    </div>
  );
}
