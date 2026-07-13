import type { ContentLanguage } from "./text-language";

export type CvJobHistory = {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
};

export type CvProfile = {
  candidateName: string;
  lastTwoJobs: CvJobHistory[];
  idealNextRole: string;
  targetRoles: string[];
  seniority: string;
  skills: string[];
  searchKeywords: string[];
  summary: string;
  careerTrajectory: string;
};

export type CvAnalysis = {
  candidateName: string;
  targetRoles: string[];
  seniority: string;
  skills: string[];
  tools: string[];
  languages: string[];
  summary: string;
  lastTwoJobs?: CvJobHistory[];
  idealNextRole?: string;
};

export type JobMatch = {
  matchScore: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  cvImprovements: string[];
  coverLetter: string;
  recruiterMessage: string;
};

export type AnalyzeResponse = {
  cv: CvAnalysis;
  match: JobMatch;
};

export type JobRecommendation = {
  job: Job;
  matchScore: number;
  reason: string;
};

export type RecommendResponse = {
  profile: CvProfile;
  recommendations: JobRecommendation[];
  cvLanguage?: "he" | "en" | "mixed";
};

export type ApplyResponse = {
  candidateName: string;
  coverLetter: string;
  recruiterMessage: string;
  matchScore: number;
  applyUrl: string;
  contactEmail: string | null;
};

export type WorkplaceType = "remote" | "hybrid" | "on-site" | "unspecified";

export type Job = {
  id: string;
  source: "greenhouse" | "lever" | "ashby" | "comeet" | "drushim";
  sourceLabel: string;
  company: string;
  title: string;
  location: string;
  department: string;
  description: string;
  url: string;
  updatedAt: string;
  workplace: WorkplaceType;
  contentLanguage?: ContentLanguage;
};

export type JobSummary = Omit<Job, "description"> & {
  contentLanguage: ContentLanguage;
};

export type JobSourceStatus = {
  id: string;
  company: string;
  jobCount: number;
  ok: boolean;
};

export type JobsResponse = {
  jobs: JobSummary[];
  total: number;
  availableTotal: number;
  sources: JobSourceStatus[];
  refreshedAt: string;
};

export type JobDetailResponse = {
  job: Job;
};
