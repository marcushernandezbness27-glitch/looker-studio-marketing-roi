// Runs apps-script/hubspot_sync.gs in Node against the REAL HubSpot API, with stand-ins for
// UrlFetchApp / SpreadsheetApp / PropertiesService / Utilities. Catches logic errors before the
// script is pasted into Google.   node dashboard3/scripts/test_sync_local.mjs
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const token = readFileSync("C:/tools/hubspot_fieldflow_token.txt", "utf8").split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("pat-"));
const tabs = {};
const sheet = (name) => ({
  name, rows: [],
  clearContents() { this.rows = []; },
  getRange(r, c, nr) { const self = this; return { setValues(v) { self.rows = v; }, setFontWeight() {} }; },
  setFrozenRows() {}, getLastRow() { return this.rows.length; }, appendRow(r) { this.rows.push(r); },
  getDataRange() { const self = this; return { getValues: () => self.rows }; },
});
const ctx = {
  console,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === "HUBSPOT_TOKEN" ? token : null) }) },
  // UrlFetchApp is synchronous in Apps Script; curl gives the same here.
  UrlFetchApp: {
    fetch(url, o = {}) {
      // Repo CSVs are read from disk (they may not be pushed yet).
      const raw = url.match(/dashboard3\/data\/(.+\.csv)$/);
      if (raw) { const t = readFileSync(new URL(`../data/${raw[1]}`, import.meta.url), "utf8"); return { getResponseCode: () => 200, getContentText: () => t }; }
      const args = ["-s", "-L", "-w", "\n%{http_code}", "-X", (o.method || "get").toUpperCase(), url];
      if (o.headers) for (const [k, v] of Object.entries(o.headers)) args.push("-H", `${k}: ${v}`);
      if (o.payload) args.push("-H", "Content-Type: application/json", "--data-binary", "@-");
      const out = execFileSync("curl", args, { input: o.payload ?? "", maxBuffer: 50e6 }).toString();
      const i = out.lastIndexOf("\n");
      return { getResponseCode: () => Number(out.slice(i + 1)), getContentText: () => out.slice(0, i) };
    },
  },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => tabs[n], insertSheet: (n) => (tabs[n] = sheet(n)) }) },
  Utilities: {
    sleep() {},
    parseCsv: (t) => t.trim().split(/\r?\n/).map((l) => l.split(",")),
  },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create() {} }) }) }) }) },
};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../apps-script/hubspot_sync.gs", import.meta.url), "utf8"), ctx);

ctx.importSimulatedData();
const sp = tabs.ff_ad_spend.rows;
console.log("ff_ad_spend rows:", sp.length - 1, "| header:", sp[0].join(" | "));
const tot = (i) => Math.round(sp.slice(1).reduce((a, r) => a + r[i], 0));
const cur = (c, i) => Math.round(sp.slice(1).filter((r) => r[5] === c).reduce((a, r) => a + Number(r[i] || 0), 0));
console.log("spend USD:", cur("USD", 6), "| EUR:", cur("EUR", 6), "| platform leads (USD rows):", cur("USD", 9), "| (EUR rows):", cur("EUR", 9));
ctx.syncHubSpot();
console.log("hs_validation:"); console.table(tabs.hs_validation.rows.slice(1).map((r) => ({ check: r[0], hubspot: r[1], sheet: r[2], status: r[3] })));
console.log("hs_sync_log:", JSON.stringify(tabs.hs_sync_log.rows.slice(1)));
const d = tabs.hs_deals.rows;
const byCh = {};
for (const r of d.slice(1)) { const k = r[12]; byCh[k] ??= { deals: new Set(), won: new Set(), won_usd: 0, won_eur: 0 }; byCh[k].deals.add(r[0]); if (r[5]) { byCh[k].won.add(r[0]); byCh[k][r[7] === "USD" ? "won_usd" : "won_eur"] += r[8]; } }
for (const v of Object.values(byCh)) { v.deals = v.deals.size; v.won = v.won.size; v.won_eur = Math.round(v.won_eur); }
console.log("deals by attributed channel:"); console.table(byCh);
console.log("contacts header:", tabs.hs_contacts.rows[0].join(" | "));
console.log("sample contact:", JSON.stringify(tabs.hs_contacts.rows[1]));
console.log("sample deal:", JSON.stringify(d[1]));

// Expected figures for the Paid Channels page (USD), to check the Looker blend against.
const contacts = tabs.hs_contacts.rows.slice(1);
const exp = {};
for (const ch of ["Paid Search", "Paid Social"]) {
  const s = sp.slice(1).filter((r) => r[3] === ch && r[5] === "USD");
  const cost = s.reduce((a, r) => a + r[6], 0), plat = s.reduce((a, r) => a + r[9], 0);
  const crm = contacts.filter((c) => c[3] === ch && c[1] >= "2026-04-01" && c[1] <= "2026-10-18").length;
  const won = d.slice(1).filter((r) => r[12] === ch && r[5] && r[7] === "USD");
  const rev = won.reduce((a, r) => a + r[8], 0);
  exp[ch] = { cost: Math.round(cost), platform_leads: plat, crm_leads: crm, over_report: `${Math.round((plat / crm - 1) * 100)}%`, cpl: Math.round(cost / crm), won: won.length, revenue: rev, cost_per_won: Math.round(cost / won.length), crm_roas: (rev / cost).toFixed(2) };
}
console.log("EXPECTED (Apr 1 – Oct 18, USD):"); console.table(exp);
