# Build Guide — Dashboard 1: Multi-Source Marketing ROI

Click-by-click. Formulas are in `CALCULATED_FIELDS.md`. Budget about 3–4 hours.

**Data honesty rule for this report:** GA4 + Search Console = **real**
marcushq.buzz data. Ads proxy, CRM and targets = **simulated** (see
`scripts/generate_mock_data.mjs`). Every page that shows simulated data carries a
visible label, and real and simulated metrics never share a scorecard unlabeled.

---

## Step 0 — Prerequisites (15 min)

1. **Put the mock data in Google Sheets.** In Google Drive, create one Google Sheet named `LS Marketing ROI — Mock Data (SIMULATED)`.
   - Make 4 tabs: `google_ads_proxy`, `crm_leads`, `spend_targets`, `utm_cheat_sheet`.
   - For each tab: File → Import → Upload the matching CSV from `data/` → **Replace current sheet**, and leave "Convert text to numbers, dates" **ON**.
   - Check that `date`, `month`, `created_date` and `closed_date` are right-aligned, which means Sheets parsed them as dates.
2. **Confirm the GA4 property.** marcushq.buzz is GA4 **G-L5S4F1PE8V**, loaded via GTM **GTM-TTFVC893**. GTM-56QMHVF2 is the Stellapura container, so don't use it here. In GA4 Admin → Property details, note the **numeric property ID**. You'll need it for Dashboard 2's Linking API URL.
3. **Mark key events** (GA4 Admin → Events), if not done already: `portfolio_engagement` and `case_study_read`. Key events only count from the day they're marked.
4. **Confirm GSC.** Search Console property for marcushq.buzz is verified.

## Step 1 — Create the report and add data sources (20 min)

1. Go to lookerstudio.google.com → **Blank report**.
2. Add the data sources below. Each one: Add data → connector → select → **Add**.
   | # | Connector | Selection | Rename the data source to |
   |---|---|---|---|
   | 1 | Google Analytics | marcushq.buzz property | `GA4 — marcushq.buzz (REAL)` |
   | 2 | Search Console | marcushq.buzz → **URL impression** → Web | `GSC URL — marcushq.buzz (REAL)` |
   | 3 | Search Console | marcushq.buzz → **Site impression** → Web | `GSC Site — marcushq.buzz (REAL)` |
   | 4 | Google Sheets | `google_ads_proxy` tab, header row ON | `Google Ads proxy (SIMULATED)` |
   | 5 | Google Sheets | `crm_leads` tab | `CRM leads (SIMULATED)` |
   | 6 | Google Sheets | `spend_targets` tab | `Spend targets (SIMULATED)` |
3. In each Sheets source (Resource → Manage added data sources → Edit):
   - **Types:** set `date` / `created_date` / `closed_date` to **Date**, `month` to **Year Month**, and `cost` / `conversion_value` / `deal_value` / `monthly_budget` / `target_cpl` to **Currency (USD)**.
   - **Aggregation:** set `target_cpl` and `target_crm_roas` to **Average**, not Sum.
4. Add the calculated fields from `CALCULATED_FIELDS.md`:
   - `Platform Group` (Field ID `platform_group_cf`) in **all 4 non-GSC sources**, plus `Traffic Type` in GA4. Type the Field ID *before* clicking Save.
   - §2 fields in the Ads proxy and §3 fields in the CRM.
5. Check data credentials: every source should show **Owner's credentials**, so public viewers see the data.

## Step 2 — Blends (20 min)

Resource → Manage blends → **Add a blend**.

**Blend A — `Paid × CRM (SIMULATED)`**
- **Table 1, Ads proxy.** Dimensions: `date`, `campaign`, `campaign_type`, `Platform Group`. Metrics: `cost`, `clicks`, `impressions`, `conversions`, `conversion_value`. Date range dimension: `date`.
- **Table 2, CRM leads.** Dimensions: `created_date`, `utm_campaign`. Metrics: `Leads`, `Won Revenue`, `Won Deals`.
- **Join:** Left outer, on `date` = `created_date` and `campaign` = `utm_campaign`.
- Add the blend fields from `CALCULATED_FIELDS.md` §4A.

