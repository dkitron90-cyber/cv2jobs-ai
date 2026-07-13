"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Job } from "../app/lib/types";
import { getLocaleDateFormatter } from "../app/lib/i18n";
import {
  fetchCvs,
  fetchJobMatches,
  fetchProfile,
  fetchSavedJobs,
  removeCv,
  removeSavedJob,
  savedJobToJob,
  updateProfile,
  type CvRow,
  type JobMatchRow,
  type SavedJobRow,
  type UserProfile,
} from "../app/lib/user-data";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./useAuth";

type SpaceTab = "overview" | "saved" | "matches" | "applications" | "cvs" | "profile";

type PersonalSpaceProps = {
  onMatchJob: (job: Job) => void;
  onBrowseJobs: () => void;
};

export default function PersonalSpace({ onMatchJob, onBrowseJobs }: PersonalSpaceProps) {
  const { locale, t } = useLanguage();
  const { user, loading: authLoading, configured } = useAuth();
  const [tab, setTab] = useState<SpaceTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobRow[]>([]);
  const [matches, setMatches] = useState<JobMatchRow[]>([]);
  const [applications, setApplications] = useState<JobMatchRow[]>([]);
  const [cvs, setCvs] = useState<CvRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [profileNotice, setProfileNotice] = useState("");

  const dateFormatter = useMemo(
    () => getLocaleDateFormatter(locale, { month: "short", day: "numeric", year: "numeric" }),
    [locale],
  );

  const loadSpace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [profileData, saved, matched, applied, cvRows] = await Promise.all([
        fetchProfile(),
        fetchSavedJobs(),
        fetchJobMatches("matched"),
        fetchJobMatches("application_sent"),
        fetchCvs(),
      ]);
      setProfile(profileData);
      setFullName(profileData?.full_name ?? "");
      setSavedJobs(saved);
      setMatches(matched);
      setApplications(applied);
      setCvs(cvRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("space.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void loadSpace();
  }, [loadSpace]);

  async function handleRemoveSaved(savedId: string) {
    await removeSavedJob(savedId);
    setSavedJobs((current) => current.filter((job) => job.id !== savedId));
  }

  async function handleRemoveCv(cvId: string) {
    await removeCv(cvId);
    setCvs((current) => current.filter((cv) => cv.id !== cvId));
  }

  async function handleSaveProfile() {
    setProfileNotice("");
    try {
      const updated = await updateProfile(fullName);
      setProfile(updated);
      setProfileNotice(t("space.profileSaved"));
    } catch {
      setProfileNotice(t("space.profileSaveFailed"));
    }
  }

  if (!configured) {
    return (
      <div className="space-shell">
        <section className="space-empty">
          <h2>{t("space.signInTitle")}</h2>
          <p>{t("space.signInBody")}</p>
        </section>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="space-shell">
        <section className="space-empty">
          <p>{t("space.loading")}</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-shell">
        <section className="space-hero">
          <p className="eyebrow">{t("space.eyebrow")}</p>
          <h1>{t("space.signInTitle")}</h1>
          <p>{t("space.signInBody")}</p>
          <button className="space-primary" onClick={onBrowseJobs}>{t("matcher.browseRadar")}</button>
        </section>
      </div>
    );
  }

  const recentItems = [
    ...savedJobs.slice(0, 3).map((item, index) => ({ type: "saved" as const, item, date: item.created_at, key: `saved-${item.id}-${index}` })),
    ...matches.slice(0, 3).map((item, index) => ({ type: "match" as const, item, date: item.created_at, key: `match-${item.id}-${index}` })),
    ...applications.slice(0, 3).map((item, index) => ({ type: "application" as const, item, date: item.created_at, key: `application-${item.id}-${index}` })),
  ]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .slice(0, 6);

  return (
    <div className="space-shell">
      <section className="space-hero">
        <div>
          <p className="eyebrow">{t("space.eyebrow")}</p>
          <h1>{t("space.title")}</h1>
          <p>{t("space.hero")}</p>
          {profile?.created_at && (
            <small>{t("space.memberSince", { date: dateFormatter.format(new Date(profile.created_at)) })}</small>
          )}
        </div>
        <div className="space-user-card">
          <span>{profile?.full_name || user.email}</span>
          <strong>{user.email}</strong>
        </div>
      </section>

      <div className="space-tabs" role="tablist" aria-label={t("space.eyebrow")}>
        {([
          ["overview", t("space.tabOverview")],
          ["saved", t("space.tabSaved")],
          ["matches", t("space.tabMatches")],
          ["applications", t("space.tabApplications")],
          ["cvs", t("space.tabCvs")],
          ["profile", t("space.tabProfile")],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "space-tab active" : "space-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="space-error" role="alert">{error}</div>}
      {loading && <div className="space-loading">{t("space.loading")}</div>}

      {!loading && tab === "overview" && (
        <section className="space-panel">
          <div className="space-stats">
            <article><strong>{savedJobs.length}</strong><span>{t("space.statSaved")}</span></article>
            <article><strong>{matches.length}</strong><span>{t("space.statMatches")}</span></article>
            <article><strong>{applications.length}</strong><span>{t("space.statApplications")}</span></article>
            <article><strong>{cvs.length}</strong><span>{t("space.statCvs")}</span></article>
          </div>
          <div className="space-section">
            <h2>{t("space.recentActivity")}</h2>
            {recentItems.length === 0 ? (
              <p className="space-empty-copy">{t("space.noActivity")}</p>
            ) : (
              <ul className="space-activity-list">
                {recentItems.map((entry) => (
                  <li key={entry.key}>
                    <span className={`space-pill ${entry.type}`}>
                      {entry.type === "saved"
                        ? t("space.tabSaved")
                        : entry.type === "match"
                          ? t("space.statusMatched")
                          : t("space.statusApplication")}
                    </span>
                    <div>
                      <strong>{entry.item.job_title}</strong>
                      <p>{entry.item.company}</p>
                    </div>
                    <small>{dateFormatter.format(new Date(entry.date))}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {!loading && tab === "saved" && (
        <section className="space-panel">
          {savedJobs.length === 0 ? (
            <p className="space-empty-copy">{t("space.emptySaved")}</p>
          ) : (
            <div className="space-card-grid">
              {savedJobs.map((row) => (
                <SavedJobCard
                  key={row.id}
                  row={row}
                  dateLabel={t("space.savedOn", { date: dateFormatter.format(new Date(row.created_at)) })}
                  onMatch={() => onMatchJob(savedJobToJob(row))}
                  onOpen={() => row.job_url && window.open(row.job_url, "_blank", "noopener,noreferrer")}
                  onRemove={() => void handleRemoveSaved(row.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "matches" && (
        <section className="space-panel">
          {matches.length === 0 ? (
            <p className="space-empty-copy">{t("space.emptyMatches")}</p>
          ) : (
            <div className="space-card-grid">
              {matches.map((row) => (
                <MatchCard key={row.id} row={row} dateFormatter={dateFormatter} t={t} />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "applications" && (
        <section className="space-panel">
          {applications.length === 0 ? (
            <p className="space-empty-copy">{t("space.emptyApplications")}</p>
          ) : (
            <div className="space-card-grid">
              {applications.map((row) => (
                <ApplicationCard
                  key={row.id}
                  row={row}
                  dateFormatter={dateFormatter}
                  onOpen={() => row.job_url && window.open(row.job_url, "_blank", "noopener,noreferrer")}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "cvs" && (
        <section className="space-panel">
          {cvs.length === 0 ? (
            <p className="space-empty-copy">{t("space.emptyCvs")}</p>
          ) : (
            <div className="space-card-grid">
              {cvs.map((row) => (
                <article className="space-card" key={row.id}>
                  <strong>{row.file_name}</strong>
                  <p>{t("space.cvUploaded", { date: dateFormatter.format(new Date(row.created_at)) })}</p>
                  <p className="space-snippet">{row.extracted_text.slice(0, 180)}…</p>
                  <button type="button" className="space-secondary" onClick={() => void handleRemoveCv(row.id)}>
                    {t("space.remove")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "profile" && (
        <section className="space-panel space-profile-form">
          <label>
            <span>{t("space.profileName")}</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label>
            <span>{t("space.profileEmail")}</span>
            <input value={user.email ?? ""} disabled />
          </label>
          <button type="button" className="space-primary" onClick={() => void handleSaveProfile()}>
            {t("space.profileSave")}
          </button>
          {profileNotice && <p className="space-notice">{profileNotice}</p>}
        </section>
      )}
    </div>
  );
}

function SavedJobCard({
  row,
  dateLabel,
  onMatch,
  onOpen,
  onRemove,
  t,
}: {
  row: SavedJobRow;
  dateLabel: string;
  onMatch: () => void;
  onOpen: () => void;
  onRemove: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <article className="space-card">
      <strong>{row.job_title}</strong>
      <p>{row.company} · {row.location}</p>
      <small>{dateLabel}</small>
      <div className="space-card-actions">
        <button type="button" className="space-primary" onClick={onMatch}>{t("space.matchAgain")}</button>
        {row.job_url && (
          <button type="button" className="space-secondary" onClick={onOpen}>{t("space.openJob")}</button>
        )}
        <button type="button" className="space-danger" onClick={onRemove}>{t("space.remove")}</button>
      </div>
    </article>
  );
}

function MatchCard({
  row,
  dateFormatter,
  t,
}: {
  row: JobMatchRow;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <article className="space-card">
      <div className="space-card-top">
        <strong>{row.job_title}</strong>
        {row.match_score != null && <span className="space-score">{row.match_score}</span>}
      </div>
      <p>{row.company}</p>
      <small>{dateFormatter.format(new Date(row.created_at))}</small>
      {row.job_url && (
        <a href={row.job_url} target="_blank" rel="noreferrer" className="space-link">
          {t("space.openJob")}
        </a>
      )}
    </article>
  );
}

function ApplicationCard({
  row,
  dateFormatter,
  onOpen,
  t,
}: {
  row: JobMatchRow;
  dateFormatter: Intl.DateTimeFormat;
  onOpen: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [showLetter, setShowLetter] = useState(false);
  const coverLetter =
    typeof row.match_result?.coverLetter === "string" ? row.match_result.coverLetter : "";

  return (
    <article className="space-card">
      <div className="space-card-top">
        <strong>{row.job_title}</strong>
        {row.match_score != null && <span className="space-score">{row.match_score}</span>}
      </div>
      <p>{row.company}</p>
      <small>{dateFormatter.format(new Date(row.created_at))}</small>
      <div className="space-card-actions">
        {row.job_url && (
          <button type="button" className="space-primary" onClick={onOpen}>{t("space.openJob")}</button>
        )}
        {coverLetter && (
          <button type="button" className="space-secondary" onClick={() => setShowLetter((value) => !value)}>
            {showLetter ? t("space.hideCoverLetter") : t("space.viewCoverLetter")}
          </button>
        )}
      </div>
      {showLetter && coverLetter && <div className="prose-block">{coverLetter}</div>}
    </article>
  );
}
