// Mock data generator for the Looker Studio Marketing ROI dashboard.
//
// Everything this script writes is SIMULATED. It stands in for a Google Ads
// account and a CRM that don't exist (no live ad spend). GA4 + Search Console
// in the dashboard are real marcushq.buzz data; these CSVs are not.
//
// Deterministic: same seed + same date range = byte-identical output, so the
// published dashboard numbers are reproducible.
//
// Usage:  node generate_mock_data.mjs [--start 2026-07-01] [--end 2026-10-10] [--seed 43]
// Output: ../data/google_ads_proxy.csv, crm_leads.csv, spend_targets.csv

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), [])
);
const START = args.start ?? "2026-07-01";
const END = args.end ?? "2026-10-10";
const SEED = Number(args.seed ?? 43);

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
mkdirSync(OUT, { recursive: true });

// mulberry32 — small seeded PRNG
let s = SEED >>> 0;
const rand = () => {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const jitter = (x, pct) => x * (1 + (rand() * 2 - 1) * pct);
const poisson = (lambda) => {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
};
const pick = (weighted) => {
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of weighted) if ((r -= w) <= 0) return v;
  return weighted[weighted.length - 1][0];
};

const day = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const monthOf = (isoDate) => isoDate.slice(0, 7) + "-01";
const dates = [];
for (let t = Date.parse(START); t <= Date.parse(END); t += day) dates.push(t);
const END_T = Date.parse(END);

// ---- Google Ads proxy -------------------------------------------------------
// Column names mirror a Google Ads campaign report export so the sheet can be
// swapped for a real Ads connector later with minimal remapping.
// utm_* values follow UTM_CHEAT_SHEET.csv so CRM leads join back to campaigns.
const CAMPAIGNS = [
  { name: "SRCH_Brand_Exact",        type: "Search",          platform: "Google",  utm_source: "google",  utm_medium: "cpc",        budget: 12, cpc: 1.6, ctr: 0.18,  cvr: 0.09,  quality: 1.5 },
  { name: "SRCH_NonBrand_Services",  type: "Search",          platform: "Google",  utm_source: "google",  utm_medium: "cpc",        budget: 45, cpc: 6.5, ctr: 0.045, cvr: 0.08,  quality: 1.0 },
  { name: "PMAX_LeadGen",            type: "Performance Max", platform: "Google",  utm_source: "google",  utm_medium: "cpc",        budget: 25, cpc: 2.2, ctr: 0.011, cvr: 0.016, quality: 0.6 },
  { name: "YT_Retargeting_Awareness",type: "Video",           platform: "YouTube", utm_source: "youtube", utm_medium: "paid_video", budget: 10, cpc: 0.9, ctr: 0.006, cvr: 0.006, quality: 0.5 },
];
const PLATFORM_LEAD_VALUE = 150; // value rule assigned to each lead conversion in Ads

const ads = [];
for (const t of dates) {
  const d = new Date(t);
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
  for (const c of CAMPAIGNS) {
    // Story beat: non-brand budget raised 30% from September.
    const budget = c.budget * (c.name === "SRCH_NonBrand_Services" && t >= Date.parse("2026-09-01") ? 1.3 : 1);
    const cost = +(jitter(budget, 0.12) * (weekend ? 0.6 : 1)).toFixed(2);
    const clicks = Math.max(0, Math.round(cost / jitter(c.cpc, 0.15)));
    const impressions = Math.round(clicks / jitter(c.ctr, 0.2));
    const conversions = poisson(clicks * c.cvr);
    ads.push({
      date: iso(t), month: monthOf(iso(t)), campaign: c.name, campaign_type: c.type,
      platform_group: c.platform, utm_source: c.utm_source, utm_medium: c.utm_medium,
      impressions, clicks, cost, conversions, conversion_value: conversions * PLATFORM_LEAD_VALUE,
      _quality: c.quality,
    });
  }
}

// ---- CRM leads --------------------------------------------------------------
// Paid leads derive from Ads conversions, minus ~12% (spam / duplicate form
// fills that Ads counts but the CRM dedupes) — the platform-vs-CRM gap the
// dashboard surfaces. Non-paid leads come from organic/direct/referral/etc.
const NON_PAID = [
  { utm_source: "google",       utm_medium: "organic",  utm_campaign: "(organic)",          platform: "Google",   rate: 0.8,  quality: 1.2 },
  { utm_source: "(direct)",     utm_medium: "(none)",   utm_campaign: "(direct)",           platform: "Direct",   rate: 0.3,  quality: 1.1 },
  { utm_source: "linkedin",     utm_medium: "social",   utm_campaign: "li_organic_posts",   platform: "LinkedIn", rate: 0.25, quality: 0.9 },
  { utm_source: "clutch.co",    utm_medium: "referral", utm_campaign: "(referral)",         platform: "Other",    rate: 0.2,  quality: 1.6 },
  { utm_source: "newsletter",   utm_medium: "email",    utm_campaign: "monthly_digest",     platform: "Email",    rate: 0.15, quality: 1.3 },
  { utm_source: "facebook",     utm_medium: "social",   utm_campaign: "fb_organic_posts",   platform: "Meta",     rate: 0.1,  quality: 0.7 },
  { utm_source: "threads",      utm_medium: "social",   utm_campaign: "threads_organic",    platform: "Threads",  rate: 0.06, quality: 0.8 },
  { utm_source: "xiaohongshu",  utm_medium: "social",   utm_campaign: "xhs_organic_notes",  platform: "Xiaohongshu", rate: 0.04, quality: 0.8 },
];

