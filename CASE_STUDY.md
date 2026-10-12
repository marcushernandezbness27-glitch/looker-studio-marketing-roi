# Multi-Source Marketing ROI Reporting in Looker Studio + a Reusable GA4 Client Template

> **DRAFT. Do not publish until the [PENDING] items are filled from the real build.**
> Target URL: marcushq.buzz/work/looker-studio-marketing-roi

**Role:** Sole builder (data model, mock data generator, calculated fields, report design, verification)
**Stack:** Looker Studio · GA4 · Google Search Console · Google Sheets · Node.js (seeded mock data generator)

---

## The problem

Marketing reporting usually fails in one of two ways.

**Platform numbers stand in for business numbers.** Google Ads reports
"conversions" and a ROAS built on an assumed value per lead. The CRM knows how many
of those conversions were real, deduplicated leads and how much revenue they
closed. The two numbers disagree, and nobody sees it because they live in
different tools.

**Every new client gets a rebuilt report.** Agencies re-create the same GA4
dashboard for each client, and the "channel" breakdown changes each time because
everyone tags links differently.

I built two reports, one for each failure, plus the tagging convention that keeps
the second one honest.

## What was built

- **Dashboard 1: Multi-Source Marketing ROI** (3 pages, 6 data sources, 2 blends)
  - **Page 1: Website & Search.** Real marcushq.buzz data: a **consent-gap panel** comparing the site's own cookieless, server-side page-view counts with consented GA4 views, then GA4 engagement and landing pages, then Search Console impressions/clicks/CTR/position.
  - **Page 2: Paid Advertising.** Spend, clicks, CRM-verified CPL, CRM ROAS vs platform ROAS, and conversion rate, by campaign, against monthly targets.
  - **Page 3: Summary / ROI.** Goal vs actual, revenue by platform, the lead funnel by stage, and paid vs organic lead mix.
- **Dashboard 2: GA4 Agency Template.** A single native GA4 connector with a **data control**, defaulting to Google's public GA4 demo property (Google Merchandise Store), so any viewer can point the whole report at their own GA4 property. Plus an optional Linking API URL that creates a client's own copy pre-connected to their property.
- **Platform grouping layer.** Two calculated fields (`Platform Group`, `Traffic Type`) that map raw source/medium into Meta / Threads / Google / YouTube / Xiaohongshu / LinkedIn / Email / Direct / Other × Paid / Organic, the same way in both reports.
- **UTM cheat sheet.** One row per platform and traffic type, with each row's `utm_*` values matched to the bucket the grouping formula puts it in.
- **Seeded mock data generator** (Node.js). It stands in for a Google Ads account and CRM that don't exist yet (no live ad spend). It's deterministic, so every number on the paid pages can be reproduced.

```
REAL                                   SIMULATED (labelled on every page)
GA4 (marcushq.buzz) ─┐                 Google Ads proxy (Sheet) ─┬─ Blend A: Ads × CRM
Search Console ──────┤                 CRM leads (Sheet) ────────┤   join: date + campaign
                     │                 Spend targets (Sheet) ────┴─ Blend B: Plan vs Actual
                     │                                               join: month + platform
                     └──────── Platform Group (Field ID platform_group_cf) ────────┘
                               one filter control drives every source

Dashboard 2:  GA4 native connector ── Data control ── viewer's own property
```

## Key decisions

### Two ROAS numbers, side by side, on purpose
In the simulated data, the Ads platform reports ROAS from a $150-per-lead value
rule, while the CRM reports revenue from closed deals. The report shows both.
The point isn't that one is right. The gap between them tells you
whether the value rule in Ads needs recalibrating, and that's a decision
a business owner can act on. A **Tracking Gap** metric (Ads conversions with no
matching CRM lead) sits alongside it, because ~12% of form fills being spam or duplicates is
normal, and invisible unless you join the two systems.

### CPL is cost per CRM lead, not cost per platform conversion
CPL divides spend by deduplicated CRM leads, joined on date + campaign. Dividing by Ads
conversions would flatter every campaign by the tracking gap.

### ROAS is a cohort view, and the report says so
Revenue is credited to the day the lead was created, not the day the deal
closed. That answers "what did July's spend produce?", but it makes the most recent
weeks look weak because their deals haven't closed. A text label on the chart
says this so nobody reads the recent dip as a problem.

