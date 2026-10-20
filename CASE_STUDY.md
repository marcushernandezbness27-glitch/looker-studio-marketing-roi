# Multi-Source Marketing ROI Reporting in Looker Studio + a Reusable GA4 Client Template

> **PUBLISHED 2026-10-15** at https://marcushq.buzz/work/looker-studio-marketing-roi (site source: portfolio-site/src/case-studies.ts).
> **Updated 2026-10-20** with Dashboard 3 (live HubSpot CRM to revenue): see the README and dashboard3/. The site entry is the canonical text.
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
pointing the data control at marcushq.buzz's own property: every chart re-queried, and
the data-source-level grouping fields kept working on the swapped property with no
chart-level rebuild.

### An empty GA4 report became the headline finding
marcushq.buzz runs consent mode v2 with the default set to denied. Over one 28-day window (Sep 14 – Oct 11, 2026), GA4
reported **0 sessions**, while the site's own cookieless server-side counter
recorded **2,434 page views** in the same period. Across the full window
(Jul 15 – Oct 12, 2026) the gap is 8,969 server-side page views against 88
consented GA4 views, a **0.98% capture rate**. Tracking wasn't broken: a
consented test visit appeared in GA4 Realtime with both key events. Visitors
who don't accept analytics cookies (and crawlers, which never do) simply don't
exist in GA4's standard reports. Instead of hiding a blank page, I added a small
CSV endpoint to the site (`/api/metrics/daily.csv`), pulled it into Sheets with
`IMPORTDATA`, and blended it with GA4 by date. The result is a **GA4 Capture
Rate** chart that shows how much of the traffic a privacy-first setup is invisible to.
The server count is an upper bound, because its user-agent bot filter doesn't catch every crawler, and the panel says so.

### Rates don't survive custom grouping
The first version of the Acquisition table showed a 1,504% "session key event rate"
for Other / Referral. `Platform Group` is a calculated dimension built from
source/medium, so Data Studio fetches one row per source/medium pair and re-aggregates
them. That works for counts, but GA4's pre-computed rates were summed across
dozens of referral sites. GA4 doesn't expose a "sessions with a key event" count, so the
rate can't be rebuilt per group. The grouped tables now use count ratios (key events per
session), and GA4's native rates appear only where GA4 computes them directly:
scorecards, date trends and the raw source/medium table.

### Real and simulated data never share a scorecard unlabeled
The Google Ads and CRM layers are simulated because there's no live ad spend
yet. Every page that uses them carries a banner saying so, and the real GA4
traffic trend on the summary page is labelled separately.

## Result

- **Dashboard 1 is live and public:** https://datastudio.google.com/reporting/b157e938-fa59-4e4f-aa4b-75ab32d4b072. It was verified in a signed-out incognito window, and the PDF export is 3 clean landscape pages.
- **The simulated paid numbers match the seeded generator to the cent** (Jul 1 – Oct 10: $8,805.97 spend, 3,451 clicks, 154 Ads conversions, $67.22 CRM-verified CPL, 6.45 CRM ROAS). That proves both blend joins (date + campaign; month + platform) are correct.
- **Real consent gap (Jul 15 – Oct 12, 2026):** 8,969 server-side page views vs 88 consented GA4 views, a 0.98% capture rate.
- **One dropdown filters every source.** Selecting Threads on the summary page returned exactly the CRM rows in the source data (9 leads, 1 won, $2,500, cross-checked against the CSV). The paid bullets went empty (no Threads spend), the lead-mix chart showed only Organic Social, and the server-side traffic panel stayed unfiltered, as its label says.
- **Search Console block:** connected and working, and it reads zero, which matches Search Console's own Performance report (0 clicks, 0 impressions). The homepage is indexed (URL Inspection: "URL is on Google"), but this new property's data only begins Oct 11, 2026, and since then the site hasn't appeared for any search. No SEO work has been done yet. Search visibility is the planned Technical SEO build. Sitemap submitted Oct 15.
- **Dashboard 2 is live and public:** https://datastudio.google.com/reporting/465f0039-1f41-49ca-8691-1aa97f6430f7. The default view shows Google's demo store (~128k sessions over 28 days, grouped into Direct / Google / Other / Meta / YouTube / Email). Switching the data control to marcushq.buzz re-pointed every chart, and `Platform Group` / `Traffic Type` populated on the swapped property (3 sessions → Direct, 2 key events from a consented test visit). So the grouping travels with the template, with no per-client rebuild.
- In the simulated data, the report surfaces what it was designed to: branded search at ~$18 CPL vs non-brand, PMax and YouTube each above their $80–$100 CPL targets, platform ROAS ~2.6× vs CRM cohort ROAS that differs from it, and a ~12–15% Ads-to-CRM tracking gap. *(These are properties of the mock dataset, regenerable with `--seed 43`, not client results.)*

## Honest gaps

- **The paid and CRM layers are simulated.** No Google Ads account is spending yet. The mock data is realistic in shape (CPCs, CTRs, weekday/weekend patterns, a mid-quarter budget change, CRM dedup), but no business decision was made from it.
- **marcushq.buzz traffic is small, and GA4 runs under consent mode v2 (default denied).** GA4 shows only consented sessions. The consent-gap panel quantifies this rather than fixing it, and its server-side baseline still includes some bots the user-agent filter misses. Search Console query rows are sparse because of low-volume anonymisation.
- **The YouTube Paid bucket is unverified with real ads.** YouTube ads run through Google Ads. With auto-tagging on, GA4 may attribute them to `google / cpc` regardless of UTMs, so the grouping has only been tested against organic YouTube referrals and the mock data.
- **No pacing logic.** Plan vs Actual compares totals, so a partial current month looks under target. A days-elapsed pacing metric is the next refinement.
- **Looker Studio, not Looker Studio Pro.** No team workspaces, scheduled delivery SLAs or audit logs were tested.

---
*Built as portfolio evidence for multi-source marketing reporting and agency GA4 templates. Companion files: `BUILD_GUIDE_DASHBOARD_1.md`, `BUILD_GUIDE_DASHBOARD_2.md`, `CALCULATED_FIELDS.md`, `data/utm_cheat_sheet.csv`.*

**Links:** [Dashboard 1: Marketing ROI](https://datastudio.google.com/reporting/b157e938-fa59-4e4f-aa4b-75ab32d4b072) · [Dashboard 2: GA4 agency template](https://datastudio.google.com/reporting/465f0039-1f41-49ca-8691-1aa97f6430f7) · [UTM cheat sheet](https://docs.google.com/spreadsheets/d/1GeKICA4HdEn43QLDG_q4p_tNUeij35aKZGXg92G_-Ls/edit?usp=sharing)
