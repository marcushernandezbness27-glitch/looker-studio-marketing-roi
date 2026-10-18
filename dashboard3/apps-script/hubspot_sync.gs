/**
 * HubSpot → Google Sheets sync for Looker Studio Dashboard 3 (Build 43b).
 * Bound to the Sheet "Dashboard 3 · FieldFlow CRM to Revenue". No Google Cloud project, no paid connector.
 *
 *   syncHubSpot()          pulls contacts + deals from HubSpot (FieldFlow test account) into
 *                          hs_contacts / hs_deals, credits each deal to the lead source of the
 *                          company's earliest contact (first touch), and writes hs_validation:
 *                          Sheet totals vs HubSpot's own counts. Every run is logged in hs_sync_log.
 *   importSimulatedData()  loads the SIMULATED spend/targets and REAL FX CSVs from the public repo.
 *   installDailyTrigger()  runs syncHubSpot every day at ~06:00 (script time zone).
 *
 * Script Property: HUBSPOT_TOKEN (HubSpot service key with crm.objects.contacts/deals/companies.read).
 */
const VERSION = 1;
const HS = 'https://api.hubapi.com';
const RAW = 'https://raw.githubusercontent.com/marcushernandezbness27-glitch/looker-studio-marketing-roi/main/dashboard3/data/';
const STAGES = {
  appointmentscheduled: '1 · Appointment scheduled', qualifiedtobuy: '2 · Qualified to buy',
  presentationscheduled: '3 · Presentation scheduled', decisionmakerboughtin: '4 · Decision maker bought in',
  contractsent: '5 · Contract sent', closedwon: '6 · Closed won', closedlost: '7 · Closed lost',
};