### Target CPL is derived, not averaged
Monthly targets store budget and target leads. "Target CPL" is calculated as
`SUM(budget) / SUM(target leads)` rather than averaging a stored CPL column,
because an average of ratios is wrong as soon as a filter spans months with
different budgets.

### One filter, many sources: matching Field IDs
A Looker Studio filter control only reaches charts on other data sources when
the field shares a name **and** a Field ID. Every source gets a `Platform Group`
field with the ID `platform_group_cf`. In GA4 it's the grouping formula, and in
the Sheets it's a plain copy of the column. That's why one dropdown filters the
whole report.

### The template uses only fields that exist in every GA4 property
Dashboard 2 never hard-codes marcushq.buzz's own event names. The Events page
runs on GA4's `Key events`, so a client's own conversions appear automatically
after they swap properties. The grouping formulas use only standard dimensions.
The template defaults to Google's public demo property. The swap was tested by
pointing the data control at marcushq.buzz's own property [PENDING: result].

### An empty GA4 report became the headline finding
marcushq.buzz runs consent mode v2 with the default set to denied. Over one 28-day window (Sep 14 – Oct 11, 2026), GA4
reported **0 sessions**, while the site's own cookieless server-side counter
recorded **2,434 page views** in the same period. Tracking wasn't broken: a
consented test visit appeared in GA4 Realtime with both key events. Visitors
who don't accept analytics cookies (and crawlers, which never do) simply don't
exist in GA4's standard reports. Instead of hiding a blank page, I added a small
CSV endpoint to the site (`/api/metrics/daily.csv`), pulled it into Sheets with
`IMPORTDATA`, and blended it with GA4 by date. The result is a **GA4 Capture
Rate** chart that shows how much of the traffic a privacy-first setup is invisible to.
The server count is an upper bound, because its user-agent bot filter doesn't catch every crawler, and the panel says so.

### Real and simulated data never share a scorecard unlabeled
The Google Ads and CRM layers are simulated because there's no live ad spend
yet. Every page that uses them carries a banner saying so, and the real GA4
traffic trend on the summary page is labelled separately.

## Result

[PENDING: fill in only what was verified. Suggested structure:]
- Dashboard 1 live and public: [PENDING URL]. All 3 pages render in an incognito window; the platform filter drives GA4 + paid + CRM charts; PDF export is clean landscape across 3 pages.
- Dashboard 2 live and public: [PENDING URL]. Default view shows the demo store; the data control switched to marcushq.buzz, and grouping fields [PENDING: worked / needed chart-level rebuild].
- In the simulated data, the report surfaces what it was designed to: branded search at ~$18 CPL vs non-brand, PMax and YouTube each above their $80–$100 CPL targets, platform ROAS ~2.6× vs CRM cohort ROAS that differs from it, and a ~12–15% Ads-to-CRM tracking gap. *(These are properties of the mock dataset, regenerable with `--seed 43`, not client results.)*

## Honest gaps

- **The paid and CRM layers are simulated.** No Google Ads account is spending yet. The mock data is realistic in shape (CPCs, CTRs, weekday/weekend patterns, a mid-quarter budget change, CRM dedup), but no business decision was made from it.
- **marcushq.buzz traffic is small, and GA4 runs under consent mode v2 (default denied).** GA4 shows only consented sessions. The consent-gap panel quantifies this rather than fixing it, and its server-side baseline still includes some bots the user-agent filter misses. Search Console query rows are sparse because of low-volume anonymisation.
- **The YouTube Paid bucket is unverified with real ads.** YouTube ads run through Google Ads. With auto-tagging on, GA4 may attribute them to `google / cpc` regardless of UTMs, so the grouping has only been tested against organic YouTube referrals and the mock data.
- **No pacing logic.** Plan vs Actual compares totals, so a partial current month looks under target. A days-elapsed pacing metric is the next refinement.
- **Looker Studio, not Looker Studio Pro.** No team workspaces, scheduled delivery SLAs or audit logs were tested.

---
*Built as portfolio evidence for multi-source marketing reporting and agency GA4 templates. Companion files: `BUILD_GUIDE_DASHBOARD_1.md`, `BUILD_GUIDE_DASHBOARD_2.md`, `CALCULATED_FIELDS.md`, `data/utm_cheat_sheet.csv`.*

**Links:** Dashboard 1 [PENDING] · Dashboard 2 template [PENDING] · UTM cheat sheet [PENDING: Google Sheet view link]