const leads = [];
const addLead = (createdT, src) => {
  const ageDays = (END_T - createdT) / day;
  // Pipeline progression: older leads are further along; quality shifts odds.
  const qualifyP = Math.min(0.75, 0.45 * src.quality);
  const winP = Math.min(0.6, 0.35 * src.quality); // of proposals
  let stage = "New", deal_value = "", closed_date = "";
  if (ageDays > 2) stage = "Contacted";
  if (stage === "Contacted" && ageDays > 5) stage = rand() < qualifyP ? "Qualified" : "Lost";
  if (stage === "Qualified" && ageDays > 12) stage = rand() < 0.7 ? "Proposal" : "Lost";
  if (stage === "Proposal") {
    const closeAfter = 14 + Math.floor(rand() * 32);
    if (ageDays > closeAfter) {
      stage = rand() < winP ? "Won" : "Lost";
      closed_date = iso(createdT + closeAfter * day);
      if (stage === "Won") deal_value = Math.round(jitter(2800, 0.45) / 50) * 50;
    }
  }
  if (stage === "Lost" && !closed_date) closed_date = iso(Math.min(END_T, createdT + (6 + Math.floor(rand() * 10)) * day));
  const created = iso(createdT);
  leads.push({
    lead_id: "", created_date: created, month: monthOf(created),
    utm_source: src.utm_source, utm_medium: src.utm_medium, utm_campaign: src.utm_campaign,
    platform_group: src.platform, traffic_type: src.paid ? "Paid" : trafficType(src.utm_medium),
    stage, deal_value, closed_date,
    service_interest: pick([["BI / Dashboards", 3], ["Data Engineering", 2], ["Automation", 3], ["Tracking / RevOps", 2]]),
  });
};
const trafficType = (m) => ({ organic: "Organic Search", "(none)": "Direct", social: "Organic Social", referral: "Referral", email: "Email" }[m] ?? "Other");

for (const row of ads) {
  for (let i = 0; i < row.conversions; i++) {
    if (rand() < 0.12) continue;
    addLead(Date.parse(row.date), { utm_source: row.utm_source, utm_medium: row.utm_medium, utm_campaign: row.campaign, platform: row.platform_group, quality: row._quality, paid: true });
  }
}
for (const t of dates) {
  const weekend = [0, 6].includes(new Date(t).getUTCDay());
  for (const src of NON_PAID) for (let i = poisson(src.rate * (weekend ? 0.4 : 1)); i > 0; i--) addLead(t, src);
}
leads.sort((a, b) => a.created_date.localeCompare(b.created_date));
leads.forEach((l, i) => (l.lead_id = "L-" + String(i + 1).padStart(4, "0")));

// ---- Spend targets ----------------------------------------------------------
// Plan numbers per month × platform. Months beyond END are kept so the sheet
// reads like a real budget plan; the dashboard's date filter hides them.
const targets = [];
for (const m of ["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01"]) {
  const lift = m >= "2026-09-01" ? 1.15 : 1;
  targets.push({ month: m, platform_group: "Google",  monthly_budget: Math.round(2500 * lift), target_leads: Math.round(32 * lift), target_cpl: 80,  target_crm_roas: 3.0 });
  targets.push({ month: m, platform_group: "YouTube", monthly_budget: 300,                     target_leads: 3,                     target_cpl: 100, target_crm_roas: 1.5 });
}

// ---- Write ------------------------------------------------------------------
const toCsv = (rows) => {
  const cols = Object.keys(rows[0]).filter((k) => !k.startsWith("_"));
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
};
writeFileSync(join(OUT, "google_ads_proxy.csv"), toCsv(ads));
writeFileSync(join(OUT, "crm_leads.csv"), toCsv(leads));
writeFileSync(join(OUT, "spend_targets.csv"), toCsv(targets));

// Summary so the numbers can be sanity-checked before upload.
const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const cost = sum(ads, "cost"), conv = sum(ads, "conversions");
const paid = leads.filter((l) => l.traffic_type === "Paid");
const paidWonValue = sum(paid.filter((l) => l.stage === "Won"), "deal_value");
console.log(`range ${START}..${END} seed ${SEED}`);
console.log(`ads rows ${ads.length}  cost $${cost.toFixed(0)}  clicks ${sum(ads, "clicks")}  ads conversions ${conv}`);
console.log(`crm leads ${leads.length} (paid ${paid.length})  won ${leads.filter((l) => l.stage === "Won").length}`);
console.log(`paid CPL (CRM) $${(cost / paid.length).toFixed(2)}  platform ROAS ${(sum(ads, "conversion_value") / cost).toFixed(2)}  CRM ROAS ${(paidWonValue / cost).toFixed(2)}`);
for (const c of CAMPAIGNS) {
  const r = ads.filter((a) => a.campaign === c.name), l = paid.filter((x) => x.utm_campaign === c.name);
  const cc = sum(r, "cost");
  console.log(`  ${c.name.padEnd(26)} cost $${cc.toFixed(0).padStart(5)}  conv ${String(sum(r, "conversions")).padStart(3)}  crm ${String(l.length).padStart(3)}  CPL $${(cc / Math.max(1, l.length)).toFixed(0)}`);
}
