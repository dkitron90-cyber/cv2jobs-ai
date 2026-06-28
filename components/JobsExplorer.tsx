"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, JobsResponse, WorkplaceType } from "../app/lib/types";

type JobsExplorerProps = {
  onMatchJob: (job: Job) => void;
};

const workplaceLabels: Record<WorkplaceType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
  unspecified: "Work mode not listed",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat("en-IL", { month: "short", day: "numeric" }).format(date);
}

function formatRefreshTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat("en-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function JobsExplorer({ onMatchJob }: JobsExplorerProps) {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadJobs(forceRefresh = false) {
    forceRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs${forceRefresh ? "?refresh=1" : ""}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load jobs");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  const companies = useMemo(
    () => [...new Set((data?.jobs ?? []).map((job) => job.company))].sort(),
    [data],
  );

  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (data?.jobs ?? []).filter((job) => {
      const searchable = [job.title, job.company, job.location, job.department, job.description]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!needle || searchable.includes(needle)) &&
        (!company || job.company === company) &&
        (!workplace || job.workplace === workplace)
      );
    });
  }, [company, data, query, workplace]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedId("");
      return;
    }
    if (!filteredJobs.some((job) => job.id === selectedId)) {
      setSelectedId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedId]);

  const selectedJob = filteredJobs.find((job) => job.id === selectedId) ?? null;
  const workingSources = data?.sources.filter((source) => source.ok).length ?? 0;
  const sourceFailures = data?.sources.filter((source) => !source.ok).length ?? 0;

  return (
    <div className="radar-shell">
      <section className="radar-hero">
        <div className="radar-copy">
          <p className="eyebrow">Israel job radar</p>
          <h1>Find the opening before the crowd does.</h1>
          <p className="hero-copy">
            Live roles pulled directly from employer hiring systems, cleaned into one shortlist,
            and ready to match against your CV.
          </p>
        </div>
        <div className="radar-scope" aria-label="Current job radar status">
          <div className="scope-rings" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <div className="scope-reading">
            <strong>{loading ? "—" : data?.availableTotal ?? 0}</strong>
            <span>live roles</span>
          </div>
        </div>
      </section>

      <section className="radar-toolbar" aria-label="Job search filters">
        <label className="search-field">
          <span className="sr-only">Search jobs</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Role, skill, team or city"
          />
        </label>
        <label className="filter-field">
          <span>Company</span>
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            <option value="">All companies</option>
            {companies.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Work mode</span>
          <select value={workplace} onChange={(event) => setWorkplace(event.target.value)}>
            <option value="">Any work mode</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
            <option value="on-site">On-site</option>
            <option value="unspecified">Not listed</option>
          </select>
        </label>
        <button className="refresh-button" onClick={() => void loadJobs(true)} disabled={refreshing}>
          <span className={refreshing ? "refresh-mark spinning" : "refresh-mark"}>↻</span>
          {refreshing ? "Scanning" : "Refresh"}
        </button>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>The radar could not reach its sources.</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => void loadJobs()}>Try again</button>
        </div>
      )}

      <section className="radar-workspace">
        <aside className="source-rail" aria-label="Connected job sources">
          <div className="rail-heading">
            <p>Source coverage</p>
            <span>{workingSources} connected</span>
          </div>
          <button
            className={!company ? "source-row active" : "source-row"}
            onClick={() => setCompany("")}
          >
            <span className="source-sigil">IL</span>
            <span><strong>All employers</strong><small>{data?.availableTotal ?? 0} roles</small></span>
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
                  <span><strong>{source.company}</strong><small>{source.jobCount} roles</small></span>
                </button>
              ))}
          </div>
          <div className="rail-footer">
            <span className="live-dot" />
            <p>
              {data ? `Updated ${formatRefreshTime(data.refreshedAt)}` : "Connecting to sources"}
              {sourceFailures > 0 && <small>{sourceFailures} source{sourceFailures === 1 ? "" : "s"} unavailable</small>}
            </p>
          </div>
        </aside>

        <div className="job-stream">
          <div className="stream-heading">
            <p><strong>{filteredJobs.length}</strong> matching roles</p>
            <span>Newest updates first</span>
          </div>

          {loading && <JobListSkeleton />}

          {!loading && filteredJobs.length === 0 && !error && (
            <div className="empty-state">
              <span>0</span>
              <h2>No roles match these filters.</h2>
              <p>Clear a filter or search for a broader skill.</p>
              <button onClick={() => { setQuery(""); setCompany(""); setWorkplace(""); }}>
                Clear filters
              </button>
            </div>
          )}

          <div className="job-list">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                className={selectedId === job.id ? "job-row selected" : "job-row"}
                onClick={() => setSelectedId(job.id)}
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
          {selectedJob ? (
            <>
              <div className="inspector-topline">
                <span className="verified-label"><i /> {selectedJob.sourceLabel} feed</span>
                <span>Updated {formatDate(selectedJob.updatedAt)}</span>
              </div>
              <div className="inspector-title">
                <span className="company-mark large">{selectedJob.company.slice(0, 2).toUpperCase()}</span>
                <div>
                  <p>{selectedJob.company}</p>
                  <h2>{selectedJob.title}</h2>
                </div>
              </div>
              <div className="inspector-chips">
                <span>{selectedJob.location}</span>
                <span>{selectedJob.department}</span>
                <span>{workplaceLabels[selectedJob.workplace]}</span>
              </div>
              <div className="inspector-actions">
                <button className="match-button" onClick={() => onMatchJob(selectedJob)}>
                  Match my CV <span>→</span>
                </button>
                <a href={selectedJob.url} target="_blank" rel="noreferrer" className="apply-link">
                  Open original
                </a>
              </div>
              <div className="job-description">
                <h3>Role brief</h3>
                {selectedJob.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .slice(0, 12)
                  .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <span>←</span>
              <p>Select a role to inspect its details.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function JobListSkeleton() {
  return (
    <div className="job-list" aria-label="Loading jobs">
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
