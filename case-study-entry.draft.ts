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
      "CRM-verified metrics: CPL = spend ÷ deduplicated CRM leads, CRM ROAS = closed revenue ÷ spend, and a Tracking Gap metric for Ads conversions with no matching CRM lead",
      "Dashboard 2: a GA4 agency template on the native connector with a data control, so any viewer can point every chart at their own GA4 property, plus a Linking API URL that creates a client's own pre-connected copy",
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
        heading: "Two ROAS numbers, side by side, on purpose",
        body: "Ads reports ROAS from a fixed value-per-lead rule; the CRM reports revenue from closed deals. Showing both isn't about picking a winner. The gap tells you whether the Ads value rule needs recalibrating. A Tracking Gap metric (Ads conversions with no CRM lead) sits alongside, because some share of spam and duplicate form fills is normal, and invisible unless the two systems are joined.",
      },
      {
        heading: "One filter, many sources: matching Field IDs",
        body: "A Looker Studio filter control only reaches charts on other data sources when the field shares both a name and a Field ID. Every source gets a Platform Group field with the ID platform_group_cf: the grouping formula in GA4, a plain column copy in the Sheets. That's why one dropdown filters GA4, paid and CRM charts together.",
      },
      {
        heading: "Target CPL is derived, not averaged",
        body: "Targets store monthly budget and target leads; target CPL is SUM(budget) ÷ SUM(target leads), not an average of a stored CPL column. An average of ratios goes wrong as soon as a date filter spans months with different budgets.",
      },
      {
        heading: "The template uses only fields every GA4 property has",
        body: "Dashboard 2 never hard-codes this site's own event names. The Events page runs on GA4's Key events, so a client's conversions appear automatically after they swap properties. PENDING: one sentence on the demo-property data control test result.",
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
      { label: "Dashboard 1: Marketing ROI (live)", url: "PENDING" },
      { label: "Dashboard 2: GA4 template (live)", url: "PENDING" },
      { label: "UTM cheat sheet", url: "PENDING" },
    ],
  },