**Blend B — `Plan vs Actual (SIMULATED)`**
- **Table 1, Ads proxy.** Dimensions: `month`, `Platform Group`. Metric: `cost`.
- **Table 2, CRM leads.** Dimensions: `month`, `Platform Group`. Metric: `Leads`. Add a filter on this table: `traffic_type` equals `Paid`.
- **Table 3, Spend targets.** Dimensions: `month`, `Platform Group`. Metrics: `monthly_budget`, `target_leads`, `target_crm_roas`.
- **Joins:** both Left outer, on `month` + `Platform Group`.
- Add the blend fields from §4B.

## Step 3 — Theme and print-clean layout (10 min)

- **Canvas:** Theme and layout → Layout → Canvas size **Custom 1100 × 850**, which is US Letter landscape at 100 px/inch, so PDF export doesn't rescale.
- **Navigation:** Navigation type **Tabs**. Turn off "Display mode: fit to width" if it's on.
- **Theme:** white background, one accent colour, 12–14 px body text.
- **Header:** add a 60 px band at the top with the title, a date range control and a Platform Group dropdown. Select all → right-click → **Make report-level** so the band appears on every page.
- **Print margins:** keep everything ≥ 30 px from the edges, and leave nothing below 820 px.

## Step 4 — Page 1: Website & Search (REAL data) (45 min)

Add a small label at the top: *"Live data: GA4 + Search Console + server-side counts for marcushq.buzz."*

### 4a. The consent-gap data source (do this first)

marcushq.buzz runs consent mode v2 with the default set to denied, so GA4 only reports
visitors who click Accept. The site also counts every page view on the server, with no
cookies and a user-agent bot filter, and publishes those counts as CSV.

1. In the mock-data Google Sheet, add a tab `server_pageviews`. In cell A1, enter:
   `=IMPORTDATA("https://marcushq.buzz/api/metrics/daily.csv")`
   The columns are `date, path, server_page_views`, and Sheets re-pulls it roughly hourly.
   This tab is **REAL** data even though it lives in the mock-data file.
2. Add it as a 7th data source named `Server page views — marcushq.buzz (REAL)`. Set `date` to type **Date**.
3. Create a blend called `Consent gap (REAL)`:
   - **Table 1, Server page views:** dimension `date`, metric `server_page_views`.
   - **Table 2, GA4:** dimension `Date`, metric `Views`.
   - **Join:** Left outer on `date` = `Date`.
   - **Blend field:** `GA4 Capture Rate` = `SUM(Views) / SUM(server_page_views)`, type Percent.

| Element | Source | Config |
|---|---|---|
| Scorecards ×3 | Consent gap blend | Server page views, GA4 views, **GA4 Capture Rate** |
| Time series | Consent gap blend | date → server_page_views vs Views. Title it *"Page views: server-side vs consented GA4"* |
| Text box | — | *"GA4 reports only visitors who accept analytics cookies (consent mode v2, default denied). The server-side count is cookieless and bot-filtered by user agent, so it is an upper bound: some automated traffic still passes the filter. The gap is the cost of privacy-first consent, made visible."* |

The platform filter doesn't apply to these charts, because the server count has no source data. Say so in the text box.

### 4b. GA4 + Search Console

| Element | Source | Config |
|---|---|---|
| Scorecards ×4 | GA4 | Sessions, Engaged sessions, Bounce rate, Avg engagement time per session. Comparison: previous period |
| Time series | GA4 | Dimension Date, metric Sessions, breakdown `Platform Group` |
| Table | GA4 | Landing page → Sessions, Engagement rate, Key events. Sort by Sessions, 10 rows |
| Scorecards ×4 | GSC Site | Impressions, Clicks, Site CTR, Average Position |
| Table | GSC Site | Query → Impressions, Clicks, CTR, Avg position. 10 rows |
| Table | GSC URL | Landing Page → Impressions, Url Clicks, URL CTR |
| Text label | — | Next to the GSC block: *"Google organic only. The platform filter does not apply."* |

