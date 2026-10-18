// Dashboard 3 inputs that HubSpot can't provide: ad spend and targets (SIMULATED) and FX rates (REAL, ECB).
//   node dashboard3/scripts/generate_ff_spend.mjs            (seeded: same output every run)
//
// The CRM side of Dashboard 3 is real HubSpot data (FieldFlow test account, synced by
// apps-script/hubspot_sync.gs). Spend is simulated, but anchored to the REAL monthly count of
// "Paid Search" and "Paid Social" leads in HubSpot, so CPL and lead volume stay consistent with
// the CRM. Platform-reported leads are set 10–35% above CRM leads, as ad platforms typically
// over-count (duplicates, spam, test submissions); the dashboard shows that gap explicitly.
//
// Output (dashboard3/data/):
//   ff_google_ads_proxy.csv   daily Google Ads campaign rows   SIMULATED
//   ff_meta_ads_proxy.csv     daily Meta Ads campaign rows     SIMULATED
//   ff_targets.csv            monthly targets per channel      SIMULATED
//   ff_fx_rates.csv           monthly average USD→EUR          REAL (ECB via frankfurter.dev)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const START = "2026-04-01", END = "2026-10-18";
const OUT = new URL("../data/", import.meta.url);
const TOKEN = readFileSync("C:/tools/hubspot_fieldflow_token.txt", "utf8").split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("pat-"));
if (!TOKEN) throw new Error("HubSpot key not found");

// Seeded RNG (mulberry32) so the "simulated" data is reproducible.
let seed = 4302;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const between = (a, b) => a + (b - a) * rand();
const round2 = (n) => Math.round(n * 100) / 100;

// ---- 1. Real paid-lead counts per month from HubSpot
async function contacts() {
  let out = [], after;
  do {
    const u = `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=ff_lead_source,ff_original_create_date${after ? `&after=${after}` : ""}`;
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error(`HubSpot ${r.status}`);
    const j = await r.json();
    out = out.concat(j.results);
    after = j.paging?.next?.after;
  } while (after);
  return out;
}
const leads = { "Paid Search": {}, "Paid Social": {} };
for (const c of await contacts()) {
  const src = c.properties.ff_lead_source, d = c.properties.ff_original_create_date;
  if (leads[src] && d && d >= START && d <= END) leads[src][d.slice(0, 7)] = (leads[src][d.slice(0, 7)] ?? 0) + 1;
}

// ---- 2. Daily spend per campaign, anchored to those leads
const days = [];
for (let t = Date.parse(START); t <= Date.parse(END); t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
const months = [...new Set(days.map((d) => d.slice(0, 7)))];

const CHANNELS = {
  "Paid Search": {
    file: "ff_google_ads_proxy.csv", platform: "Google Ads", cpl: [125, 165], cpc: [5.2, 7.8], ctr: [0.038, 0.055],
    campaigns: [["SRCH_NonBrand_FieldServiceSoftware", 0.72], ["SRCH_Brand_FieldFlow", 0.28]],
  },
  "Paid Social": {
    file: "ff_meta_ads_proxy.csv", platform: "Meta Ads", cpl: [80, 115], cpc: [1.4, 2.4], ctr: [0.008, 0.014],
    campaigns: [["META_Prospecting_FreeTrial", 0.68], ["META_Retargeting_Demo", 0.32]],
  },
};

// Split an integer total across weights so the parts sum exactly to the total (largest remainder).
function apportion(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
  return out;
}

const summary = [];
for (const [channel, cfg] of Object.entries(CHANNELS)) {
  const rows = [["date", "month", "platform", "channel", "campaign", "impressions", "clicks", "cost_usd", "platform_leads"]];
  for (const m of months) {
    const crmLeads = leads[channel][m] ?? 0;
    const mDays = days.filter((d) => d.startsWith(m));
    // Even a month with no CRM leads had spend (campaigns kept running): floor at 2 leads' worth.
    const spend = Math.max(crmLeads, 2) * between(...cfg.cpl);
    const platformLeads = Math.round(crmLeads * between(1.1, 1.35));
    summary.push({ channel, month: m, crmLeads, platformLeads, spend: round2(spend) });
    for (const [campaign, share] of cfg.campaigns) {
      const dayW = mDays.map((d) => { const wd = new Date(d).getUTCDay(); return (wd === 0 || wd === 6 ? 0.6 : 1) * between(0.75, 1.25); });
      const dayLeads = apportion(Math.round(platformLeads * share), dayW);
      const wSum = dayW.reduce((a, b) => a + b, 0);
      mDays.forEach((d, i) => {
        const cost = (spend * share * dayW[i]) / wSum;
        const clicks = Math.max(0, Math.round(cost / between(...cfg.cpc)));
        rows.push([d, `${m}-01`, cfg.platform, channel, campaign, Math.round(clicks / between(...cfg.ctr)), clicks, round2(cost), dayLeads[i]]);
      });
    }
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(cfg.file, OUT), rows.map((r) => r.join(",")).join("\n") + "\n");
}

// ---- 3. Monthly targets (SIMULATED): leads per channel, revenue overall
const targets = [["month", "channel", "target_leads", "target_cpl_usd", "target_revenue_usd"]];
for (const m of months) {
  for (const ch of Object.keys(CHANNELS)) targets.push([`${m}-01`, ch, ch === "Paid Search" ? 9 : 10, ch === "Paid Search" ? 150 : 100, ""]);
  targets.push([`${m}-01`, "All channels", "", "", 30000]);
}
writeFileSync(new URL("ff_targets.csv", OUT), targets.map((r) => r.join(",")).join("\n") + "\n");

// ---- 4. REAL monthly average USD→EUR (ECB reference rates via frankfurter.dev)
const fx = await (await fetch(`https://api.frankfurter.dev/v1/${START}..${END}?from=USD&to=EUR`)).json();
const byMonth = {};
for (const [d, r] of Object.entries(fx.rates)) (byMonth[d.slice(0, 7)] ??= []).push(r.EUR);
const fxRows = [["month", "currency", "usd_to_currency", "source"]];
for (const m of months) {
  fxRows.push([`${m}-01`, "USD", 1, "identity"]);
  const v = byMonth[m];
  if (v) fxRows.push([`${m}-01`, "EUR", (v.reduce((a, b) => a + b, 0) / v.length).toFixed(5), `ECB reference avg of ${v.length} days`]);
}
writeFileSync(new URL("ff_fx_rates.csv", OUT), fxRows.map((r) => r.join(",")).join("\n") + "\n");

console.table(summary.map((s) => ({ ...s, cpl: s.crmLeads ? round2(s.spend / s.crmLeads) : null })));
console.log("FX months:", Object.keys(byMonth).length, "| files written to dashboard3/data/");
