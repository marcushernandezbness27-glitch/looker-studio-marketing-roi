# Build Guide — Dashboard 2: GA4 Agency Template (Data Control)

This report uses **one** GA4 data source, the native connector only, with no blends and
no Sheets. That restriction is what makes the data control work: a data control can
only swap a chart whose data source uses the same connector type. Budget about 2 hours.

---

## Step 1 — Create the report (10 min)

0. **Get access to Google's GA4 demo account first.** Search "Google Analytics demo account" in Google's Analytics Help and click the GA4 access link while signed in as your Gmail. "Demo Account → GA4 - Google Merch Shop" then appears in your GA4 account list with Viewer access.
1. Go to lookerstudio.google.com → **Blank report** → Google Analytics → **Demo Account → GA4 - Google Merch Shop** → Add.
   **Why the demo property is the default:** marcushq.buzz runs consent mode with the default set to denied, so its standard GA4 reports are near-empty and a template defaulting to it would look blank. The demo store has real, rich ecommerce data. The template's job is the swap, so the default only needs to show what a populated report looks like.
2. Rename the data source to `GA4 — template source`, and keep **Owner's credentials**, so public viewers see the demo store data by default.
3. Add a text box under the title: *"Default data: Google's public GA4 demo property (Google Merchandise Store). Select your own property in the data control."*
3. Add the calculated fields from `CALCULATED_FIELDS.md` §1 (GA4 `Platform Group`, `Traffic Type`) and §5.
4. **Canvas:** Custom 1100 × 850, the same as Dashboard 1, so the two read as one product.

## Step 2 — Report-level header (15 min)

Build one top band, then select it all → right-click → **Make report-level**:

- **Data control.** Insert → Data control → connector **Google Analytics**. This is the widget that lists every GA4 property *the viewer* can access and re-points every chart at the one they pick.
- **Date range control.** Default: Last 28 days. Real GA4 always has current data, unlike Dashboard 1's mock layer.
- **Dropdown control** on `Platform Group`.
- **Title text:** "GA4 Performance Report". Add a subtitle text box: "Select your GA4 property in the top-left control."

## Step 3 — Page 1: Traffic Overview (30 min)

| Element | Config |
|---|---|
| Scorecards ×6 | Total users, New users, Sessions, Engaged Session Share, Avg engagement time per session, Views. Comparison: previous period |
| Time series | Date → Sessions, Engaged sessions. Comparison: previous period (dashed) |
| Donut | Device category → Sessions |
| Geo chart | Country → Sessions |
| Table | Page path and screen class → Views, Users, Avg engagement time. 10 rows |

## Step 4 — Page 2: Acquisition (30 min)

| Element | Config |
|---|---|
| Bar chart | `Platform Group` → Sessions, sorted descending. **This is the headline chart for the platform grouping** |
| Pivot table | Rows `Platform Group`, columns `Traffic Type`, metric Sessions, heatmap on |
| Table | `Platform Group`, `Traffic Type` → Sessions, Engagement rate, Key events, Session key event rate |
| Table | Session source / medium → Sessions, Key events. This is the raw view, so a client can audit the grouping |
| Table | Session campaign → Sessions, Key events. Hide `(not set)` with a chart filter |
| Text box | Link to the UTM cheat sheet: "Tag links using this convention so they group correctly" |

## Step 5 — Page 3: Events & Conversions (30 min)

| Element | Config |
|---|---|
| Scorecards | Key events, Session key event rate, Key Events per Session |
| Table | Event name → Event count, Total users, Event count per active user |
| Bar chart | `Platform Group` → Key events |
| Time series | Date → Key events |
| Text box | "Key events = whatever is marked as a key event in GA4 Admin. Each client's own conversions appear here automatically." |

**Use the client-agnostic** `Key events`. Don't hard-code marcushq's event names
(`portfolio_engagement`) into chart filters, because they'd show zero for any other
property and break the template.

## Step 6 — Publish (5 min)

1. Share → Manage access → **Anyone on the internet can view**.
2. File → Report settings → **turn on "Enable viewers to make a copy"**, which makes it a usable template.

## Step 7 — Verify the data control actually swaps (20 min). Do not skip this.

1. In the report's View mode, open the data control and pick **marcushq.buzz (545619721)**. This acts as "a client swapping in their own property". Use a date range that includes your Oct 12 test visit, once it's processed (24–48 h).
2. Check every page:
   - [ ] Scorecards change from the demo store's large numbers to marcushq.buzz's small ones.
   - [ ] `Platform Group` and `Traffic Type` still populate. **If they error out,** recreate them as chart-level calculated fields (see CALCULATED_FIELDS.md §5) and re-test.
   - [ ] Page 3's event table shows `portfolio_engagement` and `case_study_read` instead of the demo store's `purchase` / `add_to_cart`. That proves nothing is hard-coded to either property.
3. Open the URL in **incognito**. It should show the default demo-store data, and the charts should render.
4. Record what happened, including anything that broke, in `CASE_STUDY.md` → Result. This is the evidence for the "client can swap their own property" claim, so don't write that claim until this passes.

## Step 8 — One-click "copy with your property" link (optional, 10 min)

Looker Studio's Linking API can create a client's own copy, pre-pointed at their property:

```
https://lookerstudio.google.com/reporting/create
  ?c.reportId=<TEMPLATE_REPORT_ID>
  &r.reportName=GA4%20Performance%20Report
  &ds.ds0.connector=googleAnalytics
  &ds.ds0.propertyId=<CLIENT_NUMERIC_PROPERTY_ID>
```

(Join it onto one line.) `<TEMPLATE_REPORT_ID>` is the ID in the report's URL
after `/reporting/`. `ds0` must be the data source's **alias**: check the alias
under Resource → Manage added data sources, and replace `ds0` if it differs.

Test it with marcushq.buzz's property ID (545619721) before putting it in a proposal.
