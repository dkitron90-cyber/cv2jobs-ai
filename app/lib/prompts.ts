import type { CvProfile } from "./types";
import type { ContentLanguage } from "./text-language";
import type { Locale } from "./i18n";
import { getCrossLanguageMatchingRule, getCvReadingRule, getPromptLanguageRule } from "./i18n";

export function buildProfilePrompt(cvText: string, locale: Locale = "en", cvLanguage: ContentLanguage = "en") {
  return `You are an expert career coach specializing in Israeli tech hiring.

Read the CV carefully. Focus on the candidate's two most recent jobs (current role first, then the one before it).

Return only valid JSON matching this schema:
{
  "candidateName": "string",
  "lastTwoJobs": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "idealNextRole": "string",
  "targetRoles": ["string"],
  "seniority": "string",
  "skills": ["string"],
  "searchKeywords": ["string"],
  "summary": "string",
  "careerTrajectory": "string"
}

Rules:
- lastTwoJobs must contain exactly the two most recent positions from the CV, in reverse chronological order.
- idealNextRole is the single best next job title this candidate should pursue, inferred from those last two roles, seniority, and skills.
- targetRoles should list 2-4 realistic titles including idealNextRole.
- searchKeywords should be 6-12 short terms useful for job search (skills, domains, titles) — no full sentences.
- careerTrajectory is one sentence explaining why idealNextRole fits based on the last two jobs.
- Do not invent employers or titles that are not supported by the CV.
- ${getCvReadingRule(cvLanguage)}
- ${getCrossLanguageMatchingRule(cvLanguage, locale)}
- ${getPromptLanguageRule(locale)}

CV:
${cvText}`;
}

export function buildRankJobsPrompt(
  profile: CvProfile,
  jobs: Array<{ id: string; title: string; company: string; department: string; location: string; excerpt: string }>,
  locale: Locale = "en",
  cvLanguage: ContentLanguage = "en",
) {
  return `You are an expert career coach matching candidates to live job postings in Israel.

Given the candidate profile and job list, pick the 5 best matches from the list only.

Return only valid JSON:
{
  "rankings": [
    {
      "id": "string",
      "matchScore": number,
      "reason": "string"
    }
  ]
}

Rules:
- Use only job ids from the provided list.
- matchScore must be 0-100.
- Rank by fit to idealNextRole and the trajectory from the last two jobs.
- reason must be one concise sentence referencing specific overlap or gap.
- Prefer realistic next-step roles, not unrealistic leaps.
- ${getCrossLanguageMatchingRule(cvLanguage, locale)}
- ${getPromptLanguageRule(locale)}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOBS:
${JSON.stringify(jobs, null, 2)}`;
}

export function buildAnalyzePrompt(
  cvText: string,
  jobDescription: string,
  locale: Locale = "en",
  cvLanguage: ContentLanguage = "en",
  jobLanguage: ContentLanguage = "en",
) {
  return `You are an expert career coach and ATS matching engine.

Analyze the CV and the job description. Return only valid JSON matching this schema:
{
  "cv": {
    "candidateName": "string",
    "targetRoles": ["string"],
    "seniority": "string",
    "skills": ["string"],
    "tools": ["string"],
    "languages": ["string"],
    "summary": "string",
    "lastTwoJobs": [
      {
        "title": "string",
        "company": "string",
        "duration": "string",
        "highlights": ["string"]
      }
    ],
    "idealNextRole": "string"
  },
  "match": {
    "matchScore": number,
    "verdict": "string",
    "strengths": ["string"],
    "gaps": ["string"],
    "cvImprovements": ["string"],
    "coverLetter": "string",
    "recruiterMessage": "string"
  }
}

Rules:
- matchScore must be 0-100.
- Be honest. Do not invent experience.
- Weight the last two jobs heavily when judging fit and seniority.
- Cover letter should be concise and professional.
- Recruiter message should be short and human.
- Focus on practical hiring fit.
- ${getCvReadingRule(cvLanguage)}
- ${getCrossLanguageMatchingRule(cvLanguage, locale, jobLanguage)}
- ${getPromptLanguageRule(locale)}

CV:
${cvText}

JOB DESCRIPTION:
${jobDescription}`;
}
