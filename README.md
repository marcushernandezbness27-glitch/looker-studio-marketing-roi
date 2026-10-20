# Looker Studio — Marketing ROI + GA4 Agency Template (Build 43)

Two public Looker Studio reports for Upwork proposals, plus a UTM convention
and a case study for marcushq.buzz/work/looker-studio-marketing-roi.

| File | What it is |
|---|---|
| `data/google_ads_proxy.csv` | **SIMULATED** Google Ads campaign report: 4 campaigns × daily, Jul 1 – Oct 10 2026 |
| `data/crm_leads.csv` | **SIMULATED** CRM: 292 leads with UTM first-touch, stage and deal value. Paid leads derive from Ads conversions minus dedup |
| `data/spend_targets.csv` | **SIMULATED** monthly budget/lead targets per platform, Jul–Dec 2026 |
| `data/utm_cheat_sheet.csv` | UTM convention, with each row mapped to the dashboard's Platform Group / Traffic Type |
| `scripts/generate_mock_data.mjs` | Seeded generator: `node scripts/generate_mock_data.mjs --end 2026-10-10 --seed 43` |
| `CALCULATED_FIELDS.md` | Every formula, including field-ID rules for cross-source filtering |
| `BUILD_GUIDE_DASHBOARD_1.md` | Click-by-click: multi-source ROI report |
| `BUILD_GUIDE_DASHBOARD_2.md` | Click-by-click: GA4 data-control template + Linking API URL |
| `CASE_STUDY.md` / `case-study-entry.draft.ts` | Case study draft (markdown + ready-to-paste site entry), with [PENDING] slots for verified results |

**Real vs simulated:** GA4 and Search Console are real marcushq.buzz data
(GA4 G-L5S4F1PE8V via GTM-TTFVC893). Ads, CRM and targets are simulated and
labelled on every report page.

## Dashboard 3: CRM to Revenue ROI (Build 43b, live HubSpot)

**Live report:** https://datastudio.google.com/reporting/8f5c4c0c-efb8-47e3-af58-514e80fd7603

- **CRM data:** live HubSpot (FieldFlow demo account: 305 contacts, 63 deals), synced daily into Google Sheets by [`dashboard3/apps-script/hubspot_sync.gs`](dashboard3/apps-script/hubspot_sync.gs). No paid connector and no Google Cloud project.
- **Attribution:** each deal is credited to the lead source of its company's earliest contact (first touch).
- **Validation:** every sync is checked against HubSpot's own totals. 4/4 matched: 305 contacts, 63 deals, 20 won, $171,516.
- **Ad spend:** Google Ads + Meta spend is **simulated**, anchored to the real monthly paid-lead counts ([`generate_ff_spend.mjs`](dashboard3/scripts/generate_ff_spend.mjs)).
- **FX:** USD→EUR are real ECB reference rates.
- **Pages:** Leads & Pipeline · Paid Channels (spend → CRM leads → won revenue, platform vs CRM leads) · Revenue vs Target & Data Quality.
- **Controls:** one date, channel and currency control drives all pages, via shared Field IDs and currency as a row dimension.
- **Docs:** build guide [`dashboard3/BUILD_GUIDE_DASHBOARD_3.md`](dashboard3/BUILD_GUIDE_DASHBOARD_3.md) (with the expected figures) and connector options [`dashboard3/CONNECTORS.md`](dashboard3/CONNECTORS.md).
- **Local test:** [`dashboard3/scripts/test_sync_local.mjs`](dashboard3/scripts/test_sync_local.mjs) runs the Apps Script in Node against the real HubSpot API.

## Status checklist

- [x] Mock data generated and sanity-checked
- [x] Calculated fields, UTM sheet, build guides, case study draft
- [ ] Google Sheet created with 4 tabs (Guide 1, step 0)
- [ ] GA4 key events marked: `portfolio_engagement`, `case_study_read`
- [ ] Dashboard 1 built, public, verified in incognito + PDF
- [ ] Dashboard 2 built, public, data control verified against the GA4 demo property
- [ ] Screenshots → `portfolio-site/public/case-studies/looker-studio-marketing-roi/`
- [ ] [PENDING] slots filled; entry pasted into `portfolio-site/src/case-studies.ts`; deployed
