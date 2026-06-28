"use client";

import { useState } from "react";
import JobsExplorer from "../components/JobsExplorer";
import CvMatcher from "../components/CvMatcher";
import type { Job } from "./lib/types";

type View = "jobs" | "match";

export default function HomePage() {
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
        <button className="brand-lockup" onClick={() => setView("jobs")} aria-label="CV2Jobs AI home">
          <span className="brand-mark">C2</span>
          <span><strong>CV2JOBS</strong><small>AI CAREER RADAR</small></span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === "jobs" ? "active" : ""} onClick={() => setView("jobs")}>Job radar</button>
          <button className={view === "match" ? "active" : ""} onClick={() => setView("match")}>CV matcher</button>
        </nav>
        <div className="header-status"><i /> Employer feeds live</div>
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
