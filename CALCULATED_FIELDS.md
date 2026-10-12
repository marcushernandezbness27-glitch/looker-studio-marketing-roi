# Calculated Fields — single source of truth

Every formula used in both dashboards. Paste these exactly. Field names in
formulas must match the data source's field names; if Looker Studio renamed
a Sheets column on import (e.g. `cost` → `Cost`), fix the name in the formula.

> **Field ID rule (important for Dashboard 1):** a filter control only filters
> charts on *other* data sources when the field has the **same name and the same
> Field ID** in each source. So every data source gets a calculated field named
> `Platform Group` with Field ID **`platform_group_cf`**. You set the Field ID in
> the calculated-field editor before saving, and you can't change it afterwards.

---

## 1. Platform grouping (shared by both dashboards)

### GA4 data source: `Platform Group` (Field ID `platform_group_cf`)

```
CASE
  WHEN REGEXP_CONTAINS(LOWER(Session medium), "^e-?mail$|newsletter") THEN "Email"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "threads") THEN "Threads"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "facebook|instagram|^(fb|ig|an|msg|meta)$") THEN "Meta"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "youtube|^yt$") THEN "YouTube"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "linkedin|lnkd") THEN "LinkedIn"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "xiaohongshu|xhslink|^xhs$|rednote") THEN "Xiaohongshu"
  WHEN REGEXP_CONTAINS(LOWER(Session source), "google") THEN "Google"
  WHEN Session source = "(direct)" THEN "Direct"
  ELSE "Other"
END
```

Order matters:
- **The buckets follow the Build 43 spec:** Meta / Threads / Google / YouTube / Xiaohongshu / LinkedIn / Direct / Other, plus **Email**. Email isn't in the spec list, but the UTM cheat sheet covers email, and without its own bucket newsletter traffic would land in Other.
- **Email is checked first,** so `mail.google.com / email` doesn't land in Google.
- **Threads is checked before Meta.** It's Meta-owned, but it's reported as its own platform, so `threads.net` / `threads.com` / `l.threads.com` must not fall into Meta.
- **Xiaohongshu matches its share domain `xhslink.com`** and the `rednote` name, as well as the full name.
- **YouTube is checked before Google,** so `youtube / paid_video` stays YouTube.
- **Meta's short codes are anchored** (`^fb$`) so substrings like "digital" never match `ig`.
- **Meta's codes cover the dynamic source values.** The UTM cheat sheet recommends `utm_source={{site_source_name}}`, which returns `fb`, `ig`, `an` or `msg`.

### GA4 data source: `Traffic Type` (Field ID `traffic_type_cf`)

```
CASE
  WHEN REGEXP_CONTAINS(LOWER(Session medium), "^(cpc|ppc|cpm|cpv|display|paid.*)$") THEN "Paid"
  WHEN LOWER(Session medium) = "organic" THEN "Organic Search"
  WHEN REGEXP_CONTAINS(LOWER(Session medium), "^(social|social-network|social-media|sm|organic_social)$") THEN "Organic Social"
  WHEN REGEXP_CONTAINS(LOWER(Session medium), "^e-?mail$|newsletter") THEN "Email"
  WHEN LOWER(Session medium) = "referral"
       AND REGEXP_CONTAINS(LOWER(Session source), "facebook|instagram|threads|linkedin|lnkd|youtube|xiaohongshu|xhslink|rednote|^t[.]co$|twitter|^x[.]com$|reddit") THEN "Organic Social"
  WHEN LOWER(Session medium) = "referral" THEN "Referral"
  WHEN Session source = "(direct)" THEN "Direct"
  ELSE "Other"
END
```

`Platform Group` × `Traffic Type` answers "Google Paid vs Google Organic"
without needing a separate bucket per combination.

### Sheets data sources (Ads proxy, CRM, targets): `Platform Group` (Field ID `platform_group_cf`)

```
platform_group
```

It's a plain copy of the column. It exists only so its name and ID match the GA4 field
and one filter control drives every page. The mock data generator writes
`platform_group` with exactly the same bucket names as the GA4 CASE above.

---

## 2. Dashboard 1 — Google Ads proxy data source (`google_ads_proxy`)

| Field | Formula | Type |
|---|---|---|
| CTR | `SUM(clicks) / SUM(impressions)` | Percent |
| CPC | `SUM(cost) / SUM(clicks)` | Currency (USD) |
| Conversion Rate | `SUM(conversions) / SUM(clicks)` | Percent |
| Platform CPA | `SUM(cost) / SUM(conversions)` | Currency (USD) |
| Platform ROAS | `SUM(conversion_value) / SUM(cost)` | Number, 2 dp (show as `2.62x`) |

