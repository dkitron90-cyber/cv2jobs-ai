const pat =
  /israel|tel aviv|herzliya|haifa|jerusalem|ramat|petah|ra.?anana|kfar saba|netanya|rehovot|yokneam|be.?er sheva|caesarea|modi.?in|holon|ness ziona|ashdod|glilot|ישראל|תל אביב|הרצליה/i;

const existing = new Set([
  "appsflyer", "similarweb", "riskified", "taboola", "lightricks", "yotpo", "via", "wizinc",
  "armissecurity", "melio", "jfrog", "forter", "gongio", "orcasecurity", "torq", "payoneer",
  "catonetworks", "nice", "mongodb", "fireblocks", "elastic", "datadog", "bigid",
  "transmitsecurity", "axonius", "bringg", "gitlab", "databricks", "okta", "sisense", "zscaler",
  "cymulate", "walkme", "cloudinary", "redis", "honeybook", "snowflake",
  "crossriver", "ceva", "kayhut", "imagene-ai", "moonshot", "groundcover", "zafran_io", "zafran",
]);

const gh = [
  ["SentinelOne", "sentinelone"], ["CyberArk", "cyberark"], ["Checkmarx", "checkmarx"],
  ["Monday.com", "mondaydotcom"], ["Monday", "monday"], ["Wix", "wix"], ["Fiverr", "fiverr"],
  ["Outbrain", "outbrain"], ["Snyk", "snyk"], ["Amdocs", "amdocs"], ["Verint", "verint"],
  ["Papaya Global", "papayaglobal"], ["Tipalti", "tipalti"], ["HiBob", "hibob"], ["Deel", "deel"],
  ["Personetics", "personetics"], ["Bringg", "bringg"], ["Lumigo", "lumigo"], ["IronSource", "ironsource"],
  ["Playtika", "playtika"], ["Moon Active", "moonactive"], ["Axonius", "axonius"],
  ["Transmit Security", "transmitsecurity"], ["Silverfort", "silverfort"], ["Claroty", "claroty"],
  ["Honeybook", "honeybook"], ["Gett", "gett"], ["Lemonade", "lemonade"],
  ["Check Point", "checkpoint"], ["Check Point", "checkpointsw"], ["Groundcover", "groundcover"],
  ["Port", "port"], ["Cyera", "cyera"], ["Island", "island"], ["Hunters", "hunters"],
  ["Coralogix", "coralogix"], ["Logz.io", "logzio"], ["Gloat", "gloat"], ["Earnix", "earnix"],
  ["Nexar", "nexar"], ["Vulcan Cyber", "vulcancyber"], ["Cybereason", "cybereason"],
  ["Guardio", "guardio"], ["Stampli", "stampli"], ["PlainID", "plainid"], ["Pagaya", "pagaya"],
  ["Innovid", "innovid"], ["Optimove", "optimove"], ["Sisense", "sisense"], ["Radware", "radware"],
  ["Allot", "allot"], ["SolarEdge", "solaredge"], ["Stratasys", "stratasys"], ["Buildots", "buildots"],
  ["StoreDot", "storedot"], ["Wiliot", "wiliot"], ["Tabnine", "tabnine"], ["Redis", "redislabs"],
  ["Redis", "redisinc"], ["Own", "owncompany"], ["OwnBackup", "ownbackup"], ["Dynamic Yield", "dynamicyield"],
  ["Zencity", "zencity"], ["Trigo", "trigo"], ["Nanox", "nanox"], ["Aqua", "aquasecurity"],
  ["Intel", "intel"], ["NVIDIA", "nvidia"], ["Palo Alto", "paloaltonetworks"], ["CrowdStrike", "crowdstrike"],
  ["Salesforce", "salesforce"], ["SAP", "sap"], ["Oracle", "oracle"], ["Microsoft", "microsoft"],
  ["Google", "google"], ["Amazon", "amazon"], ["Meta", "meta"], ["Apple", "apple"],
  ["Qualtrics", "qualtrics"], ["Unity", "unity"], ["Autodesk", "autodesk"], ["Atlassian", "atlassian"],
  ["Stripe", "stripe"], ["Databricks", "databricks"], ["Snowflake", "snowflake"], ["HubSpot", "hubspot"],
  ["Zendesk", "zendesk"], ["Twilio", "twilio"], ["DocuSign", "docusign"], ["Okta", "okta"],
  ["Zscaler", "zscaler"], ["Cloudflare", "cloudflare"], ["GitLab", "gitlab"], ["GitHub", "github"],
  ["Dropbox", "dropbox"], ["Monday", "mondaycom"], ["Fiverr", "fiverrcom"], ["eToro", "etoro"],
  ["Rapyd", "rapyd"], ["Fundbox", "fundbox"], ["Bluevine", "bluevine"], ["Lendbuzz", "lendbuzz"],
  ["K Health", "khealth"], ["Minute Media", "minutemedia"], ["D-ID", "d-id"], ["Fabric", "fabric"],
  ["Stream Security", "streamsecurity"], ["Vdoo", "vdoo"], ["Aqua Security", "aquasec"],
];

