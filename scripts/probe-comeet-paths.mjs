const pat =
  /israel|tel aviv|herzliya|haifa|jerusalem|ramat|petah|ra.?anana|kfar saba|netanya|rehovot|yokneam|be.?er sheva|caesarea|modi.?in|holon|ness ziona|ashdod|glilot|ישראל|תל אביב|הרצליה/i;

const comeetPaths = [
  ["Allied Universal EM", "allied-universal-em/C2.00D"],
  ["Zafran", "zafran_io/49.009"],
  ["Abra", "abra/00.000"],
  ["Pagaya", "pagaya/00.000"],
  ["Innovid", "innovid/00.000"],
  ["Optimove", "optimove/00.000"],
  ["Radware", "radware/00.000"],
  ["SolarEdge", "solaredge/00.000"],
  ["Buildots", "buildots/00.000"],
  ["StoreDot", "storedot/00.000"],
  ["Wiliot", "wiliot/00.000"],
  ["Tabnine", "tabnine/00.000"],
  ["Coralogix", "coralogix/00.000"],
  ["Cyera", "cyera/00.000"],
  ["Island", "island/00.000"],
  ["Hunters", "hunters/00.000"],
  ["Port", "port/00.000"],
  ["Silverfort", "silverfort/00.000"],
  ["Claroty", "claroty/00.000"],
  ["Lemonade", "lemonade/00.000"],
  ["Gett", "gett/00.000"],
  ["Cybereason", "cybereason/00.000"],
  ["Guardio", "guardio/00.000"],
  ["Stampli", "stampli/00.000"],
  ["PlainID", "plainid/00.000"],
  ["Gloat", "gloat/00.000"],
  ["Earnix", "earnix/00.000"],
  ["Nexar", "nexar/00.000"],
  ["Vulcan Cyber", "vulcancyber/00.000"],
  ["Stream Security", "streamsecurity/00.000"],
  ["Dynamic Yield", "dynamicyield/00.000"],
  ["Zencity", "zencity/00.000"],
  ["Trigo", "trigo/00.000"],
  ["Nanox", "nanox/00.000"],
  ["Own", "owncompany/00.000"],
  ["Aqua Security", "aquasecurity/00.000"],
  ["Lusha", "lusha/00.000"],
  ["Verbit", "verbit/00.000"],
  ["Aidoc", "aidoc/00.000"],
  ["Healthy.io", "healthyio/00.000"],
  ["Vayyar", "vayyar/00.000"],
  ["Exodigo", "exodigo/00.000"],
  ["Finaloop", "finaloop/00.000"],
  ["Cybersixgill", "cybersixgill/00.000"],
  ["BioCatch", "biocatch/00.000"],
  ["Cymulate", "cymulate/00.000"],
  ["Commvault", "commvault/00.000"],
  ["Atera", "atera/00.000"],
  ["BeeHero", "beehero/00.000"],
  ["SentinelOne", "sentinelone/00.000"],
  ["CyberArk", "cyberark/00.000"],
  ["Checkmarx", "checkmarx/00.000"],
  ["Monday", "monday/00.000"],
  ["Wix", "wix/00.000"],
  ["Fiverr", "fiverr/00.000"],
  ["Outbrain", "outbrain/00.000"],
  ["Snyk", "snyk/00.000"],
  ["Amdocs", "amdocs/00.000"],
  ["Verint", "verint/00.000"],
  ["Papaya Global", "papayaglobal/00.000"],
  ["Tipalti", "tipalti/00.000"],
  ["HiBob", "hibob/00.000"],
  ["Deel", "deel/00.000"],
  ["Personetics", "personetics/00.000"],
  ["Lumigo", "lumigo/00.000"],
  ["IronSource", "ironsource/00.000"],
  ["Playtika", "playtika/00.000"],
  ["Moon Active", "moonactive/00.000"],
  ["Transmit Security", "transmitsecurity/00.000"],
  ["Axonius", "axonius/00.000"],
  ["Bringg", "bringg/00.000"],
  ["Orca Security", "orca-security/00.000"],
  ["Wiz", "wiz/00.000"],
  ["Armis", "armis/00.000"],
  ["Gong", "gong/00.000"],
  ["Melio", "melio/00.000"],
  ["JFrog", "jfrog/00.000"],
  ["Forter", "forter/00.000"],
  ["Via", "via/00.000"],
  ["Payoneer", "payoneer/00.000"],
  ["Torq", "torq/00.000"],
  ["BigID", "bigid/00.000"],
  ["Fireblocks", "fireblocks/00.000"],
  ["MongoDB", "mongodb/00.000"],
  ["Elastic", "elastic/00.000"],
  ["Datadog", "datadog/00.000"],
  ["Cato Networks", "catonetworks/00.000"],
  ["NICE", "nice/00.000"],
  ["AppsFlyer", "appsflyer/00.000"],
  ["Similarweb", "similarweb/00.000"],
  ["Riskified", "riskified/00.000"],
  ["Taboola", "taboola/00.000"],
  ["Lightricks", "lightricks/00.000"],
  ["Yotpo", "yotpo/00.000"],
  ["WalkMe", "walkme/00.000"],
  ["Cloudinary", "cloudinary/00.000"],
  ["Redis", "redis/00.000"],
  ["HoneyBook", "honeybook/00.000"],
  ["Snowflake", "snowflake/00.000"],
  ["GitLab", "gitlab/00.000"],
  ["Databricks", "databricks/00.000"],
  ["Okta", "okta/00.000"],
  ["Sisense", "sisense/00.000"],
  ["Zscaler", "zscaler/00.000"],
  ["Fundbox", "fundbox/00.000"],
  ["Bluevine", "bluevine/00.000"],
  ["eToro", "etoro/00.000"],
  ["Rapyd", "rapyd/00.000"],
  ["K Health", "khealth/00.000"],
  ["Minute Media", "minutemedia/00.000"],
  ["D-ID", "d-id/00.000"],
  ["Fabric", "fabric/00.000"],
  ["Vdoo", "vdoo/00.000"],
  ["Varonis", "varonis/00.000"],
  ["Allot", "allot/00.000"],
  ["Stratasys", "stratasys/00.000"],
  ["Logz.io", "logzio/00.000"],
  ["Cellebrite", "cellebrite/00.000"],
  ["Camtek", "camtek/00.000"],
  ["Nova", "nova/00.000"],
  ["Check Point", "checkpoint/00.000"],
];

const existing = new Set([
  "crossriver",
  "ceva",
  "kayhut",
  "imagene-ai",
  "moonshot",
  "groundcover",
]);

async function probeComeet(name, path) {
  const slug = path.split("/")[0].toLowerCase();
  if (existing.has(slug)) return null;
  try {
    const page = await fetch(`https://www.comeet.com/jobs/${path}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!page.ok) return null;
    const html = await page.text();
    const uid = path.split("/")[1];
    const tokenMatch = html.match(
      new RegExp(`"company_uid"\\s*:\\s*"${uid.replace(/\./g, "\\.")}"[\\s\\S]*?"token"\\s*:\\s*"([^"]+)"`),
    );
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
    return { name, slug, uid, il: il.length, total: jobs.length };
  } catch {
    return null;
  }
}

const results = [];
for (const [name, path] of comeetPaths) {
  const result = await probeComeet(name, path);
  if (result) results.push(result);
}

results.sort((a, b) => b.il - a.il);
for (const result of results) {
  console.log(`CM\t${result.name}\t${result.slug}/${result.uid}\tIL=${result.il}\ttotal=${result.total}`);
}
console.log(`\nFound ${results.length} new Comeet sources`);
