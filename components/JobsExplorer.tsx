"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, JobsResponse, JobSummary, WorkplaceType } from "../app/lib/types";
import { mergeJobDescription } from "../app/lib/job-summary";
import { readLocalJobsCache, writeLocalJobsCache } from "../app/lib/jobs-local-cache";
import { getLocaleDateFormatter } from "../app/lib/i18n";
import { normalizeSearchText } from "../app/lib/text-language";
import { saveJob } from "../app/lib/user-data";
import { useLanguage } from "./LanguageProvider";
import JobDescriptionView from "./JobDescriptionView";
import { useAuth } from "./useAuth";

type JobsExplorerProps = {
  onMatchJob: (job: Job) => void;
};

function getInitialJobsState(): { data: JobsResponse | null; loading: boolean } {
  const cached = readLocalJobsCache();
  return { data: cached, loading: !cached };
}

export default function JobsExplorer({ onMatchJob }: JobsExplorerProps) {
  const initialState = getInitialJobsState();
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<JobsResponse | null>(initialState.data);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [jobLanguage, setJobLanguage] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [loading, setLoading] = useState(initialState.loading);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [jobDescriptions, setJobDescriptions] = useState<Record<string, string>>({});
  const [loadingDescriptionId, setLoadingDescriptionId] = useState("");
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string; translated: boolean }>>({});
  const [translating, setTranslating] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [savingJobId, setSavingJobId] = useState("");

  const workplaceLabels: Record<WorkplaceType, string> = {
    remote: t("workplace.remote"),
    hybrid: t("workplace.hybrid"),
    "on-site": t("workplace.on-site"),
    unspecified: t("workplace.unspecified"),
  };

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("radar.recentlyUpdated");
    return getLocaleDateFormatter(locale, { month: "short", day: "numeric" }).format(date);
  }

  function formatRefreshTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("radar.justNow");
    return getLocaleDateFormatter(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  async function loadJobs(forceRefresh = false, hasCachedData = false) {
    if (forceRefresh) {
      setRefreshing(true);
    } else if (!hasCachedData) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await fetch(`/api/jobs${forceRefresh ? "?refresh=1" : ""}`);
      const payload = (await response.json()) as JobsResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || t("radar.couldNotLoad"));
      setData(payload);
      writeLocalJobsCache(payload);
    } catch (loadError) {
      if (!hasCachedData) {
        setError(loadError instanceof Error ? loadError.message : t("radar.couldNotLoad"));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadJobs(false, Boolean(initialState.data));
  }, []);

  async function fetchJobDescription(jobId: string): Promise<string> {
    const cached = jobDescriptions[jobId];
    if (cached) return cached;

    setLoadingDescriptionId(jobId);
    try {
      const response = await fetch(`/api/jobs?jobId=${encodeURIComponent(jobId)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("radar.couldNotLoad"));
      const description = String(payload.job?.description ?? "");
      setJobDescriptions((current) => ({ ...current, [jobId]: description }));
      return description;
    } finally {
      setLoadingDescriptionId("");
    }
  }

  const companies = useMemo(
    () => [...new Set((data?.jobs ?? []).map((job) => job.company))].sort(),
    [data],
  );

  const filteredJobs = useMemo(() => {
    const needle = normalizeSearchText(query);
    return (data?.jobs ?? []).filter((job) => {
      const searchable = normalizeSearchText(
        [job.title, job.company, job.location, job.department].join(" "),
      );
      return (
        (!needle || searchable.includes(needle)) &&
        (!company || job.company === company) &&
        (!workplace || job.workplace === workplace) &&
        (!jobLanguage || job.contentLanguage === jobLanguage)
      );
    });
  }, [company, data, jobLanguage, query, workplace]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedId("");
      setMobileDetailOpen(false);
      return;
    }
    if (!filteredJobs.some((job) => job.id === selectedId)) {
      setSelectedId(filteredJobs[0].id);
      setMobileDetailOpen(false);
    }
  }, [filteredJobs, selectedId]);

  const selectedSummary = filteredJobs.find((job) => job.id === selectedId) ?? null;
  const selectedJob = selectedSummary
    ? mergeJobDescription(selectedSummary, jobDescriptions[selectedSummary.id] ?? "")
    : null;
  const workingSources = data?.sources.filter((source) => source.ok).length ?? 0;
  const sourceFailures = data?.sources.filter((source) => !source.ok).length ?? 0;
  const selectedTranslation = selectedSummary ? translations[selectedSummary.id] : undefined;
  const displayTitle = selectedTranslation?.title ?? selectedSummary?.title ?? "";
  const displayDescription = selectedTranslation?.description ?? jobDescriptions[selectedSummary?.id ?? ""] ?? "";
  const descriptionReady = Boolean(selectedSummary && jobDescriptions[selectedSummary.id]);
  const descriptionLoading = Boolean(selectedSummary && loadingDescriptionId === selectedSummary.id);

  useEffect(() => {
    if (!selectedSummary) return;
    if (jobDescriptions[selectedSummary.id]) return;
    void fetchJobDescription(selectedSummary.id);
  }, [selectedSummary?.id, jobDescriptions]);

  useEffect(() => {
    if (!selectedJob || !descriptionReady || locale !== "he") return;
    if (translations[selectedJob.id]) return;

    const jobId = selectedJob.id;
    const sourceLanguage = selectedJob.contentLanguage;

    if (sourceLanguage === "he") {
      setTranslations((current) => ({
        ...current,
        [jobId]: {
          title: selectedJob.title,
          description: selectedJob.description,
          translated: false,
        },
      }));
      return;
    }

    let cancelled = false;
    setTranslating(true);

    void fetch("/api/translate-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        title: selectedJob.title,
        description: selectedJob.description,
      }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "translate failed");
        if (cancelled) return;
        setTranslations((current) => ({
          ...current,
          [jobId]: {
            title: payload.title,
            description: payload.description,
            translated: Boolean(payload.translated),
          },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setTranslations((current) => ({
          ...current,
          [jobId]: {
            title: selectedJob.title,
            description: selectedJob.description,
            translated: false,
          },
        }));
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [descriptionReady, locale, selectedJob?.id, selectedJob?.title, selectedJob?.description, selectedJob?.contentLanguage, translations]);

  function selectJob(jobId: string) {
    setSelectedId(jobId);
    if (window.matchMedia("(max-width: 860px)").matches) {
      setMobileDetailOpen(true);
    }
  }

  function closeMobileDetail() {
    setMobileDetailOpen(false);
  }

  async function handleMatchJob(job: JobSummary) {
    const description = jobDescriptions[job.id] || (await fetchJobDescription(job.id));
    onMatchJob(mergeJobDescription(job, description));
  }

  async function handleSaveJob(job: JobSummary) {
    if (!user) {
      setSaveNotice(t("radar.signInToSave"));
      return;
    }

    setSavingJobId(job.id);
    setSaveNotice("");
    try {
      const description = jobDescriptions[job.id] || (await fetchJobDescription(job.id));
      await saveJob(mergeJobDescription(job, description));
      setSaveNotice(t("radar.jobSaved"));
    } catch {
      setSaveNotice(t("radar.jobSaveFailed"));
    } finally {
      setSavingJobId("");
    }
  }

  return (
    <div className="radar-shell">
      <section className="radar-hero">
        <div className="radar-copy">
          <p className="eyebrow">{t("radar.eyebrow")}</p>
          <h1>{t("radar.title")}</h1>
          <p className="hero-copy">{t("radar.hero")}</p>
        </div>
        <div className="radar-scope" aria-label={t("radar.liveRoles")}>
          <div className="scope-rings" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <div className="scope-reading">
            <strong>{loading ? "—" : data?.availableTotal ?? 0}</strong>
            <span>{t("radar.liveRoles")}</span>
          </div>
        </div>
      </section>

      <section className="radar-toolbar" aria-label={t("radar.searchJobs")}>
        <label className="search-field">
          <span className="sr-only">{t("radar.searchJobs")}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("radar.searchPlaceholder")}
          />
        </label>
        <label className="filter-field">
          <span>{t("radar.company")}</span>
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            <option value="">{t("radar.allCompanies")}</option>
            {companies.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>{t("radar.workMode")}</span>
          <select value={workplace} onChange={(event) => setWorkplace(event.target.value)}>
            <option value="">{t("radar.anyWorkMode")}</option>
            <option value="hybrid">{t("workplace.hybrid")}</option>
            <option value="remote">{t("workplace.remote")}</option>
            <option value="on-site">{t("workplace.on-site")}</option>
            <option value="unspecified">{t("radar.notListed")}</option>
          </select>
        </label>
        <label className="filter-field">
          <span>{t("radar.jobLanguage")}</span>
          <select value={jobLanguage} onChange={(event) => setJobLanguage(event.target.value)}>
            <option value="">{t("radar.allLanguages")}</option>
            <option value="he">{t("radar.langHebrew")}</option>
            <option value="en">{t("radar.langEnglish")}</option>
            <option value="mixed">{t("radar.langMixed")}</option>
          </select>
        </label>
        <button className="refresh-button" onClick={() => void loadJobs(true)} disabled={refreshing}>
          <span className={refreshing ? "refresh-mark spinning" : "refresh-mark"}>↻</span>
          {refreshing ? t("radar.scanning") : t("radar.refresh")}
        </button>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>{t("radar.errorTitle")}</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => void loadJobs()}>{t("radar.tryAgain")}</button>
        </div>
      )}

      <section className={`radar-workspace${mobileDetailOpen ? " mobile-detail-open" : ""}`}>
        <aside className="source-rail" aria-label={t("radar.sourceCoverage")}>
          <div className="rail-heading">
            <p>{t("radar.sourceCoverage")}</p>
            <span>{workingSources} {t("radar.connected")}</span>
          </div>
          <button
            className={!company ? "source-row active" : "source-row"}
            onClick={() => setCompany("")}
          >
            <span className="source-sigil">IL</span>
            <span><strong>{t("radar.allEmployers")}</strong><small>{data?.availableTotal ?? 0} {t("radar.roles")}</small></span>
          </button>
          <div className="source-list">
            {(data?.sources ?? [])
              .filter((source) => source.ok)
              .sort((a, b) => b.jobCount - a.jobCount)
              .map((source) => (
                <button
                  key={source.id}
                  className={company === source.company ? "source-row active" : "source-row"}
                  onClick={() => setCompany(source.company)}
                >
                  <span className="source-sigil">{source.company.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{source.company}</strong><small>{source.jobCount} {t("radar.roles")}</small></span>
                </button>
              ))}
          </div>
          <div className="rail-footer">
            <span className="live-dot" />
            <p>
              {data ? t("radar.updated", { time: formatRefreshTime(data.refreshedAt) }) : t("radar.connecting")}
              {sourceFailures > 0 && (
                <small>
                  {sourceFailures === 1
                    ? t("radar.sourcesUnavailable", { count: sourceFailures })
                    : t("radar.sourcesUnavailablePlural", { count: sourceFailures })}
                </small>
              )}
            </p>
          </div>
        </aside>

        <div className="job-stream">
          <div className="stream-heading">
            <p><strong>{filteredJobs.length}</strong> {t("radar.matchingRoles")}</p>
            <span>{t("radar.newestFirst")}</span>
          </div>

          {loading && !data && <JobListSkeleton label={t("radar.loadingJobs")} />}

          {!loading && filteredJobs.length === 0 && !error && (
            <div className="empty-state">
              <span>0</span>
              <h2>{t("radar.emptyTitle")}</h2>
              <p>{t("radar.emptyBody")}</p>
              <button onClick={() => { setQuery(""); setCompany(""); setWorkplace(""); setJobLanguage(""); }}>
                {t("radar.clearFilters")}
              </button>
            </div>
          )}

          <div className="job-list">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                className={selectedId === job.id ? "job-row selected" : "job-row"}
                onClick={() => selectJob(job.id)}
              >
                <span className="company-mark">{job.company.slice(0, 2).toUpperCase()}</span>
                <span className="job-row-body">
                  <span className="job-row-topline">
                    <strong>{job.title}</strong>
                    <small>{formatDate(job.updatedAt)}</small>
                  </span>
                  <span className="company-line">{job.company}</span>
                  <span className="job-meta">
                    <span>{job.location}</span>
                    <span>{job.department}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="job-inspector" aria-live="polite">
          {selectedSummary ? (
            <>
              <button type="button" className="inspector-back" onClick={closeMobileDetail}>
                ← {t("radar.backToRoles")}
              </button>
              <div className="inspector-topline">
                <span className="verified-label"><i /> {selectedSummary.sourceLabel} {t("radar.feed")}</span>
                <span>{formatDate(selectedSummary.updatedAt)}</span>
              </div>
              <div className="inspector-title">
                <span className="company-mark large">{selectedSummary.company.slice(0, 2).toUpperCase()}</span>
                <div>
                  <p>{selectedSummary.company}</p>
                  <h2>{displayTitle}</h2>
                </div>
              </div>
              {translating && locale === "he" && <p className="translation-note">{t("radar.translating")}</p>}
              {selectedTranslation?.translated && locale === "he" && (
                <p className="translation-note">{t("radar.translatedNote")}</p>
              )}
              <div className="inspector-chips">
                <span>{selectedSummary.location}</span>
                <span>{selectedSummary.department}</span>
                <span>{workplaceLabels[selectedSummary.workplace]}</span>
              </div>
              <div className="inspector-actions">
                <button
                  className="match-button"
                  onClick={() => void handleMatchJob(selectedSummary)}
                  disabled={descriptionLoading}
                >
                  {t("radar.matchCv")} <span>→</span>
                </button>
                <button
                  className="save-job-button"
                  onClick={() => void handleSaveJob(selectedSummary)}
                  disabled={savingJobId === selectedSummary.id || descriptionLoading}
                >
                  {savingJobId === selectedSummary.id ? "…" : t("radar.saveJob")}
                </button>
                <a href={selectedSummary.url} target="_blank" rel="noreferrer" className="apply-link">
                  {t("radar.openOriginal")}
                </a>
              </div>
              {saveNotice && <p className="save-notice">{saveNotice}</p>}
              <div className="job-description">
                <h3>{t("radar.roleBrief")}</h3>
                {descriptionLoading && <p className="translation-note">{t("radar.loadingJobs")}</p>}
                {!descriptionLoading && <JobDescriptionView description={displayDescription} />}
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <span>←</span>
              <p>{t("radar.selectRole")}</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function JobListSkeleton({ label }: { label: string }) {
  return (
    <div className="job-list" aria-label={label}>
      {[0, 1, 2, 3, 4].map((item) => (
        <div className="job-row skeleton-row" key={item}>
          <span className="skeleton-block square" />
          <span className="skeleton-lines">
            <i />
            <i />
            <i />
          </span>
        </div>
      ))}
    </div>
  );
}