const lever = [
  "sentinelone", "cyberark", "checkmarx", "monday", "mondaydotcom", "wix", "fiverr", "outbrain",
  "snyk", "amdocs", "verint", "papayaglobal", "tipalti", "hibob", "deel", "personetics", "bringg",
  "lumigo", "ironsource", "playtika", "moonactive", "axonius", "transmitsecurity", "silverfort",
  "claroty", "honeybook", "gett", "lemonade", "groundcover", "port", "cyera", "island", "hunters",
  "coralogix", "gloat", "earnix", "nexar", "cybereason", "guardio", "stampli", "plainid", "pagaya",
  "innovid", "optimove", "sisense", "radware", "solaredge", "stratasys", "buildots", "storedot",
  "wiliot", "tabnine", "etoro", "rapyd", "khealth", "minutemedia", "logzio", "vulcancyber",
  "streamsecurity", "dynamicyield", "zencity", "trigo", "nanox", "ownbackup", "owncompany",
];

const ashby = [...lever, "crossriver", "moonshot", "d-id", "fabric", "fundbox"];

function ilGreenhouse(job) {
  const loc = [job.location?.name, ...(job.offices ?? []).flatMap((o) => [o.name, o.location])].join(" ");
  return pat.test(loc);
}

function ilLever(job) {
  const loc = [job.categories?.location, ...(job.categories?.allLocations ?? [])].join(" ");
  return pat.test(loc);
}

function ilAshby(job) {
  const loc = [job.location, ...(job.secondaryLocations ?? []).map((s) => s.location)].join(" ");
  return pat.test(loc);
}

async function probeGh(name, token) {
  if (existing.has(token)) return null;
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const jobs = data.jobs ?? [];
  const il = jobs.filter(ilGreenhouse);
  if (il.length === 0) return null;
  return { type: "GH", name, token, il: il.length, total: jobs.length };
}

async function probeLever(slug) {
  if (existing.has(slug)) return null;
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const jobs = await res.json();
  if (!Array.isArray(jobs)) return null;
  const il = jobs.filter(ilLever);
  if (il.length === 0) return null;
  return { type: "LV", name: slug, token: slug, il: il.length, total: jobs.length };
}

async function probeAshby(slug) {
  if (existing.has(slug)) return null;
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const jobs = data.jobs ?? [];
  const il = jobs.filter(ilAshby);
  if (il.length === 0) return null;
  return { type: "AB", name: slug, token: slug, il: il.length, total: jobs.length };
}

