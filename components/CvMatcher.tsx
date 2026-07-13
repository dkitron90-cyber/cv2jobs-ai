"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, ApplyResponse, CvProfile, Job, JobRecommendation, RecommendResponse } from "../app/lib/types";
import type { ContentLanguage } from "../app/lib/text-language";
import { prepareApplication, type ApplyChannel, type SendMode } from "../app/lib/apply-client";
import { normalizeJobDescription } from "../app/lib/format-description";
import { saveApplicationIfSignedIn, saveMatchIfSignedIn } from "../app/lib/save-match";
import ApplicationSendPanel from "./ApplicationSendPanel";
import { useLanguage } from "./LanguageProvider";

type CvMatcherProps = {
  selectedJob: Job | null;
  onBrowseJobs: () => void;
};

type ApplicationState = {
  data: ApplyResponse;
  status: "ready" | "sent";
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
  const [applyNotice, setApplyNotice] = useState("");
  const [cvLanguage, setCvLanguage] = useState<ContentLanguage | null>(null);
  const [applications, setApplications] = useState<Record<string, ApplicationState>>({});
  const [applyingJobId, setApplyingJobId] = useState("");
  const [preparingAll, setPreparingAll] = useState(false);
  const [cvText, setCvText] = useState("");
  const [sendPanel, setSendPanel] = useState<{ job: Job; application: ApplyResponse } | null>(null);

  useEffect(() => {
    if (!selectedJob) return;
    setActiveJob(selectedJob);
    setJobDescription(normalizeJobDescription(selectedJob.description));
    setResult(null);
    setError("");
  }, [selectedJob]);

  function resetInsights() {
    setProfile(null);
    setRecommendations([]);
    setResult(null);
    setError("");
    setCvLanguage(null);
    setCvText("");
    setApplications({});
    setApplyNotice("");
    setSendPanel(null);
  }

  function selectJob(job: Job) {
    setActiveJob(job);
    setJobDescription(normalizeJobDescription(job.description));
    setResult(null);
    setError("");
  }

  async function persistCv(analysis?: AnalyzeResponse | RecommendResponse["profile"]) {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("cv", file);
      if (analysis) form.append("analysis", JSON.stringify(analysis));
      await fetch("/api/me/cv", { method: "POST", body: form });
    } catch {
      // optional persistence
    }
  }

  async function findBestMatches() {
    setError("");
    setResult(null);
    setSavedNotice("");
    setApplyNotice("");
    setProfile(null);
    setRecommendations([]);
    setApplications({});

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
      if (data.cvText) setCvText(data.cvText);

      if (data.recommendations.length > 0) {
        selectJob(data.recommendations[0].job);
        void prewarmApplications(data.recommendations.slice(0, 3).map((item) => item.job));
      } else {
        setError(t("matcher.noMatches"));
      }

      void persistCv(data.profile);
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
    setApplyNotice("");

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
      if (data.cvText) setCvText(data.cvText);

      void persistCv(data);

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

  function getPreparedCoverLetter(job: Job) {
    if (activeJob?.id === job.id && result?.match.coverLetter) {
      return {
        coverLetter: result.match.coverLetter,
        recruiterMessage: result.match.recruiterMessage,
        matchScore: result.match.matchScore,
        candidateName: result.cv.candidateName,
      };
    }
    return null;
  }

  async function buildApplication(job: Job) {
    const cached = applications[job.id]?.data;
    if (cached) return cached;

    const prepared = getPreparedCoverLetter(job);
    return prepareApplication({
      file: file as File,
      job,
      locale,
      cvText: cvText || undefined,
      coverLetter: prepared?.coverLetter,
      recruiterMessage: prepared?.recruiterMessage,
      matchScore: prepared?.matchScore,
      candidateName: prepared?.candidateName,
    });
  }

  async function prewarmApplications(jobs: Job[]) {
    if (!file) return;

    await Promise.all(
      jobs.map(async (job) => {
        if (applications[job.id]?.data) return;
        try {
          const data = await buildApplication(job);
          setApplications((current) => ({
            ...current,
            [job.id]: { data, status: current[job.id]?.status === "sent" ? "sent" : "ready" },
          }));
        } catch {
          // background prep is best-effort
        }
      }),
    );
  }

  async function applyToJob(job: Job) {
    if (!file) return setError(t("matcher.uploadFirst"));

    setApplyingJobId(job.id);
    setApplyNotice("");
    setError("");

    try {
      const application = await buildApplication(job);
      setApplications((current) => ({
        ...current,
        [job.id]: { data: application, status: current[job.id]?.status === "sent" ? "sent" : "ready" },
      }));
      setSendPanel({ job, application });
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : t("matcher.applyFailed", { company: job.company }),
      );
    } finally {
      setApplyingJobId("");
    }
  }

  async function completeSend(job: Job, application: ApplyResponse, channel: ApplyChannel, mode: SendMode) {
    setApplications((current) => ({
      ...current,
      [job.id]: { data: application, status: "sent" },
    }));
    setSendPanel(null);

    try {
      await saveApplicationIfSignedIn({ job, application, locale, mode });
    } catch {
      // saving is optional
    }

    setApplyNotice(
      mode === "recruiter"
        ? t("matcher.applyRecruiterHint")
        : channel === "email"
          ? t("matcher.applyEmailHint")
          : t("matcher.applyPortalHint"),
    );
  }

  async function prepareAllApplications() {
    if (!file || recommendations.length === 0) return setError(t("matcher.uploadFirst"));

    setPreparingAll(true);
    setApplyNotice("");
    setError("");

    try {
      const prepared = await Promise.all(
        recommendations.map(async (item) => {
          if (applications[item.job.id]?.data) {
            return [item.job.id, applications[item.job.id].data] as const;
          }
          const data = await buildApplication(item.job);
          return [item.job.id, data] as const;
        }),
      );

      setApplications((current) => {
        const next = { ...current };
        for (const [jobId, data] of prepared) {
          next[jobId] = { data, status: current[jobId]?.status === "sent" ? "sent" : "ready" };
        }
        return next;
      });
      setApplyNotice(t("matcher.applicationQueueHint"));
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : t("matcher.somethingWrong"));
    } finally {
      setPreparingAll(false);
    }
  }

  const readyApplications = recommendations.filter((item) => applications[item.job.id]?.status === "ready");
  const sentApplications = recommendations.filter((item) => applications[item.job.id]?.status === "sent");

  return (
    <div className="matcher-shell">
      {sendPanel && file && (
        <ApplicationSendPanel
          job={sendPanel.job}
          application={sendPanel.application}
          file={file}
          onClose={() => setSendPanel(null)}
          onComplete={(channel, mode) => void completeSend(sendPanel.job, sendPanel.application, channel, mode)}
        />
      )}
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
            <div className="selected-role-actions">
              <button onClick={onBrowseJobs}>{t("matcher.browseAll")}</button>
              {file && (
                <button
                  className="apply-inline-button"
                  onClick={() => void applyToJob(activeJob)}
                  disabled={Boolean(applyingJobId)}
                >
                  {applyingJobId === activeJob.id ? t("matcher.sendingCv") : t("matcher.sendCv")}
                </button>
              )}
            </div>
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
        <button onClick={() => void findBestMatches()} disabled={findingMatches || loading || preparingAll}>
          {findingMatches ? t("matcher.readingRoles") : t("matcher.findBest")}
          {!findingMatches && <span>→</span>}
        </button>
        <button className="secondary-action" onClick={() => void analyze()} disabled={loading || findingMatches || preparingAll}>
          {loading ? t("matcher.analyzing") : t("matcher.analyze")}
        </button>
        <p>{t("matcher.runbarHint")}</p>
        {error && <strong role="alert">{error}</strong>}
        {savedNotice && <strong className="saved-notice">{savedNotice}</strong>}
        {applyNotice && <strong className="apply-notice">{applyNotice}</strong>}
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
            <div>
              <span className="step-label">{t("matcher.bestMatches")}</span>
              <h2>{t("matcher.topRoles")}</h2>
              <p className="apply-hint">{t("matcher.applyHint")}</p>
            </div>
            {file && (
              <button
                className="apply-all-button"
                onClick={() => void prepareAllApplications()}
                disabled={preparingAll || Boolean(applyingJobId)}
              >
                {preparingAll ? t("matcher.applyingAll") : t("matcher.applyAll")}
              </button>
            )}
          </div>
          <div className="recommendations-grid">
            {recommendations.map((item) => {
              const application = applications[item.job.id];
              const isApplying = applyingJobId === item.job.id;

              return (
                <article
                  key={item.job.id}
                  className={activeJob?.id === item.job.id ? "recommendation-card active" : "recommendation-card"}
                >
                  <button type="button" className="recommendation-select" onClick={() => selectJob(item.job)}>
                    <div className="recommendation-score">{item.matchScore}</div>
                    <div>
                      <strong>{item.job.title}</strong>
                      <p>{item.job.company} · {item.job.location}</p>
                      <small>{item.reason}</small>
                    </div>
                  </button>
                  {file && (
                    <div className="recommendation-actions">
                      <button
                        type="button"
                        className="apply-button"
                        onClick={() => void applyToJob(item.job)}
                        disabled={Boolean(applyingJobId) || preparingAll}
                      >
                        {isApplying
                          ? t("matcher.sendingCv")
                          : application?.status === "sent"
                            ? t("matcher.openApplyPage")
                            : t("matcher.sendCv")}
                      </button>
                      {application?.status === "sent" && (
                        <span className="apply-status sent">{t("matcher.applySent", { company: item.job.company })}</span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {readyApplications.length > 0 && (
            <div className="application-queue">
              <h3>{t("matcher.applicationQueue")}</h3>
              <p>{t("matcher.applicationQueueHint")}</p>
              <ul>
                {readyApplications.map((item) => (
                  <li key={item.job.id}>
                    <span>{item.job.company} — {item.job.title}</span>
                    <button
                      type="button"
                      onClick={() => void applyToJob(item.job)}
                      disabled={Boolean(applyingJobId)}
                    >
                      {t("matcher.sendCv")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sentApplications.length > 0 && !readyApplications.length && (
            <p className="apply-hint">{t("matcher.applyReady")}</p>
          )}
        </section>
      )}

      {result && (
        <Results
          result={result}
          t={t}
          onSendCv={activeJob && file ? () => void applyToJob(activeJob) : undefined}
          sending={Boolean(applyingJobId)}
        />
      )}
    </div>
  );
}

function Results({
  result,
  t,
  onSendCv,
  sending,
}: {
  result: AnalyzeResponse;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onSendCv?: () => void;
  sending?: boolean;
}) {
  const score = result.match.matchScore;
  return (
    <section className="results-shell">
      <div className="score-panel">
        <span>{t("matcher.matchScore")}</span>
        <strong>{score}<small>/100</small></strong>
        <p>{result.match.verdict}</p>
        {onSendCv && (
          <button className="apply-button score-apply" onClick={onSendCv} disabled={sending}>
            {sending ? t("matcher.sendingCv") : t("matcher.sendCv")}
          </button>
        )}
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
          <div className="prose-block">{result.match.coverLetter}</div>
        </ResultCard>
        <ResultCard title={t("matcher.recruiterMessage")}>
          <div className="prose-block">{result.match.recruiterMessage}</div>
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
