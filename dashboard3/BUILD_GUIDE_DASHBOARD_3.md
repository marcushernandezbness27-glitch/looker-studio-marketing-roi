# Dashboard 3: FieldFlow CRM-to-Revenue ROI (Build 43b)

**What's real:** CRM. Live HubSpot data (FieldFlow developer test account: 305 contacts, 63 deals) synced daily into Google Sheets by `apps-script/hubspot_sync.gs`. FX: ECB reference rates.
**What's simulated:** Google Ads and Meta Ads spend, anchored to the real monthly count of HubSpot "Paid Search" and "Paid Social" leads (`scripts/generate_ff_spend.mjs`). Targets. Every page says so.

What it demonstrates (the travel-company Looker brief, milestones 2 and 4):
- CRM leads joined to closed revenue
- Blends and calculated fields: CPL, cost per won deal, CRM ROAS, lead-to-won rate
- Platform-reported vs CRM leads
- The same date, channel and currency controls on every page
- Figures validated against the source
- Print-clean landscape PDF

Time: about 30 min for Part A, about 2 h for Part B.

---

## Part A: the Sheet and the sync (30 min)

1. **Create the Sheet.** In Google Drive, create a Sheet named **`Dashboard 3 · FieldFlow CRM to Revenue`**.
2. **Add the script.** Open **Extensions → Apps Script**, rename the project **`HubSpot sync (Dashboard 3)`**, paste all of [`apps-script/hubspot_sync.gs`](apps-script/hubspot_sync.gs), then press Ctrl+S.
3. **Add the HubSpot key.** Go to ⚙️ **Project Settings → Script Properties → Add**.
   - Property: `HUBSPOT_TOKEN`
   - Value: the line starting `pat-` in `C:\tools\hubspot_fieldflow_token.txt`
4. **Run the three functions in this order** (function dropdown → **Run**):
   1. **`importSimulatedData`**. The first time, approve the permissions: Sheets plus external requests. This creates `ff_google_ads`, `ff_meta_ads`, `ff_targets`, `ff_fx_rates` and `ff_ad_spend` (1,608 rows).
   2. **`syncHubSpot`**. It creates `hs_contacts` (305 rows), `hs_deals` (126 rows: 63 deals × USD/EUR), `hs_validation` and `hs_sync_log`.
   3. **`installDailyTrigger`**. Runs the sync every morning.
5. **Check `hs_validation`.** All 4 rows should say **match**: 305 contacts, 63 deals, 20 won, $171,516.
6. Leave the Sheet private. Looker Studio reads it with your credentials.

## Part B: the report (about 2 h)

### Step 1: Data sources (15 min)

Create a new report, then **Add data → Google Sheets → `Dashboard 3 · FieldFlow…`**, one tab at a time (header row ON):

| Tab | Rename the data source to |
|---|---|
| `hs_contacts` | `HubSpot contacts (LIVE)` |
| `hs_deals` | `HubSpot deals (LIVE)` |
| `ff_ad_spend` | `Ad spend, Google + Meta (SIMULATED)` |
| `ff_targets` | `Targets (SIMULATED)` |
| `hs_validation` | `Validation vs HubSpot` |
| `hs_sync_log` | `Sync log` |

**Field types:**
- In every source, set `created_date`, `close_date`, `date` and `month` / `created_month` / `close_month` to **Date**.
- Set `is_won` and `is_closed` to **Boolean**.
- Set every `amount`, `cost` and count column to **Number**.
- `currency` stays **Text**.

### Step 2: Shared filter fields (10 min)

A filter control reaches charts on *other* sources only when the field has the **same name and the same Field ID** everywhere. Type the Field ID **before** saving, because it can't be changed afterwards.

