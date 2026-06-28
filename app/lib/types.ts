export type CvAnalysis = {
  candidateName: string;
  targetRoles: string[];
  seniority: string;
  skills: string[];
  tools: string[];
  languages: string[];
  summary: string;
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

export type WorkplaceType = "remote" | "hybrid" | "on-site" | "unspecified";

export type Job = {
  id: string;
  source: "greenhouse" | "lever" | "ashby";
  sourceLabel: string;
  company: string;
  title: string;
  location: string;
  department: string;
  description: string;
  url: string;
  updatedAt: string;
  workplace: WorkplaceType;
};

export type JobSourceStatus = {
  id: string;
  company: string;
  jobCount: number;
  ok: boolean;
};

export type JobsResponse = {
  jobs: Job[];
  total: number;
  availableTotal: number;
  sources: JobSourceStatus[];
  refreshedAt: string;
};
