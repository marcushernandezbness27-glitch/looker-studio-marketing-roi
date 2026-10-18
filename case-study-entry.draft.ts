// DRAFT entry for portfolio-site/src/case-studies.ts. Append to CASE_STUDIES
// once the [PENDING] items are filled from the real build. Not imported anywhere.
// Before pasting: replace every PENDING, delete the figures you don't have.

  {
    slug: "looker-studio-marketing-roi",
    title: "Multi-Source Marketing ROI Reporting in Looker Studio + a Reusable GA4 Client Template",
    service: "bi-dashboards",
    role: "Sole builder (data model, mock data generator, calculated fields, report design, verification)",
    stack: ["Looker Studio", "GA4", "Google Search Console", "Google Sheets", "Node.js"],
    problem: [
      "Marketing reporting usually fails in one of two ways. First, platform numbers stand in for business numbers: Google Ads reports conversions and a ROAS built on an assumed lead value, while the CRM knows how many of those were real, deduplicated leads and what revenue they closed. The two disagree, and nobody sees it because they live in different tools.",
      "Second, agencies rebuild the same GA4 report for every client, and the channel breakdown changes each time because everyone tags links differently. These two reports address one failure each, plus the tagging convention that keeps the second honest.",
    ],
    built: [
      "Dashboard 1: a 3-page multi-source ROI report (Website & Search, Paid Advertising, Summary/ROI) over 6 data sources and 2 blends. GA4 + Search Console are real marcushq.buzz data; the Google Ads, CRM and targets layers are simulated and labelled on every page",
      "A consent-gap panel: the site's own cookieless server-side page-view counts (published as CSV, pulled into Sheets with IMPORTDATA) blended with consented GA4 views by date, as a GA4 Capture Rate",
      "CRM-verified metrics: CPL = spend ÷ deduplicated CRM leads, CRM ROAS = closed revenue ÷ spend, and a Tracking Gap metric for Ads conversions with no matching CRM lead",
      "Dashboard 2: a GA4 agency template on the native connector with a data control, defaulting to Google's public GA4 demo property, so any viewer can point every chart at their own GA4 property, plus a Linking API URL that creates a client's own pre-connected copy",
      "A platform grouping layer: two calculated fields mapping source/medium into Meta / Threads / Google / YouTube / Xiaohongshu / LinkedIn / Email / Direct / Other × Paid / Organic, identical in both reports",
      "A UTM cheat sheet with one row per platform and traffic type, each row matched to the bucket the grouping formula produces",
      "A seeded Node.js mock data generator that makes every simulated number reproducible",
    ],
    diagram: `REAL                              SIMULATED (labelled on every page)
GA4 (marcushq.buzz) ─┐            Google Ads proxy ─┬─ Blend A: Ads × CRM  (date + campaign)
Search Console ──────┤            CRM leads ────────┤
                     │            Spend targets ────┴─ Blend B: Plan vs Actual (month + platform)
                     └── Platform Group (Field ID platform_group_cf) ──┘
                         one filter control drives every source

Dashboard 2:  GA4 native connector ── Data control ── viewer's own property`,
    figures: [
      // PENDING: real screenshots after the build
      { kind: "image", src: "/case-studies/looker-studio-marketing-roi/page2_paid.png", caption: "Paid Advertising page: CRM-verified CPL and ROAS vs platform ROAS by campaign (simulated data, labelled)" },
      { kind: "image", src: "/case-studies/looker-studio-marketing-roi/page3_summary.png", caption: "Summary / ROI: goal vs actual, lead funnel, paid vs organic lead mix" },
      { kind: "image", src: "/case-studies/looker-studio-marketing-roi/page1_website_search.png", caption: "Website & Search: live GA4 + Search Console data for marcushq.buzz" },
    ],
    decisions: [
      {
        heading: "An empty GA4 report became the headline finding",
        body: "This site runs consent mode v2 with the default set to denied. Over 28 days GA4 reported 0 sessions, while the site's own cookieless server-side counter recorded 2,434 page views (8,969 vs 88 views across Jul 15 – Oct 12: a 0.98% capture rate). Tracking wasn't broken: a consented test visit appeared in Realtime with both key events. Non-consenting visitors and crawlers simply don't exist in GA4's standard reports. Rather than hide a blank page, the server counts are blended with GA4 by date into a GA4 Capture Rate chart. The server count is an upper bound, since its user-agent bot filter misses some crawlers.",
      },
      {
        heading: "Two ROAS numbers, side by side, on purpose",
        body: "Ads reports ROAS from a fixed value-per-lead rule; the CRM reports revenue from closed deals. Showing both isn't about picking a winner. The gap tells you whether the Ads value rule needs recalibrating. A Tracking Gap metric (Ads conversions with no CRM lead) sits alongside, because some share of spam and duplicate form fills is normal, and invisible unless the two systems are joined.",
      },
      {
        heading: "One filter, many sources: matching Field IDs",
        body: "A Looker Studio filter control only reaches charts on other data sources when the field shares both a name and a Field ID. Every source gets a Platform Group field with the ID platform_group_cf: the grouping formula in GA4, a plain column copy in the Sheets. That's why one dropdown filters GA4, paid and CRM charts together.",
      },
      {
        heading: "Rates don't survive custom grouping",
        body: "The first Acquisition table showed a 1,504% session key event rate. Platform Group is a calculated dimension over source/medium, so Data Studio re-aggregates one row per source/medium pair. Counts add up correctly, but GA4's pre-computed rates were summed across dozens of referral sites. GA4 exposes no sessions-with-key-event count to rebuild the rate, so grouped tables use count ratios (key events per session), and native rates appear only where GA4 computes them directly.",
      },
      {
        heading: "Target CPL is derived, not averaged",
        body: "Targets store monthly budget and target leads; target CPL is SUM(budget) ÷ SUM(target leads), not an average of a stored CPL column. An average of ratios goes wrong as soon as a date filter spans months with different budgets.",
      },
      {
        heading: "The template uses only fields every GA4 property has",
        body: "Dashboard 2 never hard-codes this site's own event names. The Events page runs on GA4's Key events, so a client's conversions appear automatically after they swap properties. The template defaults to Google's public demo property. Swapping the data control to this site's own property re-pointed every chart, and the grouping fields kept working with no per-client rebuild.",
      },
    ],
    result: "PENDING: fill in only what was verified (public URLs render in incognito, cross-source filter works, PDF export clean, data control swap result).",
    gaps: [
      "The Google Ads, CRM and targets layers are simulated. No ad account is spending yet. The data is realistic in shape, but no business decision was made from it.",
      "marcushq.buzz traffic is small and GA4 runs under consent mode v2 (default denied), so the real pages undercount true traffic, and Search Console query rows are sparse.",
      "The YouTube Paid bucket is unverified with real ads. With Google Ads auto-tagging, GA4 may attribute YouTube ads to google / cpc regardless of UTMs.",
      "Plan vs Actual compares totals with no days-elapsed pacing, so a partial current month reads as under target.",
    ],
    footnote: "Built as portfolio evidence for multi-source marketing reporting and agency GA4 templates. Real GA4 + Search Console data from this site; paid and CRM layers simulated and labelled.",
    links: [
      { label: "Dashboard 1: Marketing ROI (live)", url: "https://datastudio.google.com/reporting/b157e938-fa59-4e4f-aa4b-75ab32d4b072" },
      { label: "Dashboard 2: GA4 template (live)", url: "https://datastudio.google.com/reporting/465f0039-1f41-49ca-8691-1aa97f6430f7" },
      { label: "UTM cheat sheet", url: "PENDING" },
    ],
  },
