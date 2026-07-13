import type { Job, JobSummary } from "./types";
import { detectContentLanguage } from "./text-language";

export function toJobSummary(job: Job): JobSummary {
  const { description, ...rest } = job;
  return {
    ...rest,
    contentLanguage:
      job.contentLanguage ?? detectContentLanguage(`${job.title}\n${description.slice(0, 2000)}`),
  };
}

export function toJobSummaries(jobs: Job[]): JobSummary[] {
  return jobs.map(toJobSummary);
}

export function mergeJobDescription(summary: JobSummary, description: string): Job {
  return {
    ...summary,
    description,
  };
}