| Data source | Calculated field | Formula | Field ID |
|---|---|---|---|
| HubSpot contacts | `Lead channel` | `lead_source` | `channel_cf` |
| HubSpot deals | `Lead channel` | `attributed_channel` | `channel_cf` |
| Ad spend | `Lead channel` | `channel` | `channel_cf` |
| Targets | `Lead channel` | `channel` | `channel_cf` |
| HubSpot deals | `Report currency` | `currency` | `currency_cf` |
| Ad spend | `Report currency` | `currency` | `currency_cf` |

**More calculated fields:**
- **HubSpot contacts:** `Is MQL` = `IF(lead_score >= 60, 1, 0)`
- **HubSpot deals:**
  - `Won amount` = `IF(is_won, amount, 0)`
  - `Open pipeline` = `IF(is_closed, 0, amount)`
  - `Won deal id` = `IF(is_won, deal_id, NULL)`, which gives won deals = `COUNT_DISTINCT(Won deal id)`
- **Ad spend:** `Currencies in view` = `COUNT_DISTINCT(currency)`, used by the warning below.

> **Counting rule:** `hs_deals` has one row per deal **per currency**. Count deals with **COUNT_DISTINCT(deal_id)**, never Record Count. Money only adds up correctly with exactly one currency selected, which the header control enforces.

### Step 3: Theme, header, controls (15 min)

1. **Canvas:** Theme and layout → **Custom 1100 × 850** (US Letter landscape, same as Dashboards 1 and 2). White background, one accent colour.
2. **Header band (60 px)** with the title *FieldFlow · CRM to Revenue ROI* and three controls:
   - **Date range control.** Default: **Apr 1, 2026 – Oct 18, 2026** (custom).
   - **Drop-down list, control field `Lead channel`.** Data source: HubSpot contacts. Multi-select.
   - **Drop-down list, control field `Report currency`.** Data source: Ad spend. Turn **Single select ON**, set default selection **USD**, and **hide "Select all"** if offered.
3. **Make the controls report-level.** Select the band and the 3 controls → right-click → **Make report-level**.
4. **Data label (small text, under the header):** *CRM: live HubSpot (FieldFlow demo account, synced daily) · Ad spend + targets: simulated · FX: ECB reference rates*
5. **Currency guard.** Add a small scorecard: source Ad spend, metric `Currencies in view`. Conditional formatting: if > 1, red text *"Select one currency"*. Make it report-level too.

### Step 4: Page 1, Leads & Pipeline (HubSpot, LIVE) (25 min)

Date range dimension: contacts = `created_date`, deals = `close_date`.

1. **Scorecards** (row of 5):
   - Leads: contacts, `Record Count`
   - MQLs: `SUM(Is MQL)`
   - MQL rate: `SUM(Is MQL) / COUNT(contact_id)`, shown as a percentage
   - Open pipeline: deals, `SUM(Open pipeline)`
   - Won revenue: deals, `SUM(Won amount)`
2. **Stacked column chart:** dimension `created_month` (Year Month), breakdown `Lead channel`, metric Record Count. Title: *New leads by source*.
3. **Table:** dimension `Lead channel`; metrics Leads, MQLs and MQL rate, sorted by Leads.
4. **Bar chart:** source deals, filter `is_closed = false`, dimension `stage_label`, metric `SUM(amount)`. Title: *Open pipeline by stage*.
5. **Bar chart:** source contacts, dimension `score_band`, metric Record Count. Title: *Lead score bands (MQL = 60+)*.

### Step 5: Page 2, Paid Channels: Spend → Leads → Revenue (25 min)

Banner: *Spend and platform leads are simulated (no live ad accounts). CRM leads and revenue are live HubSpot data.*

**Blend `Paid ROI by channel`** (Resource → Manage blends → Add, or select a chart → Blend data):