`conversion_value` is the Ads value rule ($150 per lead conversion). That
makes **Platform ROAS** the number the ad platform would report, as opposed to
the revenue-based figure below.

## 3. Dashboard 1 — CRM data source (`crm_leads`)

| Field | Formula | Type |
|---|---|---|
| Leads | `COUNT(lead_id)` | Number |
| Won Deals | `SUM(CASE WHEN stage = "Won" THEN 1 ELSE 0 END)` | Number |
| Won Revenue | `SUM(deal_value)` | Currency (USD); blank deal_value = not won |
| Lead→Won Rate | `SUM(CASE WHEN stage = "Won" THEN 1 ELSE 0 END) / COUNT(lead_id)` | Percent |
| Open Pipeline | `SUM(CASE WHEN stage IN ("New","Contacted","Qualified","Proposal") THEN 1 ELSE 0 END)` | Number |
| Stage Order | `CASE stage WHEN "New" THEN 1 WHEN "Contacted" THEN 2 WHEN "Qualified" THEN 3 WHEN "Proposal" THEN 4 WHEN "Won" THEN 5 ELSE 6 END` | Number (sort key for the funnel bar) |

## 4. Dashboard 1 — blend calculated fields

### Blend A: `Paid × CRM` (Ads proxy LEFT OUTER JOIN CRM)
Join keys: `date` = `created_date`, `campaign` = `utm_campaign`.

| Field | Formula | Notes |
|---|---|---|
| CPL (CRM) | `SUM(cost) / SUM(Leads)` | **Required metric.** Cost per *deduplicated CRM lead*, not per Ads conversion |
| CRM ROAS | `SUM(Won Revenue) / SUM(cost)` | **Required metric.** Revenue from closed deals ÷ spend |
| Conversion Rate (CRM) | `SUM(Leads) / SUM(clicks)` | **Required metric.** Clicks → real leads |
| Tracking Gap | `1 - SUM(Leads) / SUM(conversions)` | Share of Ads-reported conversions with no CRM lead (spam/duplicates) |

> CRM ROAS here is a **cohort view**: revenue is credited to the day the lead
> was created, not the day it closed. That's the right lens for "what did
> July's spend produce?" Recent cohorts will look low because their deals
> haven't closed yet. Say this in a text box on the chart.

### Blend B: `Plan vs Actual` (Ads proxy LEFT OUTER JOIN CRM (paid) LEFT OUTER JOIN Targets)
Join keys: `month` + `Platform Group` in all three tables. The CRM table in this
blend has a table-level filter `traffic_type = Paid`.

| Field | Formula | Notes |
|---|---|---|
| Budget Pacing | `SUM(cost) / SUM(monthly_budget)` | Percent; >100% = overspend |
| Target CPL (implied) | `SUM(monthly_budget) / SUM(target_leads)` | Aggregates correctly across months, unlike `AVG(target_cpl)` |
| CPL vs Target | `(SUM(cost) / SUM(Leads)) / (SUM(monthly_budget) / SUM(target_leads)) - 1` | Percent; positive = more expensive than plan |
| Leads vs Target | `SUM(Leads) / SUM(target_leads)` | Percent |

> **Partial-month caveat.** October data ends on the generator's `--end` date, but
> its targets are full-month. A pacing view (spend-to-date ÷ budget × days
> elapsed ÷ days in month) is a better comparison than raw totals. That
> refinement is noted as a gap in the case study and not built.

---

## 5. Dashboard 2 — GA4 template (native connector only, no blends)

Uses the same `Platform Group` and `Traffic Type` fields from §1, plus:

| Field | Formula | Type |
|---|---|---|
| Engaged Session Share | `Engaged sessions / Sessions` | Percent (GA4's own Engagement rate works too; this one stays correct under any filter) |
| Key Events per Session | `Key events / Sessions` | Number, 2 dp |
| Is Key Page | `CASE WHEN REGEXP_CONTAINS(Landing page, "^/work/|^/analytics") THEN "Case study / proof" ELSE "Other" END` | Dimension. marcushq-specific example: edit the regex per client |

**Data control compatibility:** these are data-source-level calculated fields
built only from standard GA4 dimensions and metrics that exist in every property, so
they should keep working when a viewer switches property. Verification step 7 in
`BUILD_GUIDE_DASHBOARD_2.md` tests exactly this against Google's public GA4 demo
property. If the switch breaks a field, rebuild it as a chart-level calculated
field on the affected charts.
