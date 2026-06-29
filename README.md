# CV2Jobs AI

AI job radar and CV matching MVP for the Israeli market. It currently:

- Pulls live Israel-located roles from employer feeds (Greenhouse, Lever, Ashby, Comeet) plus Hebrew hi-tech listings from Drushim
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

## Job sources

| Type | Status | Notes |
|------|--------|-------|
| Greenhouse | Live | Public boards API, no auth |
| Lever | Live | Public postings API |
| Ashby | Live | Public job-board API |
| Comeet | Live | Public careers API; token resolved from each employer page |
| Drushim | Live | Hebrew hi-tech listings via public search API (`catdir=25`) |
| AllJobs / JobMaster | Planned | No official public API — see below |

### Comeet

Many Israeli startups host careers on Comeet (`comeet.com/jobs/{slug}/{uid}`). Each employer exposes a public [Careers API](https://developers.comeet.com/reference/careers-api-overview). The app resolves the employer token from the public careers page, then pulls published positions with full descriptions.

To add an employer, append `{ slug, uid }` to `COMEET_SOURCES` in `app/lib/sources/comeet.ts`. Both values appear in the employer’s Comeet careers URL.

### Licensed Israeli job boards

Drushim, AllJobs, JobMaster, and JobNet do not offer a free, documented public API for third-party aggregators. Practical options:

1. **Commercial partnership** — contact the board for a licensed XML/JSON feed (best for production).
2. **Apify actors** — third-party scrapers (e.g. Drushim, AllJobs) return normalized JSON via the Apify API; requires an Apify token and ongoing cost.
3. **Direct scraping** — some boards expose internal JSON endpoints, but this may conflict with terms of service and is brittle.

CV2Jobs currently focuses on **direct employer feeds** (Greenhouse, Lever, Ashby, Comeet) to avoid ToS risk and keep apply links pointing at the employer. Board integration is the next phase once a licensed or approved data path is chosen.

## Next phase

- Supabase login
- Save CV analyses
- Save job matches
- Application tracker
- Licensed or approved Drushim / AllJobs feed integration
- Expand Lever, Ashby, and Comeet employer coverage
- Persist source snapshots and saved jobs
