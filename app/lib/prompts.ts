export function buildAnalyzePrompt(cvText: string, jobDescription: string) {
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
    "summary": "string"
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
- Cover letter should be concise and professional.
- Recruiter message should be short and human.
- Focus on practical hiring fit.

CV:
${cvText}

JOB DESCRIPTION:
${jobDescription}`;
}
