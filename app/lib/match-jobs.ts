import type { CvProfile, JobRecommendation } from "./types";
import type { Job } from "./types";

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s+#./-]/gu, " ");
}

function keywordScore(job: Job, profile: CvProfile): number {
  const haystack = normalize(`${job.title} ${job.department} ${job.description}`);
  let score = 0;

  for (const keyword of profile.searchKeywords) {
    const token = normalize(keyword).trim();
    if (token && haystack.includes(token)) score += 2;
  }

  for (const role of profile.targetRoles) {
    const token = normalize(role).trim();
    if (token && haystack.includes(token)) score += 4;
  }

  const ideal = normalize(profile.idealNextRole).trim();
  if (ideal && haystack.includes(ideal)) score += 6;

  for (const jobEntry of profile.lastTwoJobs) {
    const title = normalize(jobEntry.title).trim();
    if (title && haystack.includes(title)) score += 1;
  }

  return score;
}

export function prefilterJobs(jobs: Job[], profile: CvProfile, limit = 35): Job[] {
  return [...jobs]
    .map((job) => ({ job, score: keywordScore(job, profile) }))
    .sort((left, right) => right.score - left.score || left.job.title.localeCompare(right.job.title))
    .slice(0, limit)
    .map(({ job }) => job);
}

export function mergeRankings(
  jobs: Job[],
  rankings: Array<{ id: string; matchScore: number; reason: string }>
): JobRecommendation[] {
  const byId = new Map(jobs.map((job) => [job.id, job]));

  return rankings
    .map((ranking) => {
      const job = byId.get(ranking.id);
      if (!job) return null;
      return {
        job,
        matchScore: ranking.matchScore,
        reason: ranking.reason,
      };
    })
    .filter((item): item is JobRecommendation => item !== null);
}

export function fallbackRecommendations(jobs: Job[], profile: CvProfile, limit = 5): JobRecommendation[] {
  return [...jobs]
    .map((job) => ({ job, score: keywordScore(job, profile) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ job, score }) => ({
      job,
      matchScore: Math.min(95, 45 + score * 4),
      reason: `Title and skills overlap with your trajectory toward ${profile.idealNextRole}.`,
    }));
}