function syncHubSpot() {
  const started = new Date();
  try {
    const contacts = fetchAll_('contacts', ['ff_lead_source', 'ff_original_create_date', 'lifecyclestage', 'fieldflow_lead_score', 'createdate'], 'companies');
    const deals = fetchAll_('deals', ['dealname', 'dealstage', 'amount', 'closedate', 'createdate'], 'companies');

    // First touch per company: the lead source of its earliest contact (by original create date).
    const first = {};
    contacts.forEach(function (c) {
      const co = firstAssoc_(c, 'companies'), d = c.properties.ff_original_create_date;
      if (co && d && (!first[co] || d < first[co].date)) first[co] = { date: d, src: c.properties.ff_lead_source || '(unknown)' };
    });

    const cRows = [['contact_id', 'created_date', 'created_month', 'lead_source', 'lifecycle_stage', 'lead_score', 'score_band', 'company_id']];
    contacts.forEach(function (c) {
      const p = c.properties, d = p.ff_original_create_date || String(p.createdate || '').slice(0, 10), s = Number(p.fieldflow_lead_score || 0);
      cRows.push([c.id, d, d ? d.slice(0, 7) + '-01' : '', p.ff_lead_source || '(unknown)', p.lifecyclestage || '', s,
        s >= 60 ? '3 · MQL (60+)' : s >= 40 ? '2 · Nurture (40-59)' : '1 · Not ready (<40)', firstAssoc_(c, 'companies') || '']);
    });

    // EUR amounts use the close month's ECB rate from the ff_fx_rates tab (run importSimulatedData first).
    const fxSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ff_fx_rates');
    const fx = fxByMonth_(fxSheet ? fxSheet.getDataRange().getValues().map(function (r) { return r.map(function (v) { return v instanceof Date ? Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd') : v; }); }) : []);
    // One row per deal per currency (see importSimulatedData): count deals with COUNT_DISTINCT(deal_id).
    const dRows = [['deal_id', 'deal_name', 'company_id', 'stage', 'stage_label', 'is_won', 'is_closed', 'currency', 'amount', 'created_date', 'close_date', 'close_month', 'attributed_channel', 'attribution_note']];
    const base = deals.map(function (x) {
      const p = x.properties, co = firstAssoc_(x, 'companies'), f = co && first[co], close = String(p.closedate || '').slice(0, 10);
      return { id: x.id, usd: Number(p.amount || 0), close: close, won: p.dealstage === 'closedwon', row: function (cur, amount) {
        return [x.id, p.dealname || '', co || '', p.dealstage, STAGES[p.dealstage] || p.dealstage,
          p.dealstage === 'closedwon', p.dealstage === 'closedwon' || p.dealstage === 'closedlost', cur, amount,
          String(p.createdate || '').slice(0, 10), close, close ? close.slice(0, 7) + '-01' : '',
          f ? f.src : 'Unattributed', f ? 'first touch: earliest company contact, ' + f.date : 'no contact associated with the company'];
      } };
    });
    base.forEach(function (b) {
      dRows.push(b.row('USD', b.usd));
      const rate = eur_(fx, b.close);
      if (!isNaN(rate)) dRows.push(b.row('EUR', Math.round(b.usd * rate * 100) / 100));
    });

    write_('hs_contacts', cRows);
    write_('hs_deals', dRows);

    // Validation: what HubSpot itself reports vs what landed in the Sheet (USD rows = one per deal).
    const usdRows = dRows.slice(1).filter(function (r) { return r[7] === 'USD'; });
    const won = usdRows.filter(function (r) { return r[5] === true; });
    const wonAmountSheet = won.reduce(function (a, r) { return a + r[8]; }, 0);
    const wonHs = searchAll_('deals', [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }], ['amount']);
    const wonAmountHs = wonHs.reduce(function (a, x) { return a + Number(x.properties.amount || 0); }, 0);
    const checks = [
      ['Contacts', searchTotal_('contacts'), cRows.length - 1],
      ['Deals', searchTotal_('deals'), usdRows.length],
      ['Closed-won deals', wonHs.length, won.length],
      ['Closed-won amount (USD)', wonAmountHs, wonAmountSheet],
    ];
    const vRows = [['check', 'hubspot', 'sheet', 'status', 'checked_at']].concat(checks.map(function (c) {
      return [c[0], c[1], c[2], c[1] === c[2] ? 'match' : 'MISMATCH', started];
    }));
    write_('hs_validation', vRows);
    const mismatches = checks.filter(function (c) { return c[1] !== c[2]; }).length;
    log_(started, mismatches ? 'mismatch' : 'ok', cRows.length - 1, usdRows.length, mismatches ? mismatches + ' validation mismatch(es)' : '');
  } catch (e) {
    log_(started, 'error', '', '', String(e && e.message || e));
    throw e;
  }
}

function importSimulatedData() {
  const tabs = {};
  [['ff_google_ads', 'ff_google_ads_proxy.csv'], ['ff_meta_ads', 'ff_meta_ads_proxy.csv'],
   ['ff_targets', 'ff_targets.csv'], ['ff_fx_rates', 'ff_fx_rates.csv']].forEach(function (t) {
    const res = UrlFetchApp.fetch(RAW + t[1], { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error(t[1] + ': HTTP ' + res.getResponseCode());
    const rows = Utilities.parseCsv(res.getContentText()).filter(function (r) { return r.length > 1; })
      .map(function (r, i) { return i === 0 ? r : r.map(num_); });
    write_(t[0], rows);
    tabs[t[0]] = rows;
  });
  // Looker Studio blends join but can't stack (union) sources, so both platforms go into one tab.
  // Currency is a ROW dimension (one row per currency, EUR at the monthly ECB rate) so a single
  // "Currency" filter with a shared Field ID switches every source at once. Each row carries the
  // full volume metrics: the report's Currency control is single-select, so exactly one set of rows
  // is ever summed (the report shows a warning if more than one currency is in view).
  const fx = fxByMonth_(tabs.ff_fx_rates);
  const union = [['date', 'month', 'platform', 'channel', 'campaign', 'currency', 'cost', 'impressions', 'clicks', 'platform_leads']];
  ['ff_google_ads', 'ff_meta_ads'].forEach(function (name) {
    tabs[name].slice(1).forEach(function (r) {
      union.push([r[0], r[1], r[2], r[3], r[4], 'USD', r[7], r[5], r[6], r[8]]);
      union.push([r[0], r[1], r[2], r[3], r[4], 'EUR', Math.round(r[7] * eur_(fx, r[1]) * 100) / 100, r[5], r[6], r[8]]);
    });
  });
  write_('ff_ad_spend', union);
}

// month (YYYY-MM-01) → USD→EUR rate, from the ff_fx_rates tab rows.
function fxByMonth_(rows) {
  const m = {};
  (rows || []).slice(1).forEach(function (r) { if (r[1] === 'EUR') m[String(r[0]).slice(0, 7)] = Number(r[2]); });
  return m;
}
// Rate for a month; months beyond the data (e.g. expected close dates) use the latest known rate.
function eur_(fx, month) {
  const k = String(month).slice(0, 7), keys = Object.keys(fx).sort();
  if (!keys.length) return NaN;
  return fx[k] || fx[keys[keys.length - 1]];
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncHubSpot') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncHubSpot').timeBased().everyDays(1).atHour(6).create();
}

// ---------- helpers ----------

function hs_(method, path, body) {
  const token = PropertiesService.getScriptProperties().getProperty('HUBSPOT_TOKEN');
  if (!token) throw new Error('Script Property HUBSPOT_TOKEN is not set');
  for (let attempt = 1; ; attempt++) {
    const res = UrlFetchApp.fetch(HS + path, {
      method: method, contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + token }, payload: body ? JSON.stringify(body) : undefined,
    });
    const code = res.getResponseCode();
    if (code === 429 && attempt < 4) { Utilities.sleep(2000 * attempt); continue; } // HubSpot rate limit: back off
    if (code >= 300) throw new Error('HubSpot ' + method + ' ' + path.split('?')[0] + ' → ' + code + ': ' + res.getContentText().slice(0, 200));
    return JSON.parse(res.getContentText());
  }
}

function fetchAll_(object, props, assoc) {
  let out = [], after = '';
  do {
    const j = hs_('get', '/crm/v3/objects/' + object + '?limit=100&properties=' + props.join(',') + (assoc ? '&associations=' + assoc : '') + (after ? '&after=' + after : ''));
    out = out.concat(j.results);
    after = j.paging && j.paging.next ? j.paging.next.after : '';
  } while (after);
  return out;
}

function searchAll_(object, filters, props) {
  let out = [], after;
  do {
    const j = hs_('post', '/crm/v3/objects/' + object + '/search', { filterGroups: [{ filters: filters }], properties: props, limit: 100, after: after });
    out = out.concat(j.results);
    after = j.paging && j.paging.next ? j.paging.next.after : undefined;
  } while (after);
  return out;
}

function searchTotal_(object) {
  return hs_('post', '/crm/v3/objects/' + object + '/search', { limit: 1 }).total;
}

function firstAssoc_(rec, type) {
  const a = rec.associations && rec.associations[type];
  return a && a.results && a.results.length ? a.results[0].id : '';
}

function write_(name, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if (rows.length) sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function log_(started, status, contacts, deals, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('hs_sync_log') || ss.insertSheet('hs_sync_log');
  if (sh.getLastRow() === 0) sh.appendRow(['started_at', 'seconds', 'status', 'contacts', 'deals', 'note', 'script_version']);
  sh.appendRow([started, Math.round((Date.now() - started.getTime()) / 100) / 10, status, contacts, deals, note, VERSION]);
}

function num_(v) {
  return v !== '' && !isNaN(v) && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? Number(v) : v;
}