GSC data lags about 2–3 days, and low-traffic sites see query anonymisation, so
expect sparse query rows. That's honest data, not a bug.

## Step 5 — Page 2: Paid Advertising (SIMULATED) (45 min)

Add a red/amber banner at the top: *"Simulated Google Ads data (no live spend). Built to demonstrate the reporting layer."*

| Element | Source | Config |
|---|---|---|
| Scorecards ×6 | Blend A | Spend, Clicks, Ads conversions, **CPL (CRM)**, **CRM ROAS**, **Conversion Rate (CRM)** |
| Combo chart | Blend A | Date (week) → bars cost, line CPL (CRM) |
| Table with heatmap | Blend A | campaign → cost, clicks, CTR*, conversions, Leads, CPL (CRM), Platform ROAS, CRM ROAS, Tracking Gap |
| Bullet charts ×2 | Blend B | Budget Pacing (target 100%), Leads vs Target (target 100%) |
| Bar chart | Blend B | Platform Group → CPL vs Target (conditional colour: red > 0) |
| Text box | — | The cohort caveat from `CALCULATED_FIELDS.md` §4A |

\* CTR isn't in the blend. Either add it as a blend field (`SUM(clicks)/SUM(impressions)`) or drop the column.

## Step 6 — Page 3: Summary / ROI (30 min)

Add the banner: *"Paid + CRM = simulated · Traffic trend = live GA4."*

| Element | Source | Config |
|---|---|---|
| Scorecards (goal vs actual) | Blend B | Spend vs Budget, Paid Leads vs Target, CPL vs Target. Use the scorecard's "Compare to" on the target metric, or a bullet chart |
| Scorecard | CRM | Won Revenue, all sources |
| Scorecard | Blend A | CRM ROAS (paid) |
| Time series | CRM | Week → Leads, breakdown `Traffic Type`. Paid vs organic lead mix |
| Funnel (bar, sorted by Stage Order) | CRM | stage → Leads |
| Pie / donut | CRM | Platform Group → Won Revenue |
| Small time series, labelled **REAL** | GA4 | Week → Sessions (site traffic context) |

## Step 7 — Publish and verify (15 min)

1. **Share.** Share → Manage access → **Anyone on the internet can view**. Report settings: turn off **Enable viewers to download** if you don't want CSV pulls, and leave **Show data source title**.
2. **Public view.** Open the view URL in an **incognito window** and confirm all three pages render data.
3. **Filters.** Set the Platform Group filter to `YouTube`. Page 2 and page 3 paid charts and the GA4 charts should change, and the GSC block should stay put (as labelled). If a chart doesn't react, its `Platform Group` Field ID doesn't match: delete that field and recreate it with ID `platform_group_cf`.
4. **Dates.** Set the date range to Jul 1 – Sep 30 2026 and confirm the Ads scorecards match the generator's printed totals for that range. To get totals for any range, run `node scripts/generate_mock_data.mjs --end 2026-09-30`.
5. **PDF.** File → Download → PDF. All 3 pages should be landscape, with nothing clipped.
6. **Default date range:** Report settings → **Custom Jul 1 2026 – Oct 10 2026**, matching the mock data's range, so the paid pages aren't empty under "Last 28 days" later. Re-run the generator with a later `--end` and re-import to extend it.
7. Paste the public URL into `CASE_STUDY.md` (the `[PENDING]` link) and the TS draft.
8. Take 3 screenshots, one per page, at 1100 px. Save them to `portfolio-site/public/case-studies/looker-studio-marketing-roi/` as `page1_website_search.png`, `page2_paid.png` and `page3_summary.png`.
