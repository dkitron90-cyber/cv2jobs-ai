import type { Job, JobSourceStatus } from "../types";
import { decodeEntities, inferWorkplaceFromText, isIsraelLocation, toPlainText } from "./shared";

const LINKEDIN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
};

// Guest search API: returns HTML job cards, 25 per page, no auth required.
const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";

const PAGES_PER_SEARCH = 2;
const PAGE_SIZE = 25;
const REQUEST_DELAY_MS = 400;

export const LINKEDIN_SEARCHES = [
  { keywords: "software engineer", department: "Engineering" },
  { keywords: "frontend developer", department: "Engineering" },
  { keywords: "backend developer", department: "Engineering" },
  { keywords: "devops engineer", department: "DevOps" },
  { keywords: "data engineer", department: "Data" },
  { keywords: "qa engineer", department: "QA" },
  { keywords: "product manager", department: "Product" },
];

type LinkedInSearch = (typeof LINKEDIN_SEARCHES)[number];

function cleanText(html = ""): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseJobCards(html: string, search: LinkedInSearch): Job[] {
  const segments = html.split(/data-entity-urn="urn:li:jobPosting:/).slice(1);

  return segments.flatMap((segment): Job[] => {
    const externalId = segment.match(/^(\d+)"/)?.[1];
    const url = segment.match(/base-card__full-link[^>]*href="([^"]+)"/)?.[1];
    const title = cleanText(segment.match(/base-search-card__title[^>]*>([\s\S]*?)<\/h3>/)?.[1]);
    const company = cleanText(segment.match(/base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/)?.[1]);
    const location = cleanText(segment.match(/job-search-card__location[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    const postedAt = segment.match(/datetime="(\d{4}-\d{2}-\d{2})"/)?.[1];

    if (!externalId || !url || !title || !isIsraelLocation(location)) return [];

    return [
      {
        id: `linkedin:${externalId}`,
        source: "linkedin",
        sourceLabel: "LinkedIn",
        company: company || "Unknown",
        title,
        location: location || "Israel",
        department: search.department,
        // Descriptions live on a separate endpoint per job; lazy-loaded via
        // fetchLinkedInJobDescription when the job is opened.
        description: "",
        url: decodeEntities(url).split("?")[0],
        updatedAt: postedAt || new Date().toISOString(),
        workplace: inferWorkplaceFromText(`${title} ${location}`),
      },
    ];
  });
}

async function fetchSearchPage(search: LinkedInSearch, page: number): Promise<Job[]> {
  const params = new URLSearchParams({
    keywords: search.keywords,
    location: "Israel",
    f_TPR: "r604800", // posted within the last week
    start: String(page * PAGE_SIZE),
  });

  const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: LINKEDIN_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn returned HTTP ${response.status}`);
  }

  return parseJobCards(await response.text(), search);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchLinkedInJobs(): Promise<{ jobs: Job[]; sources: JobSourceStatus[] }> {
  const jobsById = new Map<string, Job>();
  let anyPageOk = false;

  // Sequential requests with a small delay to stay under LinkedIn's rate limits.
  for (const search of LINKEDIN_SEARCHES) {
    for (let page = 0; page < PAGES_PER_SEARCH; page += 1) {
      try {
        const jobs = await fetchSearchPage(search, page);
        anyPageOk = true;
        for (const job of jobs) {
          if (!jobsById.has(job.id)) jobsById.set(job.id, job);
        }
        if (jobs.length < PAGE_SIZE) break;
      } catch {
        break;
      }
      await wait(REQUEST_DELAY_MS);
    }
  }

  const jobs = [...jobsById.values()];

  return {
    jobs,
    sources: [{ id: "linkedin-israel", company: "LinkedIn", jobCount: jobs.length, ok: anyPageOk }],
  };
}

export async function fetchLinkedInJobDescription(jobId: string): Promise<string | null> {
  const externalId = jobId.split(":")[1];
  if (!externalId) return null;

  try {
    const response = await fetch(`${DETAIL_URL}/${externalId}`, {
      headers: LINKEDIN_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const markup = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/)?.[1];
    if (!markup) return null;

    const description = toPlainText(markup);
    return description || null;
  } catch {
    return null;
  }
}