| Table | Join keys | Dimensions | Metrics | Date range dimension |
|---|---|---|---|---|
| 1 Ad spend (left) | – | `Lead channel`, `Report currency` | `cost`, `platform_leads`, `clicks` | `date` |
| 2 HubSpot contacts | Left outer on `Lead channel` | `Lead channel` | Record Count → rename **CRM leads** | `created_date` |
| 3 HubSpot deals | Left outer on `Lead channel` + `Report currency` | `Lead channel`, `Report currency` | `Won amount` → **Won revenue**, `COUNT_DISTINCT(Won deal id)` → **Won deals** | `close_date` |

**Chart-level calculated fields** on the table below:

| Field | Formula |
|---|---|
| CPL | `cost / CRM leads` |
| Cost per won deal | `cost / Won deals` |
| CRM ROAS | `Won revenue / cost` |
| Lead → won rate | `Won deals / CRM leads` |
| Platform over-report | `(platform_leads - CRM leads) / CRM leads` |

1. **Table** (blend): `Lead channel` · Spend · Platform leads · CRM leads · Platform over-report · CPL · Won deals · Won revenue · Cost per won deal · CRM ROAS.
2. **Clustered bar chart** (blend): `Lead channel`, metrics `platform_leads` and `CRM leads`. Title: *Ad platforms report more leads than the CRM records*. This is the "Google Ads shows 20, CRM shows 14" view.
3. **Combo chart:** second blend, **`Spend vs CRM leads by month`**.
   - Ad spend (`month`, `Lead channel`, `Report currency`; metric `cost`) left outer join HubSpot contacts (`created_month`, `Lead channel`; Record Count).
   - Join keys: month = created_month and Lead channel.
   - Chart: dimension month; bars = cost, line = CRM leads (right axis).

### Step 6: Page 3, Revenue vs Target and Data Quality (20 min)

1. **Blend `Revenue vs target`:**
   - HubSpot deals (`close_month`, `Report currency`; `Won amount`) left outer join Targets (`month`; `target_revenue_usd`, with a filter `channel = All channels`), joined on close_month = month.
   - Chart: column = Won revenue, line = target. Note on the chart: *target in USD*. Also add a table version.
2. **Table:** HubSpot deals, dimension `Lead channel`, metrics `COUNT_DISTINCT(deal_id)`, Won deals, Won revenue.
   - Include **Unattributed** (3 deals whose company has no contact, a data-quality finding from the HubSpot audit).
   - Subtitle: *First-touch attribution: each deal is credited to the lead source of its company's earliest contact.*
3. **Table:** `Validation vs HubSpot` (check · hubspot · sheet · status), plus a scorecard showing the latest `started_at` from the sync log. Title: *Every figure checked against HubSpot on each sync*.

### Step 7: Verify, share, export (15 min)

1. **Numbers.** With the default date range, Currency = USD and all channels, page 2 should match:

   | | Spend | Platform leads | CRM leads | Over-report | CPL | Won | Revenue | CRM ROAS |
   |---|---|---|---|---|---|---|---|---|
   | Paid Search | $6,608 | 59 | 46 | 28% | $144 | 2 | $12,036 | 1.82 |
   | Paid Social | $5,170 | 61 | 52 | 17% | $99 | 4 | $40,512 | 7.84 |

   Page 1 should match too: Won revenue **$171,516**, 20 won deals.
   - If spend or revenue roughly **doubles**, the currency control isn't single-select.
   - If CRM leads is off, a blend table has the wrong date range dimension.
2. **Currency.** Switch to EUR. Spend should be about **€10,192** total, and won revenue about **€149,930**. Lead counts must not change.
3. **Channel.** Pick Paid Social. All three pages react. If a chart doesn't, its `Lead channel` Field ID isn't `channel_cf`.
4. **Share.** Share → Manage access → **Anyone with the link: Viewer**. Do this from your phone or personal device: sharing changes fail from this server's datacenter IP.
5. **PDF.** File → Download → PDF. All 3 pages should be landscape, nothing clipped.
6. **Screenshots** of all 3 pages, plus `hs_validation` in the Sheet and the Apps Script code, for the case study.
