"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, CvProfile, Job, JobRecommendation, RecommendResponse } from "../app/lib/types";
import type { ContentLanguage } from "../app/lib/text-language";
import { saveMatchIfSignedIn } from "../app/lib/save-match";
import { useLanguage } from "./LanguageProvider";

type CvMatcherProps = {
  selectedJob: Job | null;
  onBrowseJobs: () => void;
};

export default function CvMatcher({ selectedJob, onBrowseJobs }: CvMatcherProps) {
  const { locale, t } = useLanguage();
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
  const [cvLanguage, setCvLanguage] = useState<ContentLanguage | null>(null);

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
    setCvLanguage(null);
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

    if (!file) return setError(t("matcher.uploadFirst"));

    setFindingMatches(true);
    try {
      const form = new FormData();
      form.append("cv", file);
      form.append("locale", locale);

      const response = await fetch("/api/recommend", { method: "POST", body: form });
      const data = (await response.json()) as RecommendResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || t("matcher.couldNotFind"));

      setProfile(data.profile);
      setRecommendations(data.recommendations);
      setCvLanguage(data.cvLanguage ?? null);

      if (data.recommendations.length > 0) {
        selectJob(data.recommendations[0].job);
      } else {
        setError(t("matcher.noMatches"));
      }
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : t("matcher.somethingWrong"));
    } finally {
      setFindingMatches(false);
    }
  }

  async function analyze() {
    setError("");
    setResult(null);
    setSavedNotice("");

    if (!file) return setError(t("matcher.uploadFirst"));
    if (!jobDescription.trim()) {
      return setError(t("matcher.needDescription"));
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("cv", file);
      form.append("jobDescription", jobDescription);
      form.append("locale", locale);

      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("matcher.analysisFailed"));
      setResult(data);

      try {
        const saved = await saveMatchIfSignedIn({
          activeJob,
          jobDescription,
          result: data,
          locale,
        });
        if (saved) setSavedNotice(t("matcher.matchSaved"));
      } catch {
        setSavedNotice("");
      }
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : t("matcher.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="matcher-shell">
      <section className="matcher-hero">
        <div>
          <p className="eyebrow">{t("matcher.eyebrow")}</p>
          <h1>{t("matcher.title")}</h1>
          <p>{t("matcher.hero")}</p>
        </div>
        {activeJob ? (
          <div className="selected-role-card">
            <span>{selectedJob ? t("matcher.selectedFromRadar") : t("matcher.bestFromCv")}</span>
            <strong>{activeJob.title}</strong>
            <p>{activeJob.company} · {activeJob.location}</p>
            <button onClick={onBrowseJobs}>{t("matcher.browseAll")}</button>
          </div>
        ) : (
          <button className="browse-callout" onClick={onBrowseJobs}>
            <span>{t("matcher.pickManually")}</span>
            {t("matcher.browseRadar")} →
          </button>
        )}
      </section>

      <section className="matcher-inputs">
        <label className="upload-panel">
          <span className="step-label">{t("matcher.stepEvidence")}</span>
          <strong>{t("matcher.uploadCv")}</strong>
          <p>{t("matcher.uploadHelp")}</p>
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
            {file ? file.name : t("matcher.chooseFile")}
          </span>
          {cvLanguage && (
            <small className="cv-language-badge">
              {cvLanguage === "he"
                ? t("matcher.cvLanguageHe")
                : cvLanguage === "mixed"
                  ? t("matcher.cvLanguageMixed")
                  : t("matcher.cvLanguageEn")}
            </small>
          )}
        </label>

        <label className="description-panel">
          <span className="step-label">{t("matcher.stepTarget")}</span>
          <strong>{profile ? t("matcher.suggestedMatch") : t("matcher.jobDescription")}</strong>
          <p>
            {profile
              ? t("matcher.inferredTarget", { role: profile.idealNextRole })
              : t("matcher.targetHelp")}
          </p>
          <textarea
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setResult(null);
            }}
            placeholder={t("matcher.targetPlaceholder")}
          />
        </label>
      </section>

      <div className="matcher-runbar">
        <button onClick={() => void findBestMatches()} disabled={findingMatches || loading}>
          {findingMatches ? t("matcher.readingRoles") : t("matcher.findBest")}
          {!findingMatches && <span>→</span>}
        </button>
        <button className="secondary-action" onClick={() => void analyze()} disabled={loading || findingMatches}>
          {loading ? t("matcher.analyzing") : t("matcher.analyze")}
        </button>
        <p>{t("matcher.runbarHint")}</p>
        {error && <strong role="alert">{error}</strong>}
        {savedNotice && <strong className="saved-notice">{savedNotice}</strong>}
      </div>

      {profile && (
        <section className="profile-insights">
          <article className="profile-card">
            <span className="step-label">{t("matcher.careerRead")}</span>
            <h2>{profile.candidateName || t("matcher.yourProfile")}</h2>
            <p className="profile-summary">{profile.summary}</p>
            <div className="profile-meta">
              <div>
                <small>{t("matcher.idealNextRole")}</small>
                <strong>{profile.idealNextRole}</strong>
              </div>
              <div>
                <small>{t("matcher.seniority")}</small>
                <strong>{profile.seniority}</strong>
              </div>
            </div>
            <p className="trajectory">{profile.careerTrajectory}</p>
          </article>

          <article className="history-card">
            <span className="step-label">{t("matcher.lastTwoJobs")}</span>
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
            <span className="step-label">{t("matcher.bestMatches")}</span>
            <h2>{t("matcher.topRoles")}</h2>
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

      {result && <Results result={result} t={t} />}
    </div>
  );
}

function Results({
  result,
  t,
}: {
  result: AnalyzeResponse;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const score = result.match.matchScore;
  return (
    <section className="results-shell">
      <div className="score-panel">
        <span>{t("matcher.matchScore")}</span>
        <strong>{score}<small>/100</small></strong>
        <p>{result.match.verdict}</p>
      </div>
      <div className="result-content">
        <ResultCard title={t("matcher.candidateSummary")}>
          <p>{result.cv.summary}</p>
          <small>{t("matcher.seniority")}: {result.cv.seniority}</small>
          {result.cv.idealNextRole && <small>{t("matcher.idealNextRole")}: {result.cv.idealNextRole}</small>}
        </ResultCard>
        <div className="result-grid">
          <ListCard title={t("matcher.strengths")} items={result.match.strengths} tone="positive" />
          <ListCard title={t("matcher.gaps")} items={result.match.gaps} tone="warning" />
        </div>
        <ListCard title={t("matcher.cvImprovements")} items={result.match.cvImprovements} />
        <ResultCard title={t("matcher.coverLetter")}>
          <pre>{result.match.coverLetter}</pre>
        </ResultCard>
        <ResultCard title={t("matcher.recruiterMessage")}>
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
