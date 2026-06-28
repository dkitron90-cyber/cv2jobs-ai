# CV2Jobs AI

AI job radar and CV matching MVP for the Israeli market. It currently:

- Pulls live Israel-located roles from employer feeds (Greenhouse, Lever, Ashby)
- Normalizes and deduplicates jobs across companies
- Filters by keyword, employer, and work mode
- Opens the original employer application page
- Sends any live role directly into the CV matcher
- Reads a CV and compares it to a job description

- CV profile analysis
- Target roles
- Match score
- Strengths
- Gaps
- CV improvements
- Cover letter
- Recruiter message

## Run locally

```bash
npm install
cp .env.example .env.local
# add your OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000

If port 3000 is occupied, Next.js will print the alternative local port.

## MVP flow

1. Browse live employer jobs in the Job Radar.
2. Search or filter the combined feed.
3. Select a role and click Match my CV.
4. Upload a PDF, DOCX, or TXT CV.
5. Review the score and generated application assets.

## Next phase

- Supabase login
- Save CV analyses
- Save job matches
- Application tracker
- Add Comeet and licensed Israeli job-board feeds
- Expand Lever and Ashby employer coverage
- Persist source snapshots and saved jobs