const comeetPaths = [
  ["Groundcover", "groundcover/88.008"], ["Cross River", "crossriver/C7.00F"], ["Imagene AI", "imagene-ai/D7.000"],
  ["Ceva", "ceva/76.005"], ["Kayhut", "Kayhut/F0.00B"], ["Moonshot", "moonshot/87.005"],
  ["Zafran", "zafran_io/49.009"],
  ["Pagaya", "pagaya/00.000"], ["Axonius", "axonius/00.000"], ["Transmit", "transmitsecurity/00.000"],
  ["Silverfort", "silverfort/00.000"], ["Claroty", "claroty/00.000"], ["Honeybook", "honeybook/00.000"],
  ["Personetics", "personetics/00.000"], ["Innovid", "innovid/00.000"], ["Optimove", "optimove/00.000"],
  ["Sisense", "sisense/00.000"], ["Radware", "radware/00.000"], ["SolarEdge", "solaredge/00.000"],
  ["Buildots", "buildots/00.000"], ["StoreDot", "storedot/00.000"], ["Wiliot", "wiliot/00.000"],
  ["Tabnine", "tabnine/00.000"], ["Coralogix", "coralogix/00.000"], ["Cyera", "cyera/00.000"],
  ["Island", "island/00.000"], ["Hunters", "hunters/00.000"], ["Port", "port/00.000"],
  ["Lemonade", "lemonade/00.000"], ["Gett", "gett/00.000"], ["Fiverr", "fiverr/00.000"],
  ["Monday", "monday/00.000"], ["HiBob", "hibob/00.000"], ["Tipalti", "tipalti/00.000"],
  ["Papaya", "papayaglobal/00.000"], ["Deel", "deel/00.000"], ["Playtika", "playtika/00.000"],
  ["Moon Active", "moonactive/00.000"], ["IronSource", "ironsource/00.000"], ["Checkmarx", "checkmarx/00.000"],
  ["SentinelOne", "sentinelone/00.000"], ["CyberArk", "cyberark/00.000"], ["Amdocs", "amdocs/00.000"],
  ["Verint", "verint/00.000"], ["NICE", "nice/00.000"], ["Outbrain", "outbrain/00.000"],
  ["Similarweb", "similarweb/00.000"], ["AppsFlyer", "appsflyer/00.000"], ["Lightricks", "lightricks/00.000"],
  ["Riskified", "riskified/00.000"], ["Yotpo", "yotpo/00.000"], ["Taboola", "taboola/00.000"],
  ["Orca", "orca-security/00.000"], ["Wiz", "wiz/00.000"], ["Armis", "armis/00.000"],
  ["Gong", "gong/00.000"], ["Melio", "melio/00.000"], ["Fireblocks", "fireblocks/00.000"],
  ["JFrog", "jfrog/00.000"], ["Forter", "forter/00.000"], ["Via", "via/00.000"],
  ["Payoneer", "payoneer/00.000"], ["Torq", "torq/00.000"], ["BigID", "bigid/00.000"],
  ["Aqua Security", "aquasecurity/00.000"], ["Bringg", "bringg/00.000"], ["Lumigo", "lumigo/00.000"],
  ["Cloudinary", "cloudinary/00.000"], ["WalkMe", "walkme/00.000"], ["Redis", "redis/00.000"],
  ["MongoDB", "mongodb/00.000"], ["Datadog", "datadog/00.000"], ["Elastic", "elastic/00.000"],
  ["Cato Networks", "catonetworks/00.000"], ["Nexar", "nexar/00.000"], ["Earnix", "earnix/00.000"],
  ["Gloat", "gloat/00.000"], ["Guardio", "guardio/00.000"], ["Stampli", "stampli/00.000"],
  ["PlainID", "plainid/00.000"], ["Cybereason", "cybereason/00.000"], ["Vulcan", "vulcancyber/00.000"],
  ["Stream Security", "streamsecurity/00.000"], ["D-ID", "d-id/00.000"], ["K Health", "khealth/00.000"],
  ["Minute Media", "minutemedia/00.000"], ["eToro", "etoro/00.000"], ["Rapyd", "rapyd/00.000"],
];

async function probeComeet(name, path) {
  const slug = path.split("/")[0].toLowerCase();
  if (existing.has(slug)) return null;
  const page = await fetch(`https://www.comeet.com/jobs/${path}`, { signal: AbortSignal.timeout(15000) });
  if (!page.ok) return null;
  const html = await page.text();
  const uid = path.split("/")[1];
  const tokenMatch = html.match(new RegExp(`"company_uid":\\s*"${uid.replace(/\./g, "\\.")}"[^"]*"token":\\s*"([^"]+)"`));
  if (!tokenMatch) return null;
  const token = tokenMatch[1];
  const res = await fetch(
    `https://www.comeet.co/careers-api/2.0/company/${uid}/positions?token=${token}&details=true`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!res.ok) return null;
  const jobs = await res.json();
  if (!Array.isArray(jobs) || jobs.length === 0) return null;
  const il = jobs.filter(
    (j) => j.location?.country === "IL" || pat.test([j.location?.name, j.location?.city].join(" ")),
  );
  if (il.length === 0) return null;
  return { type: "CM", name, token: `${slug}/${uid}`, slug, uid, il: il.length, total: jobs.length };
}

const results = [];
for (const [name, token] of gh) {
  try {
    const r = await probeGh(name, token);
    if (r) results.push(r);
  } catch {}
}
for (const slug of lever) {
  try {
    const r = await probeLever(slug);
    if (r) results.push(r);
  } catch {}
}
for (const slug of ashby) {
  try {
    const r = await probeAshby(slug);
    if (r) results.push(r);
  } catch {}
}
for (const [name, path] of comeetPaths) {
  try {
    const r = await probeComeet(name, path);
    if (r) results.push(r);
  } catch {}
}

results.sort((a, b) => b.il - a.il);
for (const r of results) {
  console.log(`${r.type}\t${r.name}\t${r.token}\tIL=${r.il}\ttotal=${r.total}`);
}
console.log(`\nFound ${results.length} new sources`);
