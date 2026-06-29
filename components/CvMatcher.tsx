"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, CvProfile, Job, JobRecommendation, RecommendResponse } from "../app/lib/types";
import { saveMatchIfSignedIn } from "../app/lib/save-match";

type CvMatcherProps = {
  selectedJob: Job | null;
  onBrowseJobs: () => void;
};

export default function CvMatcher({ selectedJob, onBrowseJobs }: CvMatcherProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [findingMatches, setFindingMatches] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    if (!selectedJob) return;
    setActiveJob(selectedJob);
    setJobDescription(selectedJob.description);
    setResult(null);
    setError("");
  }, [selectedJob]);

  function resetInsights() {
    setProfile(null);
    setRecommendations([]);
    setResult(null);
    setError("");
  }

  function selectJob(job: Job) {
    setActiveJob(job);
    setJobDescription(job.description);
    setResult(null);
    setError("");
  }

  async function findBestMatches() {
    setError("");
    setResult(null);
    setSavedNotice("");
    setProfile(null);
    setRecommendations([]);

    if (!file) return setError("Upload a CV first.");

    setFindingMatches(true);
    try {
      const form = new FormData();
      form.append("cv", file);

      const response = await fetch("/api/recommend", { method: "POST", body: form });
      const data = (await response.json()) as RecommendResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not find matches");

      setProfile(data.profile);
      setRecommendations(data.recommendations);

      if (data.recommendations.length > 0) {
        selectJob(data.recommendations[0].job);
      } else {
        setError("No live roles matched your profile yet. Paste a job description or browse the radar.");
      }
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Something went wrong");
    } finally {
      setFindingMatches(false);
    }
  }

  async function analyze() {
    setError("");
    setResult(null);
    setSavedNotice("");

    if (!file) return setError("Upload a CV first.");
    if (!jobDescription.trim()) {
      return setError("Find your best match from the radar, or paste a job description.");
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("cv", file);
      form.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);

      try {
        const saved = await saveMatchIfSignedIn({
          activeJob,
          jobDescription,
          result: data,
        });
        if (saved) setSavedNotice("Match saved to your account.");
      } catch {
        setSavedNotice("");
      }
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="matcher-shell">
      <section className="matcher-hero">
        <div>
          <p className="eyebrow">CV match desk</p>
          <h1>Upload your CV — we find the best fit.</h1>
          <p>The AI reads your last two roles, infers your ideal next job, and ranks live openings from the radar.</p>
        </div>
        {activeJob ? (
          <div className="selected-role-card">
            <span>{selectedJob ? "Selected from job radar" : "Best match from your CV"}</span>
            <strong>{activeJob.title}</strong>
            <p>{activeJob.company} · {activeJob.location}</p>
            <button onClick={onBrowseJobs}>Browse all roles</button>
          </div>
        ) : (
          <button className="browse-callout" onClick={onBrowseJobs}>
            <span>Or pick manually</span>
            Browse the Israel job radar →
          </button>
        )}
      </section>

      <section className="matcher-inputs">
        <label className="upload-panel">
          <span className="step-label">01 / Your evidence</span>
          <strong>Upload your CV</strong>
          <p>PDF, DOCX or TXT. We focus on your two most recent jobs to infer the best next role.</p>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              resetInsights();
              setActiveJob(null);
              setJobDescription("");
            }}
          />
          <span className={file ? "file-choice chosen" : "file-choice"}>
            {file ? file.name : "Choose CV file"}
          </span>
        </label>

        <label className="description-panel">
          <span className="step-label">02 / The target</span>
          <strong>{profile ? "Suggested best match" : "Job description"}</strong>
          <p>
            {profile
              ? `Inferred target: ${profile.idealNextRole}. Edit below or pick another recommendation.`
              : "Find matches automatically, or paste a role / select one from the radar."}
          </p>
          <textarea
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setResult(null);
            }}
            placeholder="Upload a CV and click Find best match, or paste a job description here…"
          />
        </label>
      </section>

      <div className="matcher-runbar">
        <button onClick={() => void findBestMatches()} disabled={findingMatches || loading}>
          {findingMatches ? "Reading your last two roles…" : "Find best match"}
          {!findingMatches && <span>→</span>}
        </button>
        <button className="secondary-action" onClick={() => void analyze()} disabled={loading || findingMatches}>
          {loading ? "Analyzing evidence…" : "Analyze this match"}
        </button>
        <p>Profile · radar ranking · score · outreach</p>
        {error && <strong role="alert">{error}</strong>}
        {savedNotice && <strong className="saved-notice">{savedNotice}</strong>}
      </div>

      {profile && (
        <section className="profile-insights">
          <article className="profile-card">
            <span className="step-label">Career read</span>
            <h2>{profile.candidateName || "Your profile"}</h2>
            <p className="profile-summary">{profile.summary}</p>
            <div className="profile-meta">
              <div>
                <small>Ideal next role</small>
                <strong>{profile.idealNextRole}</strong>
              </div>
              <div>
                <small>Seniority</small>
                <strong>{profile.seniority}</strong>
              </div>
            </div>
            <p className="trajectory">{profile.careerTrajectory}</p>
          </article>

          <article className="history-card">
            <span className="step-label">Last two jobs</span>
            <div className="history-list">
              {profile.lastTwoJobs.map((job, index) => (
                <div className="history-item" key={`${job.company}-${job.title}-${index}`}>
                  <strong>{job.title}</strong>
                  <p>{job.company} · {job.duration}</p>
                  <ul>
                    {job.highlights.map((highlight, highlightIndex) => (
                      <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="recommendations-shell">
          <div className="recommendations-head">
            <span className="step-label">Best matches from radar</span>
            <h2>Top roles for your trajectory</h2>
          </div>
          <div className="recommendations-grid">
            {recommendations.map((item) => (
              <button
                key={item.job.id}
                type="button"
                className={activeJob?.id === item.job.id ? "recommendation-card active" : "recommendation-card"}
                onClick={() => selectJob(item.job)}
              >
                <div className="recommendation-score">{item.matchScore}</div>
                <div>
                  <strong>{item.job.title}</strong>
                  <p>{item.job.company} · {item.job.location}</p>
                  <small>{item.reason}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {result && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: AnalyzeResponse }) {
  const score = result.match.matchScore;
  return (
    <section className="results-shell">
      <div className="score-panel">
        <span>Match score</span>
        <strong>{score}<small>/100</small></strong>
        <p>{result.match.verdict}</p>
      </div>
      <div className="result-content">
        <ResultCard title="Candidate summary">
          <p>{result.cv.summary}</p>
          <small>Seniority: {result.cv.seniority}</small>
          {result.cv.idealNextRole && <small>Ideal next role: {result.cv.idealNextRole}</small>}
        </ResultCard>
        <div className="result-grid">
          <ListCard title="Strengths" items={result.match.strengths} tone="positive" />
          <ListCard title="Gaps" items={result.match.gaps} tone="warning" />
        </div>
        <ListCard title="CV improvements" items={result.match.cvImprovements} />
        <ResultCard title="Cover letter">
          <pre>{result.match.coverLetter}</pre>
        </ResultCard>
        <ResultCard title="Recruiter message">
          <pre>{result.match.recruiterMessage}</pre>
        </ResultCard>
      </div>
    </section>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="result-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function ListCard({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: string }) {
  return (
    <ResultCard title={title}>
      <ul className={`result-list ${tone}`}>
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </ResultCard>
  );
}
