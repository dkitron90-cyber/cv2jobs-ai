"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, Job } from "../app/lib/types";

type CvMatcherProps = {
  selectedJob: Job | null;
  onBrowseJobs: () => void;
};

export default function CvMatcher({ selectedJob, onBrowseJobs }: CvMatcherProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedJob) return;
    setJobDescription(selectedJob.description);
    setResult(null);
    setError("");
  }, [selectedJob]);

  async function analyze() {
    setError("");
    setResult(null);

    if (!file) return setError("Upload a CV first.");
    if (!jobDescription.trim()) return setError("Choose a role or paste a job description first.");

    setLoading(true);
    try {
      const form = new FormData();
      form.append("cv", file);
      form.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
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
          <h1>Know where you stand before you apply.</h1>
          <p>Compare evidence from your CV against the role, then close the gaps that matter.</p>
        </div>
        {selectedJob ? (
          <div className="selected-role-card">
            <span>Selected from job radar</span>
            <strong>{selectedJob.title}</strong>
            <p>{selectedJob.company} · {selectedJob.location}</p>
            <button onClick={onBrowseJobs}>Choose another role</button>
          </div>
        ) : (
          <button className="browse-callout" onClick={onBrowseJobs}>
            <span>Start with a live role</span>
            Browse the Israel job radar →
          </button>
        )}
      </section>

      <section className="matcher-inputs">
        <label className="upload-panel">
          <span className="step-label">01 / Your evidence</span>
          <strong>Upload your CV</strong>
          <p>PDF, DOCX or TXT. Your file stays in this analysis request.</p>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <span className={file ? "file-choice chosen" : "file-choice"}>
            {file ? file.name : "Choose CV file"}
          </span>
        </label>

        <label className="description-panel">
          <span className="step-label">02 / The target</span>
          <strong>Job description</strong>
          <p>{selectedJob ? "Loaded from the employer’s live posting." : "Paste a role or select one from the radar."}</p>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the complete job description here…"
          />
        </label>
      </section>

      <div className="matcher-runbar">
        <button onClick={() => void analyze()} disabled={loading}>
          {loading ? "Analyzing evidence…" : "Analyze this match"}
          {!loading && <span>→</span>}
        </button>
        <p>Score · strengths · gaps · CV edits · outreach</p>
        {error && <strong role="alert">{error}</strong>}
      </div>

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
