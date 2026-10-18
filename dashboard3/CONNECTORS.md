# Getting HubSpot (and Meta Ads) into Looker Studio: options and trade-offs

Looker Studio has no native HubSpot or Meta Ads connector. There are three ways in:

| Route | How | Cost | Good for | Watch out for |
|---|---|---|---|---|
| **Sheets sync with Apps Script** (this build) | A script pulls the HubSpot API into a Google Sheet on a daily trigger; Looker reads the Sheet | $0 | Full control: custom attribution logic (first touch via company), validation tab, any property | Someone maintains the script. Sheets has a 10M-cell cap. Refresh is daily, not live. The API key's scopes must cover what you pull |
| **Partner connector** (Supermetrics, Windsor.ai, Coupler.io, Porter Metrics, Dataslayer…) | Install the connector in Looker Studio, authorise HubSpot / Meta | Monthly subscription, usually per data source or account (see below) | Fast setup, live-ish queries, Meta Ads + HubSpot from one vendor, no code for the client to maintain | Per-source pricing adds up across 22 sources. Custom logic (first-touch joins) still needs blends or Sheets. Quotas and sampling vary |
| **Warehouse** (HubSpot → BigQuery via Fivetran / Airbyte / a connector's warehouse plan) | Load raw objects into BigQuery, model them (e.g. dbt), point Looker at the models | Higher: tool plus warehouse | Many sources, history, joins too heavy for blends | Overkill for one dashboard; setup time |

## Partner connector pricing: verify before quoting

Third-party comparisons disagree widely. Entry prices found on 2026-10-18 (all from comparison articles, not vendor pricing pages):
- Windsor.ai: about $19–23/month
- Porter Metrics: about $12.50–19/month
- Coupler.io: $24–49/month, or free on a low tier
- Supermetrics: anywhere from about $44 to $299/month depending on plan

**Check the vendor's own pricing page for the HubSpot connector specifically before putting a number in a proposal.**

Sources: [Swydo: Supermetrics alternatives](https://www.swydo.com/blog/best-supermetrics-alternatives/) · [Dataslayer: Supermetrics competitors with pricing (2026)](https://dataslayer.ai/blog/12-supermetrics-competitors-with-transparent-pricing-2026-comparison) · [Porter Metrics: Looker Studio connectors](https://portermetrics.com/es/test/)

## How I'd choose for a client

- **A handful of sources and a team that won't maintain code** → a partner connector. Pick one vendor that covers HubSpot **and** Meta Ads, to keep one bill and one login.
- **Custom attribution, or validation the client must trust** → the Sheets sync for the CRM, even alongside a connector for ad platforms. The script writes the exact join the business uses, and a validation tab proves the numbers match HubSpot.
- **Many sources, long history, heavy joins** → a warehouse. Looker Studio becomes the presentation layer only.
